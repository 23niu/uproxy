var self = require("sdk/self");
var panel = require("sdk/panel");



var initToolbar = function(freedom) {
  // create toolbarbutton
  var tbb = require("sdk/ui").Button({
    id: "UProxyItem",
    label: "UProxy",
    image: self.data.url("submodules/uproxy-common/images/uproxy-19.png"),
    panel: initPanel(freedom.communicator)
  });
  
  tbb.moveTo({
    toolbarID: "nav-bar",
    forceMove: false // only move from palette
  });
};

var initPanel = function(freedomCommunicator) {
  var l10n = JSON.parse(self.data.load("l10n/en/messages.json"));
  var uproxyPanel = panel.Panel({
    contentURL: self.data.url("popup.html"),
    width: 450,
    height: 300
  });
  freedomCommunicator.addContentContext(uproxyPanel);
  uproxyPanel.port.on("show", function() {
    uproxyPanel.port.emit("l10n", l10n);
  });
  return uproxyPanel;
};

var freedomEnvironment = require('./init_freedom').InitFreedom();

// TODO: Remove when uproxy.js no longer uses setTimeout
// and replace with the line:
// initToolbar(freedomEnvironment);
require('sdk/timers').setTimeout(initToolbar, 20, freedomEnvironment);

