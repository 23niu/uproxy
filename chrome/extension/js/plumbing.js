var appExtensionId = "hilnpmepiebcjhibkbkfkjkacnnclkmi";
var appPort = chrome.runtime.connect(appExtensionId);
//appPort.postMessage("Test");

window.addEventListener('load', function() {
  freedom_listeners['viewopen'] = [function(args) {
    var frame = document.createElement('iframe');
    frame.src = args;
    document.body.appendChild(frame);
  }];
}, true);

