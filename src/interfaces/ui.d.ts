/**
 * ui.d.ts
 *
 * Interfaces specific to the UI.
 * (There are equivalents for these data structures on the Core side, but those
 * contain attributes / functionality not relevant to the UI.)
 */
/// <reference path='user.d.ts' />
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
   * UI-specific Instance.
   * TODO: Maybe turn this into an actual class. We'll see.
   */
  export interface Instance {
    instanceId    :string;
    description   :string;
    consent       :ConsentState;
    // TODO: rosterInfo is used in app.ts, remove if unnecessary.
    rosterInfo    ?:RosterInfo;
  }


}  // module UI
