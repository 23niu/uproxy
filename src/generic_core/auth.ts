/**
 * auth.ts
 *
 * This file contains functions related to uProxy authentication.
 * TODO: Hook the video-auth SAS-RTC component into here.
 */
/// <reference path='../interfaces/lib/webrtc/RTCPeerConnection.d.ts' />

module Auth {

  export var localKey :string = '';  // Key extracted from peerconnection.
  export var ttl      :number = 0;  // Expiry of the key.
  export var pc       :RTCPeerConnection = null;

  declare var mozRTCPeerConnection;
  var RTCPC = RTCPC || webkitRTCPeerConnection || mozRTCPeerConnection;

  // This regular expression captures the fingerprint from an sdp header.
  var SDP_FINGERPRINT_REGEX = /(?:a=fingerprint:sha-256\s)(.*)\s/m;

  /**
   * Create an un-used local WebRTC peer connection to obtain the local keyhash
   * from. Returns a promise fulfilled with the keyhash string.
   */
  export function getLocalFingerprint() : Promise<string> {
    if ('' != localKey) {
      return Promise.resolve(localKey);
    }
    var pc = new RTCPC(null);
    return new Promise((F,R) => {
      pc.createOffer((description:RTCSessionDescription) => {
        var fingerprint = extractFingerprint(description);
        F(description);
      })
    });
  }

  function extractFingerprint(desc:RTCSessionDescription) : string {
    var sdp = desc.sdp;
    var captured = sdp.match(SDP_FINGERPRINT_REGEX);
    if (!captured || !captured[1]) {
      console.warn('SDP header does not contain fingerprint.');
      return null;
    }
    return captured[1];
  }

}  // module Auth
