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

// TODO: Create a copy rule which automatically moves all third_party
// typescript declarations to a nicer path.

/// <reference path='../../../third_party/freedom-typings/freedom-module-env.d.ts' />
/// <reference path='../../../third_party/freedom-typings/social.d.ts' />

import globals = require('./globals');

import diagnose = require('./diagnose-nat');
import logging = require('../../../third_party/uproxy-lib/logging/logging');
import net = require('../../../third_party/uproxy-networking/net/net.types');
import uproxy_core_api = require('../interfaces/uproxy_core_api');
import social = require('../interfaces/social');
import social_network = require('./social');
import remote_instance = require('./remote-instance');
import remote_connection = require('./remote-connection');
import user_interface = require('../interfaces/ui');
import version = require('../version/version');
import browser_connector = require('../interfaces/browser_connector');
import ui = require('./ui_connector');
import uproxy_core = require('./uproxy_core');

import ui_connector = ui.connector;

// Prepare all the social providers from the manifest.
social_network.initializeNetworks();

// --------------------------------------------------------------------------
// Register Core responses to UI commands.
// --------------------------------------------------------------------------
var core = new uproxy_core.uProxyCore();

ui_connector.onCommand(
    uproxy_core_api.Command.GET_INITIAL_STATE,
    ui_connector.sendInitialState);

// When the login message is sent from the extension, assume it's explicit.
ui_connector.onPromiseCommand(
    uproxy_core_api.Command.LOGIN,
    core.login);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.LOGOUT,
    core.logout);

// TODO: UI-initiated Instance Handshakes need to be made specific to a network.
// core.onCommand(uproxy_core_api.Command.SEND_INSTANCE_HANDSHAKE_MESSAGE,
//                core.sendInstanceHandshakeMessage);
ui_connector.onCommand(uproxy_core_api.Command.MODIFY_CONSENT,
    core.modifyConsent);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.START_PROXYING_COPYPASTE_GET,
    core.startCopyPasteGet);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.STOP_PROXYING_COPYPASTE_GET,
    core.stopCopyPasteGet);

ui_connector.onCommand(
    uproxy_core_api.Command.START_PROXYING_COPYPASTE_SHARE,
    core.startCopyPasteShare);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.STOP_PROXYING_COPYPASTE_SHARE,
    core.stopCopyPasteShare);

ui_connector.onCommand(
    uproxy_core_api.Command.COPYPASTE_SIGNALLING_MESSAGE,
    core.sendCopyPasteSignal);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.START_PROXYING,
    core.start);

ui_connector.onCommand(uproxy_core_api.Command.STOP_PROXYING,
    core.stop);

// TODO: Implement this or remove it.
// core.onCommand(uproxy_core_api.Command.CHANGE_OPTION, (data) => {
//   log.warn('CHANGE_OPTION yet to be implemented');
//   // TODO: Handle changes that might affect proxying.
// });

// TODO: make the invite mechanism an actual process.
// core.onCommand(uproxy_core_api.Command.INVITE, (userId:string) => {
// });

ui_connector.onCommand(
    uproxy_core_api.Command.HANDLE_MANUAL_NETWORK_INBOUND_MESSAGE,
    core.handleManualNetworkInboundMessage);

ui_connector.onCommand(
    uproxy_core_api.Command.UPDATE_GLOBAL_SETTINGS,
    core.updateGlobalSettings);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.GET_LOGS,
    core.getLogsAndNetworkInfo);

ui_connector.onPromiseCommand(
    uproxy_core_api.Command.GET_NAT_TYPE,
    core.getNatType);
