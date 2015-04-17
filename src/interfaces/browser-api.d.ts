// Describes the interface for functions that have different implications
// for different browsers.

interface BrowserAPI {
  // Configuration and control of the browsers proxy settings.
  startUsingProxy(endpoint:Net.Endpoint) : void;
  stopUsingProxy() : void;
  // Set the browser icon for the extension/add-on.
  setIcon(iconFile :string) : void;
  // Open a new tab if it is not already open
  launchTabIfNotOpen(url :string) :void;
  // Open a new tab
  openTab(url :string) : void;
  bringUproxyToFront() : void;
  browserSpecificElement : string;

  /*
   * tag is used to uniquely identify notifications.  If it is a json-encoded
   * object with information on the notification, it should be used to
   * determine how to handle clicks to the notification
   */
  showNotification(text :string, tag :string) :void;

  // Should end in a forward slash.
  frontDomain :string;

  /**
    * Make a POST request to a given url.
    *
    * If cloudfrontDomain is provided, we really want to visit
    * cloudfrontDomain + cloudfrontPath (url is ignored).
    * Domain fronted requests are made via frontDomain.
    * cloudfrontPath should not start with a leading forward slash.
    */
  httpPost(url :string, data :any, cloudfrontDomain ?:string,
           cloudfrontPath ?:string) : Promise<void>;
}

declare var Notification : {
  new (title :string, options ?:any) : any;
}
