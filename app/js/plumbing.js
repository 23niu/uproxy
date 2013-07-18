var extPort;

var script = document.createElement('script');
script.setAttribute('data-manifest', 'js/uproxy.json');
script.src = 'js/freedom/freedom.js';
document.head.appendChild(script);

chrome.runtime.onConnectExternal.addListener(function(port) {
  extPort = port;
  extPort.onMessage.addListener(onExtMsg);
});

function onExtMsg(msg) {
  if (msg.cmd == 'emit') {
    freedom.emit(msg.type, msg.data);
  } else if (msg.cmd == 'on') {
    freedom.on(msg.type, function (ret) {
      extPort.postMessage({
        cmd: 'on',
        type: msg.type,
        data: ret
      });
    });
  } else if (msg.cmd == 'once') {
    freedom.once(msg.type, function (ret) {
      extPort.postMessage({
        cmd: 'once',
        type: msg.type,
        data: ret
      });
    });
  }
};

