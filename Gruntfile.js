/**
 * UProxy Grunt Build System
 * Support commands:
 * grunt
 *  build - Builds Chrome and Firefox extensions
 *  setup - Installs local dependencies and sets up environment
 *  test - Run unit tests
 *  watch - Watch for changes in 'common' and copy as necessary
 *  clean - Cleans up
 *  copy:chrome_app - Copy 'common' files into the Chrome App
 *  copy:chrome_ext - Copy 'common' files into the Chrome Extension
 *  copy:firefox - Copy 'common' files into Firefox
 *  everything - 'setup', 'test', then 'build'
 **/

var path = require("path");
var minimatch = require("minimatch");

//List of all files for each distribution
//NOTE: This is ultimately what gets copied, so keep this precise
//NOTE: Keep all exclusion paths ('!' prefix) at the end of the array
var chrome_app_files = [
  'common/ui/icons/**',
  'common/freedom/freedom.js',
  'common/backend/**', 
  '!common/backend/spec/**', 
  '!common/backend/identity/xmpp/node-xmpp/**'
];
var chrome_ext_files = [
  'common/ui/**',
  'common/bower_components/**'
];
var firefox_files = [];
//Testing
//TODO fix
var sources = ['common/backend/util.js'];
var testSources = sources.slice(0);

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      chrome_app: {files: [{src: chrome_app_files, dest: 'chrome/app/'}]},
      chrome_ext: {files: [{src: chrome_ext_files, dest: 'chrome/extension/src/'}]},
      firefox: {files: [{src: firefox_files, dest: 'firefox/data/'}]},
      watch: {files: []},
    },
    watch: {  //Watch everything
      files: ['common/**/*'], //TODO this doesn't work as expected on VMs
      tasks: ['copy:watch'],
      options: {spawn: false}
    },
    shell: {
      git_submodule: {
        command: ['git submodule init', 'git submodule update'].join(';'),
        options: {stdout: true}
      },
      bower_install: {
        command: 'bower install',
        options: {stdout: true, execOptions: {cwd: 'common/ui'}}
      },
      setup_freedom: {
        command: 'npm install',
        options: {stdout: true, execOptions: {cwd: 'common/freedom'}}
      },
      freedom: {
        command: 'grunt',
        options: {stdout: true, execOptions: {cwd: 'common/freedom'}}
      },
    },
    clean: ['chrome/app/common/**', 'chrome/extension/src/common/**', 'firefox/data/common/**'],
    jasmine: {
      common: {
        src: testSources,
        options: {
          specs: 'common/backend/spec/*Spec.js'
        }
      }
    },
    jshint: {
      all: sources,
      options: {
        '-W069': true
      }
    }

  });
  
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');

  //On file change, see which distribution it affects and
  //update the copy:watch task to copy only those files
  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    var files = [];
    if (minimatchArray(filepath, chrome_app_files)) {
      grunt.log.writeln(filepath + ' - watch copying to Chrome app');
      files.push({src: filepath, dest: 'chrome/app/'});
    } 
    if (minimatchArray(filepath, chrome_ext_files)) {
      grunt.log.writeln(filepath + ' - watch copying to Chrome ext');
      files.push({src: filepath, dest: 'chrome/extension/src/'});
    }
    if (minimatchArray(filepath, firefox_files)) {
      grunt.log.writeln(filepath + ' - watch copying to Firefox');
      files.push({src: filepath, dest: 'firefox/data/'});
    }
    grunt.config(['copy', 'watch', 'files'], files);
    grunt.log.writeln("copy:watch is now: " + JSON.stringify(grunt.config(['copy', 'watch'])));
  });

  //Setup task
  grunt.registerTask('setup', [
    'shell:git_submodule', 
    'shell:bower_install',
    'shell:setup_freedom',
    'shell:freedom'
  ]);
  //Test task
  grunt.registerTask('test', [
    'jshint:all',
    'jasmine'
  ]);
  //Build task
  grunt.registerTask('build', [
    'copy:chrome_app',
    'copy:chrome_ext'
  ]);
  grunt.registerTask('everything' ['setup', 'test', 'build']);
  // Default task(s).
  grunt.registerTask('default', ['build']);
 
};

//minimatchArray will see if 'file' matches the set of patterns
//described by 'arr'
//NOTE: all exclusion strings ("!" prefix) must be at the end
//of the array arr
function minimatchArray(file, arr) {
  var result = false;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].substr(0, 1) == "!") {
      result &= minimatch(file, arr[i]);
    } else {
      result |= minimatch(file, arr[i]);
    }
  }
  return result;
};

