/**
 * ui.ts
 *
 * Common User Interface state holder and changer.
 * TODO: firefox bindings.
 */
/// <reference path='user.ts' />
/// <reference path='../../uproxy.ts'/>
/// <reference path='../../interfaces/ui.d.ts'/>
/// <reference path='../../interfaces/browser_action.d.ts'/>
/// <reference path='../../interfaces/browser-proxy-config.d.ts'/>


declare var model         :UI.Model;
declare var proxyConfig   :IBrowserProxyConfig;


module UI {

  var REFRESH_TIMEOUT :number = 1000;  // ms.

  export var DEFAULT_USER_IMG = 'icons/contact-default.png';

  /**
   * Enumeration of mutually-exclusive view states.
   */
  export enum View {
    SPLASH = 0,
    ROSTER,
    USER,
    NETWORKS,
    SETTINGS,
  }

  export enum Gestalt {
    GIVING = 101,
    GETTING
  }

  /**
   * Structure of the uProxy UI model object:
   * TODO: Probably put the model in its own file.
   */
  export interface Model {
    networks : UI.Network[];
    // TODO: Other top-level generic info...

    // This is a 'global' roster - a combination of all User Profiles.
    // TODO: remove this if possible and just use network.roster
    roster :User[];

    description :string;
  }

  /**
   * Specific to one particular Social network.
   */
  export interface Network {
    name   :string;
    online :boolean;
    roster :{ [userId:string] :User }
  }

  /**
   * The User Interface class.
   *
   * Keeps persistent state between the popup opening and closing.
   * Manipulates the payloads received from UPDATES from the Core in preparation
   * for UI interaction.
   * Any COMMANDs from the UI should be directly called from the 'core' object.
   */
  export class UserInterface implements uProxy.UIAPI {
    public DEBUG = false;  // Set to true to show the model in the UI.

    public view :View;  // Appearance.

    // Keep track of currently viewed contact and instance.
    public network :string = 'google';
    public user :User = null;
    public focusedInstance :UI.Instance = null;
    // If we are proxying, keep track of the instance and user.
    public currentProxyServer :UI.CurrentProxy = null;

    public errors :string[] = [];

    // TODO: Put this into the 'auth' service, which will eventually include
    // sas-rtc.
    public localFingerprint :string = null;

    // Maps instanceId to 'GET' or 'GIVE' state, if the user has explicitly
    // clicked to change the screen in the UI.  If an instance is missing from
    // this map we should default to the correct get/give state based on the
    // consent settings.
    // TODO: put this in storage to remember the get/give state after restart.
    private mapInstanceIdToGetOrGive_  :{ [instanceId :string] :string } = {};

    advancedOptions = false;
    // TODO: Pull search / filters into its own class.
    search = '';
    numClients = 0;
    myName = '';
    myPic = null;

    accessIds = 0;  // How many people are proxying through us.

    // When the description changes while the text field loses focus, it
    // automatically updates.
    oldDescription :string = '';

    // Initial filter state.
    public filters = {
        'online': false,
        'myAccess': false,
        'friendsAccess': false,
        'uproxy': false
    };

