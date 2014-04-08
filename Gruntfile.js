/**
 * UProxy Grunt Build System
 * Support commands:
 * grunt
 *  build - Builds Chrome and Firefox extensions
 *  setup - Installs local dependencies and sets up environment
 *  xpi - Generates an .xpi for installation to Firefox.
 *  test - Run unit tests
 *  watch - Watch for changes in 'common' and copy as necessary
 *  clean - Cleans up
 *  build_chrome - build Chrome files
 *  build_chrome_extension - build Chrome extension files
 *  build_chrome_app - build Chrome app files
 *  build_firefox - build Firefox
 *  everything - 'setup', 'test', then 'build'
 **/

var TaskManager = require('./tools/taskmanager');

// TODO: Move more file lists here.
var FILES = {
  jasminehelper: [
    // Help Jasmine's PhantomJS understand promises.
    'node_modules/es6-promise/dist/promise-*.js',
    '!node_modules/es6-promise/dist/promise-*amd.js',
    '!node_modules/es6-promise/dist/promise-*.min.js'
  ],
  // Mocks for chrome app/extension APIs.
  jasmine_chrome: [
    // TODO: Update the path after reorganizing chrome directories.
    'build/mocks/chrome_mocks.js'
  ],
  jasminesrc: [
    // Required files for testing.
    'src/scraps/test/freedom-mocks.js',
    'build/generic_core/uproxy_core/util.js',
    'build/generic_core/uproxy_core/nouns-and-adjectives.js',
    'build/generic_core/uproxy_core/constants.js',
    'build/generic_core/uproxy_core/state-storage.js',
    'build/generic_core/uproxy_core/social.js',
    'build/generic_core/uproxy_core/uproxy.js',
    'build/generic_core/uproxy_core/start-uproxy.js'
  ],
};

