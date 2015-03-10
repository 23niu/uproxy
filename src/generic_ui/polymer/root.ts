/// <reference path='../../interfaces/ui-polymer.d.ts' />
/// <reference path='../scripts/ui.ts' />
/// <reference path='../../uproxy.ts' />

declare var ui :UI.UserInterface;

Polymer({
  model: model,
  dialog: {
    message: '',
    heading: '',
    affirmative: {
      text: '',
      signal: ''
    },
    dismissive: {
      text: '',
      signal: ''
    }
  },
  updateView: function(e, detail, sender) {
    // If we're switching from the SPLASH page to the ROSTER, fire an
    // event indicating the user has logged in. roster.ts listens for
    // this event.
    if (detail.view == uProxy.View.ROSTER && ui.view == uProxy.View.SPLASH) {
      this.fire('core-signal', {name: "login-success"});
      this.$.modeTabs.updateBar();
    }
    ui.view = detail.view;
  },
  settingsView: function() {
    ui.view = uProxy.View.SETTINGS;
  },
  rosterView: function() {
    console.log('rosterView called');
    ui.view = uProxy.View.ROSTER;
  },
  setGetMode: function() {
    model.globalSettings.mode = uProxy.Mode.GET;
  },
  setShareMode: function() {
    model.globalSettings.mode = uProxy.Mode.SHARE;
  },
  closedWelcome: function() {
    model.globalSettings.hasSeenWelcome = true;
    core.updateGlobalSettings(model.globalSettings);
  },
  closedSharing: function() {
    model.globalSettings.hasSeenSharingEnabledScreen = true;
    core.updateGlobalSettings(model.globalSettings);
  },
  dismissCopyPasteError: function() {
    ui.copyPasteUrlError = false;
  },
  openDialog: function(e, detail, sender) {
    /* 'detail' parameter holds the data that was passed when the open-dialog
     * signal was fired. It should be of the form:
     *
     * { heading: 'title for the dialog',
     *   message: 'main message for the dialog',
     *   affirmative: {
     *     text: 'button text, e.g. Done',
     *     signal: 'core-signal to fire when button is clicked'
     *   },
     *   dismissive: {
     *     text: 'button text, e.g. Cancel',
     *     signal: 'core-signal to fire when button is clicked'
     *   }
     *  }
     *
     * If text == '', the button is not shown.
     * If signal == '', no core-signal is fired.
     */

    this.dialog = detail.dialog;
    this.$.dialog.toggle();
  },
  affirmativeButtonClick: function() {
    if (this.dialog.affirmative.signal != '') {
      this.fire('core-signal', {name: this.dialog.affirmative.signal});
    }
  },
  dismissiveButtonClick: function() {
    if (this.dialog.dismissive.signal != '') {
      this.fire('core-signal', {name: this.dialog.dismissive.signal});
    }
  },
  ready: function() {
    // Expose global ui object and UI module in this context.
    this.ui = ui;
    this.uProxy = uProxy;
    if(ui.browserApi.browserSpecificElement){
      var div = document.createElement("div");
      var browserCustomElement = document.createElement(ui.browserApi.browserSpecificElement);
      div.innerHTML = browserCustomElement.outerHTML;
      this.$.browserElementContainer.appendChild(div.childNodes[0]);
    }
  },

  observe: {
    'model.globalSettings.mode': 'modeChange'
  },
  modeChange: function() {
    core.updateGlobalSettings(model.globalSettings);
  }
});
