UProxy
======


### Layout

This is the top-level [UProxy repository](https://github.com/UWNetworksLab/UProxy). It contains all code for UProxy. Browser-dependent components live in "chrome" and "firefox" subdirectories. Browser-independent components live in the 'common' subdirectory.

### Tools

UProxy is built using the following tools:

 - We use [Grunt](http://gruntjs.com/) as the build system.
 - We have now committed to writing our JavaScript as [TypeScript](http://www.typescriptlang.org/), this does type checking and has some syntax improvements on JS, while letting us incrementally migrate and easily include external JS packages and frameworks.
 - We use [Jasmine](http://pivotal.github.io/jasmine/) to write, run and do unit tests.
We use git submodule to include the freedom library into uproxy.
 - We use [Bower](http://bower.io) to install libraries that we use in the UI (specified in `common/ui/bower.json`) including AngularJS.
 - We use [AngularJS](http://angularjs.org) for UI coding
 - We use npm for installing node modules that we use for our build process (Specified in the package.json)
 - We use [sass](http://sass-lang.com/) to write css in a nicer way.

### Development setup

#### Pre-Requirements

Note: you will either need to run these as root, or set the directories they
modify (/usr/local) to being editable by your user (sudo chown -R $USER /usr/local)

- [node](http://nodejs.org/) + npm: `brew install node # or similar for your system` (You may need to update you brew package manager, e.g. `brew update`)

    - You may need to set your $NODE_PATH environment variable appropriately
      (e.g. it might be: `/usr/local/share/npm/lib/node_modules`).

    - If you install npm things globally, you'll need to do so as the
      appropriate super-user.

- [grunt](http://gruntjs.com/): `npm install -g grunt-cli`

- [bower](http://bower.io/) 1.0 or later: `npm install -g bower`. If you already have bower installed at a lower version, run `npm update -g bower`.

    - To run binaries from globally-installed npm packages without
      fully-qualifying paths, add your npm bin directory to your path
      (e.g. /usr/local/share/npm/bin/grunt).

- [compass](http://compass-style.org/):
  `gem install compass` (requires ruby, often comes installed, may need to be installed as super-user)

    - This is assuming you have `ruby` and `rubygems` installed.

#### Installation, setup, compilation, updating

1. Clone UProxy and its submodules (and its submodules' submodules...):
`git clone https://github.com/UWNetworksLab/UProxy.git`

2. Run `./setup.sh`. This will install all local dependencies,
as appropriate to run in Chrome.
The first time you run this, you'll see lots of npm, bower and grunt
messages. Check the last couple of lines in case there is an error.

Note that if any local dependencies have changed (i.e. changes to bower dependencies,
updates to FreeDOM), you will have to run `./setup.sh` to update these dependencies.


#### Running in Chrome

1. In Chrome, navigate to chrome://extensions, check 'Developer Mode'.

2. Click 'Load unpacked extension...' and select the 'chrome/app' directory.

3. Click 'Load unpacked extension...' and select the 'chrome/extension/src' directory.

#### Development

UProxy uses the Grunt build system for development. Here are a list
of supported Grunt commands:
 *  `build` - Builds Chrome and Firefox extensions
 *  `setup` - Installs local dependencies and sets up environment
 *  `xpi` - Generates an .xpi for installation to Firefox.
 *  `test` - Run unit tests
 *  `watch` - Watch for changes in 'common' and copy as necessary
 *  `clean` - Cleans up
 *  `build_chrome` - Build just Chrome
 *  `build_firefox` - Build just Firefox
 *  `everything` - 'setup', 'test', then 'build'

The easiest way to stay current is to pull changes, run `grunt build` to build
your distribution, then run `grunt watch`, which will rebuild as you make changes. (TODO: grunt watch is broken; fix it!)

Before submitting any changes to the repository, make sure to run `grunt test`
to make sure it passes all unit tests. Failing tests are cause to immediately
reject submissions.

#### Testing in Firefox

1. TODO


#### Building the packaged Chrome extension

- Run `grunt build` from the chrome/extension directory to lint the script, run tests, and if those go well, build a packed extension.

- To test the built extension, go to `chrome://extensions` and load it both the uProxy extension and app using developer mode from the `chrome/extension/src` directory and the `chrome/app` directory.


#### Fixing compilation and setup

The following hints may help you if it goes wrong and you need to debug and fix it.

- A file called `package.json` provides details of node packages used to build uProxy. To download and install them in the right place (typically a subdirectory called `node_packages`) run `npm install`.

- A file called `bower.json` provides details of packages for the UI, typically JavaScript for the browser. Run `bower install` to download and install the dependencies. They are typically installed in a directory called `lib` (as defined by a local file called `.bowerrc`).

- If bower fails, it doesn't tell you. Sometimes things don't work because it failed to install something that you need. You can run bower by hand from the `common/ui` directory and look out for error messages.

- Check that you have the latest freedom.js.

- If things are not working, check that you have a recent version of bower, npm, and node.
