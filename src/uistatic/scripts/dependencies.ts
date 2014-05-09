// Fake dependency which mocks all interactions such that the UI can work.
/// <reference path='../../uproxy.ts' />
/// <reference path='../../interfaces/ui.d.ts'/>
/// <reference path='../../interfaces/notify.d.ts'/>
/// <reference path='../../interfaces/lib/angular.d.ts' />
/// <reference path='../../generic_ui/scripts/ui.ts' />

console.log('This is not a real uProxy frontend.');

// declare var state:UI.Model;
declare var angular:ng.IAngularStatic;

var model :UI.Model = {
  networks: {},
  // 'global' roster, which is just the concatenation of all network rosters.
  roster: {}
};

// Initialize model object to a mock. (state.js)
// var model = state;  // || { identityStatus: {} };

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

function generateFakeUserMessage() : UI.UserMessage {
  return {
    network: 'google',
    user: {
      userId: 'alice',
      name: 'Alice uProxy',
      timestamp: Date.now()
    },
    clients: [
      UProxyClient.Status.ONLINE
    ],
    instances: [
      {
        instanceId: 'alice-instance-01',
        description: 'fake instance for alice',
        consent: {
          asClient: Consent.ClientState.NONE,
          asProxy:  Consent.ProxyState.NONE
        },
        access: {
          asClient: false,
          asProxy: false
        }
      }
    ]
  }
}

class MockCore implements uProxy.CoreAPI {

  public status :StatusObject;
  private proxy :UI.Instance = null;

  constructor() {
    this.status = { connected: true };
  }
  reset() {
    console.log('Resetting.');
  }
  sendInstance(clientId) {
    console.log('Sending instance ID to ' + clientId);
  }
  modifyConsent(command) {
    // Fake the core interaction, assume it sent bits on the wire, and receive
    // the update from core.
    var userUpdate = generateFakeUserMessage();
    var user = model.roster[command.userId];
    var instance = user.instances[0];
    switch (command.action) {
      case Consent.UserAction.REQUEST:
      case Consent.UserAction.CANCEL_REQUEST:
      case Consent.UserAction.ACCEPT_OFFER:
      case Consent.UserAction.IGNORE_OFFER:
        instance.consent.asProxy = Consent.userActionOnProxyState(
            command.action, instance.consent.asProxy);
        break;
      case Consent.UserAction.OFFER:
      case Consent.UserAction.CANCEL_OFFER:
      case Consent.UserAction.ALLOW_REQUEST:
      case Consent.UserAction.IGNORE_REQUEST:
        instance.consent.asClient = Consent.userActionOnClientState(
            command.action, instance.consent.asClient);
        break;
      default:
        console.warn('Invalid Consent.UserAction! ' + command.action);
        return;
    }
    userUpdate.instances[0].consent = instance.consent;
    ui.syncUser(userUpdate);
    console.log('Modified consent: ', command,
                'new state: ', instance.consent);
    // Randomly generate a positive response from alice.
    // TODO: Make two UIs side-by-side for an actual 'peer-to-peer' mock.
    if (Math.random() > 0.5) {
      console.log('Alice will respond...');
      setTimeout(() => {
        userUpdate.instances[0].consent.asProxy = Consent.ProxyState.GRANTED;
        userUpdate.instances[0].consent.asClient = Consent.ClientState.GRANTED;
        ui.syncUser(userUpdate);
      }, 500);
    }
  }

  // Fake starting and stopping proxying sessions.
  start = (path) => {
    console.log('Starting to proxy through ', path);
    // TODO: Do a better way of accessing instances.
    this.proxy = model.networks[path.network]
        .roster[path.userId]
        .instances[0];
    console.log(this.proxy);
    this.proxy.access.asProxy = true;
  }

  stop = () => {
    if (!this.proxy) {
      console.warn('No proxy to stop for.');
      return;
    }
    console.log('Stopping proxy through ', this.proxy);
    this.proxy.access.asProxy = false;
    this.proxy = null;
  }

  updateDescription(description) {
    console.log('Updating description to ' + description);
  }
  changeOption(option) {
    console.log('Changing option ' + option);
  }
  login(network) {
    console.log('Logging in to', network);
    ui['syncNetwork_']({
      name: 'google',
      online: true
    });
    // Pretend we receive a bunch of user messages.
    ui.syncUser(generateFakeUserMessage());
  }
  logout(network) {
    console.log('Logging out of', network);
    ui['syncNetwork_']({
      name: 'google',
      online: false
    });
  }
  dismissNotification(userId) {
    console.log('Notification seen for ' + userId);
  }
  onUpdate(update, handler) {
    // In the 'real uProxy', this is where the UI installs update handlers for
    // events received from the Core. Since this is a standalone UI, there is
    // only a mock core, and all interaction is fake beyond this point.
  }
}

var mockCore = new MockCore();
var ui :uProxy.UIAPI = new UI.UserInterface(
    mockCore,
    new MockNotifications());

var dependencyInjector = angular.module('dependencyInjector', [])
  .filter('i18n', function () {
    return function (key) { return key; };
  })
  .constant('onStateChange', null)
  .constant('ui', ui)
  .constant('model', model)
  .constant('core', mockCore)

// Fake a bunch of interactions from core.
// Starts off being 'offline' to a network.
ui['syncNetwork_'](<UI.NetworkMessage>{
  name: 'google',
  online: false
});

ui['DEBUG'] = true;
