var GOOGLE_TOKENINFO_URL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';

// Client ID associated with our redirect URL from Google Developers Console.
var CLIENT_ID =
    '746567772449-jkm5q5hjqtpq5m9htg9kn0os8qphra4d.apps.googleusercontent.com';

function AuthGoogle(credCallback, errorCallback) {
  this.credentialsCallback = credCallback;
  this.errorCallback = errorCallback;
  this.credentials = {
    userId: null,
    token: null
  };
  this.login(true);
};

AuthGoogle.prototype.login = function(interactive) {
  var launchLoginPopup = function() {
    var googleOAuth2Url = 'https://accounts.google.com/o/oauth2/auth?' +
      'response_type=token' +
      '&redirect_uri=' + chrome.identity.getRedirectURL() +
      '&client_id=' + CLIENT_ID +
      // scopes are "email" and "https://www.googleapis.com/auth/googletalk"
      // separated by a space (%20).
      '&scope=email%20https://www.googleapis.com/auth/googletalk';
    console.log('googleOAuth2Url: ' + googleOAuth2Url);
    chrome.identity.launchWebAuthFlow(
        {url: googleOAuth2Url, interactive: true},
        function(responseUrl) {
          console.log('Got responseUrl: ' + responseUrl);
          if (chrome.runtime.lastError) {
            console.log('Error logging into Google: ', chrome.runtime.lastError);
            return;
          }

          // Parse Oauth2 token from responseUrl
          var token = responseUrl.match(/access_token=([^&]+)/)[1];
          console.log('Got Oauth2 token:' + token);
          if (!token) {
            console.error('Error getting token for Google');
            return;
          }

          this.getCredentials_(token);
        }.bind(this));
  }.bind(this);

  // Always logout before logging in to Google.  This is to ensure that
  // the user always gets to pick their Google account.  If we did not
  // call logout first, the user might be logged into a different account
  // (possibly by another app/extension, as all apps/extensions share
  // the same sandboxed environment used by chrome.identity.launchWebAuthFlow)
  // and would be unable to pick the right account for UProxy.
  // Only invoke login popup after logout has been completed (asynchronously).
  this.logout(launchLoginPopup);
};

AuthGoogle.prototype.getCredentials_ = function(token) {
  // Make googleapis request to get user's email address, then pass
  // credentials back to social provider.
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('load', (function(evt) {
    if (xhr.status == 200) {
      var response = JSON.parse(xhr.responseText);
      this.credentials = {
        userId: response.email,
        jid: response.email,
        oauth2_token: token,
        oauth2_auth: 'http://www.google.com/talk/protocol/auth',
        host: 'talk.google.com'
      };
      if (this.credentialsCallback) {
        this.credentialsCallback(this.credentials);
      } else {
        this.errorCallback('Missing Google credentials callback');
      }
    } else {
      this.errorCallback('Error validating Google oAuth token');
    }
  }).bind(this), false);
  xhr.addEventListener('error', (function(evt) {
    this.errorCallback('Error occurred while validating Google oAuth token');
  }).bind(this), false);
  xhr.open('get', GOOGLE_TOKENINFO_URL + token, true);
  xhr.send();
};

AuthGoogle.prototype.logout = function(callback) {
  // Logout of Google so that next time login URL is invoked user can
  // sign in with a different account.  This must be launched using
  // launchWebAuthFlow so that sandboxed environment is logged out (so
  // this can't be done using an xhr request).
  console.log('About to log out of Google');
  var logoutUrl = 'https://accounts.google.com/logout';
  chrome.identity.launchWebAuthFlow(
      {url: logoutUrl, interactive: false},
      function(responseUrl) {
        console.log('Successfully logged out of Google');
        if (callback) {
          callback();
        }
      });
};
