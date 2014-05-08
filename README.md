# uProxy

[![Build Status](https://magnum.travis-ci.com/uProxy/uProxy.svg?token=HiP4RTme8LSvyrP9kNJq&branch=master)](https://magnum.travis-ci.com/uProxy/uProxy)

[uProxy](uproxy.org) is a broswer extension that lets users share their internet connection.

## Tools

UProxy is built using the following tools:
 - [Grunt](http://gruntjs.com/) for build tasks.
 - [TypeScript](http://www.typescriptlang.org/) as the primary language, which
   compiles to JavaScript. This does type checking and has some syntax
   improvements on JS, while letting us incrementally migrate and easily include external JS packages and frameworks.
 - [Jasmine](http://pivotal.github.io/jasmine/) for testing.
 - [AngularJS](http://angularjs.org) for UI coding.
 - [sass](http://sass-lang.com/) to write css more beautifully.

To manage dependencies we use:
 - [npm](https://www.npmjs.org/) for installing node modules that we use for our build process.  (Specified in `package.json`)
 - [Bower](http://bower.io) to install libraries that we use in the UI
   (specified in `bower.json`) including AngularJS.


## Development setup

### Pre-Requirements to build uProxy

Note: you will either need to run these as root, or set the directories they
modify (`/usr/local`) to being editable by your user (sudo chown -R $USER /usr/local)

- [node](http://nodejs.org/) and the Node Package Manaager (NPM):

    - On Mac with Brew, you can do: `brew install node` (You may need to update you brew package manager, e.g. `brew update`). You can also install directly from a Mac package off the [NodeJS Website](http://nodejs.org/).

    - On Ubuntu, you can do `apt-get install nodejs`.

    - On Archlinux, you can do 'pacman -S nodejs'.

    - You may need to set your `$NODE_PATH` environment variable appropriately
      (e.g. it might be: `/usr/local/share/npm/lib/node_modules`).

    - If you install npm things globally, you'll need to do so as the
      appropriate super-user.

- [bower](http://bower.io/) 1.0 or later: Install globally with `npm install -g bower`. If you already have bower installed at a lower version, run `npm update -g bower`.

    - To run binaries from globally-installed npm packages without
      fully-qualifying paths, make sure you have added your npm bin directory to your path (e.g. `export PATH=$PATH:/usr/local/share/npm/bin/grunt`).

- [Grunt](http://gruntjs.com/): Install globally with `npm install -g grunt-cli

- [Typescript](http://www.typescriptlang.org/): Install globally with  `npm install -g typescript`

- [sass](http://sass-lang.com/):
  `sudo gem install sass` (requires ruby, often comes installed, may need to be installed as super-user)

    - This is assuming you have `ruby` and `rubygems` installed.


### Setup of uProxy codebase

1. Clone uProxy and its submodules (and its submodules' submodules...):
`git clone https://github.com/uProxy/uProxy.git`

2. Run `./setup.sh`. This will install all local dependencies,
as appropriate to run in Chrome and Firefox. The first time you run this, you'll see lots of npm, bower and grunt messages. Check the last couple of lines in case there is an error.

Note that if any local dependencies have changed (i.e. changes to bower dependencies, updates to FreeDOM), you will have to run `./setup.sh` again to update these dependencies.


### Building and installing and running for Chrome

These are the steps to try uProxy in the Chrome browser.

- Run `grunt build_chrome` from the root directory of the repository to compile
  all the typescript and prepare the assets.

- In Chrome, go to `chrome://extensions` and click 'Load unpacked extension...' for both `/build/chrome/app` and `build/chrome/extension`. You need both the uProxy Chrome App and the Extension.


### Development and re-building uProxy

uProxy uses the Grunt build system for its build tasks. Here is a list
of uProxy's Grunt commands:

 *  `setup` - Installs local dependencies and sets up environment
 *  `build` - Builds everything, making stuff in the `build` directory (and runns tests).
   *  `build_chrome` - Build Chrome app and extension
   *  `build_chrome_app` - Build just Chrome app
   *  `build_chrome_extension` - Build just Chrome extension
   *  `build_firefox` - Build just Firefox
   *  `build_uistatic` - Build the static ui.
 *  `clean` - Cleans up
 *  `watch` - Watch for changes and recompile as needed.
 *  `test` - Run unit tests
 *  `xpi` - Generates an .xpi for installation to Firefox.
 *  `run_uistatic` - Run the standalone UI on a local webserver.
 *  `everything` - 'setup', 'test', then 'build'

The easiest way to stay current is to pull changes, run `grunt build` to build
your distribution, then run `grunt watch`, which will rebuild as you make changes. (TODO: grunt watch is broken; fix it!)

Before submitting any changes to the repository, make sure to run `grunt test`
to make sure it passes all unit tests. Failing tests are cause to immediately
reject submissions. :)


### Fixing compilation and setup

The following hints may help you if it goes wrong and you need to debug and fix it.

- The file called `package.json` provides details of node packages used to build uProxy. To download and install them in the right place (typically a subdirectory called `node_packages`) run `npm install`.

- A file called `bower.json` provides details of packages for the UI, typically JavaScript for the browser. Run `bower install` to download and install the dependencies. They are typically installed in a directory called `lib` (as defined by a local file called `.bowerrc`).

- If bower fails, it doesn't tell you. Sometimes things don't work because it failed to install something that you need. You can run bower by hand from the `bower install` and look out for error messages.

- If things are not working, check that you have a recent version of bower, npm, and node.


## Layout of files

Configuration and setup files
 * `setup.sh` a shell script, assumes you have `npm` installed, to setup uproxy (install and setup dependent libraries).
 * `Gruntfile.js` a file that specifies common tasks, e.g. how to build and package uproxy.
 * `bower.json` specified dependent libraries from Bower.
 * `package.json` specified dependent libraries from NPM.
 * `.gitignore` what git should ignore
 * `.bowerrc` tells bower where to put files
 * `.travis.yml` Travis auto-testing
* `tools` directory contains some typescript and javascript to help Grunt.

Source code
 * `src` holds all source code; no compiled files.
 * `src/generic_ui` generic user interface code
 * `src/generic_core` generic uproxy core-functionality code
 * `src/chrome_app` code specific to the chrome app
 * `src/chrome_extension` code specific to the chrome extension
 * `src/firefox` code specific to filefox
 * `third_party` holds external libraries we depend on that are copied into this repository.
 * `node_modules` dynamically generated npm module dependencies.
 * `scraps` temporary holding for sharing scraps of code.

Dynamically created directories (`grunt clean` should remove them)
 * `build` created by grunt tasks; holds the built code, but none of the code that was compiled.
 * `dist` created by grunt tasks; holds final distirbution versions.
 * `test_output` created by grunt tasks; holds test-output files.
 * `.grunt` holds grunt cache stuff
 * `.sass-cache` holds sass cache stuff

## Glossary of frameworks you need to know about

 * AngularJS - a UI framework for html/JS apps.
 * Jasmine - a testing framework for JavaScript.
 * Karma - a test runner or angularjs.
 * Grunt (and the `Gruntfile.js` file) - a JavaScript task runner, used for compilation/building.
 * NPM (and the `package.json` file): NPM (node package manager) us used to specify dependencies on node modules we use for compilation, e.g. typescript and grunt. These dependencies get places in the `node_modules` directory.
 * Bower (and the `bower.json` file) - a package manager for the web. Used for javascript and web-libraries that the extension uses (e.g. angular). Note: this uses the file .bowerrc to specify where bower components get installed (in third_party/bower_components)
 * Travis: a continnuous build system.
 * Coveralls: a continnuous coverage checking system.