    /**
     * UI must be constructed with hooks to Notifications and Core.
     * Upon construction, the UI installs update handlers on core.
     */
    constructor(
        public core   :uProxy.CoreAPI,
        public browserAction :BrowserAction) {

      // TODO: Determine the best way to describe view transitions.
      this.view = View.SPLASH;  // Begin at the splash intro.

      // Attach handlers for UPDATES received from core.
      // TODO: Implement the rest of the fine-grained state updates.
      // (We begin with the simplest, total state update, above.)
      core.onUpdate(uProxy.Update.ALL, (state :Object) => {
        console.log('Received uProxy.Update.ALL:', state);
        model.description = state['description'];
        // TODO: Implement this after a better payload message is implemented.
        // There is now a difference between the UI Model and the state object
        // from the core, so one-to-one mappinsg from the old json-patch code cannot
        // work.
      });

      // Add or update the online status of a network.
      core.onUpdate(uProxy.Update.NETWORK, this.syncNetwork_);

      // Attach handlers for USER updates.
      core.onUpdate(uProxy.Update.USER_SELF, (payload :UI.UserMessage) => {
        // Instead of adding to the roster, update the local user information.
        console.log('uProxy.Update.USER_SELF:', payload);
        var profile :UI.UserProfileMessage = payload.user;
        this.myPic = profile.imageData || DEFAULT_USER_IMG;
        this.myName = profile.name;
      });
      core.onUpdate(uProxy.Update.USER_FRIEND, (payload :UI.UserMessage) => {
        console.log('uProxy.Update.USER_FRIEND:', payload);
        this.syncUser(payload);
      });
      core.onUpdate(uProxy.Update.ERROR, (errorText :string) => {
        console.warn('uProxy.Update.ERROR: ' + errorText);
        this.showNotification(errorText);
        // CONSIDER: we might want to display some errors in the extension popup
        // as well (by pusing them onto this.errors).
        // this.errors.push(errorText);
      });
      core.onUpdate(uProxy.Update.NOTIFICATION, (notificationText :string) => {
        console.warn('uProxy.Update.NOTIFICATION: ' + notificationText);
        this.showNotification(notificationText);
      });
      core.onUpdate(uProxy.Update.PROXYING_STOPPED, () => {
        this.stopProxyingInUiAndConfig();
      });

      core.onUpdate(uProxy.Update.LOCAL_FINGERPRINT, (payload :string) => {
        this.localFingerprint = payload;
        console.log('Received local fingerprint: ' + this.localFingerprint);
      });

      core.onUpdate(uProxy.Update.MANUAL_NETWORK_OUTBOUND_MESSAGE,
                    (message :uProxy.Message) => {
        console.log('Manual network outbound message: ' +
                    JSON.stringify(message));
        // TODO: Display the message in the 'manual network' UI.
      });

      console.log('Created the UserInterface');
    }

    update = (type:uProxy.Update, data?:any) => {
      // TODO: Implement.
    }

    public showNotification = (notificationText :string) => {
      new Notification('uProxy', { body: notificationText,
                                   icon: 'icons/uproxy-128.png'});
    }

    // ------------------------------- Proxying ----------------------------------
    // TODO Replace this with a 'Proxy Service'.
    /**
     * Starts proxying by updating UI-specific state, then passing the start
     * COMMAND to the core.
     * Assumes that there is a 'current instance' available.
     */
    public startProxying = () => {
      if (!this.user || !this.focusedInstance) {
        console.error('Cannot start proxying without a current instance.');
        return;
      }
      // Prepare the instance path.
      var path = <InstancePath>{
        // TODO: Don't hardcode the network. This involves some changes to the
        // model. Do this soon.
        network: 'google',
        userId: this.user.userId,
        instanceId: this.focusedInstance.instanceId
      };
      this.core.start(path).then(() => {
        this.currentProxyServer = {
          instance: this.focusedInstance,
          user: this.user
        };
        this._setProxying(true);
      });
    }

    /**
     * Stops proxying by updating UI-specific state, and passing the stop
     * COMMAND to the core.
     */
    public stopProxyingUserInitiated = () => {
      if (!this.focusedInstance) {
        console.warn('Stop Proxying called while not proxying.');
        return;
      }
      this.stopProxyingInUiAndConfig();
      this.core.stop();
    }

    /**
     * Removes proxy indicators from UI and undoes proxy configuration
     * (e.g. chrome.proxy settings).
     */
    public stopProxyingInUiAndConfig = () => {
      if (!this.currentProxyServer) {
        console.warn('Stop Proxying called while not proxying.');
        return;
      }
      this._setProxying(false);
      this.currentProxyServer = null;
      proxyConfig.stopUsingProxy();
    }