module.exports = function(grunt) {
  grunt.initConfig({
    'pkg': grunt.file.readJSON('package.json'),

    //-------------------------------------------------------------------------
    'shell': {
      bower_install: {
        command: 'bower install',
        options: {stdout: true, stderr: true, failOnError: true}
      },
      socks_rtc_setup: {
        command: 'npm install;grunt',
        options: {stdout: true, stderr: true, failOnError: true, execOptions: {cwd: 'node_modules/socks-rtc'}}
      },
    },

    //-------------------------------------------------------------------------
    'clean': ['build',
              'dist',
              'tmp',
              '.sass-cache',
              '.grunt',
              'node_modules',
              'test_output',
              'external_lib/bower_components'],

    //-------------------------------------------------------------------------
    'copy': {
      // Generic (platform independent) UI stuff to be copied.
      generic_ui: {files: [
        // Non-compiled generic stuff
        {expand: true, cwd: 'src/generic_ui',
         src: ['**', '!**/spec', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/generic_ui'},
        // Icons
        {expand: true, cwd: 'src',
         src: ['icons/**'],
         dest: 'build/generic_ui'},
        // Libraries
        {expand: true, cwd: 'external_lib/bower_components/',
         src: ['lodash/dist/lodash.js',
               'angular/angular.js',
               'angular-animate/angular-animate.js',
               'json-patch/jsonpatch.js',
               'angular-lodash/angular-lodash.js'],
         dest: 'build/generic_ui/lib'}
      ]},

      generic_core: {files: [
        // Non-compiled generic stuff
        {expand: true, cwd: 'src/generic_core',
         src: ['**', '!**.spec.js', '!**.spec.ts', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/generic_core'},
        // Icons
        {expand: true, cwd: 'src',
         src: ['icons/**'],
         dest: 'build/generic_core'},
        // TODO: update the social provider to this when ready:
        // {expand: true, cwd: 'node_modules/freedom-social-xmpp‎/node-xmpp-browser.js',
        //  src: ['node-xmpp-browser.js'],
        //  dest: 'build/generic_core/lib'}
        {expand: true, cwd: 'node_modules/freedom/providers/social',
         src: ['websocket-server/**'],
         dest: 'build/generic_core/lib'},
        {expand: true, cwd: 'node_modules/socks-rtc/build/',
         src: ['rtc-to-net/**'],
         dest: 'build/generic_core/lib'},
        {expand: true, cwd: 'node_modules/socks-rtc/build/',
         src: ['socks-to-rtc/**'],
         dest: 'build/generic_core/lib'}
      ]},

      // Static/independent UI. Assumes the top-level task generic_ui
      // completed.
      uistatic: {files: [
        // The platform specific non-compiled stuff, and...
        {expand: true, cwd: 'src/uistatic',
         src: ['**', '!**/spec', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/uistatic/'},
        // ... the generic ui stuff
        {expand: true, cwd: 'build/generic_ui',
         src: ['**'],
         dest: 'build/uistatic/'}
      ]},

      // Chrome extension. Assumes the top-level task generic_ui completed.
      chrome_extension: {files: [
        // Libraries
        {expand: true, cwd: 'node_modules/freedom-for-chrome/',
         src: ['freedom.js'],
         dest: 'build/chrome_extension/lib'},
        // The platform specific non-compiled stuff, and...
        {expand: true, cwd: 'src/chrome_extension',
         src: ['**', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/chrome_extension/'},
        // ... the generic ui stuff
        {expand: true, cwd: 'build/generic_ui',
         src: ['**'],
         dest: 'build/chrome_extension/'},
        // app-extension glue.
        {expand: true, cwd: 'build/interfaces',
         src: ['chrome_glue.js'],
         dest: 'build/chrome_extension/scripts/'}
      ]},

      // Chrome app. Assumes the top-level task generic_core completed.
      chrome_app: {files: [
        // Libraries
        {expand: true, cwd: 'node_modules/freedom-for-chrome/',
         src: ['freedom-for-chrome.js'],
         dest: 'build/chrome_app/lib'},
        // The platform specific stuff, and...
        {expand: true, cwd: 'src/chrome_app',
         src: ['**', '!**/spec', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/chrome_app/'},
        // ... the generic core stuff
        {expand: true, cwd: 'build/generic_core',
         src: ['**'],
         dest: 'build/chrome_app/'},
        // app-extension glue.
        {expand: true, cwd: 'build/interfaces',
         src: ['chrome_glue.js'],
         dest: 'build/chrome_app/scripts/'},
        {expand: true, cwd: 'node_modules/socks-rtc/src/chrome-providers',
         src: ['**'],
         dest: 'build/chrome_app/lib/freedom-providers'}
      ]},

      // Firefox. Assumes the top-level tasks generic_core and generic_ui
      // completed.
      firefox: {files: [
        // The platform specific stuff, and...
        {expand: true, cwd: 'src/firefox/',
         src: ['**', '!**/spec', '!**/*.md', '!**/*.ts', '!**/*.sass'],
         dest: 'build/firefox/'},
        // ... the generic core stuff
        {expand: true, cwd: 'build/generic_core',
         src: ['**'],
         dest: 'build/firefox/'},
        // ... the generic UI stuff
        {expand: true, cwd: 'build/generic_ui',
         src: ['**'],
         dest: 'build/firefox/'}
      ]}
    },

    //-------------------------------------------------------------------------
    'sass': {
      generic_ui: {
        files: [
          { expand: true, cwd: 'src/generic_ui',
            src: ['**/*.sass'],
            dest: 'build/generic_ui/',
            ext: '.css'
          }]
      }
    },

    //-------------------------------------------------------------------------
    'typescript': {
      // uProxy UI without any platform dependencies
      generic_ui: {
        src: ['src/generic_ui/**/*.ts'],
        dest: 'build/generic_ui',
        options: { basePath: 'src/generic_ui/' }
      },

      // Core uProxy without any platform dependencies
      generic_core: {
        src: ['src/generic_core/**/*.ts'],
        dest: 'build/generic_core/',
        options: { basePath: 'src/generic_core/' }
      },

      // uistatic specific typescript
      uistatic: {
        src: ['src/generic_ui/scripts/ui.d.ts',
              'src/generic_core/core.d.ts',
              'src/generic_ui/scripts/ui.ts',
              'src/uistatic/scripts/dependencies.ts'],
        dest: 'build/uistatic/',
      },

      // uProxy chrome extension specific typescript
      chrome_extension: {
        src: ['src/chrome_extension/**/*.ts'],
        dest: 'build/',
        options: { basePath: 'src/' }
      },

      // uProxy chrome app specific typescript
      chrome_app: {
        src: ['src/chrome_app/**/*.ts',
              'src/interfaces/chrome_glue.ts'],
        dest: 'build/',
        options: { basePath: 'src/' }
      },

      // uProxy firefox specific typescript
      firefox: {
        src: ['src/firefox/**/*.ts'],
        dest: 'build/firefox/',
        options: { basePath: 'src/firefox/' }
      },

      // TODO: This is a temporary location for mocks. Needs to be reorganized.
      mocks: {
        src: ['src/scraps/test/**/*.ts'],
        dest: 'build/mocks/',
        options: { basePath: 'src/scraps/test/' }
      },
    },

    //-------------------------------------------------------------------------
    'concat': {
      uistatic: {
        files: [
          {src: ['build/uistatic/src/generic_ui/scripts/ui.js',
                 'build/uistatic/src/uistatic/scripts/dependencies.js'],
           dest: 'build/uistatic/scripts/dependencies.js'}
        ]
      }
    },

    //-------------------------------------------------------------------------
    'jasmine': {
      chrome_extension: {
        src: FILES.jasminehelper
            .concat(FILES.jasmine_chrome)
            .concat([
              'build/chrome_extension/scripts/core_connector.js'
            ]),
        options: {
          // helpers: ['src/scraps/test/example-state.jsonvar',
                    // 'src/scraps/test/example-saved-state.jsonvar'],
          keepRunner: true,
          outfile: 'test_output/_ChromeExtensionSpecRunner.html',
          specs: 'build/chrome_extension/scripts/**/*.spec.js'
        }
      },
      generic_core: {
        // Files being tested
        src: FILES.jasminehelper
              .concat(FILES.jasminesrc),
        options: {
          helpers: ['src/scraps/test/example-state.jsonvar',
                    'src/scraps/test/example-saved-state.jsonvar'],
          keepRunner: true,
          outfile: 'test_output/_CoreSpecRunner.html',
          specs: 'src/generic_core/uproxy_core/**/*.spec.js'
        }
      }
    },

    //-------------------------------------------------------------------------
    'mozilla-cfx': {
      debug_run: {
        options: {
          extension_dir: 'dist/firefox',
          command: 'run'
        }
      }
    },

    //-------------------------------------------------------------------------
    'compress': {
      main: {
        options: {
          mode: 'zip',
          archive: 'dist/uproxy.xpi'
        },
        expand: true,
        cwd: "build/firefox",
        src: ['**'],
        dest: '.'
      }
    },

  });  // grunt.initConfig

  //---------------------------------------------------------------------------
  // Helper function for watch.
  // Combines the cwd and src params of a file to make an expanded src. Used
  // to make a watch actually watch the dependent files.
  // TODO: Write in typescript and specify types.
  function makeSrcOfFiles(files_config_property) {
    var srcs = [];
    var files = grunt.config.get(files_config_property);
    files.map(function(file) {
      file.src.map(function(s) { srcs.push(file.cwd + '/' + s); });
    });
    if(srcs == []) {
      throw("makeSrcOfFiles failed for: " + files_config_property);
    }
    return srcs;
  }
  grunt.config.set('watch', {
    typescript_generic_ui: {
      files: '<%= typescript.generic_ui.src %>',
      tasks: ['typescript:generic_ui']
    },
    typescript_generic_core: {
      files: '<%= typescript.generic_core.src %>',
      tasks: ['typescript:generic_core']
    },
    typescript_chrome_app: {
      files: '<%= typescript.chrome_app.src %>',
      tasks: ['typescript:chrome_app']
    },
    typescript_chrome_extension: {
      files: '<%= typescript.chrome_extension.src %>',
      tasks: ['typescript:chrome_extension']
    },
    typescript_uistatic: {
      files: '<%= typescript.uistatic.src %>',
      tasks: ['typescript:uistatic']
    },
    typescript_firefox: {
      files: '<%= typescript.firefox.src %>',
      tasks: ['typescript:firefox']
    },
    concat_uistatic: {
      files: makeSrcOfFiles('concat.uistatic.files'),
      tasks: ['concat:uistatic']
    },
    sass_generic_ui: {
      files: makeSrcOfFiles('sass.generic_ui.files'),
      tasks: ['sass:generic_ui']
    },
    copy_generic_ui: {
      files: makeSrcOfFiles('copy.generic_ui.files'),
      tasks: ['copy:generic_ui']
    },
    copy_generic_core: {
      files: makeSrcOfFiles('copy.generic_core.files'),
      tasks: ['copy:generic_core']
    },
    copy_uistatic: {
      files: makeSrcOfFiles('copy.uistatic.files'),
      tasks: ['copy:uistatic']
    },
    copy_chrome_extension: {
      files: makeSrcOfFiles('copy.chrome_extension.files'),
      tasks: ['copy:chrome_extension']
    },
    copy_chrome_app: {
      files: makeSrcOfFiles('copy.chrome_app.files'),
      tasks: ['copy:chrome_app']
    },
    copy_firefox: {
      files: makeSrcOfFiles('copy.firefox.files'),
      tasks: ['copy:firefox']
    },
  });

  //-------------------------------------------------------------------------
  // These should match exactly with those listed in package.json.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-typescript');

  //-------------------------------------------------------------------------
  // Define tasks. We use TaskManager to avoid pointless re-compilation.
  var taskManager = new TaskManager.Manager();

  taskManager.add('setup', [
    'shell:bower_install',
  ]);

  taskManager.add('build_generic_core', [
    'typescript:generic_core',
    'copy:generic_core'
  ]);

  taskManager.add('build_generic_ui', [
    'typescript:generic_ui',
    'sass:generic_ui',
    'copy:generic_ui'
  ]);

  taskManager.add('build_uistatic', [
    'build_generic_ui',
    'typescript:uistatic',
    'concat:uistatic',
    'copy:uistatic'
  ]);

  taskManager.add('build_chrome_extension', [
    'build_generic_ui',
    'typescript:chrome_extension',
    'copy:chrome_extension',
  ]);

  taskManager.add('build_chrome_app', [
    'build_generic_core',
    'typescript:chrome_app',
    'copy:chrome_app',
  ]);

  taskManager.add('build_chrome', [
    'build_chrome_extension',
    'build_chrome_app'
  ]);

  // Firefox build tasks.
  taskManager.add('build_firefox', [
    'build_generic_ui',
    'build_generic_core',
    'copy:firefox'
  ]);

  taskManager.add('build_firefox_xpi', [
    "build_firefox",
    "compress:main"
  ]);

  taskManager.add('run_firefox', [
    'build_firefox',
    'mozilla-cfx:debug_run'
  ]);

  taskManager.add('test_chrome_extension', [
    'typescript:mocks',
    'build_chrome_extension',
    'jasmine:chrome_extension'
  ]);

  taskManager.add('test_core', [
    'build_generic_core',
    'jasmine:generic_core'
  ]);

  taskManager.add('test', [
    'test_core',
    'test_chrome_extension'
  ]);

  taskManager.add('build', [
    'build_chrome_app',
    'build_chrome_extension',
    'build_firefox',
    'build_uistatic',
    'test'
  ]);

  taskManager.add('everything', ['setup', 'build']);

  // Default task(s).
  taskManager.add('default', ['build']);

  taskManager.list().forEach(function(n) {
    console.log("\n * " + n + ": " + taskManager.get(n).join(", "));
    console.log(" * " + n + "(unflat): " + taskManager.getUnflattened(n).join(", "));
  });

  //-------------------------------------------------------------------------
  //Setup tasks
  taskManager.list().forEach(function(taskName) {
    grunt.registerTask(taskName, taskManager.get(taskName));
  });

};  // module.exports = function(grunt) ...
