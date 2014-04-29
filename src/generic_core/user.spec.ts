/// <reference path='../interfaces/lib/jasmine/jasmine.d.ts' />
/// <reference path='user.ts' />
/// <reference path='social.ts' />


describe('Core.User', () => {

  // Prepare a fake Social.Network object to construct User on top of.
  var network = jasmine.createSpyObj('network', [
      'api',
      'send',
      'sendInstanceHandshake',
      'getLocalInstanceId'
  ]);

  var profile :freedom.Social.UserProfile = {
    name: 'Alice',
    userId: 'fakeuser',
    timestamp: 456
  };
  var user :Core.User;

  beforeEach(() => {
    spyOn(console, 'log');
    spyOn(console, 'warn');
    spyOn(ui, 'syncInstance');
  });

  it('creates with the correct userId', () => {
    user = new Core.User(network, profile);
    expect(user.userId).toEqual('fakeuser');
    expect(user.name).toEqual('Alice');
  });

  it('created with an empty client and instance tables', () => {
    expect(user.clients).toEqual({});
    expect(user['instances_']).toEqual({});
    expect(user['clientToInstanceMap_']).toEqual({});
    expect(user['instanceToClientMap_']).toEqual({});
  });

  it('sends an instance message to newly ONLINE clients', () => {
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuser',
      clientId: 'fakeclient',
      status: freedom.Social.Status.ONLINE,
      timestamp: 12345
    };
    user.handleClient(clientState);
    expect(network.sendInstanceHandshake).toHaveBeenCalledWith('fakeclient');
    expect(Object.keys(user.clients).length).toEqual(1);
    expect(user.clients['fakeclient']).toEqual(freedom.Social.Status.ONLINE);
    expect(Object.keys(user.clients)).toEqual([
      'fakeclient'
    ]);
  });

  it('does not re-send instance messages to the same client', () => {
    network.sendInstanceHandshake.calls.reset();
    expect(user.clients['fakeclient']).toEqual(freedom.Social.Status.ONLINE);
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuser',
      clientId: 'fakeclient',
      status: freedom.Social.Status.ONLINE,
      timestamp: 12345
    };
    user.handleClient(clientState);
    expect(Object.keys(user.clients).length).toEqual(1);
    expect(Object.keys(user.clients)).toEqual([
      'fakeclient'
    ]);
    expect(network.sendInstanceHandshake).not.toHaveBeenCalled();
  });

  it('does not send instance messages to non-uProxy clients', () => {
    network.sendInstanceHandshake.calls.reset();
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuser',
      clientId: 'fakeclient-not-uproxy',
      status: freedom.Social.Status.ONLINE_WITH_OTHER_APP,
      timestamp: 12345
    };
    user.handleClient(clientState);
    expect(Object.keys(user.clients).length).toEqual(1);
    expect(Object.keys(user.clients)).toEqual([
      'fakeclient',
    ]);
    expect(network.sendInstanceHandshake).not.toHaveBeenCalled();
  });

  it('deletes DISCONNECTED client', () => {
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuser',
      clientId: 'fakeclient',
      status: freedom.Social.Status.OFFLINE,
      timestamp: 12346
    };
    user.handleClient(clientState);
    expect(Object.keys(user.clients).length).toEqual(0);
    expect(user.clients['fakeclient']).not.toBeDefined();
  });

  it('re-adds an re-sends instance message to new ONLINE clients', () => {
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuser',
      clientId: 'fakeclient',
      status: freedom.Social.Status.ONLINE,
      timestamp: 12345
    };
    user.handleClient(clientState);
    expect(network.sendInstanceHandshake).toHaveBeenCalledWith('fakeclient');
    expect(Object.keys(user.clients).length).toEqual(1);
    expect(user.clients['fakeclient']).toEqual(freedom.Social.Status.ONLINE);
    expect(Object.keys(user.clients)).toEqual([
      'fakeclient'
    ]);
  });

  it('logs an error when receiving a ClientState with wrong userId', () => {
    var clientState :freedom.Social.ClientState = {
      userId: 'fakeuserd',
      clientId: 'fakeclient',
      status: freedom.Social.Status.ONLINE,
      timestamp: 12345
    };
    spyOn(console, 'error');
    user.handleClient(clientState);
    expect(console.error).toHaveBeenCalled();
  });

  function makeAliceMessage(msg :uProxy.Message) :freedom.Social.IncomingMessage {
    return {
      from: {
        userId: 'fakeuser',
        clientId: 'fakeclient',
        status: freedom.Social.Status.ONLINE,
        timestamp: 12346
      },
      message: JSON.stringify(msg)
    };
  }

  describe('communications', () => {

    it('handles an INSTANCE message', () => {
      spyOn(user, 'syncInstance_');
      user.handleMessage(makeAliceMessage({
        type: uProxy.MessageType.INSTANCE,
        data: {
          'foo': 1
        }
      }));
      expect(user['syncInstance_']).toHaveBeenCalled();
    });

    it('handles a CONSENT message', () => {
      spyOn(user, 'handleConsent_');
      user.handleMessage(makeAliceMessage({
        type: uProxy.MessageType.CONSENT,
        data: {
          'bar': 2
        }
      }));
      expect(user['handleConsent_']).toHaveBeenCalled();
    });

    it('errors when receiving a message with invalid MessageType', () => {
      spyOn(console, 'error');
      user.handleMessage(makeAliceMessage({
        type: <uProxy.MessageType>0,
        data: {
          'baz': 3
        }
      }));
      expect(console.error).toHaveBeenCalled();
    });

    it('errors when receiving a message with wrong userId', () => {
      var msg :freedom.Social.IncomingMessage = {
        from: {
          userId: 'REALLYfakeuser',
          clientId: 'fakeclient',
          status: freedom.Social.Status.ONLINE,
          timestamp: 12346
        },
        message: 'hello'
      };
      spyOn(console, 'error');
      user.handleMessage(msg);
      expect(console.error).toHaveBeenCalled();
    });

    it('errors when receiving a message with non-existing client', () => {
      var msg :freedom.Social.IncomingMessage = {
        from: {
          userId: 'fakeuser',
          clientId: 'REALLYfakeclient',
          status: freedom.Social.Status.ONLINE,
          timestamp: 12346
        },
        message: 'hello'
      };
      spyOn(console, 'error');
      user.handleMessage(msg);
      expect(console.error).toHaveBeenCalled();
    });

  });  // describe communications

  describe('client <---> instance', () => {

    var instanceData :Instance = {
      instanceId: 'fakeinstance',
      keyHash: null,
      status: null,
      description: 'fake instance',
    };
    var instance :Core.RemoteInstance;

    beforeEach(() => {
      if (instance) {
        spyOn(instance, 'update');
        spyOn(instance, 'send');
      }
    });

    it('syncs clientId <--> instanceId mapping', () => {
      expect(user.instanceToClient('fakeinstance')).toBeUndefined();
      expect(user.clientToInstance('fakeclient')).toBeUndefined();
      user['syncInstance_']('fakeclient', instanceData);
      expect(user.instanceToClient('fakeinstance')).toEqual('fakeclient');
      expect(user.clientToInstance('fakeclient')).toEqual('fakeinstance');
      instance = user.getInstance('fakeinstance');
      expect(instance).toBeDefined();
    });

    it('cleanly updates for new clientId <--> instanceId mappings', () => {
      // New client to be associated with the same instance.
      var clientState :freedom.Social.ClientState = {
        userId: 'fakeuser',
        clientId: 'fakeclient2',
        status: freedom.Social.Status.ONLINE,
        timestamp: 12345
      };
      // spyOn(instance, 'update');
      // Add the new client.
      user.handleClient(clientState);
      // Pretend a valid instance message has been sent from the new client.
      user['syncInstance_']('fakeclient2', instanceData);
      expect(user.instanceToClient('fakeinstance')).toEqual('fakeclient2');
      expect(user.clientToInstance('fakeclient')).toEqual(null);
      expect(user.clientToInstance('fakeclient2')).toEqual('fakeinstance');
    });

    it('sends consent message if Instance already exists', () => {
      var userInstance = user.getInstance('fakeinstance');
      expect(userInstance).toBeDefined();
      spyOn(userInstance, 'sendConsent');
      user['syncInstance_']('fakeclient', instanceData);
      expect(userInstance.sendConsent).toHaveBeenCalled();
    });

    it('syncs UI after updating instance', () => {
      user['syncInstance_']('fakeclient', instanceData);
      expect(ui.syncInstance).toHaveBeenCalled();
    });

  });  // describe client <---> instance

});  // uProxy.User
