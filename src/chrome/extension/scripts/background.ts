/**
 * background.ts
 *
 * This is the background page for the Extension. It maintains a chrome runtime
 * connection with the App, consistent state changes with the UI (see ui.js)
 * and holds the data model for both the popup and options page.
 */
// Assumes that core_stub.ts has been loaded.
// UserInterface is defined in 'generic_ui/scripts/ui.ts'.

/// <reference path='core_connector.ts' />
/// <reference path='proxy-config.ts' />

/// <reference path='../../../interfaces/ui.d.ts' />
/// <reference path='../../../interfaces/lib/chrome/chrome.d.ts'/>
/// <reference path='../../../generic_ui/scripts/ui.ts' />

/// <reference path='../../../../node_modules/freedom-typescript-api/interfaces/social.d.ts' />

var ui   :uProxy.UIAPI;  // singleton referenced in both options and popup.
// --------------------- Communicating with the App ----------------------------
var core :ChromeCoreConnector;  // way for ui to speak to a uProxy.CoreAPI

// TODO: This should be *actually* typed.
// Proxy Configuration.
var proxyConfig = new BrowserProxyConfig();


// Singleton model for angularjs hooks on both popup and options.
var model :UI.Model = {
  networks: {},
  // 'global' roster, which is just the concatenation of all network rosters.
  roster: []
};

// TODO(): remove this if there's no use for it.
chrome.runtime.onInstalled.addListener((details) => {
  console.log('onInstalled: previousVersion', details.previousVersion);
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('onSuspend');
  //proxyConfig.stopUsingProxy();
});

/**
 * Primary initialization of the Chrome Extension. Installs hooks so that
 * updates from the Chrome App side propogate to the UI.
 */
function initUI() : UI.UserInterface {

  core = new ChromeCoreConnector({ name: 'uproxy-extension-to-app-port' });
  core.connect();
  var browserAction = new ChromeBrowserAction();

  return new UI.UserInterface(core, browserAction);
}

console.log('Initializing chrome extension background page...');
if (undefined === ui) {
  ui = initUI();
}
