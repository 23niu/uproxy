// Chrome-specific dependencies.
'use strict';


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


angular.module('dependencyInjector', [])
  .filter('i18n', function () {
    var getMessage = chrome.i18n.getMessage;
    return function (key) {
      return getMessage(key);
    };
  })
  .constant('appChannel', chrome.extension.getBackgroundPage().appChannel)
  .constant('onStateChange', chrome.extension.getBackgroundPage().onStateChange)
  // Singleton model lives in chrome extension's background page.
  .constant('ui', chrome.extension.getBackgroundPage().ui)
  .constant('model', chrome.extension.getBackgroundPage().model)
  .constant('roster', chrome.extension.getBackgroundPage().roster)
