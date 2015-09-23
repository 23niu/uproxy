/// <reference path='../../../../third_party/polymer/polymer.d.ts' />
/// <reference path='./context.d.ts' />

import ui_constants = require('../../interfaces/ui');

var ui = ui_context.ui;
var core = ui_context.core;
var model = ui_context.model;

Polymer({
  connect: function() {
    ui.login(this.networkName).then(() => {
      console.log('connected to ' + this.networkName);
      // syncNetwork will update the view to the ROSTER.
      ui.bringUproxyToFront();
    }).catch((e :Error) => {
      console.warn('Did not log in ', e);
    });
  },
  ready: function() {
    this.displayName = ui.getNetworkDisplayName(this.networkName);
  },
});
