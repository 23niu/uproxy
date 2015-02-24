/// <reference path='../third_party/typings/jasmine/jasmine.d.ts' />
/// <reference path='../uproxy.ts' />
/// <reference path='../arraybuffers/arraybuffers.ts' />

var testConnection = (socksEndpoint :Net.Endpoint) : Promise<Boolean> => {
  return freedom('scripts/build/compile-src/integration/integration.json', {debug:'log'}).then((interface :any) => {
    var testModule = new interface();
    var input = ArrayBuffers.stringToArrayBuffer('arbitrary test string');
    return testModule.startEchoServer().then((port:number) => {
      return testModule.connect(socksEndpoint, port, "").
          then((connectionId :string) => {
        return testModule.echo(connectionId, input)
            .then((output :ArrayBuffer) => {
          return Promise.resolve(
            ArrayBuffers.byteEquality(input, output));
        })
      });
    }).catch((e :any) => {
      return Promise.reject(e);
    })
  });
}
declare var ALICE;
declare var BOB;
var REDIRECT_URL = 'http://localhost';
var CLIENT_ID =
    '746567772449-mv4h0e34orsf6t6kkbbht22t9otijip0.apps.googleusercontent.com';
var CLIENT_SECRET = 'M-EGTuFRaWLS5q_hygpJZMBu';

var OAuthView = function() {};
OAuthView.prototype.initiateOAuth = function(redirectURIs, continuation) {
  continuation({redirect: REDIRECT_URL, state: ''});
  return true;
};
OAuthView.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  if (!this.refreshToken) {
    continuation(undefined, 'No refreshToken set.');
    return;
  }
  return Helper.getAccessToken(this.refreshToken).then(function(accessToken) {
    continuation(REDIRECT_URL + '?access_token=' + accessToken);
  }).catch(function(e) {
    continuation(undefined, 'Failed to get access token');
  });
};

var Helper = {
  // Returns a Promise that fulfills with an access token.
  getAccessToken: function(refreshToken) {
    return new Promise(function(fulfill, resolve) {
      var data = 'refresh_token=' + refreshToken +
          '&client_id=' + CLIENT_ID +
          '&client_secret=' + CLIENT_SECRET +
          '&grant_type=refresh_token';
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/oauth2/v3/token', true);
      xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
      xhr.onload = function() {
        fulfill(JSON.parse(this.response).access_token);
      };
      xhr.send(data);
    });
  },
  // Sets up an onClientState listener and invokes the callback function
  // anytime a new client for the given userId appears as ONLINE.
  onClientOnline: function(socialClient, userId, callback) {
    socialClient.on('onClientState', function(clientState) {
      if (clientState.userId == userId &&
          clientState.status == 'ONLINE' &&
          !Helper.onlineClientIds[clientState.clientId]) {
        // Mark this client as online so we don't re-invoke the callback
        // extra times (e.g. when only lastUpdated has changed.)
        Helper.onlineClientIds[clientState.clientId] = true;
        callback(clientState);
      }
    });
  },
  onlineClientIds: {}
};  // end of Helper