    _setProxying = (isProxying : boolean) => {
      if (isProxying) {
        this.browserAction.setIcon('uproxy-19-p.png');
      } else {
        this.browserAction.setIcon('uproxy-19.png');
      }
    }

    // -------------------------------- Filters ----------------------------------
    /**
     * Toggling |filter| changes the visibility and ordering of roster entries.
     * TODO: Filters not currently used. Either re-implement or remove during
     * the next UX update.
     */
    toggleFilter = (filter) => {
      if (undefined === this.filters[filter]) {
        console.error('Filter "' + filter + '" is not a valid filter.');
        return false;
      }
      console.log('Toggling ' + filter + ' : ' + this.filters[filter]);
      this.filters[filter] = !this.filters[filter];
    }

    /**
     * Returns |false| if contact |c| should *not* currently be visible in the
     * roster.
     */
    doesContactPassFilter = () => {
      return (user :UI.User) : boolean => {
        var searchText = this.search,
            compareString = user.name.toLowerCase();
        // First, compare filters.
        if ((this.filters.online        && !user.isOnline)    ||
            (this.filters.uproxy        && !user.canUProxy) ||
            (this.filters.myAccess      && !user.givesMe)   ||
            (this.filters.friendsAccess && !user.usesMe)) {
          return false;
        }
        // Otherwise, if there is no search text, this.user is visible.
        if (!searchText) {
          return true;
        }
        if (compareString.indexOf(searchText) >= 0) {
          return true;
        }
        return false;  // Does not match the search text, should be hidden.
      };
    }

    // --------------------------- Focus & Notifications ---------------------------
    /**
     * Handler for when the user clicks on the entry in the roster for a User.
     * Sets the UI's 'current' User and Instance, if it exists.
     */
    public focusOnUser = (user :UI.User, instance :UI.Instance) => {
      this.view = View.USER;
      console.log('focusing on user ' + user);
      this.user = user;
      this.focusedInstance = instance;
    }

    /*
     * Change from the detailed access view back to the roster view.
     * Clears the 'current user'.
     */
    public returnToRoster = () => {
      this.view = View.ROSTER;
      console.log('returning to roster! ' + this.user);
    }

    syncInstance = (instance : any) => {}
    updateMappings = () => {}

    sendConsent = () => {}

    private getNetwork = (networks : UI.Network[], networkName :string) => {
      for (var networkId in networks) {
        if (networks[networkId].name === networkName) {
          return networks[networkId];
        }
      }
      return null;
    }

    /**
     * Synchronize a new network to be visible on this UI.
     */
    private syncNetwork_ = (network :UI.NetworkMessage) => {
      console.log('uProxy.Update.NETWORK', network, model.networks);
      console.log(model);
      var existingNetwork = this.getNetwork(model.networks, network.name);
      if (existingNetwork) {
        existingNetwork.online = network.online;
      } else {
        model.networks.push({
          name:   network.name,
          online: network.online,
          roster: {}
        });
      }
    }

    // Determine whether uProxy is connected to some network.
    // TODO: Make these functional and write specs.
    public loggedIn = () => {
      for (var networkId in model.networks) {
        if (model.networks[networkId].online &&
            // TODO: figure out how to reference Social.MANUAL_NETWORK_ID here
            model.networks[networkId].name !== "manual") {
          return true;
        }
      }
      return false;
    }

    // Synchronize the data about the current user.
    // TODO: Be able to sync local instance, per network.

