Polymer({
  displayAdvancedSettings: false,
  logOut: function() {
    core.logout({name: ui.onlineNetwork.name,
                 userId: ui.onlineNetwork.userId}).then(() => {
      ui.view = UI.View.SPLASH;
      ui.setOfflineIcon();
    });
  },
  toggleAdvancedSettings: function() {
    this.displayAdvancedSettings = !this.displayAdvancedSettings;
    if (!this.displayAdvancedSettings) {
      // Hiding the advanced settings will also hide the confirmation
      // messages.
      this.$.confirmNewServer.hidden = true;
      this.$.confirmResetServers.hidden = true;
    }
  },
  setStunServer: function() {
    core.setStunServer(this.stunServer);
    this.$.confirmNewServer.hidden = false;
  },
  resetStunServers: function() {
    core.setStunServer('_DEFAULT_SERVERS_');
    this.$.confirmResetServers.hidden = false;
  },
  ready: function() {
    this.ui = ui;
  }
});
