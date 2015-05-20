/// <reference path='./context.d.ts' />
/// <reference path='../../../../third_party/polymer/polymer.d.ts' />
/// <reference path='../../../../third_party/typings/xregexp/xregexp.d.ts' />
/// <reference path='../../../../third_party/typings/i18next/i18next.d.ts' />

import social = require('../../interfaces/social');
import ui_types = require('../../interfaces/ui');
import user_interface = require('../scripts/ui');
import regEx = require('xregexp');
import XRegExp = regEx.XRegExp;

declare var i18n_t :Function;

// Example usage of these tests:
// isRightToLeft.test('hi') --> false
// isRightToLeft.test('لك الوص') --> true
var isRightToLeft = XRegExp('[\\p{Arabic}\\p{Hebrew}]');
var isCommonUnicode = XRegExp('[\\p{Common}]');
var ui = ui_context.ui;
var core = ui_context.core;
var model = ui_context.model;

interface button_description {
  text :string;
  signal :string;
  dismissive :boolean;
}

interface dialog_description {
  heading :string;
  message :string;
  buttons: button_description[];
}

Polymer({
  dialog: {
    message: '',
    heading: '',
    buttons: []
  },
  toastMessage: '',
  unableToGet: '',
  unableToShare: '',
  updateView: function(e :Event, detail :{ view :ui_types.View }) {
    // If we're switching from the SPLASH page to the ROSTER, fire an
    // event indicating the user has logged in. roster.ts listens for
    // this event.
    if (detail.view == ui_types.View.ROSTER && ui.view == ui_types.View.SPLASH) {
      this.fire('core-signal', {name: "login-success"});
      if (!model.globalSettings.hasSeenWelcome) {
        this.statsDialogOrBubbleOpen = true;
        this.$.statsDialog.toggle();
      }
      this.closeSettings();
      this.$.modeTabs.updateBar();
    }
    ui.view = detail.view;
  },
  statsIconClicked: function() {
    this.$.mainPanel.openDrawer();
  },
  closeSettings: function() {
    this.$.mainPanel.closeDrawer();
  },
  rosterView: function() {
    console.log('rosterView called');
    ui.view = ui_types.View.ROSTER;
  },
  setGetMode: function() {
    ui.setMode(ui_types.Mode.GET);
  },
  setShareMode: function() {
    ui.setMode(ui_types.Mode.SHARE);
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
    ui.copyPasteError = ui_types.CopyPasteError.NONE;
  },
  openDialog: function(e :Event, detail :dialog_description) {
    /* 'detail' parameter holds the data that was passed when the open-dialog
     * signal was fired. It should be of the form:
     *
     * { heading: 'title for the dialog',
     *   message: 'main message for the dialog',
     *   buttons: [{
     *     text: 'button text, e.g. Done',
     *     signal: 'core-signal to fire when button is clicked (optional)',
     *     dismissive: boolean, whether button is dismissive (optional)
     *   }]
     * }
     */

    this.dialog = detail;
    // Using async() allows the contents of the dialog to update before
    // it's opened. Opening the dialog too early causes it to be positioned
    // incorrectly (i.e. off center).
    this.async(() => {
      this.$.dialog.open();
    });
  },
  dialogButtonClick: function(event :Event, detail :Object, target :HTMLElement) {
    var signal = target.getAttribute('data-signal');
    if (signal) {
      this.fire('core-signal', { name: signal });
    }
  },
  ready: function() {
    // Expose global ui object and UI module in this context.
    this.ui = ui;
    this.ui_constants = ui_types;
    this.user_interface = user_interface;
    this.model = model;
    if (ui.browserApi.browserSpecificElement){
      var browserCustomElement = document.createElement(ui.browserApi.browserSpecificElement);
      this.$.browserElementContainer.appendChild(browserCustomElement);
    }
    if (ui.view == ui_types.View.ROSTER &&
        !model.globalSettings.hasSeenWelcome) {
      this.statsDialogOrBubbleOpen = true;
      this.$.statsDialog.open();
    }
    this.dir = 'ltr';
  },
  closeStatsBubble: function() {
    this.statsDialogOrBubbleOpen = false;
  },
  enableStats: function() {
    // TODO: clean up the logic which controls which welcome dialog or bubble
    // is shown.
    this.model.globalSettings.statsReportingEnabled = true;
  },
  disableStats: function() {
    this.model.globalSettings.statsReportingEnabled = false;
    this.statsDialogOrBubbleOpen = false;
  },
  tabSelected: function(e :Event) {
    if (this.ui.isSharingDisabled &&
        this.model.globalSettings.mode == ui_types.Mode.SHARE) {
      // Keep the mode on get and display an error dialog.
      this.ui.setMode(ui_types.Mode.GET);
      this.fire('open-dialog', {
        heading: i18n_t('sharingUnavailableTitle'),
        message: i18n_t('sharingUnavailableMessage'),
        buttons: [{text: i18n_t('close'), dismissive: true}]
      });
    } else {
      // setting the value is taken care of in the polymer binding, we just need
      // to sync the value to core
      core.updateGlobalSettings(model.globalSettings);
    }
  },
  signalToFireChanged: function() {
    if (ui.signalToFire != '') {
      this.fire('core-signal', {name: ui.signalToFire});
      ui.signalToFire = '';
    }
  },
  revertProxySettings: function() {
    this.ui.stopGettingInUiAndConfig(false);
  },
  toastMessageChanged: function(oldVal :string, newVal :string) {
    if (newVal) {
      this.toastMessage = newVal;
      this.unableToShare = ui.unableToShare;
      this.unableToGet = ui.unableToGet;
      this.$.toast.show();

      // clear the message so we can pick up on other changes
      ui.toastMessage = null;
      ui.unableToShare = false;
      ui.unableToGet = false;
    }
  },
  openTroubleshoot: function() {
    if (this.ui.unableToGet) {
      this.troubleshootTitle = i18n_t('unableToGet');
    } else {
      this.troubleshootTitle = i18n_t('unableToShare');
    }
    this.$.toast.dismiss();
    this.fire('core-signal', {name: 'open-troubleshoot'});
  },
  topOfStatuses: function(statuses: string[], visible :boolean) {
    // Returns number of pixels from the bottom of the window a toast
    // can be positioned without interfering with the getting or sharing
    // status bars.
    // Since the toast always looks for the bottom of the window, not the
    // bottom of its parent element, this function is needed to control toast
    // placement rather than a simpler solution such as moving the toast
    // inside the roster element.
    var height = 10; // should start 10px up
    var statusRowHeight = 58; // From style of the statusRow divs.

    if (!visible) {
      // if the statuses are not on the screen, we don't need to do anything
      return height;
    }

    for (var i in statuses) {
      if (statuses[i]) {
        height += statusRowHeight;
      }
    }

    return height;
  },
  // mainPanel.selected can be either "drawer" or "main"
  // Our "drawer" is the settings panel. When the settings panel is open,
  // make sure to hide the stats tooltip so the two don't overlap.
  drawerToggled: function() {
    if (this.$.mainPanel.selected == 'drawer') {
      // Drawer was opened.
      this.$.statsTooltip.disabled = true;
    } else {
      // Drawer was closed.
      this.$.statsTooltip.disabled = false;
    }
  },
  observe: {
    '$.mainPanel.selected' : 'drawerToggled',
    'ui.toastMessage': 'toastMessageChanged',
  }
});
