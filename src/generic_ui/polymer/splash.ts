/// <reference path='./context.d.ts' />

/**
 * Script for the introductory splash screen.
 */
Polymer({
  SPLASH_STATES: {
    INTRO: 0,
    NETWORKS: 1
  },
  setState: function(state :Number) {
    if (state < 0 || state > Object.keys(this.SPLASH_STATES).length) {
      console.error('Invalid call to setState: ' + state);
      return;
    }
    ui_context.ui.splashState = state;
  },
  next: function() {
    this.setState(ui_context.ui.splashState + 1);
  },
  prev: function() {
    this.setState(ui_context.ui.splashState - 1);
  },
  copypaste: function() {
    this.fire('core-signal', { name: 'copypaste-init' });
  },
  openFeedbackForm: function() {
    this.fire('core-signal', {name: 'open-feedback'});
  },
  ready: function() {
    this.ui = ui_context.ui;
    this.model = ui_context.model;
  }
});
