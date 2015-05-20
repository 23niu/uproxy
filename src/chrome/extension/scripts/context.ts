/// <reference path='../../../../../third_party/typings/chrome/chrome.d.ts' />
/// <reference path='../../../generic_ui/polymer/context.d.ts' />

import ui_constants = require('../../../interfaces/ui');
import user_interface = require('../../../generic_ui/scripts/ui');
import CoreConnector = require('../../../generic_ui/scripts/core_connector');
import ChromeCoreConnector = require('./chrome_core_connector');

var ui_context :UiGlobals = (<any>chrome.extension.getBackgroundPage()).ui_context;
export var ui :user_interface.UserInterface= ui_context.ui;
export var core :CoreConnector = ui_context.core;
export var browserConnector = ui_context.browserConnector;
export var model :user_interface.Model = ui_context.model;
ui.browser = 'chrome';

console.log('Loaded dependencies for Chrome Extension.');
