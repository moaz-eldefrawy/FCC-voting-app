// remove poll
  $(".btn-danger").click(function(){
    if(confirm("Are you sure you want to delete this poll?")){ 
      $.ajax({
        url: window.location.href + "?remove=1", 
        method: "post",
        success: function(data){
          window.location.href= "https://fancy-thrill.glitch.me";
        },
        error: function(){
          alert("Sorry an Error happened");
        }

      })
    }
  })

  var a = window.location.href.split('/')
  var pollName = a[ a.length - 1 ];
  // handling share button
  $("#share").click(function(){
    console.log(pollName)
    var width  = 575,
      height = 400,
      left   = ($(window).width()  - width)  / 2,
      top    = ($(window).height() - height) / 2,
      url    = "http://twitter.com/share?text=" + decodeURI(pollName) + " | Fcc-Voting | " + window.location.href ,
      opts   = 'status=1' +
               ',width='  + width  +
               ',height=' + height +
               ',top='    + top    +
               ',left='   + left;
    url = encodeURI(url)
    window.open(url, 'twitter', opts);
  })

  // handling submit an option button
  $("#submitOption").click(function(){
    var chosenOption = $('#options').val();
    var url = "https://fancy-thrill.glitch.me/polls/" + pollName + "?choose=" + $("#options").val();
    console.log(url)
    $.ajax({
      url: url,
      method: "post",
      success: function(){
        console.log("option submitted");
      },
      error: function(){
        console.log("couldn't submit an option")
      }
    })
  })

  
  // fil select element with options
  function renderSelectOptions(){
    options.forEach((el, i) => {
      var option = "<option>" + el + "</option>";
      $('#options').append(option);   
    })
  }


  // getting poll options
  var options = [];

  $.ajax({
    url: "/polls/" + pollName + "/getOptions",
    method: "get",
    success: function(data){
      console.log("getting options ..");
      console.log(data);
      options = Object.keys(data);
      console.log(options)
      renderGraph()
      renderSelectOptions()
    },
    error: function(err){
      alert("sorry an error happend when trying to get the poll options");  
    }
  })

  // getting random colors
  var usedColors = [];
  function generateRandomColor(){
    var r = Math.floor(Math.random()*254),
    g = Math.floor(Math.random()*254),
    b = Math.floor(Math.random()*254),
    opacity = Math.random()
    var color = "rgba(" + r + ", " + g + ", " + b + ", " + opacity + ")";
    return color.toString();
  }

  // setting up the graph
  function renderGraph(){  
    var ctx = document.getElementById("myChart").getContext('2d');
    var myChart = new Chart(ctx, {
      type: 'pie',
      data: {
          labels: options,
          datasets: [{
              label: '# of Votes',
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                generateRandomColor(),
                generateRandomColor(),
                generateRandomColor(),
                generateRandomColor(),
                generateRandomColor(),
                generateRandomColor(),

              ],

          }]
      },
      options: {
        maintainAspectRatio: false
      } 
    })
  }