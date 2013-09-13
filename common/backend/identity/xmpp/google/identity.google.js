var chrome = {
  socket: freedom['core.socket']()
};
  
console.warn = function(f) {
  console.log(f);
};

var window = {};
var view = freedom['core.view']();

function IdentityProvider() {
  //DEBUG
  window.current = this;
  console.log("Google Identity provider");
  
  this.client = null;
  this.credentials = null;
  this.loginOpts = null;

  this.status = 'offline';
  //dispatchEvent is not bound until after constructor
  setTimeout((function () {
    this.dispatchEvent('onStatus', {
      status: this.status, network: 'google', message: "Init Google identity provider"
    });
  }).bind(this), 0);
  this.profile = {
    me: {},
    roster: {}
  };

  view.open({file: 'google'}).done(function() {
    view.show();
  });
};

IdentityProvider.prototype.login = function(opts, continuation) {
  this.loginOpts = opts;
  if (!this.credentials) {
    this.status = 'authenticating';
    this.dispatchEvent('onStatus', {
      status: this.status, network: 'google', message: "G+ OAuth2 Sequence"
    });
    view.once('message', function(opts, cont, message) {
      if (message.cmd && message.cmd == 'google-auth') {
        this.credentials = message.message;
        this.login(opts, cont);
      } else {
        cont(message);
      }
    }.bind(this, opts, continuation));
    view.postMessage({
      cmd: 'google-login',
      interactive: opts.interactive
    });
    return;
  } else if (!this.client) {
    var clientId = this.credentials.userId + '/' + this.loginOpts.agent;
    this.status = 'connecting';
    this.dispatchEvent('onStatus', {
      userId: this.credentials.userId,
      network: 'google',
      status: this.status, 
      message: "G+ XMPP connect"
    });
    this.profile.me[this.credentials.userId] = {};
    this.profile.me[this.credentials.userId].userId = this.credentials.userId;
    this.profile.me[this.credentials.userId].clients = {};
    this.profile.me[this.credentials.userId].clients[clientId] = {
      clientId: clientId, 
      network: 'google',
      status: 'offline'
    };
    //Start XMPP client
    this.client = new window.XMPP.Client({
      xmlns:'jabber:client',
      jid: clientId,
      oauth2_token: this.credentials.token,
      oauth2_auth: 'http://www.google.com/talk/protocol/auth',
      host: "talk.google.com"
    });
    //TODO(willscott): Support Upgrade to TLS wrapped connection.  
    this.client.connection.allowTLS = false;
    //this.client.addListener('online', function(){this.client.send(new window.XMPP.Element('presence', {}));}.bind(this));
    //this.client.addListener('stanza', function(s) {console.log(s.attrs.from);} );
    this.client.addListener('online', this.onOnline.bind(this));
    this.client.addListener('error', function(e) {
      console.warn(e);
      this.status = 'error';
      this.dispatchEvent('onStatus', {
        userId: this.credentials.userId,
        network: 'google',
        status: this.status, 
        message: JSON.stringify(e)
      })
      continuation();
    }.bind(this));
    this.client.addListener('stanza', this.onMessage.bind(this));
  }
  continuation();
};

IdentityProvider.prototype.getProfile = function(id, continuation) {
  //TODO get profiles for other users
  if (id == undefined) {
    continuation(this.profile);
  } else if (this.profile.me[id]) {
    continuation(this.profile);
  } else if (this.profile.roster[id]) {
    continuation({me: this.profile.roster[id], roster: {}});
  }
};

// Send a message to someone.
IdentityProvider.prototype.sendMessage = function(to, msg, continuation) {
  this.client.send(new window.XMPP.Element('message', {
    to: to,
    type: 'chat'
  }).c('body').t(JSON.stringify(msg)));
  continuation();
};

IdentityProvider.prototype.logout = function(userId, networkName, continuation) {
  //@TODO(ryscheng) debug, remove oAuth stuffies
  this.status = 'offline'; 
  userId = this.credentials.userId;
  this.dispatchEvent('onStatus', {
    userId: userId,
    network: 'google',
    status: this.status,
    message: 'Woo!'
  });
  this.profile.me[userId].clients = {};
  this.dispatchEvent('onChange', this.profile.me[userId]);
  for (var id in this.profile.roster) {
    if (this.profile.roster.hasOwnProperty(id)) {
      this.profile.roster[id].clients = {};
      this.dispatchEvent('onChange', this.profile.roster[id]);
    }
  }
  this.credentials = null;
  this.unannounce();
  this.client.end();
  this.client = null;
  continuation({
    userId: userId,
    success: true,
    message: 'Logout Google'
  });
};


////////////////////////////////////
// INTERNAL METHODS
////////////////////////////////////

function getBaseJid(fullJid) {
  if (fullJid.indexOf('/') < 0) {
    return fullJid;
  } else {
    return fullJid.substring(0, fullJid.indexOf('/'));
  }
}

