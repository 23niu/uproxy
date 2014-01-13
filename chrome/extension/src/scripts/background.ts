/**
 * background.ts
 *
 * This is the background page for the Extension. It maintains a chrome runtime
 * connection with the App, consistent state changes with the UI (see ui.js)
 * and holds the data model for both the popup and options page.
 */
// Assumes that freedom_connector.js has been loaded.
/// <reference path="../common/ui/scripts/ui.d.ts"/>
console.log('Initializing chrome extension background page...');
/* jshint -W098 */

declare var chrome:any;
declare var jsonpatch:any;
declare var FreedomConnector:any;

class chromeNotifications implements INotifications {
  ICON_DIR : string = '../common/ui/icons/';
  setIcon(iconFile : string) {
    // TODO: make this not require chrome
    chrome.browserAction.setIcon({
      path: this.ICON_DIR + iconFile
    });
  }
  setLabel(text : string) {
    chrome.browserAction.setBadgeText({ text: '' + text });
  }
  setColor(color) {
    chrome.browserAction.setBadgeBackgroundColor({color: color});
  }
}


// This singleton is referenced in both options and popup.
// UI object is defined in 'common/ui/scripts/ui.js'.
var ui = new UI(new chromeNotifications());

// --------------------- Communicating with the App ----------------------------
// Chrome App Id for UProxy Packaged Chrome App.
var FREEDOM_CHROME_APP_ID = 'hilnpmepiebcjhibkbkfkjkacnnclkmi';
var appChannel = new FreedomConnector(FREEDOM_CHROME_APP_ID, {
    name: 'uproxy-extension-to-app-port' });
appChannel.onConnected.addListener(init);

var _extensionInitialized = false;

// Proxy Configuration.
// TODO: This is throwing a ts warning which is actually okay, but should be
// fixed later once the rest of everything is more typescriptafied.
var proxyConfig = new window.BrowserProxyConfig();
proxyConfig.clearConfig();

// Sometimes the ui-ready fails. Keep trying until we get a valid reset state.
function pollAppForInitialization() {
}

// ---------------------------- State Changes ----------------------------------
var model = {};  // Singleton angularjs model for either popup or options.
var onStateChange = new chrome.Event();

// Rate Limiting for state updates (ms)
var SYNC_TIMEOUT = 800;
var syncBlocked = false;
var syncTimer = null;     // Keep reference to the timer.

// Rate limit synchronizations.
function rateLimitedUpdates() {
  ui.synchronize();
  checkRunningProxy();
  onStateChange.dispatch();
}

// TODO(): remove this if there's no use for it.
chrome.runtime.onInstalled.addListener(function (details) {
  console.log('onInstalled: previousVersion', details.previousVersion);
});

chrome.runtime.onSuspend.addListener(function () {
  console.log('onSuspend');
  //proxyConfig.stopUsingProxy();
})

// ---------------------------- Initialization ---------------------------------
// Called when appChannel is connected.
function init() {

  var finishStateChange = function() {
    // Initiate first sync and start a timer if necessary, in order to
    // rate-limit passes through the entire model & other checks.
    if (!syncBlocked) {
      syncBlocked = true;
      rateLimitedUpdates();
    }
    if (!syncTimer) {
      syncTimer = setTimeout(function() {
        rateLimitedUpdates();
        syncTimer = null;  // Allow future timers.
        syncBlocked = false;
      }, SYNC_TIMEOUT);
    }
  }

  // A full state-refresh should occur whenever the extension first connects to
  // the App, or when the user does a full reset.
  appChannel.on('state-refresh', function(state) {
    // For resetting state, don't nuke |model| with the new object...
    // (there are references to it for Angular) instead, replace keys so the
    // angular $watch can catch up.
    // var currentKeys = Object.keys(model);
    for (var k in model) {
      delete model[k];
    }
    for (var k in state) {
      model[k] = state[k];
    }
    console.log('state-refresh: model = ', model);
    finishStateChange();
  });

  // Normal state-changes should modify some path inside |model|.
  appChannel.on('state-change', function(patchMsg) {
    console.log("state-change(patch: ", patchMsg);
    for (var i in patchMsg) {
      // NEEDS TO BE ADD, BECAUSE THIS IS A HACK :)
      // TODO: verify the path and use replace when appropriate.
      patchMsg[i].op = 'add';
      if ('' == patchMsg[i].path) {
        console.log('WARNING: There should never be a root state-change. \n' +
                    'Use state-refresh');
      }
    }
    jsonpatch.apply(model, patchMsg);
    finishStateChange();
  });

  console.log('UI <------> APP wired.');
  appChannel.emit('ui-ready');  // Tell uproxy.js to send us a state-refresh.
}


function checkRunningProxy() {
  if (model && model['instances']) {
    for (var k in model['instances']) {
      if (model['instances'].hasOwnProperty(k) && model['instances'][k].status &&
          model['instances'][k].status.proxy) {
        if ('running' == model['instances'][k].status.proxy) {
          proxyConfig.startUsingProxy();
          return;
        }
      }
    }
  }
  proxyConfig.stopUsingProxy();
}


// Need to constantly poll for the connection,
// because it is possible that the App doesn't even exist.
function checkThatAppIsInstalled() {
  appChannel.connect();
  setTimeout(checkThatAppIsInstalled, SYNC_TIMEOUT * 5);
}

checkThatAppIsInstalled();
