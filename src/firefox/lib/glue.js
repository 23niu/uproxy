/**
 * Forwards data from content script to freedom;
 * TODO(salomegeo): rewrite in typescript;
 * Figure out a way to avoid freeom -> add-on env -> content script -> add-on
 * for proxy setting and setiing a main icon.
 */

var proxyConfig = require('firefox_proxy_config.js').proxyConfig;

// TODO: rename uproxy.js/ts to uproxy-enums.js/ts
var uProxy = require('uproxy.js').uProxy;
var { Ci, Cc, Cr } = require("chrome");
var self = require("sdk/self");
var events = require("sdk/system/events");
var notifications = require('sdk/notifications')
var pagemod = require('sdk/page-mod');

// TODO: rename freedom to uProxyFreedomModule
function setUpConnection(freedom, panel, button) {
  function connect(command, from, to) {
    from.on(command, function(data) {
      to.emit(command, data);
    })
  }

  function openURL(url) {
    var win = Cc['@mozilla.org/appshell/window-mediator;1']
        .getService(Ci.nsIWindowMediator)
        .getMostRecentWindow('navigator:browser');
    if (url.indexOf(':') < 0) {
      url = self.data.url(url);
    }
    win.gBrowser.selectedTab = win.gBrowser.addTab(url);
    panel.hide();
  }

  // Set up listeners between core and ui.
  for (var command in uProxy.Command) {
    if (typeof uProxy.Command[command] === 'number') {
      connect('' + uProxy.Command[command], panel.port, freedom);
    }
  }

  for (var update in uProxy.Update) {
    if (typeof uProxy.Update[update] === 'number') {
      connect('' + uProxy.Update[update], freedom, panel.port);
    }
  }

  panel.port.on('startUsingProxy', function(endpoint) {
    proxyConfig.startUsingProxy(endpoint);
  });

  panel.port.on('stopUsingProxy', function() {
    proxyConfig.stopUsingProxy();
  });

  panel.port.on('setIcon', function(iconFiles) {
    button.state("window", {
      icon : iconFiles
    });
  });

  panel.port.on('showPanel', function() {
    panel.show({
      position: button
    });
  });

  panel.port.on('openURL', function(url) {
    openURL(url);
  });

  panel.port.on('launchTabIfNotOpen', function(url) {
    // TODO: only launch if not open (https://github.com/uProxy/uproxy/issues/1124)
    openURL(url);
  });

  panel.port.on('showNotification', function(notification) {
    notifications.notify({
      text: notification.text,
      iconURL: './icons/128_online.png',
      data: notification.tag,
      onClick: function(data) {
        panel.port.emit('notificationClicked', data);
      }
    });
  });

  /* Allow any pages in the addon to send messages to the UI or the core */
  pagemod.PageMod({
    include: self.data.url('*'),
    contentScriptFile: self.data.url('scripts/content-proxy.js'),
    onAttach: function(worker) {
      worker.port.on('update', function(data) {
        panel.port.emit(uProxy.Update[data.update], data.data);
      });

      worker.port.on('command', function(data) {
        freedom.emit(uProxy.Command[data.command], data.data);
      });

      worker.port.on('stopUsingProxy', proxyConfig.stopUsingProxy);
    }
  });
}

exports.setUpConnection = setUpConnection
