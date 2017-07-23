var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var dbUrl = process.env.DBURL;
var twitterApi = require("node-twitter-api");

var app = express();

"use-strict";
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
        db.close()
        //console.log(docs)
        if(!docs.length)
          resolve([{url: 'not found'}])
          
        resolve(docs);
      })
    })
  })
  
}

// Handling Requests

//hompage
var getUserInfo;
app.use(function(req, res, next) {
    var ip = req.headers['x-forwarded-for'].split(',')[0];
    //console.log(ip)
      // getting user info
    getUserInfo = isAuth(ip)  
    //console.log(getUserInfo)
    getUserInfo = getUserInfo.then(function(userInfo){
      
      if(userInfo[0].url == ip){
        return({userName: userInfo[0].name, userAuth: true});
      }
      else{
        return({userAuth: false})  
      }
    }).catch(function(){
       return({userAuth: false})
        return 0;
    })
    next()
      
})

app.get('/polls/:id', (req, res) => {
  getUserInfo.then(function(response){
    res.render('poll', response)
   
  }).catch(function(err){
    res.end("erro" + err);
  })
})


// get poll options
app.get('/polls/:id/getOptions', function(req, res){
  var pollName = req.params.id;
  getUserInfo.then(function(response){
    MongoClient.connect(dbUrl, function(err, db){
      var pollsColl = db.collection('polls')
      console.log(pollName)
      pollsColl.find({name: pollName}, {options: 1}).toArray(function(err, docs){
        console.log(docs)
        res.writeHead(200, {'content-type': 'application/json'})
        res.end(JSON.stringify(docs[0].options))
      })
    })
  }).catch((err) =>{
    res.end("error: " + err);
  })
})

// remove & add a poll
app.post('/polls/:id', (req, res) => {
  var pollName = req.params.id;
  var ip = req.headers['x-forwarded-for'].split(',')[0];
  
  
  getUserInfo.then(function(response){ 
    var key = ip;
    if(response.userAuth)
      key = response.userNameز;
    function handleIfUserSubmitiedBefore(err, db){
        if(err) return console.log('Unable to connect to MongoDB');
        var pollsColl = db.collection('polls');
        
      
        pollsColl.find({name: pollName}, {voters: 1}).toArray(function(err, docs){
          console.log(docs)
          console.log()
          console.log(key)
          if( docs[0].voters[key] != undefined ){ // if the key (person OR ipAddress) exists 
            var pastVote = docs[0].voters[key];
            pollsColl.update( {name: pollName}, {$inc: {["options."+pastVote] : -1} }, function(err){
               console.log( err || "voting is set to default");  
            })
          } else {
            console.log("user didn't vote before")
          }
        })
        //callback()
    }
    console.log(pollName +'...')
    console.log(req.query)
    if(req.query.remove == 1){
      MongoClient.connect(dbUrl, function(err, db){
        if(err) return console.log("Unable to connecto to MongoDb");
        var pollsColl = db.collection('polls');

        pollsColl.remove({name: pollName}, function(data){
          console.log('data:')
          var usersColl = db.collection('verifiedUsers')
          usersColl.update({}, {$pull: {polls: pollName} }, function(){
            db.close();
            res.redirect('redirect');
          })
        })
      })
    } 
    // handling user choosing an option to vote for
    else if( ("choose" in req.query) ){
      console.log('an option is chosen')
      // check if the user has submiited an option before
      
      MongoClient.connect(dbUrl, function(err, db){
          handleIfUserSubmitiedBefore(err, db)
          if(err) return console.log("Unable to connecto to MongoDb");
          var pollsColl = db.collection('polls');
          pollsColl.update( {name: pollName}, {$inc: {["options."+req.query.choose] : 1} })
          pollsColl.update( {name: pollName}, {$set: {["voter" + key.toString()]: req.query.choose} })
      })
        
    } else
      res.redirect("https://fancy-thrill.glitch.me/polls/" + pollName );
  }).catch(function(err){
    res.end("erro" + err);
  })
})

