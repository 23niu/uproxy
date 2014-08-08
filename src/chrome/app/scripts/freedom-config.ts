/**
 * Configure Freedom
 **/
/// <reference path='../../../../node_modules/freedom-typescript-api/interfaces/freedom.d.ts' />

// Defined in src/chrome-providers/*.ts
declare module TcpSocket { class Chrome {} }
declare module UdpSocket { class Chrome {} }
var View_oauth :(app: any, dispatchEvent: any) => void;

// Configure variable used by Freedom to register custom providers
window.freedomcfg = function(register) {
  // Setup Freedom to use our providers (in src/chrome-providers)
  // TODO: uncomment once these aren't broken.
  register('core.view', View_oauth);
  // register('core.socket', TcpSocket.Chrome);
  // register('core.udpsocket', UdpSocket.Chrome);
}