IdentityProvider.prototype.getAttr = function (fullJid, attr) {
  var baseJid = getBaseJid(fullJid);
  if (this.profile.me[baseJid] && this.profile.me[baseJid][attr]) {
    return this.profile.me[baseJid][attr];
  } else if (this.profile.roster[baseJid] && this.profile.roster[baseJid][attr]) {
    return this.profile.roster[baseJid][attr];
  } else {
    return null;
  }
};

IdentityProvider.prototype.sendChange = function (jid) {
  var baseJid = getBaseJid(jid);
  if (this.profile.me[baseJid]) {
    this.dispatchEvent('onChange', this.profile.me[baseJid]);
  } else if (this.profile.roster[baseJid]) {
    this.dispatchEvent('onChange', this.profile.roster[baseJid]);
  } else {
    console.log("Error - missing roster: "+baseJid);
  }
};

IdentityProvider.prototype.setAttr = function (fullJid, attr, value) {
  var baseJid = getBaseJid(fullJid);
  if (this.profile.me[baseJid]) {
    this.profile.me[baseJid][attr] = value;
  } else if (this.profile.roster[baseJid]) {
    this.profile.roster[baseJid][attr] = value;
  } else {
    this.profile.roster[baseJid] = {userId: baseJid};
    this.profile.roster[baseJid][attr] = value;
  }
  this.sendChange(baseJid);
};

IdentityProvider.prototype.setDeviceAttr = function (fullJid, attr, value) {
  var baseJid = getBaseJid(fullJid);
  var clientList = {};
  clientList[fullJid] = {clientId: fullJid, network: 'google'};
  if (this.profile.me[baseJid] && this.profile.me[baseJid].clients) {
    clientList = this.profile.me[baseJid].clients;
  } else if (this.profile.me[baseJid]) {
    this.profile.me[baseJid].clients = clientList;
  } else if (this.profile.roster[baseJid] && this.profile.roster[baseJid].clients) {
    clientList = this.profile.roster[baseJid].clients;
  } else if (this.profile.roster[baseJid]) {
    this.profile.roster[baseJid].clients = clientList;
  } else {
    this.profile.roster[baseJid] = {userId: baseJid, clients: clientList};
  }

  if (clientList[fullJid]) {
    clientList[fullJid][attr] = value;
  } else {
    clientList[fullJid] = {clientId: fullJid};
    clientList[fullJid][attr] = value;
  }
  this.sendChange(baseJid);
};

IdentityProvider.prototype.onOnline = function() {
  //Send first presence message
  this.announce();
  this.status = 'online';
  this.dispatchEvent('onStatus', {
    userId: this.credentials.userId,
    network: 'google',
    status: this.status, 
    message: "Woo!"
  });
  //Get roster request (for names)
  this.client.send(new window.XMPP.Element('iq', {type: 'get'})
    .c('query', {'xmlns': 'jabber:iq:roster'}).up());
  //Get my own vCard
  this.client.send(new window.XMPP.Element('iq', {
    type: 'get',
    to: this.credentials.userId
  }).c('vCard', {'xmlns': 'vcard-temp'}).up());
  //Update status
  var clients = this.profile.me[this.credentials.userId].clients;
  for (var k in clients) {
    if (clients.hasOwnProperty(k) && clients[k].clientId.indexOf(this.loginOpts.agent) >= 0) {
      clients[k].status = 'messageable';
    }
  }
};

IdentityProvider.prototype.announce = function () {
  this.client.send(new window.XMPP.Element('presence', {})
    .c("show").t("xa").up() //mark status of this client as 'extended away'.
    .c("c", { // Advertise extended capabilities.
      xmlns: "http://jabber.org/protocol/caps",
      node: this.loginOpts.url,
      ver: this.loginOpts.version,
      hash: "fixed"
    }).up()
    //.c('priority').t("-127").up() // mark priority as low.
  );
  //this.client.send(new window.XMPP.Element('presence', {}));
};

IdentityProvider.prototype.unannounce = function() {
  this.client.send(new window.XMPP.Element('presence', {type: 'unavailable'}));
};

