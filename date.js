


exports.getDate= function(){
    var today = new Date();
    options = {
        weekday :"long",
        day : "numeric",
        month : "long"
    };
    return today.toLocaleDateString('fa-IR',options);
}

exports.getDay= function(){
    var today = new Date();
    options = {
        weekday :"long",
        
    };
    return today.toLocaleDateString('fa-IR',options);
}
