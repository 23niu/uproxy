/// <reference path='../../interfaces/ui-polymer.d.ts' />
/// <reference path='../scripts/ui.ts' />

declare var ui :UI.UserInterface;

Polymer({
  model: {},
  settingsView: function() {
    ui['view'] = UI.View.SETTINGS;
  },
  rosterView: function() {
    console.log('rosterView called');
    ui['view'] = UI.View.ROSTER;
  },
  setGetMode: function() {
    ui.mode = UI.Mode.GET;
  },
  setShareMode: function() {
    ui.mode = UI.Mode.SHARE;
  },
  ready: function() {
    // Expose global ui object and UI module in this context.
    this.ui = ui;
    this.UI = UI;
  }
});