IdentityProvider.prototype.onRoster = function(stanza) {
  if (window.roster) {
    window.roster.push(stanza);
  } else {
    window.roster = [stanza];
  }
  //Expect result from roster 'get'
  var from = null;
  if (stanza.attrs.from) {
    from = stanza.attrs.from;
  } else {
    from = stanza.attrs.to;
  }
  var query = stanza.getChild('query');
  var vCard = stanza.getChild('vCard');
  if (query && query.attrs.xmlns == 'jabber:iq:roster') {
    var items = query.getChildren('item');
    //Collect names in associative array
    for (var i = 0; i < items.length; i++) {
      var attrs = items[i].attrs;
      if (attrs.jid && attrs.name) {
        this.setAttr(attrs.jid, 'name', attrs.name);
      }
    }
  }
  if (vCard && vCard.attrs.xmlns == 'vcard-temp') {
    var fn = vCard.getChildText('FN');
    var url = vCard.getChildText('URL');
    var photo = vCard.getChild('PHOTO');
    if (fn) {
      this.setAttr(from , 'name', fn);
    }
    if (url) {
      this.setAttr(from , 'url', url);
    }
    if (photo && photo.getChildText('EXTVAL')) {
      this.setAttr(from , 'imageUrl', photo.getChildText('EXTVAL'));
    } else if (photo && photo.getChildText('TYPE') && photo.getChildText('BINVAL')) {
      var type = photo.getChildText('TYPE');
      var bin = photo.getChildText('BINVAL');
      //TODO(ryscheng) deal with it
    }
  }

};

IdentityProvider.prototype.onPresence = function(stanza) {
  console.log(stanza.attrs.from);
  if(window.presence) {
    window.presence.push(stanza);
  } else {
    window.presence = [stanza];
  }
  //Set status
  var status = stanza.getChildText("show") || "online";
  if (stanza.attrs.type == 'unavailable') {
    status = stanza.attrs.type;
  } 
  var hash = "unknown";
  try {
    hash = stanza.getChild("x").getChildText("photo");
  } catch(e) {
  }
  if (status == 'unavailable') {
    this.setDeviceAttr(stanza.attrs.from, 'status', 'offline');
  } else { //must be online or messageable
    //Set Uproxy capability
    var cap = stanza.getChild('c');
    //TODO check application version mismatch
    if (cap && cap.attrs.node==this.url) { //&& cap.attrs.ver==this.loginOpts.version) {
      this.setDeviceAttr(stanza.attrs.from, 'status', 'messageable');
    } else {
      this.setDeviceAttr(stanza.attrs.from, 'status', 'online');
    }
  }
  this.setDeviceAttr(stanza.attrs.from, 'xmppStatus', status);
  this.setDeviceAttr(stanza.attrs.from, 'hash', hash);
    
  //Request vCard if not seen before
  //TODO(ryscheng) - Do this in a better way that caches results
  if (this.getAttr(stanza.attrs.from, 'name') == null) {
    //TODO(ryscheng) Used to permanently dedup iq requests. Probably a better way
    this.setAttr(stanza.attrs.from, 'name', ' ');
    this.client.send(new window.XMPP.Element('iq', {
      type: 'get',
      to: getBaseJid(stanza.attrs.from)
    }).c('vCard', {'xmlns': 'vcard-temp'}).up());
  }
};

IdentityProvider.prototype.onMessage = function(stanza) {
  //console.log("incoming message from " + from + ": " + msg);
  if (stanza.is('message') && stanza.getChildText('body') && stanza.attrs.type !== 'error') {
    //TODO(ryscheng): extract data, send cleaned up stream structure?
    this.setDeviceAttr(stanza.attrs.from, 'lastSeen', new Date());
    //TODO check intended recipient
    if (stanza.attrs.to.indexOf(this.loginOpts.agent) >= 0) {
      this.dispatchEvent('onMessage', {
        fromUserId: getBaseJid(stanza.attrs.from),
        fromClientId: stanza.attrs.from, 
        toUserId: getBaseJid(stanza.attrs.to),
        toClientId: stanza.attrs.to,
        message: JSON.parse(stanza.getChildText('body'))
      });
    } else {
      //this wasn't intended for me
      console.log('Unprocessed message: '+ JSON.stringify(stanza));
    }
  } else if (stanza.is('iq') && stanza.attrs.type == 'get') {
    // Respond to capability requests from other users.
    var query = stanza.getChild("query");
    if (query && query.attrs.xmlns == "http://jabber.org/protocol/disco#info") {
      this.setDeviceAttr(stanza.attrs.from, 'lastSeen', new Date());
      stanza.attrs.to = stanza.attrs.from;
      delete stanza.attrs.from;
      stanza.attrs.type = 'result';
      query.c('identity', {category: 'client', name: this.loginOpts.agent, type: 'bot'}).up()
        .c('feature', {'var': 'http://jabber.org/protocol/caps'}).up()
        .c('feature', {'var': 'http://jabber.org/protocol/disco#info'}).up()
        .c('feature', {'var': this.url}).up();
      this.client.send(stanza);
    }
  } else if (stanza.is('iq') && stanza.attrs.type == 'result') {
    this.onRoster(stanza);
  } else if (stanza.is('presence')) {
    this.onPresence(stanza);
  } else {    //Unhandled message
    if (window.droppedMessages) {
      window.droppedMessages.push(stanza);
    } else {
      window.droppedMessages = [stanza];
    }

  }

};

var identity = freedom.identity();
identity.provideAsynchronous(IdentityProvider);