    /**
     * Synchronize data about some friend.
     */
    public syncUser = (payload :UI.UserMessage) => {
      var network = this.getNetwork(model.networks, payload.network);
      if (!network) {
        console.warn('Received USER for non-existing network.');
        return;
      }
      // Construct a UI-specific user object.
      var profile = payload.user;
      // Update / create if necessary a user, both in the network-specific
      // roster and the global roster.
      var user :UI.User;
      user = network.roster[profile.userId];
      // CONSIDER: we might want to check if this user has been our proxy
      // server and if so stop the proxying if they are no longer proxying
      // for us (e.g. they were disconnected).  Currently we are sending an
      // explicit stop proxy message from the app to stop proxying.
      if (!user) {
        // New user.
        user = new UI.User(profile.userId);
        network.roster[profile.userId] = user;
        model.roster.push(user);
      }
      user.update(profile);

      // Update instances
      user.instances = payload.instances;
      if (user == this.user) {
        // Update focusedInstance
        for (var i = 0; i < user.instances.length; ++i) {
          if (user.instances[i].instanceId == this.focusedInstance.instanceId) {
            this.focusedInstance = user.instances[i];
            break;
          }
        }
      }
      if (this.currentProxyServer && user == this.currentProxyServer.user) {
        // Update currentProxyServer.instance.
        for (var i = 0; i < user.instances.length; ++i) {
          if (user.instances[i].instanceId == this.currentProxyServer.instance.instanceId) {
            this.currentProxyServer.instance = user.instances[i];
            break;
          }
        }
      }

      user.canUProxy = user.instances.some((instance) => {
        return instance.isOnline;
      });

      // Update givesMe and usesMe fields based on whether any instance
      // has these permissions.
      // TODO: we may want to include offered permissions here (even if the
      // peer hasn't accepted the offer yet).
      for (var i = 0; i < user.instances.length; ++i) {
        var consent = user.instances[i].consent;
        if (consent.asClient == Consent.ClientState.GRANTED) {
          user.usesMe = true;
        }
        if (consent.asProxy == Consent.ProxyState.GRANTED) {
          user.givesMe = true;
        }
      }

      console.log('Synchronized user.', user);
    };

    // TODO: this might be more efficient if we just had a ui.hasUProxyBuddies
    // boolean that we could keep up to date.
    public hasOnlineUProxyBuddies = () => {
      for (var i = 0; i < model.roster.length; ++i) {
        var user :UI.User = model.roster[i];
        if (user.instances.length > 0 && user.isOnline) {
          return true;
        }
      }
      return false;
    }

    public login = (network) => {
      this.core.login(network).then(
        () => {
          this.view = UI.View.ROSTER;
        },
        () => { console.warn('login failed for ' + network) });
    }

    public logout = (network) => {
      this.core.logout(network);
      // Immediately set the network to be offline, because instant UI feedback
      // to the user's action is more important than waiting for a roundtrip
      // Core-UI update message in the logging out case.
      this.getNetwork(model.networks, network).online = false;
    }

    public isCurrentProxyClient = (user: User) : boolean => {
      for (var i = 0; i < user.instances.length; ++i) {
        if (user.instances[i].access.asClient) {
          return true;
        }
      }
      return false;
    }

    public isProxying = () : boolean => {
      return this.currentProxyServer != null;
    }

    public toggleGetOrGive = (newValue :string, instance :UI.Instance)
        : void => {
      if (newValue !== 'GET' && newValue !== 'GIVE') {
        console.error('toggleGetOrGive: unexpected value ' + newValue);
        return;
      }
      this.mapInstanceIdToGetOrGive_[instance.instanceId] = newValue;
    }

    public showGetOrGive = (instance :UI.Instance) : string => {
      if (!instance) {
        // This occurs because angular still evaluates expressions using
        // ui.focusedInstance even when those DOM elements are hidden
        // and ui.focusedInstance is null.
        return 'GET';
      } else if (this.mapInstanceIdToGetOrGive_[instance.instanceId]) {
        // User explicitly toggled get/give
        return this.mapInstanceIdToGetOrGive_[instance.instanceId];
      } else if (instance.consent.asClient != Consent.ClientState.NONE) {
        // User has offered or been requested to act as proxy server.
        return 'GIVE';
      } else {
        return 'GET';
      }
    }

  }  // class UserInterface

}  // module UI
