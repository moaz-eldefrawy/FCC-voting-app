$(document).ready(function(){
  
  // know the active button & adding an active call to it
  var windowUrl = window.location.href;
  var navLinks = $('nav li');
  navLinks.removeClass('active');
  for(var i=0; i<navLinks.length; i++)
  {
    if(navLinks[i].firstChild.href == windowUrl)
      navLinks[i].className+=' active';
  }

  // handling sign up with twitter button
  });
