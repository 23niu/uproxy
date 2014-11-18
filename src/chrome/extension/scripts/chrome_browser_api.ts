/**
 * chrome_browser_api.ts
 *
 * Chrome-specific implementation of the Browser API.
 */
/// <reference path='../../../interfaces/browser-api.d.ts' />
/// <reference path='../../../third_party/typings/chrome/chrome.d.ts'/>
/// <reference path='../../../networking-typings/communications.d.ts' />


class ChromeBrowserApi implements BrowserAPI {

  // For browser action.

  public ICON_DIR :string = 'icons/';

  public setIcon = (iconFile :string) : void => {
    chrome.browserAction.setIcon({
      path: this.ICON_DIR + iconFile
    });
  }

  // For proxy configuration.

  private preUproxyConfig_ :chrome.proxy.ProxyConfig = null;
  private uproxyConfig_ :chrome.proxy.ProxyConfig = null;
  private running_ :boolean = false;

  constructor() {
    // use localhost
    this.uproxyConfig_ = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "socks5",
          host: null,
          port: null
        }
      }
    };

    // TODO: tsd's chrome definition is missing .clear on ChromeSetting, which
    // is why we employ a hacky thing here.
    chrome.proxy.settings['clear']({scope: 'regular'});
  }

  public startUsingProxy = (endpoint:Net.Endpoint) => {
    if (this.running_ == false) {
      this.uproxyConfig_.rules.singleProxy.host = endpoint.address;
      this.uproxyConfig_.rules.singleProxy.port = endpoint.port;
      console.log('Directing Chrome proxy settings to uProxy');
      this.running_ = true;
      chrome.proxy['settings']['get']({incognito:false},
        (details) => {
          this.preUproxyConfig_ = details.value;
          chrome.proxy.settings.set({
              value: this.uproxyConfig_,
              scope: 'regular'
            }, () => {console.log('Successfully set proxy');});
        });
    }
  };

  public stopUsingProxy = (askUser :boolean) => {
    if (askUser && this.running_ == true) {
      // Create a tab which prompts the user to decide if they want
      // to reset their proxy config.
      this.launchTabIfNotOpen("polymer/disconnected.html");
    } else if (!askUser && this.running_ == true) {
      this.revertProxySettings_();
    }
  };

  private revertProxySettings_ = () => {
    if (this.running_ == true) {
      console.log('Reverting Chrome proxy settings');
      this.running_ = false;
      chrome.proxy.settings.set({
        value: this.preUproxyConfig_,
        scope: 'regular'
      });
    }
  };

  // For FAQ.

  public openFaq = (pageAnchor ?:string) => {
    var faqUrl = "../polymer/faq.html";
    if (pageAnchor) {
      chrome.tabs.create({url: faqUrl + '#' + pageAnchor});
    } else {
      chrome.tabs.create({url: faqUrl});
    }
  }

  // Other.

  /**
    * Launch a tab with the url if no existing tab is open with that url.
    * @param relativeUrl must refer to a local page and should be relative
    *                    to the extension URL.
    */
  public launchTabIfNotOpen = (relativeUrl :string) => {
    chrome.tabs.query({currentWindow: true}, function(tabs){
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].url == chrome.extension.getURL(relativeUrl)) {
          chrome.tabs.update(tabs[i].id, {url: "../" + relativeUrl, active: true});
          return;
        }
      }
      chrome.tabs.create({url: "../" + relativeUrl});
    });
  }
}
