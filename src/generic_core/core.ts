/**
 * core.ts
 *
 * This is the primary uproxy code. It maintains in-memory state,
 * checkpoints information to local storage, and synchronizes state with the
 * front-end.
 *
 * In-memory state includes:
 *  - Roster, which is a list of contacts, always synced with XMPP friend lists.
 *  - Instances, which is a list of active uProxy installs.
 */
/// <reference path='../uproxy.ts'/>
/// <reference path='storage.ts' />
/// <reference path='social.ts' />
/// <reference path='util.ts' />
/// <reference path='../interfaces/instance.d.ts' />
/// <reference path='../interfaces/ui.d.ts' />
// TODO: Create a copy rule which automatically moves all third_party
// typescript declarations to a nicer path.
/// <reference path='../freedom/typings/freedom.d.ts' />
/// <reference path='../freedom/typings/social.d.ts' />
/// <reference path='../networking-typings/communications.d.ts' />


var storage = new Core.Storage();

// This is the channel to speak to the UI component of uProxy.
// The UI is running from the privileged part of freedom, so we can just set
// this to be freedom, and communicate using 'emit's and 'on's.
var bgAppPageChannel = freedom;

// Keep track of the current remote instance who is acting as a proxy server
// for us.
var remoteProxyServerInstance : Core.RemoteInstance = null;

// Entry-point into the UI.
class UIConnector implements uProxy.UIAPI {

  /**
   * Send an Update message to the UI.
   * TODO: Turn this private and make outside accesses directly based on UIAPI.
   */
  public update = (type:uProxy.Update, data?:any) => {
    var printableType :string = uProxy.Update[type];
    console.log('update [' + printableType + ']', data);
    bgAppPageChannel.emit('' + type, data);
  }

  public syncInstance = (instance, field?:any) => {
    // TODO: (the interface may change)
  }

  public syncMappings = () => {
    // TODO: (the interface may change)
  }

  public updateAll = () => {
    console.log('sending ALL state to UI.');
    for (var networkName in Social.networks) {
      Social.networks[networkName].notifyUI();
    }
    // Only send ALL update to UI when description is loaded.
    core.loadDescription.then(() => {
      this.update(uProxy.Update.ALL, {'description': core.description});
    });
  }

  public syncUser = (payload:UI.UserMessage) => {
    console.log('Core: UI.syncUser ' + JSON.stringify(payload));
    this.update(uProxy.Update.USER_FRIEND, payload);
  }

  public refreshDOM = () => {
    console.error('Cannot refresh DOM from the Core.');
  }

  public sendError = (errorText :string) => {
    this.update(uProxy.Update.ERROR, errorText);
  }

  public showNotification = (notificationText :string) => {
    this.update(uProxy.Update.NOTIFICATION, notificationText);
  }

  public stopProxyingInUiAndConfig = () => {
    this.update(uProxy.Update.STOP_PROXYING);
  }

  public isProxying = () : boolean => {
    return remoteProxyServerInstance != null;
  }

}
var ui = new UIConnector();

/**
 * Primary uProxy backend. Handles which social networks one is connected to,
 * sends updates to the UI, and handles commands from the UI.
 */
class uProxyCore implements uProxy.CoreAPI {
  public description :string = 'My computer';
  public loadDescription :Promise<void> = null;

  constructor() {
    console.log('Preparing uProxy Core.');
    // Send the local webrtc fingerprint to the UI.
    // TODO: enable once we can use peerconnection from within the webworker.
    Auth.getLocalFingerprint().then((fingerprint) => {
      console.log('Fetched local WebRTC fingerprint: ' + fingerprint);
      ui.update(uProxy.Update.LOCAL_FINGERPRINT, fingerprint);
    }).catch((e) => {
      console.error(e);
    });

    // TODO: description isn't loading properly after a restart in chrome,
    // although save then load immediately after works.
    this.loadDescription = storage.load<Core.StoredDescription>('description')
        .then((loadedDescriptionObj :Core.StoredDescription) => {
          console.log('Loaded description: "' + loadedDescriptionObj.description + '"');
          this.description = loadedDescriptionObj.description;
        }).catch((e) => {
          console.log('No description loaded', e);
        });
  }

  /**
   * Logs out of all networks and resets data.
   */
  reset = () => {
    console.log('reset');
    for (var network in Social.networks) {
      Social.networks[network].logout();
    }
    storage.reset().then(ui.updateAll);
  }

  sendInstance = (clientId :string) => {
    // TODO: Possibly implement this, or get rid of the possibility for
    // UI-initiated instance handshakes.
  }

