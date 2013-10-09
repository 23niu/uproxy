// Assumes that freedom_connector.js has been loaded.
'use strict';
/* jshint -W098 */

console.log('Initializing chrome extension background page...');

// Chrome App Id for UProxy Packaged Chrome App.
var FREEDOM_CHROME_APP_ID = 'hilnpmepiebcjhibkbkfkjkacnnclkmi';

// TODO(): remove this if there's no use for it.
chrome.runtime.onInstalled.addListener(function (details) {
  console.log('onInstalled: previousVersion', details.previousVersion);
});

var freedom = new FreedomConnector(FREEDOM_CHROME_APP_ID,
                                   {name: 'uproxy-extension-to-app-port'});

var onFreedomStateChange = new chrome.Event();

var model = {};  // Singleton angularjs model for either popup or options.

freedom.onConnected.addListener(function () {
  freedom.on('state-change', function (patchMsg) {
    // console.log('Patch: ' + JSON.stringify(patchMsg));
    console.log(patchMsg);
    // if (patchMsg[0].path.indexOf('roster') > 0) console.log(patchMsg);
    onFreedomStateChange.dispatch(patchMsg);
  });
});
