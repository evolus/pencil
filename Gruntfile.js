'use strict';

var getHost = function() {
  return {
    get linux() {
      return process.platform === 'linux';
    },
    get windows() {
      return process.platform === 'win32';
    },
    get mac() {
      return process.platform === 'darwin';
    }
  };
};

var parseBuildPlatforms = function(argumentPlatform) {
  var inputPlatforms = argumentPlatform || process.platform + ";" + process.arch;

  inputPlatforms = inputPlatforms.replace("darwin", "mac");
  inputPlatforms = inputPlatforms.replace(/;ia|;x|;arm/, "");

  var buildAll = /^all$/.test(inputPlatforms);

  var buildPlatforms = {
    mac32: /mac32/.test(inputPlatforms) || buildAll,
    mac64: /mac64/.test(inputPlatforms) || buildAll,
    win32: /win32/.test(inputPlatforms) || buildAll,
    win64: /win64/.test(inputPlatforms) || buildAll,
    linux32: /linux32/.test(inputPlatforms) || buildAll,
    linux64: /linux64/.test(inputPlatforms) || buildAll
  };

  return buildPlatforms;
};

var getPlatform = function(buildPlatforms) {
  var buildPlatform = buildPlatforms || parseBuildPlatforms();
  if (buildPlatform.mac32) { return 'mac32'; }
  if (buildPlatform.mac64) { return 'mac64'; }
  if (buildPlatform.win32) { return 'win32'; }
  if (buildPlatform.win64) { return 'win64'; }
  if (buildPlatform.linux32) { return 'linux32'; }
  if (buildPlatform.linux64) { return 'linux64'; }
};

module.exports = function(grunt) {

  var host = getHost();
  var buildPlatforms = parseBuildPlatforms(grunt.option('platforms'));
  var pkgJson = grunt.file.readJSON('package.json');
  var currentVersion = pkgJson.version;
  var platform = getPlatform(buildPlatforms);

  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', [
    'dist'
  ]);

  grunt.registerTask('build', [
    'nwjs'
  ]);

  grunt.registerTask('dist', [
    'clean',
    'build',
    'package' // all platforms
  ]);

  grunt.registerTask('run', [
    'env:dev',
    'start'
  ]);

  grunt.registerTask('start', function() {
    if (!grunt.file.exists(grunt.config.get('nwjs').options.cacheDir)) {
      grunt.task.run('nwjs');
    }

    var start = parseBuildPlatforms();
    if (start.win32 || start.win64) {
      grunt.task.run('exec:win');
    } else if (start.mac32 || start.mac64) {
      grunt.task.run('exec:mac');
    } else if (start.linux32 || start.linux64) {
      grunt.task.run('exec:linux');
    } else {
      grunt.log.writeln('OS not supported.');
    }
  });

  grunt.registerTask('package', [
    'shell:packageLinux64',
    'shell:packageDEBLinux64',
    'shell:packageLinux32',
    'shell:packageDEBLinux32',
    'shell:packageWin',
    'shell:packageMac'
  ]);

  grunt.initConfig({
    pkgJson: pkgJson,
    platform: platform,

    env: {
      options: {
      },
      dev: {
        NODE_ENV: grunt.option('environment') || 'dev'
      }
    },

    nwjs: {
      options: {
        version: '0.12.3',
        buildDir: './build', // Where the build version of my node-webkit app is saved
        cacheDir: './build/cache',
        macIcns: './src/app/images/icons/main-window.icns', // Path to the Mac icon file
        macZip: (buildPlatforms.win32 || buildPlatforms.win64), // Zip nw for mac in windows. Prevent path too long if build all is used.,

        platforms: ['linux', 'win']
      },
      src: [
        './pencil-core/**',
        './stencils/**',
        './lib/**',
        './views/**',
        './fonts/**',
        './theme/**',
        './css/**',

        './app.js',
        './app.xhtml',
        './package.json', './README.md', './CHANGELOG.md', './LICENSE.txt',

        './node_modules/**',

        '!./node_modules/bower/**', '!./node_modules/*grunt*/**',
        '!./node_modules/nw-gyp/**', '!./node_modules/**/*.bin',
        '!./node_modules/**/*.c', '!./node_modules/**/*.h',
        '!./node_modules/**/Makefile', '!./node_modules/**/*.h',
        '!./**/test*/**', '!./**/doc*/**', '!./**/example*/**',
        '!./**/demo*/**', '!./**/bin/**', '!./**/build/**', '!./**/.*/**',
        '!./lib/reload.js'
      ]
    },

    exec: {
      win: {
        cmd: '"build/cache/<%= nwjs.options.version %>/<%= platform %>/nw.exe" .'
      },
      mac: {
        cmd: 'build/cache/<%= nwjs.options.version %>/<%= platform %>/nwjs.app/Contents/MacOS/nwjs .'
      },
      linux: {
        cmd: 'build/cache/<%= nwjs.options.version %>/<%= platform %>/nw .'
      }
    },

    jshint: {
      gruntfile: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: 'Gruntfile.js'
      },
      src: {
        options: {
          jshintrc: 'src/app/.jshintrc'
        },
        src: [
          'src/app/**/*.js',
          '!src/app/vendor/**/*.js'
        ]
      }
    },

    shell: {
      packageLinux64: {
        command: function() {
          if (host.linux || host.mac) {
            return [].join(' && ');
          } else {
            return [].join(' && ');
          }
        }
      },
      packageLinux32: {
        command: function() {
          if (host.linux || host.mac) {
            return [].join(' && ');
          } else {
            return [].join(' && ');
          }
        }
      },
      packageWin: {
        command: function() {
          if (host.linux || host.mac) {
            return [].join(' && ');
          } else {
            return [].join(' && ');
          }
        }
      },
      packageMac: {
        command: function() {
          if (host.linux || host.mac) {
            return [].join(' && ');
          } else {
            return [].join(' && ');
          }
        }
      }
    },

    compress: {
      linux32: {
        options: {
          mode: 'tgz',
          archive: 'build/releases/Pencil/linux32/Pencil-' + currentVersion + '-Linux-32.tar.gz'
        },
        expand: true,
        cwd: 'build/Pencil/linux32',
        src: '**',
        dest: 'Pencil'
      },
      linux64: {
        options: {
          mode: 'tgz',
          archive: 'build/releases/Pencil/linux64/Pencil-' + currentVersion + '-Linux-64.tar.gz'
        },
        expand: true,
        cwd: 'build/Pencil/linux64',
        src: '**',
        dest: 'Pencil'
      },
      mac: {
        options: {
          mode: 'tgz',
          archive: 'build/releases/Pencil/mac/Pencil-' + currentVersion + '-Mac.tar.gz'
        },
        expand: true,
        cwd: 'build/Pencil/mac',
        src: '**',
        dest: ''
      },
      windows: {
        options: {
          mode: 'tgz',
          archive: 'build/releases/Pencil/win/Pencil-' + currentVersion + '-Win.tar.gz'
        },
        expand: true,
        cwd: 'build/Pencil/win',
        src: '**',
        dest: 'Pencil'
      }
    },

    clean: {
      nwjs: ['build/cache/**/<%= nwjs.options.version %>/*pdf*', 'build/cache/**/<%= nwjs.options.version %>/*credits*']
    }

  });

};