describe('uproxy core', function() {
  //jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  var uProxyFreedom = 'scripts/build/compile-src/integration/scripts/freedom-module.json';
  var alice;
  var bob;
  var alicePath;
  var bobPath;
  var promiseId = 0;
  it('loads uproxy', (done) => {
    // Ensure that aliceSocialInterface and bobSocialInterface are set.
    var AliceOAuthView = function() {};
    AliceOAuthView.prototype = new OAuthView();
    AliceOAuthView.prototype.refreshToken = ALICE.REFRESH_TOKEN;
    var BobOAuthView = function() {};
    BobOAuthView.prototype = new OAuthView();
    BobOAuthView.prototype.refreshToken = BOB.REFRESH_TOKEN;
    var alicePromise = freedom(uProxyFreedom,
        {oauth: [AliceOAuthView], debug: 'log'})
        .then(function(interface) {
      alice = interface();
    });
    var bobPromise = freedom(uProxyFreedom,
        {oauth: [BobOAuthView], debug: 'log'})
        .then(function(interface) {
      bob = interface();
    });
    Promise.all([alicePromise, bobPromise]).then(done);
  });

  it('logs in', (done) => {
    var promises = [];
    alice.emit('' + uProxy.Command.LOGIN,
                     <uProxy.PromiseCommand>{data: 'Google', promiseId: ++promiseId});
    promises.push(new Promise(function(fulfill, reject) {
      alice.once('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
        fulfill();
      });
    }));
    bob.emit('' + uProxy.Command.LOGIN,
                     <uProxy.PromiseCommand>{data: 'Google', promiseId: ++promiseId});
    promises.push(new Promise(function(fulfill, reject) {
      bob.once('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
        fulfill();
      });
    }));
    promises.push(new Promise(function(fulfill, reject) {
      alice.on('' + uProxy.Update.USER_FRIEND, (data) => {
        if (data.user.userId === BOB.ANONYMIZED_ID
           && data.user.name === BOB.NAME
           && data.instances.length > 0) {
          BOB.INSTANCE_ID = data.instances[0].instanceId;
          fulfill();;
        }
      })
    }));
    promises.push(new Promise(function(fulfill, reject) {
      bob.on('' + uProxy.Update.USER_FRIEND, (data) => {
        if (data.user.userId === ALICE.ANONYMIZED_ID
            && data.user.name === ALICE.NAME
            && data.instances.length > 0) {
          ALICE.INSTANCE_ID = data.instances[0].instanceId;
          fulfill();
        }
      })
    }));

    Promise.all(promises).then(() => {
      var globalSettings = {
        description: '',
        stunServers: [],
        hasSeenSharingEnabledScreen: true,
        hasSeenWelcome: false,
        allowNonUnicast: true
      };
      alice.emit('' + uProxy.Command.UPDATE_GLOBAL_SETTINGS,
                 {data: globalSettings});
      bob.emit('' + uProxy.Command.UPDATE_GLOBAL_SETTINGS,
               {data: globalSettings});
      done();
    });
  });

  it('ask and get permission', (done) => {
    alicePath = {
      network: {
        name: 'Google',
        userId: BOB.EMAIL,
      },
      userId: ALICE.ANONYMIZED_ID,
      instanceId: ALICE.INSTANCE_ID
    };
    bobPath = {
      network: {
        name: 'Google',
        userId: ALICE.EMAIL,
      },
      userId: BOB.ANONYMIZED_ID,
      instanceId: BOB.INSTANCE_ID
    };

    alice.emit('' + uProxy.Command.MODIFY_CONSENT,
                     {data: {path: bobPath, action:Consent.UserAction.REQUEST}});
    var bobFriend = function(data) {
      if (data.user.userId === ALICE.ANONYMIZED_ID && data.instances.length > 0
          && data.instances[0].instanceId === ALICE.INSTANCE_ID
          && data.instances[0].consent.remoteRequestsAccessFromLocal
          && !data.instances[0].consent.localGrantsAccessToRemote) {
        bob.off('' + uProxy.Update.USER_FRIEND, bobFriend);
        bob.emit('' + uProxy.Command.MODIFY_CONSENT,
                         {data: {path: alicePath, action:Consent.UserAction.OFFER}});
      }
    }
    bob.on('' + uProxy.Update.USER_FRIEND, bobFriend);

    var aliceFriend = function(data) {
      if (data.user.userId === BOB.ANONYMIZED_ID && data.instances.length > 0
          && data.instances[0].instanceId === BOB.INSTANCE_ID
          && data.instances[0].consent.remoteGrantsAccessToLocal) {
        alice.off('' + uProxy.Update.USER_FRIEND, aliceFriend);
        done();
      }
    };
    alice.on('' + uProxy.Update.USER_FRIEND, aliceFriend);
  });

  it('start proxying', (done) => {
    alice.emit('' + uProxy.Command.START_PROXYING,
               {data: bobPath, promiseId: ++promiseId});
    var aliceStarted = new Promise(function(fulfill, reject) {
      alice.once('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
        expect(data.promiseId).toEqual(promiseId);
        testConnection(data.argsForCallback).then((proxying) => {
          expect(proxying).toEqual(true);
          fulfill();
        });
      });
    });

    var bobStarted = new Promise(function(fulfill, reject) {
      bob.once('' + uProxy.Update.START_GIVING_TO_FRIEND, (data) => {
        expect(data).toEqual(ALICE.INSTANCE_ID);
        fulfill();
      });
    });

    Promise.all([aliceStarted, bobStarted]).then(done);
  });

  it('stop proxying', (done) => {
    alice.emit('' + uProxy.Command.STOP_PROXYING,
               {data: bobPath});
    // alice not proxying
    var bobStopped = new Promise(function(fulfill, reject) {
      bob.once('' + uProxy.Update.STOP_GIVING_TO_FRIEND, (data) => {
        expect(data).toEqual(ALICE.INSTANCE_ID);
        fulfill();
      });
    });

    var aliceStopped = new Promise(function(fulfill, reject) {
      alice.once('' + uProxy.Update.STOP_GETTING_FROM_FRIEND, (data) => {
        expect(data).toEqual({instanceId: BOB.INSTANCE_ID, error: false});
        fulfill();
      });
    });

    Promise.all([aliceStopped, bobStopped]).then(done);
  });

  it('start proxying again', (done) => {
    alice.emit('' + uProxy.Command.START_PROXYING,
               {data: bobPath, promiseId: ++promiseId});
    var aliceStarted = new Promise(function(fulfill, reject) {
      alice.once('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
        expect(data.promiseId).toEqual(promiseId);
        testConnection(data.argsForCallback).then((proxying) => {
          expect(proxying).toEqual(true);
          fulfill();
        });
      });
    });

    var bobStarted = new Promise(function(fulfill, reject) {
      bob.once('' + uProxy.Update.START_GIVING_TO_FRIEND, (data) => {
        expect(data).toEqual(ALICE.INSTANCE_ID);
        fulfill();
      });
    });

    Promise.all([aliceStarted, bobStarted]).then(done);
  });

  it('stop proxying again', (done) => {
    alice.emit('' + uProxy.Command.STOP_PROXYING,
               {data: bobPath});
    // alice not proxying
    var bobStopped = new Promise(function(fulfill, reject) {
      bob.once('' + uProxy.Update.STOP_GIVING_TO_FRIEND, (data) => {
        //expect(data).toEqual(ALICE.INSTANCE_ID);
        fulfill();
      });
    });

    var aliceStopped = new Promise(function(fulfill, reject) {
      alice.once('' + uProxy.Update.STOP_GETTING_FROM_FRIEND, (data) => {
        expect(data).toEqual({instanceId: BOB.INSTANCE_ID, error: false});
        fulfill();
      });
    });

    Promise.all([aliceStopped, bobStopped]).then(done);
  });

  it('log out', (done) => {
    alice.emit('' + uProxy.Command.LOGOUT,
               {data: {name: 'Google', userId: ALICE.EMAIL}, promiseId: ++promiseId});

    alice.once('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
      expect(data.promiseId).toEqual(promiseId);
      bob.emit('' + uProxy.Command.MODIFY_CONSENT,
                       {data: {path: alicePath, action:Consent.UserAction.CANCEL_OFFER}});
      bob.emit('' + uProxy.Command.LOGOUT,
                 {data: {name: 'Google', userId: BOB.EMAIL}, promiseId: ++promiseId});
      done();
    });
  });

  it('log back in and check permissions', (done) => {
    alice.emit('' + uProxy.Command.LOGIN,
               {data: 'Google', promiseId: ++promiseId});
    var aliceLoggedIn = new Promise((F, R) => {
      alice.on('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
        if (data.promiseId === promiseId) {
          F();
        }
      });
    });
    var aliceFriend = function(data) {
      aliceLoggedIn.then(() => {
        if (data.user.userId === BOB.ANONYMIZED_ID && data.instances.length > 0
            && data.instances[0].instanceId === BOB.INSTANCE_ID
            && data.instances[0].consent.remoteGrantsAccessToLocal
            && !data.instances[0].consent.localGrantsAccessToRemote) {
          alice.emit('' + uProxy.Command.MODIFY_CONSENT,
                           {data: {path: bobPath, action:Consent.UserAction.OFFER}});
          alice.off('' + uProxy.Update.USER_FRIEND, aliceFriend);
          bob.emit('' + uProxy.Command.LOGIN,
                   {data: 'Google', promiseId: ++promiseId});
          var bobFriend = function(data) {
            if (data.user.userId === ALICE.ANONYMIZED_ID && data.instances.length > 0
                && data.instances[0].instanceId === ALICE.INSTANCE_ID
                && data.instances[0].consent.remoteRequestsAccessFromLocal
                && !data.instances[0].consent.localGrantsAccessToRemote
                && data.instances[0].consent.remoteGrantsAccessToLocal) {
              bob.off('' + uProxy.Update.USER_FRIEND, bobFriend);
              done();
            }
          };
          bob.on('' + uProxy.Update.USER_FRIEND, bobFriend);
        }
      });
    };
    alice.on('' + uProxy.Update.NETWORK, (data) => {
      if (data.online) {
        alice.on('' + uProxy.Update.USER_FRIEND, aliceFriend);
      }
    });
  });

  it('try proxying again', (done) => {
    bob.emit('' + uProxy.Command.MODIFY_CONSENT,
                     {data: {path: alicePath, action:Consent.UserAction.REQUEST}});
    bob.emit('' + uProxy.Command.START_PROXYING,
               {data: alicePath, promiseId: ++promiseId});
    bob.on('' + uProxy.Update.COMMAND_FULFILLED, (data) => {
      if (data.promiseId === 6) {
        // TODO test proxying data.endpoints
      }
    });

    alice.on('' + uProxy.Update.START_GIVING_TO_FRIEND, (data) => {
      expect(data).toEqual(BOB.INSTANCE_ID);
      done();
    });
  });
});
