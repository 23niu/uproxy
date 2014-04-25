/**
 * remote-instance.ts
 *
 * This file defines the uProxy Instance class for remote installations. It
 * allows any pair of uProxy installations to speak to one another regarding
 * consent, proxying status, and any other signalling information.
 */
/// <reference path='../interfaces/instance.d.ts' />
/// <reference path='consent.ts' />
/// <reference path='social.ts' />

interface ConsentState {
  asClient :Consent.ClientState;
  asProxy :Consent.ProxyState;
}


module Core {

  /**
   * RemoteInstance - represents a remote uProxy installation.
   *
   * There are two pathways to modifying the consent of this remote instance.
   * - Locally, via a user command from the UI.
   * - Remotely, via consent bits sent over the wire by a friend.
   *
   */
  export class RemoteInstance implements Instance {

    public instanceId    :string;
    public keyHash       :string
    //socialConnection : SocialConnection;
    public trust         :InstanceTrust;
    public description   :string;

    public consent       :ConsentState;
    private transport    :Transport;
    // private proxyConsent  :Consent.ProxyState;
    // private clientConsent :Consent.ClientState;
    private clientId     :string;  // Do we need this here?

    /**
     * Construct a Remote Instance as the result of receiving an instance
     * handshake. Typically, instances are initialized with the lowest consent
     * values.
     */
    constructor(
        public network :Social.Network,
        handshake : Instance) {
      this.consent = {
        asClient: Consent.ClientState.NONE,
        asProxy: Consent.ProxyState.NONE
      };
      this.update(handshake);
    }

    /**
     * Send a message to this instance.
     */
    public send = (msg:uProxy.Message) => {
      // The overlay social network is responsible for mapping ourselves to the
      // clientId.
      this.network.send(this.instanceId, msg);
    }

    /**
     * Update the information about this remote instance as a result of its
     * Instance Message.
     * Assumes that |data| actually belongs to this instance.
     */
    public update = (data :Instance) => {
      // TODO: copy the rest of the data.
      this.instanceId = data.instanceId;
    }

    /**
     * Send consent bits to re-synchronize consent with remote |instance|.
     * This is expected *after* receiving an instance notification for an
     * already existing instance.
     */
    public sendConsent = () => {
      var consentPayload :uProxy.Message = {
        type: uProxy.MessageType.CONSENT,
        data: {
          instanceId: null, //TODO /.me.instanceId,  // local uProxy instance id.
          consent: this.trust
        }
      };
      this.send(consentPayload);
    }

    // action -> target trust level.
    // TODO: Remove once the new consent stuff is in.
    private TrustOp = {
      // If Alice |action|'s Bob, then Bob acts as the client.
      'allow': C.Trust.YES,
      'offer': C.Trust.OFFERED,
      'deny': C.Trust.NO,
      // Bob acts as the proxy.
      'request-access': C.Trust.REQUESTED,
      'cancel-request': C.Trust.NO,
      'accept-offer': C.Trust.YES,
      'decline-offer': C.Trust.NO
    };

    /**
     * Update trust state for this instance. Emits change to UI.
     * |action| - Trust action to execute.
     * |received| - boolean of source of this action.
     */
    private _updateTrust(action, received) {
      received = received || false;
      var asProxy = ['allow', 'deny', 'offer'].indexOf(action) < 0 ?
          !received : received;
      var trustValue = this.TrustOp[action];
      // var instance = store.state.instances[instanceId];
      // if (!instance) {
        // console.error('Cannot find instance ' + instanceId + ' for a trust change!');
        // return false;
      // }
      if (asProxy) {
        this.trust.asProxy = trustValue;
      } else {
        this.trust.asClient = trustValue;
      }
      store.saveInstance(this.instanceId);
      ui.syncInstance(this, 'trust');
      console.log('Instance trust changed. ' + JSON.stringify(this.trust));
      return true;
    }

    /**
     * Modify the consent for this instance, locally. (User clicked on one of
     * the consent buttons in the UI.) Sends bits to the remote afterwards.
     *
     * Gives a warning for UserActions which are invalid for the current state.
     */
    public modifyConsent = (action :Consent.UserAction) => {
      switch(action) {
        // Actions affecting our consent towards the remote as our proxy.
        case Consent.UserAction.REQUEST:
        case Consent.UserAction.CANCEL_REQUEST:
        case Consent.UserAction.ACCEPT_OFFER:
        case Consent.UserAction.IGNORE_OFFER:
          this.consent.asProxy = Consent.userActionOnProxyState(
              action, this.consent.asProxy);
          break;
        // Actions affecting our consent towards the remote as our client.
        case Consent.UserAction.OFFER:
        case Consent.UserAction.CANCEL_OFFER:
        case Consent.UserAction.ALLOW_REQUEST:
        case Consent.UserAction.IGNORE_REQUEST:
          this.consent.asClient = Consent.userActionOnClientState(
              action, this.consent.asClient);
          break;
      }
      // Send new consent bits to the remote client.
      this.sendConsent();
    }

    // getJSON() {
      // return {
        // remoteProxyState: this.remoteProxyState,
        // remoteClientState: this.remoteClientState,
        // instanceId: this.instanceId,
        // transport: this.transport.getJson(),
        //socialConnection: this.socialConnection_.getJson()
      // }
    // }
  }  // class Core.RemoteInstance

  export enum ObfuscationType {NONE, RANDOM1 }

  // Json format for a remote instance.
  export interface InstanceJson {
    // instanceId, unique.
    instanceId : string;
    //
    remoteProxyState : Consent.ProxyState;
    remoteClientState : Consent.ClientState;

    // Json for the social connection.
    //socialConnection : SocialConnection.Json;
    // Json for the transport provided by the instance.
    transport : Transport.Json;
  }

}  // module Core