  /**
   * Install a handler for commands received from the UI.
   */
  public onCommand = (cmd :uProxy.Command, handler:any) => {
    bgAppPageChannel.on('' + cmd,
      (args :uProxy.PromiseCommand) => {
        // Call handler with args.data and ignore other fields in args
        // like promiseId.
        handler(args.data);
      });
  }

  /**
   * Install a handler for promise commands received from the UI.
   * Promise commands return an ack or error to the UI.
   */
  public onPromiseCommand = (cmd :uProxy.Command,
                             handler :(data ?:any) => Promise<void>) => {
    var promiseCommandHandler = (args :uProxy.PromiseCommand) => {
      // Ensure promiseId is set for all requests
      if (!args.promiseId) {
        var err = 'onPromiseCommand called for cmd ' + cmd +
                  'with promiseId undefined';
        console.error(err)
        return Promise.reject(err);
      }

      // Call handler function, then return success or failure to UI.
      handler(args.data).then(
        () => {
          ui.update(uProxy.Update.COMMAND_FULFILLED, args.promiseId);
        },
        () => {
          ui.update(uProxy.Update.COMMAND_REJECTED, args.promiseId);
        }
      );
    };
    bgAppPageChannel.on('' + cmd, promiseCommandHandler);
  }

  changeOption = (option :string) => {
    // TODO: implement options.
  }

  dismissNotification = (instancePath :InstancePath) => {
    // TODO: implement options.
  }


  /**
   * Access various social networks using the Social API.
   */
  public login = (networkName:string) : Promise<void> => {
    var network = Social.getNetwork(networkName);
    if (null === network) {
      var warn = 'Could not login to ' + networkName;
      console.warn(warn)
      return Promise.reject(warn);
    }
    var loginPromise = network.login(true);
    loginPromise.then(ui.updateAll)
        .then(() => {
          console.log('Successfully logged in to ' + networkName);
        });

    // TODO: save the auto-login default.
    return loginPromise;
  }

  /**
   * Log-out of |networkName|.
   * TODO: write a test for this.
   */
  public logout = (networkName:string) : void => {
    var network = Social.getNetwork(networkName);
    if (null === network) {
      console.warn('Could not logout of ' + networkName);
      return;
    }
    network.logout().then(() => {
      console.log('Successfully logged out of ' + networkName);
    });
    // TODO: only remove clients from the network we are logging out of.
    ui.syncMappings();
    // TODO: disable auto-login
    // store.saveMeToStorage();
  }

  // onUpdate not needed in the real core.
  onUpdate = (update, handler) => {}

  /**
   * Update user's description of their current device. This applies to all
   * local instances for every network the user is currently logged onto. Those
   * local instances will then propogate their description update to all
   * instances.
   */
  public updateDescription = (newDescription:string) => {
    // TODO: Send the new description to peers.  Right now we assume that users
    // can't update the description after they are signed in.
    var newDescriptionObj :Core.StoredDescription = {
      description: newDescription
    };
    storage.save<Core.StoredDescription>('description', newDescriptionObj);
    core.description = newDescription;
  }

  /**
   * Modifies the local consent value as the result of a local user action.
   * This is a distinct pathway from receiving consent bits over the wire, which
   * is handled directly inside the relevant Social.Network.
   */
  public modifyConsent = (command:uProxy.ConsentCommand) => {
    // Determine which Network, User, and Instance...
    var instance = this.getInstance(command.path);
    if (!instance) {  // Error msg emitted above.
      console.error('Cannot modify consent for non-existing instance!');
      return;
    }
    // Set the instance's new consent levels. It will take care of sending new
    // consent bits over the wire and re-syncing with the UI.
    instance.modifyConsent(command.action);
  }

  /**
   * Begin using a peer as a proxy server.
   * Starts SDP negotiations with a remote peer. Assumes |path| to the
   * RemoteInstance exists.
   */
  public start = (path :InstancePath) : Promise<void> => {
    // Disable any previous proxying session.
    if (remoteProxyServerInstance) {
      console.log('Existing proxying session! Terminating...');
      // Stop proxy, don't notify UI since UI request a new proxy.
      remoteProxyServerInstance.stop();
      remoteProxyServerInstance = null;
    }
    var remote = this.getInstance(path);
    if (!remote) {
      var err = 'Instance ' + path.instanceId + ' does not exist for proxying.';
      console.error(err);
      return Promise.reject(err);
    }
    // remote.start will send an update to the UI.
    return remote.start().then(() => {
      // Remember this instance as our proxy.
      remoteProxyServerInstance = remote;
    });
  }

