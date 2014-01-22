// Fake dependency which mocks all interactions such that the UI can work.
/// <reference path='../common/ui/scripts/ui.d.ts'/>
/// <reference path='../common/core.d.ts'/>

console.log('This is not a real uProxy frontend.');

// declare var ui:any;
declare var state:any;
declare var angular:any;
declare var UI:CUI;

// Initialize model object to a mock. (state.js)
var model = state || { identityStatus: {} };

/// <reference path='../common/ui/scripts/notify.d.ts'/>
class MockNotifications implements INotifications {
  setIcon(iconFile) {
    console.log('setting icon to ' + iconFile);
  }
  setLabel(text) {
    console.log('setting label to: ' + text);
  }
  setColor(color) {
    console.log('setting background color of the badge to: ' + color);
  }
}

class MockCore implements Interfaces.ICore {
  constuctor() {}
  reset() {
    console.log('Resetting.');
  }
  sendInstance(clientId) {
    console.log('Sending instance ID to ' + clientId);
  }
  modifyConsent(instanceId, action) {
    console.log('Modifying consent.');
  }
  start(instanceId) {
    console.log('Starting to proxy through ' + instanceId);
  }
  stop(instanceId) {
    console.log('Stopping proxy through ' + instanceId);
  }
  updateDescription(description) {
    console.log('Updating description to ' + description);
  }
  changeOption(option) {
    console.log('Changing option ' + option);
  }
}

var ui:IUI = new UI(
    new MockNotifications(),
    new MockCore());

var dependencyInjector = angular.module('dependencyInjector', [])
  .filter('i18n', function () {
    return function (key) { return key; };
  })
  .constant('appChannel', {
    status: {
      connected: true
    },
    emit: function(name, args) {
      console.log('appChannel.emit("' + name + '",', args);
      ui.sync();  // Fake sync because there's no backend update.
    }
  })
  .constant('onStateChange', null)
  .constant('ui', ui)
  .constant('model', model)
  .constant('roster', null)