//hompage
function renderHomepage(req, res){
  var pollsNames = [];
    
  getUserInfo.then(function(response){
      MongoClient.connect(dbUrl, function(err, db){
        if(err) console.log("Unable to connecto to MongoDb");
          var pollsColl = db.collection('polls');
          pollsColl.find().toArray(function(err, docs){
          for(var i=0; i<docs.length; i++){
            pollsNames.push(docs[i].name);
          }

          response.pollsNames = pollsNames;
          res.render('index', response)
        })
      })
       
    }).catch(function(err){
      res.end("erro" + err);
    })
}

app.get('/polls', renderHomepage)
app.get('/', renderHomepage);
app.get("/mypolls", function(req,res){

  getUserInfo.then(function(response){
    MongoClient.connect(dbUrl, (err, db) => {
      var usersColl = db.collection('verifiedUsers');
      usersColl.find({name: response.userName}).toArray(function(err, docs){
        if(err) return console.log(err);
        console.log(docs)
        response.polls = docs[0].polls;
        res.render('mypolls', response);       
      })
    })
  }).catch(function(err){
    res.end("erro" + err);
  })
})

app.get("/newpoll", function(req, res){
  function decodeOptions(str){
    var result = [];
    str.pop();
    for(var i=0; i<str.length; i++){
      var l = str[i].length 
      console.log(str[i] + " " + l)
      if(l != 1)
        result.push(str[i])
      
    }
    
    return result;
  }
  
  getUserInfo.then(function(response){ 
    var ip = req.headers['x-forwarded-for'].split(',')[0];
    if(!Object.keys(req.query).length) {// requesting the page
      res.render('newpoll', response)
    }
    else{
      //console.log(' a poll made!! ')
      var options = req.query.options.split('\n');
      var pollName = req.query.name;
      
      // seting the options object
      var optionsObj = {};
      for(var i=0; i<options.length; i++){
        options[i] = options[i].replace(/\s+/g, ' ').trim();
        optionsObj[ options[i] ] = 1;
      }
      
      MongoClient.connect(dbUrl, (err, db) => {
        if(err) return console.log(err)
        // attaching the collection to the user
        new Promise((resolve, reject) => { 
          var usersColl = db.collection('verifiedUsers');
          var pollsColl = db.collection('polls');
          var f1 = false, f2 = false;
          usersColl.update({name: response.userName}, {$push: {"polls": pollName} }, function(err, data){
           f1 = true;
            if(f1 & f2)
              resolve(123)
          })
          pollsColl.insert({name: pollName, options: optionsObj, voters: {}}, function(){
            f2 = true;
            if(f1 & f2)
              resolve(123)
          })

        }).then((val) => {
          db.close();
          res.redirect('https://fancy-thrill.glitch.me/');
        }).catch((err) => {
          console.log(err)
        })
      })
    }
  })
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
                        // Handling sing in with twitter
                        usersColl.find({"name": user.name}).toArray(function (err, docs){
                          app.set(ip, true);
                          if(!docs.length){ //frsit time to sign in with twitter
                            usersColl.insert( {name: user.name, url: ip, polls: []}, function(){
                              db.close();
                              res.redirect('https://fancy-thrill.glitch.me');
                            });
                          } else{ // not firt-time to sign in with twitter on the website
                            usersColl.update( {name: user.name}, {'$set': {url: ip} } , function(){
                              db.close();
                              res.redirect('https://fancy-thrill.glitch.me');
                            });
                            
                          }
                        })
                      })
                    }
                });
        });
   
})
app.get('/signout', function(req, res, next){
  var ip = req.headers['x-forwarded-for'].split(',')[0];
  MongoClient.connect(dbUrl, (err, db) => {
    var usersColl = db.collection('verifiedUsers');
    usersColl.update({url: ip}, {'$set': {url: 'not found'}}, () =>{
      res.redirect('https://fancy-thrill.glitch.me')
      db.close()
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
