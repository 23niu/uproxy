/// <reference path='./context.d.ts' />
/// <reference path='../../../../third_party/polymer/polymer.d.ts' />
/// <reference path='../../../../third_party/typings/lodash/lodash.d.ts' />

import ui_constants = require('../../interfaces/ui');
import uproxy_core_api = require('../../interfaces/uproxy_core_api');
import user = require('../scripts/user');
import _ = require('lodash');

Polymer({
  contact: {
    // Must adhere to the typescript interface UI.User.
    name: 'unknown'
  },
  toggle: function() {
    if (!this.isExpanded) {
      // Hide the status before we start opening the core-collapse.
      this.hideOnlineStatus = true;
    } else {
      // Let core-collapse close before reshowing the online status.
      setTimeout(() => { this.hideOnlineStatus = false; }, 400);
    }

    if (this.model.globalSettings.mode == ui_constants.Mode.SHARE) {
      this.contact.shareExpanded = !this.contact.shareExpanded;
    } else if (this.model.globalSettings.mode == ui_constants.Mode.GET) {
      this.contact.getExpanded = !this.contact.getExpanded;
    }
  },
  ready: function() {
    this.ui = ui_context.ui;
    this.ui_constants = ui_constants;
    this.model = ui_context.model;
    this.GettingConsentState = user.GettingConsentState;
    this.SharingConsentState = user.SharingConsentState;
    this.hideOnlineStatus = this.isExpanded;
  },
  openLink: function(event :Event) {
    this.ui.browserApi.openTab(this.contact.url);
    event.stopPropagation();  // Don't toggle when link is clicked.
  },
  // |action| is the string end for a uproxy_core_api.ConsentUserAction
  modifyConsent: function(action :uproxy_core_api.ConsentUserAction) {
    var command = <uproxy_core_api.ConsentCommand>{
      path: {
        network : {
         name: this.contact.network.name,
         userId: this.contact.network.userId
        },
        userId: this.contact.userId
      },
      action: action
    };
    console.log('[polymer] consent command', command)
    ui_context.core.modifyConsent(command);
  },

  // Proxy UserActions.
  request: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.REQUEST) },
  cancelRequest: function() {
    this.modifyConsent(uproxy_core_api.ConsentUserAction.CANCEL_REQUEST)
  },
  ignoreOffer: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.IGNORE_OFFER) },
  unignoreOffer: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.UNIGNORE_OFFER) },

  // Client UserActions
  offer: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.OFFER) },
  cancelOffer: function() {
    this.ui.stopGivingInUi();
    this.modifyConsent(uproxy_core_api.ConsentUserAction.CANCEL_OFFER);
  },
  ignoreRequest: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.IGNORE_REQUEST) },
  unignoreRequest: function() { this.modifyConsent(uproxy_core_api.ConsentUserAction.UNIGNORE_REQUEST) },
  hasInstance: function(instanceId :string) {
    return instanceId && _.contains(this.contact.allInstanceIds, instanceId);
  },
  fireChanged: function() {
    // this is needed as a slight hack since the observer on the contacts array
    // a level up does not pick up on changes in contact properties
    this.fire('contact-changed');
  },
  observe: {
    'contact.isSharingWithMe': 'fireChanged',
    'contact.isGettingFromMe': 'fireChanged',
    'contact.isOnline': 'fireChanged',
  },
  computed: {
    'isExpanded': '(model.globalSettings.mode === ui_constants.Mode.GET && contact.getExpanded) || (model.globalSettings.mode === ui_constants.Mode.SHARE && contact.shareExpanded)'
  }
});