  /**
   * Stop proxying with the current instance, if it exists.
   */
  public stop = () => {
    if (!proxy) {
      console.error('Cannot stop proxying when there is no proxy');
    }
    remoteProxyServerInstance.stop();
    remoteProxyServerInstance = null;
    // TODO: Handle revoked permissions notifications.
  }

  public handleManualNetworkInboundMessage =
      (command :uProxy.HandleManualNetworkInboundMessageCommand) => {
    var manualNetwork :Social.ManualNetwork =
        <Social.ManualNetwork> Social.getNetwork(Social.MANUAL_NETWORK_ID);
    if (!manualNetwork) {
      console.error('Manual network does not exist; discarding inbound ' +
                    'message. Command=' + JSON.stringify(command));
      return;
    }

    manualNetwork.receive(command.senderClientId, command.message);
  }

  /**
   * Obtain the RemoteInstance corresponding to an instance path.
   */
  public getInstance = (path :InstancePath) : Core.RemoteInstance => {
    var network = Social.getNetwork(path.network);
    if (!network) {
      console.error('No network ' + path.network);
      return;
    }
    var user = network.getUser(path.userId);
    if (!user) {
      console.error('No user ' + path.userId);
      return;
    }
    return user.getInstance(path.instanceId);
  }

}  // class uProxyCore


// Prepare all the social providers from the manifest.
var networks = Social.initializeNetworks();
var core = new uProxyCore();

/*

Install signalling channel hooks. When we receive 'sendSignalToPeer' events
emitted from the socks-rtc, it is uProxy's job to pass those signals through to
XMPP / the target social provider, eventually reaching the appropriate remote
instance. To accomplish this, it must identify the peer using a fully qualified
InstancePath.

The data sent over the signalling channel will be the full signal, and not just
the data portion. This includes the |peerId| as part of the payload, which will
allow the remote to verify the provinance of the signal.

:PeerSignal is defined in SocksRTC.
Expect peerId to be a #-connected InstancePath.

*/

socksToRtcClient.on('sendSignalToPeer', (signalFromSocksRtc :PeerSignal) => {
  console.log('client(sendSignalToPeer):' + JSON.stringify(signalFromSocksRtc));

  var localPeerId :LocalPeerId = JSON.parse(signalFromSocksRtc.peerId);
  var instance = core.getInstance(localPeerId.serverInstancePath);
  if (!instance) {
    console.error('Cannot send client signal to non-existing RemoteInstance.');
    return;
  }

  // When passing the PeerSignal over the social network, the signal's peerId
  // should only contain instance ids, not potentially revealing user or
  // social network info.
  var localInstanceId = instance.user.getLocalInstanceId();
  var sharedSignal :PeerSignal = {
    peerId: localInstanceId,
    data: signalFromSocksRtc.data
  };
  console.log('client(sendSignalToPeer): sending sharedSignal ' +
              JSON.stringify(sharedSignal));
  instance.send({
    type: uProxy.MessageType.SIGNAL_FROM_CLIENT_PEER,
    data: sharedSignal
  });
});

socksToRtcClient.on('socksToRtcSuccess', (peerInfo :PeerInfo) => {
  var localPeerId :LocalPeerId = JSON.parse(peerInfo.peerId);
  var instance = core.getInstance(localPeerId.serverInstancePath);
  if (!instance) {
    console.error('socksToRtcSuccess: RemoteInstance not found.', peerInfo);
    return;
  }
  instance.handleStartSuccess();
});

socksToRtcClient.on('socksToRtcFailure', (peerInfo :PeerInfo) => {
  var localPeerId :LocalPeerId = JSON.parse(peerInfo.peerId);
  var instance = core.getInstance(localPeerId.serverInstancePath);
  if (!instance) {
    console.error('socksToRtcFailure: RemoteInstance not found.', peerInfo);
    return;
  }
  instance.handleStartFailure();
});

socksToRtcClient.on('socksToRtcTimeout', (peerInfo :PeerInfo) => {
  console.warn('socksToRtcTimeout occurred for peer ' + peerInfo.peerId);
  var localPeerId :LocalPeerId = JSON.parse(peerInfo.peerId);
  var instance = core.getInstance(localPeerId.serverInstancePath);
  if (!instance) {
    console.error('socksToRtcFailure: RemoteInstance not found.', peerInfo);
    return;
  }
  instance.stop();
  ui.stopProxyingInUiAndConfig();
  ui.sendError('Darn, something went wrong with your proxying connection.' +
    ' Please try to connect again.');
});

