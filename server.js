var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var dbUrl = process.env.DBURL;
var twitterApi = require("node-twitter-api");

var app = express();

"user-strict";
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//hadling requests 
// wantedPolls >> are the polls that is requested from the funciton
function getAllPolls(){ 
  return new Promise(function(resolve, reject){
    MongoClient.connect(dbUrl, function(err, db){
      if(err) console.log("Unable to connecto to MongoDb");
      else {
        var pollsColl = db.collection('polls');
        pollsColl.find().toArray(function(err, polls){
          if(err) return {"err": err};
          var pollsNames = [];
          for(var i=0; i<polls.length; i++){
            pollsNames.push(polls[i].name);
          }
          db.close();
          resolve(pollsNames);
        })
      }
    });
  })
}
function getMyPolls(){
    return new Promise(function(resolve, reject){
      MongoClient.connect(dbUrl, function(err, db){
        if(err) console.log("error: " + err );
        else {
          var myPollsColl = db.collection('verifiedUsers');
          myPollsColl.find().toArray(function(err, docs){
            if(err) return console.log("error: " + err);
            var polls = docs.mypolls;
            db.close();
            resolve(polls);
          })
        }
      })
    })
}

function isAuth(url){
 
  return new Promise(function(resolve, reject){
    MongoClient.connect(dbUrl, function(err, db){
      var usersColl = db.collection("verifiedUsers");
      usersColl.find({url: url}).toArray(function(err, docs){
        resolve(docs);
      })
    })
  })
  
  return true/false;
}

var response = {}

// Handling Requests

//hompage
app.get('*', function(req, res, next){
  
  console.log(response)
   var userIpAddr = req.headers['x-forwarded-for'].split(',')[0];
    // getting user info
  var getUserInfo = isAuth(userIpAddr)  
  getUserInfo.then(function(userInfo){
    if(!userInfo.length){
      response.userAuth = false; 
    }
    else{
      response.userName = userInfo[0].name;  
      response.userAuth = true;
    }
  });
  next()
})

app.get('/polls', function(req, res){
  res.render('index', response)
  
});
//hompage
app.all('/', function(req, res){
  console.log("sending index file")
   res.render('index', response)
  
});
app.get("/mypolls", function(req,res){
  // knowing if a user is logged in
    res.render('mypolls', response)
  
  // 
})
app.get("/newpoll", function(req, res){
  res.render( 'newpoll', response);
})

// handling sign up button

var twitter = new twitterApi({
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callback: process.env.CALLBACK_URL
  })
  
var _requestSecret;
app.get('/request-token', function(req, res){
  
  
  twitter.getRequestToken(function(err, requestToken, requestSecret){
    if(err)
      res.status(500).send(err);
    else {
      _requestSecret = requestSecret;
      console.log(requestToken)
      res.redirect("https://api.twitter.com/oauth/authenticate?oauth_token=" + requestToken);
    }
      
  })  
})
// CALLBACK URL assigned to twitter 
app.all('/signup', function(req, res){
   var requestToken = req.query.oauth_token,
      verifier = req.query.oauth_verifier;
  
        twitter.getAccessToken(requestToken, _requestSecret, verifier, function(err, accessToken, accessSecret) {
            if (err)
                res.status(500).send(err);
            else
                twitter.verifyCredentials(accessToken, accessSecret, function(err, user) {
                    if (err)
                        res.status(500).send(err);
                    else{
                      // connecting to verifiedUsers Database
                      MongoClient.connect(dbUrl, function(err, db){
                        if(err) return console.log(err);
                        var usersColl = db.collection('verifiedUsers');
                        var ip = req.headers['x-forwarded-for'].split(',')[0];
                        console.log(user.name)
                        // Handling sing in with twitter
                        usersColl.find({"name": user.name}).toArray(function (err, docs){
                          console.log(docs.length)
                          if(!docs.length){ //frsit time to sign in with twitter
                            usersColl.insert( {name: user.name, url: ip}, function(){db.close()} );
                          } else{ // not firt-time to sign in with twitter on the website
                            usersColl.update( {name: user.name}, {'$set': {url: ip} } , function(){
                              db.close();
                            });
                          }
                        })
                      })
                      
                      res.redirect('https://fancy-thrill.glitch.me');
                    }
                });
        });
   
})
app.get('/signout', function(req, res, next){
  MongoClient.connect(dbUrl, function(err, db){
     var usersColl = db.collection("verifiedUsers")
     usersColl.remove({name: response.userName}, function(){
       db.close();
       response.userAuth = false;
       res.redirect('https://fancy-thrill.glitch.me')
     })
  })
  
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
 
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
