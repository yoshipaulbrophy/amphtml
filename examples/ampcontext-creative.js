window.name = "%7B%22_context%22:%7B%22location%22:%22foo.com%22,%22canonicalUrl%22:%22foo.com%22,%22clientId%22:%22123%22,%22pageViewId%22:%221%22,%22sentinel%22:%220-291921%22,%22startTime%22:%220%22,%22referrer%22:%22baz.net%22%7D%7D";
function intersectionCallback(payload){
  changes = payload.changes;
  // Step 4: Do something with the intersection updates!
  // Code below is simply an example.
  var latestChange = changes[changes.length - 1];

  // Amp-ad width and height.
  var w = latestChange.boundingClientRect.width;
  var h = latestChange.boundingClientRect.height;

  // Visible width and height.
  var vw = latestChange.intersectionRect.width;
  var vh = latestChange.intersectionRect.height;

  // Position in the viewport.
  var vx = latestChange.boundingClientRect.x;
  var vy = latestChange.boundingClientRect.y;

  // Viewable percentage.
  var viewablePerc = (vw * vh) / (w * h) * 100;

  console.log(viewablePerc, w, h, vw, vh, vx, vy);

}

function dummyCallback(changes){
  console.log(changes);
}

var shouldStopVis = false;
var stopVisFunc;
var shouldStopInt = false;
var stopIntFunc;

if (!window.context || !window.context.isReady){
  console.log("window.context NOT READY");
  window.addEventListener('windowContextCreated', function(){
    console.log("window.context READY");
    window.context.onResizeSuccess(resizeSuccessCallback);
    window.context.onResizeDenied(resizeDeniedCallback);
  });
}

function resizeSuccessCallback(requestedHeight, requestedWidth){
  console.log("Success!");
  console.log(this);
  resizeTo(600,500);
  console.log(requestedHeight);
  console.log(requestedWidth);
}

function resizeDeniedCallback(requestedHeight, requestedWidth){
  console.log("DENIED");
  console.log(requestedHeight);
  console.log(requestedWidth);
}

function toggleObserveIntersection(){
  if (shouldStopInt){
    stopIntFunc();
  } else {
    stopIntFunc = window.context.observeIntersection(intersectionCallback);
  }
  shouldStopInt = !shouldStopInt;
}

function toggleObserveVisibility(){
  if (shouldStopVis){
    stopVisFunc();
  } else {
    stopVisFunc = window.context.observePageVisibility(dummyCallback);
  }
  shouldStopVis = !shouldStopVis;
}