// Make this take an actual peer object type.
rtcToNetServer.on('sendSignalToPeer', (signalFromSocksRtc :PeerSignal) => {
  console.log('server(sendSignalToPeer):' + JSON.stringify(signalFromSocksRtc));

  var localPeerId :LocalPeerId = JSON.parse(signalFromSocksRtc.peerId);
  var instance = core.getInstance(localPeerId.clientInstancePath);
  if (!instance) {
    console.error('Cannot send server signal to non-existing peer.');
    return;
  }

  // When passing the PeerSignal over the social network, the signal's peerId
  // should only contain instance ids, not potentially revealing user or
  // social network info.
  var localInstanceId = instance.user.getLocalInstanceId();
  var sharedSignal :PeerSignal = {
    peerId: localInstanceId,
    data: signalFromSocksRtc.data
  };
  console.log('server(sendSignalToPeer): sending sharedSignal ' +
              JSON.stringify(sharedSignal));
  instance.send({
    type: uProxy.MessageType.SIGNAL_FROM_SERVER_PEER,
    data: sharedSignal
  });
});

function updateClientProxyConnection(localPeerIdString :string,
    isConnected :boolean) {
  var localPeerId :LocalPeerId = JSON.parse(localPeerIdString);
  var instance = core.getInstance(localPeerId.clientInstancePath);
  if (!instance) {
    console.error('updateClientProxyConnection: RemoteInstance not found.',
        localPeerIdString, isConnected);
    return;
  }
  instance.updateClientProxyConnection(isConnected);
  if (isConnected) {
    var user :Core.User = instance.user;
    var displayName :string = (user.name && user.name !== 'pending') ?
      user.name : user.userId;
    ui.showNotification(displayName + ' is now proxying through you.');
  }
};

rtcToNetServer.on('rtcToNetConnectionEstablished',
    (localPeerIdString :string) => {
  updateClientProxyConnection(localPeerIdString, true);
});

rtcToNetServer.on('rtcToNetConnectionClosed',
    (localPeerIdString :string) => {
  updateClientProxyConnection(localPeerIdString, false);
});

// TODO: move this into User, or some sort of proxy service object.
/*
function handleNewlyActiveClient(msg) {
  var instanceId = msg.data.instanceId;
  var instance = store.state.instances[instanceId];
  if (!instance) {
    console.error('Cannot be proxy for nonexistent instance.');
    return;
  }
  console.log('PROXYING FOR CLIENT INSTANCE: ' + instanceId);
  instance.status.client = C.ProxyState.RUNNING;
  ui.syncInstance(instance, 'status');
}

function handleInactiveClient(msg) {
  var instanceId = msg.data.instanceId;
  var instance = store.state.instances[instanceId];
  if (!instance) {
    console.error('Cannot be proxy for nonexistent instance.');
    return;
  }
  instance.status.client = C.ProxyState.OFF;
  ui.syncInstance(instance, 'status');
}
*/

function _validateKeyHash(keyHash:string) {
  console.log('Warning: keyHash Validation not yet implemented...');
  return true;
}

// --------------------------------------------------------------------------
// Register Core responses to UI commands.
// --------------------------------------------------------------------------
core.onCommand(uProxy.Command.READY, ui.updateAll);
core.onCommand(uProxy.Command.RESET, core.reset);
// When the login message is sent from the extension, assume it's explicit.
core.onPromiseCommand(uProxy.Command.LOGIN, core.login);
core.onCommand(uProxy.Command.LOGOUT, core.logout)

// TODO: UI-initiated Instance Handshakes need to be made specific to a network.
// core.onCommand(uProxy.Command.SEND_INSTANCE, core.sendInstance);
core.onCommand(uProxy.Command.MODIFY_CONSENT, core.modifyConsent);

core.onPromiseCommand(uProxy.Command.START_PROXYING, core.start);
core.onCommand(uProxy.Command.STOP_PROXYING, core.stop);

core.onCommand(uProxy.Command.CHANGE_OPTION, (data) => {
  console.warn('CHANGE_OPTION yet to be implemented!');
  // TODO: Handle changes that might affect proxying.
});

core.onCommand(uProxy.Command.UPDATE_DESCRIPTION, core.updateDescription);

// TODO: make the invite mechanism an actual process.
core.onCommand(uProxy.Command.INVITE, (userId:string) => {
});

core.onCommand(uProxy.Command.HANDLE_MANUAL_NETWORK_INBOUND_MESSAGE,
               core.handleManualNetworkInboundMessage);


// Now that this module has got itself setup, it sends a 'ready' message to the
// freedom background page.
bgAppPageChannel.emit('ready', null);
