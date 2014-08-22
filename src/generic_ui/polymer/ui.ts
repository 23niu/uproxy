/// <reference path='../../interfaces/ui-polymer.d.ts' />

declare var ui :uProxy.UIAPI;

var $ui;
Polymer({
  model: {},
  giveMode: () => {
    console.log('GIVE mode.');
    $ui.view = $ui.ROSTER;
    $ui.gestalt = $ui.GIVING;
  },
  getMode: () => {
    console.log('GET mode.');
    $ui.view = $ui.ROSTER;
    $ui.gestalt = $ui.GETTING;
  },
  ready: function() {

    // TODO: Use typescript and enums and everything here.
    this.SPLASH = 0;
    this.ROSTER = 1;
    this.SETTINGS = 2;
    this.NETWORKS = 3;

    this.GIVING = 101;
    this.GETTING = 102;

    console.log('UI view is doing a thing!', this.view);
    $ui = this;
    var roster = this.$.roster;
    var settings = this.$.settings;
    console.log(roster);
    console.log(settings);

    $ui.gestalt = this.GIVING;

    $ui.loggedIn = ui.loggedIn;

    // TODO: actually disting$uish between give and get sort order.
    this.$.btnGive.addEventListener('click', function() {
    });
    this.$.btnGet.addEventListener('click', function() {
    });
    this.$.btnNetworks.addEventListener('click', function() {
      console.log('NETWORKS');
      $ui.view = $ui.NETWORKS;
    });
    this.$.btnSettings.addEventListener('clicked', function() {
      console.log('SETTINGS');
      // TODO: this is a hack for now. use actually good view state changes.
      $ui.view = ($ui.SETTINGS == $ui.view) ? $ui.ROSTER : $ui.SETTINGS;
    });

    // Determine which view to start in.
    this.view = this.SPLASH;
    if (ui.introSplashed) {
      // This must be asynchronous to avoid a CSS bug.
      // TODO: There seems to be a race condition with polymer element load
      // order which sometimes still causes a CSS bug. This needs to be fixed.
      this.async(function() {
        this.view = this.NETWORKS;
      }, 1000);
    }

  }
});
