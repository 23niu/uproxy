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
/// <reference path='../../networking-typings/communications.d.ts' />

declare var model         :UI.Model;
declare var proxyConfig   :IBrowserProxyConfig;


module UI {

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

  export interface Contacts {
    onlineTrustedUproxy :UI.User[];
    offlineTrustedUproxy :UI.User[];
    onlineUntrustedUproxy :UI.User[];
    offlineUntrustedUproxy :UI.User[];
    onlineNonUproxy :UI.User[];
    offlineNonUproxy :UI.User[];
  }

  /**
   * Structure of the uProxy UI model object:
   * TODO: Probably put the model in its own file.
   */
  export interface Model {
    networks : UI.Network[];
    contacts : Contacts;
    description :string;
  }

  /**
   * Specific to one particular Social network.
   */
  export interface Network {
    name   :string;
    // TODO(salomegeo): Add more information about the user.
    userId :string;
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

    // TODO: Put this into the 'auth' service, which will eventually include
    // sas-rtc.
    public localFingerprint :string = null;

    myName = '';
    myPic = null;

    // Instance you are getting access from.
    // Set to the remote instance for which access.isProxy = true.
    // Null if you are not getting access.
    public instanceGettingAccessFrom = null;
    // The instances you are giving access to.
    // Remote instances are added to this set if their access.isClient value
    // is true.
    public instancesGivingAccessTo = {};

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
        this.getNetwork(payload.network).userId = profile.userId;
      });
      core.onUpdate(uProxy.Update.USER_FRIEND, (payload :UI.UserMessage) => {
        console.log('uProxy.Update.USER_FRIEND:', payload);
        this.syncUser(payload);
      });
      core.onUpdate(uProxy.Update.ERROR, (errorText :string) => {
        console.warn('uProxy.Update.ERROR: ' + errorText);
        this.showNotification(errorText);
      });
      core.onUpdate(uProxy.Update.NOTIFICATION, (notificationText :string) => {
        console.warn('uProxy.Update.NOTIFICATION: ' + notificationText);
        this.showNotification(notificationText);
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

      core.onUpdate(uProxy.Update.STOP_GETTING_FROM_FRIEND,
          (data :any) => {
        if (data.instanceId === this.instanceGettingAccessFrom) {
          this.instanceGettingAccessFrom = null;
          this.stopGettingInUiAndConfig(data.error);
        }
        // If the two instanceIds did not match then either the stop
        // was initiated from the UI (i.e. user clicked stop) or the
        // user somehow tried to stop proxying from someone they were not
        // already proxying through.
      });

      core.onUpdate(uProxy.Update.START_GIVING_TO_FRIEND,
          (instanceId :string) => {
        if (!this.isGivingAccess()) {
          this.startGivingInUi();
        }
        this.instancesGivingAccessTo[instanceId] = true;
      });

      core.onUpdate(uProxy.Update.STOP_GIVING_TO_FRIEND,
          (instanceId :string) => {
        delete this.instancesGivingAccessTo[instanceId];
        if (!this.isGivingAccess()) {
          this.stopGivingInUi();
        }
      });

      console.log('Created the UserInterface');
    }

    public showNotification = (notificationText :string) => {
      new Notification('uProxy', { body: notificationText,
                                   icon: 'icons/uproxy-128.png'});
    }

    /**
     * Removes proxy indicators from UI and undoes proxy configuration
     * (e.g. chrome.proxy settings).
     * If user didn't end proxying, so if proxy session ended because of some
     * unexpected reason, user should be asked before reverting proxy settings.
     */
    public stopGettingInUiAndConfig = (askUser :boolean) => {
      this.browserAction.setIcon('uproxy-19.png');
      proxyConfig.stopUsingProxy(askUser);
    }

    /**
      * Sets extension icon to default and undoes proxy configuration.
      */
    public startGettingInUiAndConfig = (endpoint:Net.Endpoint) => {
      this.browserAction.setIcon('uproxy-19-c.png');
      proxyConfig.startUsingProxy(endpoint);
    }

    /**
      * Set extension icon to the 'giving' icon.
      */
    public startGivingInUi = () => {
      this.browserAction.setIcon('uproxy-19-p.png');
    }

    /**
      * Set extension icon to the default icon.
      */
    public stopGivingInUi = () => {
      this.browserAction.setIcon('uproxy-19.png');
    }

    public isGettingAccess = () => {
      return this.instanceGettingAccessFrom != null;
    }

    public isGivingAccess = () => {
      return Object.keys(this.instancesGivingAccessTo).length > 0;
    }

    syncInstance = (instance : any) => {}
    updateMappings = () => {}

    sendConsent = () => {}

    private getNetwork = (networkName :string) => {
      for (var networkId in model.networks) {
        if (model.networks[networkId].name === networkName) {
          return model.networks[networkId];
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
      var existingNetwork = this.getNetwork(network.name);
      if (existingNetwork) {
        existingNetwork.online = network.online;
        existingNetwork.userId = network.userId;
        if (!network.online) {
          for (var userId in existingNetwork.roster) {
            var user = existingNetwork.roster[userId];
            this.categorizeUser_(user, user.getCategory(), null);
          }
          existingNetwork.roster = {};
        }
      } else {
        model.networks.push({
          name:   network.name,
          userId: network.userId,
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
      var network = this.getNetwork(payload.network);
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
      var oldCategory = null;

      // CONSIDER: we might want to check if this user has been our proxy
      // server and if so stop the proxying if they are no longer proxying
      // for us (e.g. they were disconnected).  Currently we are sending an
      // explicit stop proxy message from the app to stop proxying.
      if (!user) {
        // New user.
        user = new UI.User(profile.userId, network);
        network.roster[profile.userId] = user;
      } else {
        // Existing user, get the category before modifying any properties.
        oldCategory = user.getCategory();
      }

      user.update(profile);
      user.instances = payload.instances;

      var newCategory = user.getCategory();
      this.categorizeUser_(user, oldCategory, newCategory);

      console.log('Synchronized user.', user);
    };

    private categorizeUser_ = (user, oldCategory, newCategory) => {
      if (oldCategory == null) {
        // User hasn't yet been categorized.
        model.contacts[newCategory].push(user);
      } else if (oldCategory != newCategory) {
        // Remove user from old category.
        var oldCategoryArray = model.contacts[oldCategory];
        for (var i = 0; i < oldCategoryArray.length; ++i) {
          if (oldCategoryArray[i] == user) {
            oldCategoryArray.splice(i, 1);
            break;
          }
        }
        // Add users to new category.
        if (newCategory) {
          model.contacts[newCategory].push(user);
        }
      }
    }
  }  // class UserInterface

}  // module UI
