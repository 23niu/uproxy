/**
 * ui.d.ts
 *
 * Interfaces specific to the UI.
 * (There are equivalents for these data structures on the Core side, but those
 * contain attributes / functionality not relevant to the UI.)
 */
/// <reference path='user.d.ts' />
/// <reference path='../generic_ui/scripts/ui.ts' />
/// <reference path='instance.d.ts' />
/// <reference path='lib/angular.d.ts' />
/// <reference path='../../node_modules/freedom-typescript-api/interfaces/social.d.ts' />

declare module UI {

  // Payloads for crossing the Core -> UI boundary.
  export interface NetworkMessage {
    name    :string;
    online  :boolean;
  }

  export interface UserMessage {
    network   :string;
    user      :freedom.Social.UserProfile;
    clients   :UProxyClient.Status[];
    instances :any[];
  }

  export interface ClientMessage {
    userId   :string;
    clientId :string;
    status   :UProxyClient.Status;
  }

  /**
   * Proxy-state message is sent from the Core to the UI to indicate changes in
   * the current proxying state when received over the network. (e.g. The other
   * side has disconnected)
   * TODO: Actually implemnt the passing of this to the UI.
   */
  export interface ProxyMessage {
    path    :InstancePath;
    access  :boolean;
  }

  /**
   * UI-specific Instance.
   * TODO: Maybe turn this into an actual class. We'll see.
   */
  export interface Instance {
    instanceId    :string;
    description   :string;
    consent       :ConsentState;
    access        :AccessState;
  }

  export interface CurrentProxy {
    instance :Instance;
    user :UI.User;
  }

}  // module UI
