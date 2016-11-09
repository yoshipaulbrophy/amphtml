import './polyfills';


let test = window.location.hash;
switch(test){
  case "#sendMetadata":
      sendMetadata();
      break;
  case "#sendIntersectionObserver":
      sendIntersectionObserver();
      break;
};

function sendMetadata(){
    window.addEventListener("windowContextCreated", function(){
        window.top.postMessage(JSON.stringify({
            "location" : window.context.location,
            "canonicalUrl" : window.context.canonicalUrl,
            "clientId" : window.context.clientId,
            "pageViewId" : window.context.pageViewId,
            "sentinel" : window.context.sentinel,
            "startTime" : window.context.startTime,
            "referrer" : window.context.referrer,
        }), "*");
    });
}

function sendIntersectionObserver(){
    console.log("Should be sending intersection observer");
    window.addEventListener("windowContextCreated", function(){
        window.addEventListener("message", message => {
            console.log("In intersection observer listener");
            console.log(message);
        });
        window.context.observeIntersection();
        window.top.postMessage("intersection observer", "*");
    });
    // create a listener for the message
}
