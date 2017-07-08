$(document).ready(function(){
  
  // know the active button & adding an active call to it
  var windowUrl = window.location.href;
  var navLinks = $('nav li');
  navLinks.removeClass('active');
  for(var i=0; i<navLinks.length; i++)
  {
    console.log(navLinks[i].firstChild.href);
    console.log(windowUrl);
    if(navLinks[i].firstChild.href == windowUrl)
      navLinks[i].className+=' active';
  }

  // handling sign up with twitter button
  $("#signup").click(function(){ 
    window.location.href = "https://fancy-thrill.glitch.me/request-token";
  })

});
