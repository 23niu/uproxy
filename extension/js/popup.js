// Run as soon as the document's DOM is ready.
var bkg = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function () {
  bkg.console.log("loaded UProxy DOM");
});

(function load() {
  var input = document.getElementById('msg_input');
  input.onkeydown = function(evt) {
    if (evt.keyCode == 13) {
      var text = input.value;
      input.value = "";
      bkg.sendMsg("", text);
    }
  };
  bkg.addMsgListener(function(msg) {
    var msg_log = document.getElementById('msg_log');
    msg_log.appendChild(document.createTextNode(msg));
    msg_log.appendChild(document.createElement('br'));
  });
})();
