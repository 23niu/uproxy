import user_interface = require('../../../generic_ui/scripts/ui');
import CoreConnector = require('../../../generic_ui/scripts/core_connector');
import FirefoxCoreConnector = require('./firefox_connector');
import FirefoxBrowserApi = require('./firefox_browser_api');

export var ui   :user_interface.UserInterface;
export var core :CoreConnector;
export var browserConnector: FirefoxCoreConnector;
export var model :user_interface.Model;
function initUI() {
    browserConnector = new FirefoxCoreConnector();
    core = new CoreConnector(browserConnector);
    var firefoxBrowserApi = new FirefoxBrowserApi();

    return new user_interface.UserInterface(core, firefoxBrowserApi);
}

if (undefined === ui) {
    ui = initUI();
    model = ui.model;
}

ui.browser = 'firefox';
