var first = true;
function verify() {
    if(!first){
        $( "#valid" ).slideToggle("slow");
    }
    var username = document.getElementsByName("username")[0].value;
    var password = document.getElementsByName("password")[0].value;
    $.post("https://www.track.kabzy.com/api/login", 
    	{username : username , password : password})
            .success(function(data){
               console.log(data);
               //store the authentication token as a cookie 
               document.cookie="session="+data.auth;
               window.location = 'drivers.html';
            })
            .error(function(data){
                $( "#valid" ).slideToggle("slow");
                first = false;
                console.error(data);
            })
}