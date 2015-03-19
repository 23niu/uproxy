/**
 * Script for the introductory splash screen.
 */
Polymer({
  SPLASH_STATES: {
    INTRO: 0,
    NETWORKS: 1
  },
  setState: function(state) {
    if (state < 0 || state > Object.keys(this.SPLASH_STATES).length) {
      console.error('Invalid call to setState: ' + state);
      return;
    }
    ui.splashState = state;
  },
  next: function() {
    this.setState(ui.splashState + 1);
  },
  prev: function() {
    this.setState(ui.splashState - 1);
  },
  copypaste: function() {
    initCopyPaste();
  },
  ready: function() {
    this.ui = ui;
    this.model = model;
  }
});
