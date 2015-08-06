/// <reference path='./context.d.ts' />
/// <reference path='../../../../third_party/polymer/polymer.d.ts' />

/**
 * Script for the introductory splash screen.
 */

declare var require :(path :string) => Object;

import ui_constants = require('../../interfaces/ui');

interface Language {
  description :string;
  language :string;
  languageCode :string;
}
var languages :Language[] = <Language[]>require('../locales/all/languages.json');

var ui = ui_context.ui;
var core = ui_context.core;
var model = ui_context.model;

Polymer({
  SPLASH_STATES: {
    INTRO: 0,
    NETWORKS: 1,
    EMAIL_LOGIN: 2
  },
  setState: function(state :Number) {
    if (state < 0 || state > Object.keys(this.SPLASH_STATES).length) {
      console.error('Invalid call to setState: ' + state);
      return;
    }
    model.globalSettings.splashState = state;
    core.updateGlobalSettings(model.globalSettings);
  },
  next: function() {
    this.setState(model.globalSettings.splashState + 1);
  },
  prev: function() {
    this.setState(model.globalSettings.splashState - 1);
  },
  copypaste: function() {
    this.fire('core-signal', { name: 'copypaste-init' });
  },
  openFeedbackForm: function() {
    this.fire('core-signal', {name: 'open-feedback'});
  },
  updateLanguage: function(event :Event, detail :any, sender :HTMLElement) {
    if (detail.isSelected) {
      var newLanguage = detail.item.getAttribute('languageCode');
      ui.updateLanguage(newLanguage);
      window.location.reload();
    }
  },
  showEmailLogin: function() {
    model.globalSettings.splashState = this.SPLASH_STATES.EMAIL_LOGIN;
  },
  // TODO: save this to storage, maybe per network
  createNewUser: true,
  toggleCreateNewUser: function() {
    this.createNewUser = !this.createNewUser;
  },
  loginToEmail: function() {
    console.log('loginToEmail called, ' + this.userId + ', ' + this.password);
    // TODO: userId isn't really the right name for this.
    ui.login('Email', this.userId, this.password, this.createNewUser).then(() => {
      // Fire an update-view event, which root.ts listens for.
      this.fire('update-view', { view: ui_constants.View.ROSTER });
      ui.bringUproxyToFront();
      this.toggleCreateNewUser();
    }).catch((e :Error) => {
      // TODO: why does this result in an error popup?
      console.warn('Did not log in ', e);
    });
  },
  userId: '',
  password: '',
  ready: function() {
    this.model = model;
    this.languages = languages;
  }
});
