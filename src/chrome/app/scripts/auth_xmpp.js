var CREDENTIALS_KEY = "xmpp-credentials-mvav24n24ovp48";

function AuthXmpp(credCallback, errorCallback) {
  this.credentialsCallback = credCallback;
  this.errorCallback = errorCallback;
  this.credentials = {
    userId: null,
    token: null,
    host: null,
    port: null,
    register: false
  };
  this.dialogWindow= null;
};

AuthXmpp.prototype.login = function(interactive) {
  chrome.storage.local.get(CREDENTIALS_KEY, (function(data) {
    if (data && data[CREDENTIALS_KEY] && data[CREDENTIALS_KEY] !== null) {
      this.credentialsCallback(data[CREDENTIALS_KEY]);
      return;
    } else if (interactive) {
      this.createDialog();
    } else {
      console.log('XMPP provider authentication: Credentials not cached and interactive is off');
    }
  }).bind(this));
};

AuthXmpp.prototype.logout = function() {
  chrome.storage.local.remove(CREDENTIALS_KEY);
};

/*** 
 * INTERNAL METHODS
 **/

AuthXmpp.prototype.createDialog = function() {
  chrome.app.window.create(
    'dialogs/xmpp-auth/xmpp-auth.html',
    {
      id: 'xmpp-auth',
      minWidth: 600,
      minHeight: 400,
      maxWidth: 600,
      maxHeight: 400
    },
    (function(child_win) {
      this.dialogWindow = child_win;
      this.dialogWindow.onClosed.addListener((function() {
        this.dialogWindow = null;
        chrome.storage.local.get(CREDENTIALS_KEY, (function(data) {
          if (data && data[CREDENTIALS_KEY] && data[CREDENTIALS_KEY] !== null) {
            this.credentialsCallback(data[CREDENTIALS_KEY]);
            return;
          } else {
            this.errorCallback('XMPP provider authentication: No credentials provided into dialog window');
          }
        }).bind(this));
      }).bind(this));
    }).bind(this)
  ); 

};


