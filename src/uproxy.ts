/**
 * uproxy.ts
 *
 * This file defines the base uProxy module. It contains Enums and interfaces
 * which are relevant to all parts of uProxy, notably for communication between
 * the Core and the UI.
 */

// TODO: Move the notifications somewhere better.
/// <reference path='generic_core/consent.ts' />
/// <reference path='interfaces/ui.d.ts' />

module uProxy {

  // --- Communications ---

  /**
   * Commands are sent from the UI to the Core due to a user interaction.
   * This fully describes the set of commands which Core must respond to.
   */
  export enum Command {
    READY = 1000,
    REFRESH,
    RESET,
    LOGIN,
    LOGOUT,
    SEND_INSTANCE,
    INVITE,
    CHANGE_OPTION,
    UPDATE_DESCRIPTION,
    // Skip now deprecated DISMISS_NOTIFICATION
    START_PROXYING = 1010,
    STOP_PROXYING,
    MODIFY_CONSENT,       // TODO: make this work with the consent piece.
  }

  /**
   * Updates are sent from the Core to the UI, to update state which the UI must
   * expose to the user.
   */
  export enum Update {
    ALL = 2000,
    NETWORK,      // One particular network.
    USER_SELF,    // Local / myself on the network.
    USER_FRIEND,  // Remote friend on the roster.
    CLIENT,       // Single client for a User.
    INSTANCE,
    DESCRIPTION,
    ID_MAPS,  // ClientId <---> InstanceId mappings.
    COMMAND_FULFILLED,
    COMMAND_REJECTED,
    ERROR,
    STOP_PROXYING,
    NOTIFICATION,
    LOCAL_FINGERPRINT  // From the WebRTC peer connection.
  }

  /**
   * Messages are sent from Core to a remote Core - they are peer communications
   * between uProxy users. This enum describes the possible Message types.
   */
  // TODO: move into generic_core.
  // TODO: rename to PeerMessageType & PeerMessage.
  // TODO: consider every message having every field, and that MessageType is
  // no longer needed. This would use fewer larger messages.
  export enum MessageType {
    INSTANCE = 3000,  // Instance messages notify the user about instances.
    CONSENT,
    DESCRIPTION,
    // These are for the signalling-channel. The payloads are arbitrary, and
    // could be specified from uProxy, or could also be SDP headers forwarded
    // from socks-rtc's RTCPeerConnection.
    SIGNAL_FROM_CLIENT_PEER,
    SIGNAL_FROM_SERVER_PEER,
    // Request that an instance message be sent back from a peer.
    INSTANCE_REQUEST
  }

  // Messages to the peer form the boundary for JSON parse / stringify.
  export interface Message {
    type :MessageType;
    // TODO: Add a comment to explain the types that data can take and their
    // relationship to MessageType.
    data :Object;
  }

  /**
   * ConsentCommands are sent from the UI to the Core, to modify the consent of
   * a :RemoteInstance in the local client. (This is not sent on the wire to
   * the peer). This should only be passed along with a `Command.MODIFY_CONSENT`
   * command.
   */
  export interface ConsentCommand {
    path       :InstancePath;
    action     :Consent.UserAction;
  }

  // --- Core <--> UI Interfaces ---

  /**
   * The primary interface to the uProxy Core.
   *
   * This will be enforced for both the actual core implementation, as well as
   * abstraction layers such as the Chrome Extension, so that all components
   * which speak to the core benefit from this consistency.
   */
  // TODO: Rename CoreApi.
  export interface CoreAPI {

    // Clears all state and storage.
    reset() : void;

    // Send your own instanceId to target clientId.
    sendInstance(clientId :string) : void;

    modifyConsent(command :ConsentCommand) : void;

    // Using peer as a proxy.
    start(instancePath :InstancePath) : Promise<void>;
    stop () : void;

    updateDescription(description :string) : void;
    // TODO: rename toggle-option and/or replace with real configuration system.
    changeOption(option :string) : void;

    login(network :string) : Promise<void>;
    logout(network :string) : void;

    // TODO: use Event instead of attaching manual handler. This allows event
    // removal, etc.
    onUpdate(update :Update, handler :Function) : void;
  }

  /**
   * The primary interface for the uProxy User Interface.
   * Currently, the UI update message types are specified in ui.d.ts.
   */
  // TODO: rename UiApi.
  export interface UIAPI {

    // Global sync of all state.

    sync(state?:string) : void;
    update(type:Update, data?:any) : void;

    syncUser(UserMessage:UI.UserMessage) : void;
    // TODO: Enforce these types of granular updates. (Doesn't have to be exactly
    // the below)...
    // updateAll(data:Object) : void;
    // updateNetwork(network:Social.Network) : void;
    // updateSelf(user:Core.User) : void;
    // Update an instance.
    // syncInstance(instance : any) : void;
    // updateMappings() : void;
    // updateIdentity(identity) : void;
    // addNotification() : void;

    showNotification(notificationText :string) : void;
    isProxying() : boolean;
    stopProxyingInUiAndConfig() : void;

    // TODO: explain why this is needed. Seems like a hack to refresh the dom.
    refreshDOM() : void;

  }

  interface ICoreOptions {
    allowNonroutableAddresses(enabled:boolean):void;
    setStunServers(servers:string[]):void;
    setTurnServers(servers:string[]):void;
  }

  // PromiseCommand is used when the UI makes requests to the Core which
  // require a promise to be returned. Because many requests can be made, the
  // UI needs to distinguish between them. The `promiseId` allows keeping track
  // of which command was issued. e.g. consider the user clicking to login to
  // multiple networks; we want the UI to know when each login completes.
  //
  // TODO: when freedom supports multiple runtime enviroments, this code should
  // be able to be removed.
  export interface PromiseCommand {
    data ?:Object;  // Usually JSON.
    promiseId :number;  // Values <= 1 means success/error should be returned.
  }

}  // module uProxy

// We use this to map Freedom's untyped social network structures into a real
// type-script enum & interface.
module UProxyClient {
  // Status of a client; used for both this client (in which case it will be
  // either ONLINE or OFFLINE)
  export enum Status {
    OFFLINE,
    // This client runs the same freedom.js app as you and is online
    ONLINE,
    // This client is online, but not with the same application/agent type
    // (i.e. can be useful to invite others to your freedom.js app)
    ONLINE_WITH_OTHER_APP,
  }

  // Status of a client connected to a social network.
  export interface State {
    userId    :string;
    clientId  :string;
    status    :Status;
    timestamp :number;
  }
}


// Status object for connected. This is an object so it can be bound in
// angular. connected = true iff connected to the app which is running
// freedom.
// TODO: this is chrome-specific. Move to the right place.
interface StatusObject {
  connected :boolean;
}
