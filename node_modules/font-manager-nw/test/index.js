var gui = require('nw.gui');
var win = gui.Window.get();
win.focus();

var fontManager = require('../');
var assert = require('assert');

// some standard fonts that are likely to be installed on the platform the tests are running on
var standardFont = process.platform === 'linux' ? 'Liberation Sans' : 'Arial';
var postscriptName = process.platform === 'linux' ? 'LiberationSans' : 'ArialMT';

describe('font-manager', function() {
  it('should export some functions', function() {
    assert.equal(typeof fontManager.getAvailableFonts, 'function');
    assert.equal(typeof fontManager.getAvailableFontsSync, 'function');
    assert.equal(typeof fontManager.findFonts, 'function');
    assert.equal(typeof fontManager.findFontsSync, 'function');
    assert.equal(typeof fontManager.findFont, 'function');
    assert.equal(typeof fontManager.findFontSync, 'function');
    assert.equal(typeof fontManager.substituteFont, 'function');
    assert.equal(typeof fontManager.substituteFontSync, 'function');
  });

  function assertFontDescriptor(font) {
    assert.equal(typeof font, 'object');
    assert.equal(typeof font.path, 'string');
    assert.equal(typeof font.postscriptName, 'string');
    assert.equal(typeof font.family, 'string');
    assert.equal(typeof font.style, 'string');
    assert.equal(typeof font.weight, 'number');
    assert.equal(typeof font.width, 'number');
    assert.equal(typeof font.italic, 'boolean');
    assert.equal(typeof font.monospace, 'boolean');
  }

  describe('getAvailableFonts', function() {
    it('should throw if no callback is provided', function() {
      assert.throws(function() {
        fontManager.getAvailableFonts();
      }, /Expected a callback/);
    });

    it('should throw if callback is not a function', function() {
      assert.throws(function() {
        fontManager.getAvailableFonts(2);
      }, /Expected a callback/);
    });

    it('should getAvailableFonts asynchronously', function(done) {
      var async = false;

      fontManager.getAvailableFonts(function(fonts) {
        assert(async);
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        done();
      });

      async = true;
    });
  });

  describe('getAvailableFontsSync', function() {
    it('should getAvailableFonts synchronously', function() {
      var fonts = fontManager.getAvailableFontsSync();
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
    });
  });

  describe('findFonts', function() {
    it('should throw if no font descriptor is provided', function() {
      assert.throws(function() {
        fontManager.findFonts(function(fonts) {});
      }, /Expected a font descriptor/);
    });

    it('should throw if font descriptor is not an object', function() {
      assert.throws(function() {
        fontManager.findFonts(2, function(fonts) {});
      }, /Expected a font descriptor/);
    });

    it('should throw if no callback is provided', function() {
      assert.throws(function() {
        fontManager.findFonts({ family: standardFont });
      }, /Expected a callback/);
    });

    it('should throw if callback is not a function', function() {
      assert.throws(function() {
        fontManager.findFonts({ family: standardFont }, 2);
      }, /Expected a callback/);
    });

    it('should findFonts asynchronously', function(done) {
      var async = false;

      fontManager.findFonts({ family: standardFont }, function(fonts) {
        assert(async);
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        done();
      });

      async = true;
    });

    it('should find fonts by postscriptName', function(done) {
      fontManager.findFonts({ postscriptName: postscriptName }, function(fonts) {
        assert(Array.isArray(fonts));
        assert.equal(fonts.length, 1);
        fonts.forEach(assertFontDescriptor);
        assert.equal(fonts[0].postscriptName, postscriptName);
        assert.equal(fonts[0].family, standardFont);
        done();
      });
    });

    it('should find fonts by family and style', function(done) {
      fontManager.findFonts({ family: standardFont, style: 'Bold' }, function(fonts) {
        assert(Array.isArray(fonts));
        assert.equal(fonts.length, 1);
        fonts.forEach(assertFontDescriptor);
        assert.equal(fonts[0].family, standardFont);
        assert.equal(fonts[0].style, 'Bold');
        assert.equal(fonts[0].weight, 700);
        done();
      });
    });

    it('should find fonts by weight', function(done) {
      fontManager.findFonts({ family: standardFont, weight: 700 }, function(fonts) {
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        fonts.forEach(function(font) {
          assert.equal(font.weight, 700);
        });
        done();
      });
    });

    it('should find italic fonts', function(done) {
      fontManager.findFonts({ family: standardFont, italic: true }, function(fonts) {
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        fonts.forEach(function(font) {
          assert.equal(font.italic, true);
        });
        done();
      });
    });

    it('should find italic and bold fonts', function(done) {
      fontManager.findFonts({ family: standardFont, italic: true, weight: 700 }, function(fonts) {
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        fonts.forEach(function(font) {
          assert.equal(font.italic, true);
          assert.equal(font.weight, 700);
        });
        done();
      });
    });

    it('should return an empty array for nonexistent family', function(done) {
      fontManager.findFonts({ family: '' + Date.now() }, function(fonts) {
        assert(Array.isArray(fonts));
        assert.equal(fonts.length, 0);
        done();
      });
    });

    it('should return an empty array for nonexistent postscriptName', function(done) {
      fontManager.findFonts({ postscriptName: '' + Date.now() }, function(fonts) {
        assert(Array.isArray(fonts));
        assert.equal(fonts.length, 0);
        done();
      });
    });

    it('should return many fonts for empty font descriptor', function(done) {
      fontManager.findFonts({}, function(fonts) {
        assert(Array.isArray(fonts));
        assert(fonts.length > 0);
        fonts.forEach(assertFontDescriptor);
        done();
      });
    });
  });

  describe('findFontsSync', function() {
    it('should throw if no font descriptor is provided', function() {
      assert.throws(function() {
        fontManager.findFontsSync();
      }, /Expected a font descriptor/);
    });

    it('should throw if font descriptor is not an object', function() {
      assert.throws(function() {
        fontManager.findFontsSync(2);
      }, /Expected a font descriptor/);
    });

    it('should findFonts synchronously', function() {
      var fonts = fontManager.findFontsSync({ family: standardFont });
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
    });

    it('should find fonts by postscriptName', function() {
      var fonts = fontManager.findFontsSync({ postscriptName: postscriptName });
      assert(Array.isArray(fonts));
      assert.equal(fonts.length, 1);
      fonts.forEach(assertFontDescriptor);
      assert.equal(fonts[0].postscriptName, postscriptName);
      assert.equal(fonts[0].family, standardFont);
    });

    it('should find fonts by family and style', function() {
      var fonts = fontManager.findFontsSync({ family: standardFont, style: 'Bold' });
      assert(Array.isArray(fonts));
      assert.equal(fonts.length, 1);
      fonts.forEach(assertFontDescriptor);
      assert.equal(fonts[0].family, standardFont);
      assert.equal(fonts[0].style, 'Bold');
      assert.equal(fonts[0].weight, 700);
    });

    it('should find fonts by weight', function() {
      var fonts = fontManager.findFontsSync({ family: standardFont, weight: 700 });
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
      assert.equal(fonts[0].weight, 700);
    });

    it('should find italic fonts', function() {
      var fonts = fontManager.findFontsSync({ family: standardFont, italic: true });
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
      assert.equal(fonts[0].italic, true);
    });

    it('should find italic and bold fonts', function() {
      var fonts = fontManager.findFontsSync({ family: standardFont, italic: true, weight: 700 });
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
      assert.equal(fonts[0].italic, true);
      assert.equal(fonts[0].weight, 700);
    });

    it('should return an empty array for nonexistent family', function() {
      var fonts = fontManager.findFontsSync({ family: '' + Date.now() });
      assert(Array.isArray(fonts));
      assert.equal(fonts.length, 0);
    });

    it('should return an empty array for nonexistent postscriptName', function() {
      var fonts = fontManager.findFontsSync({ postscriptName: '' + Date.now() });
      assert(Array.isArray(fonts));
      assert.equal(fonts.length, 0);
    });

    it('should return many fonts for empty font descriptor', function() {
      var fonts = fontManager.findFontsSync({});
      assert(Array.isArray(fonts));
      assert(fonts.length > 0);
      fonts.forEach(assertFontDescriptor);
    });
  });

  describe('findFont', function() {
    it('should throw if no font descriptor is provided', function() {
      assert.throws(function() {
        fontManager.findFont(function(fonts) {});
      }, /Expected a font descriptor/);
    });

    it('should throw if font descriptor is not an object', function() {
      assert.throws(function() {
        fontManager.findFont(2, function(fonts) {});
      }, /Expected a font descriptor/);
    });

    it('should throw if no callback is provided', function() {
      assert.throws(function() {
        fontManager.findFont({ family: standardFont });
      }, /Expected a callback/);
    });

    it('should throw if callback is not a function', function() {
      assert.throws(function() {
        fontManager.findFont({ family: standardFont }, 2);
      }, /Expected a callback/);
    });

    it('should findFont asynchronously', function(done) {
      var async = false;

      fontManager.findFont({ family: standardFont }, function(font) {
        assert(async);
        assert.equal(typeof font, 'object');
        assert(!Array.isArray(font));
        assertFontDescriptor(font);
        assert.equal(font.family, standardFont);
        done();
      });

      async = true;
    });

    it('should find font by postscriptName', function(done) {
      fontManager.findFont({ postscriptName: postscriptName }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.postscriptName, postscriptName);
        assert.equal(font.family, standardFont);
        done();
      });
    });

    it('should find font by family and style', function(done) {
      fontManager.findFont({ family: standardFont, style: 'Bold' }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.family, standardFont);
        assert.equal(font.style, 'Bold');
        assert.equal(font.weight, 700);
        done();
      });
    });

    it('should find font by weight', function(done) {
      fontManager.findFont({ family: standardFont, weight: 700 }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.weight, 700);
        done();
      });
    });

    it('should find italic font', function(done) {
      fontManager.findFont({ family: standardFont, italic: true }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.italic, true);
        done();
      });
    });

    it('should find bold italic font', function(done) {
      fontManager.findFont({ family: standardFont, italic: true, weight: 700 }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.italic, true);
        assert.equal(font.weight, 700);
        done();
      });
    });

    it('should return a fallback font for nonexistent family', function(done) {
      fontManager.findFont({ family: '' + Date.now() }, function(font) {
        assertFontDescriptor(font);
        done();
      });
    });

    it('should return a fallback font for nonexistent postscriptName', function(done) {
      fontManager.findFont({ postscriptName: '' + Date.now() }, function(font) {
        assertFontDescriptor(font);
        done();
      });
    });

    it('should return a fallback font matching traits as best as possible', function(done) {
      fontManager.findFont({ family: '' + Date.now(), weight: 700 }, function(font) {
        assertFontDescriptor(font);
        assert.equal(font.weight, 700);
        done();
      });
    });

    it('should return a font for empty font descriptor', function(done) {
      fontManager.findFont({}, function(font) {
        assertFontDescriptor(font);
        done();
      });
    });
  });

  describe('findFontSync', function() {
    it('should throw if no font descriptor is provided', function() {
      assert.throws(function() {
        fontManager.findFontSync();
      }, /Expected a font descriptor/);
    });

    it('should throw if font descriptor is not an object', function() {
      assert.throws(function() {
        fontManager.findFontSync(2);
      }, /Expected a font descriptor/);
    });

    it('should findFonts synchronously', function() {
      var font = fontManager.findFontSync({ family: standardFont });
      assert.equal(typeof font, 'object');
      assert(!Array.isArray(font));
      assertFontDescriptor(font);
    });

    it('should find font by postscriptName', function() {
      var font = fontManager.findFontSync({ postscriptName: postscriptName });
      assertFontDescriptor(font);
      assert.equal(font.postscriptName, postscriptName);
      assert.equal(font.family, standardFont);
    });

    it('should find font by family and style', function() {
      var font = fontManager.findFontSync({ family: standardFont, style: 'Bold' });
      assertFontDescriptor(font);
      assert.equal(font.family, standardFont);
      assert.equal(font.style, 'Bold');
      assert.equal(font.weight, 700);
    });

    it('should find font by weight', function() {
      var font = fontManager.findFontSync({ family: standardFont, weight: 700 });
      assertFontDescriptor(font);
      assert.equal(font.weight, 700);
    });

    it('should find italic font', function() {
      var font = fontManager.findFontSync({ family: standardFont, italic: true });
      assertFontDescriptor(font);
      assert.equal(font.italic, true);
    });

    it('should find bold italic font', function() {
      var font = fontManager.findFontSync({ family: standardFont, italic: true, weight: 700 });
      assertFontDescriptor(font);
      assert.equal(font.italic, true);
      assert.equal(font.weight, 700);
    });

    it('should return a fallback font for nonexistent family', function() {
      var font = fontManager.findFontSync({ family: '' + Date.now() });
      assertFontDescriptor(font);
    });

    it('should return a fallback font for nonexistent postscriptName', function() {
      var font = fontManager.findFontSync({ postscriptName: '' + Date.now() });
      assertFontDescriptor(font);
    });

    it('should return a fallback font matching traits as best as possible', function() {
      var font = fontManager.findFontSync({ family: '' + Date.now(), weight: 700 });
      assertFontDescriptor(font);
      assert.equal(font.weight, 700);
    });

    it('should return a font for empty font descriptor', function() {
      var font = fontManager.findFontSync({});
      assertFontDescriptor(font);
    });
  });

  describe('substituteFont', function() {
    it('should throw if no postscript name is provided', function() {
      assert.throws(function() {
        fontManager.substituteFont(function(font) {});
      }, /Expected postscript name/);
    });

    it('should throw if postscript name is not a string', function() {
      assert.throws(function() {
        fontManager.substituteFont(2, 'hi', function(font) {});
      }, /Expected postscript name/);
    });

    it('should throw if no substitution string is provided', function() {
      assert.throws(function() {
        fontManager.substituteFont(postscriptName, function(font) {});
      }, /Expected substitution string/);
    });

    it('should throw if substitution string is not a string', function() {
      assert.throws(function() {
        fontManager.substituteFont(postscriptName, 2, function(font) {});
      }, /Expected substitution string/);
    });

    it('should throw if no callback is provided', function() {
      assert.throws(function() {
        fontManager.substituteFont(postscriptName, '汉字');
      }, /Expected a callback/);
    });

    it('should throw if callback is not a function', function() {
      assert.throws(function() {
        fontManager.substituteFont(postscriptName, '汉字', 52);
      }, /Expected a callback/);
    });

    it('should substituteFont asynchronously', function(done) {
      var async = false;

      fontManager.substituteFont(postscriptName, '汉字', function(font) {
        assert(async);
        assert.equal(typeof font, 'object');
        assert(!Array.isArray(font));
        assertFontDescriptor(font);
        assert.notEqual(font.postscriptName, postscriptName);
        done();
      });

      async = true;
    });

    it('should return the same font if it already contains the requested characters', function(done) {
      fontManager.substituteFont(postscriptName, 'hi', function(font) {
        assertFontDescriptor(font);
        assert.equal(font.postscriptName, postscriptName);
        done();
      });
    });

    it('should return a default font if no font exists for the given postscriptName', function(done) {
      fontManager.substituteFont('' + Date.now(), '汉字', function(font) {
        assertFontDescriptor(font);
        done();
      });
    });
  });

  describe('substituteFontSync', function() {
    it('should throw if no postscript name is provided', function() {
      assert.throws(function() {
        fontManager.substituteFontSync();
      }, /Expected postscript name/);
    });

    it('should throw if postscript name is not a string', function() {
      assert.throws(function() {
        fontManager.substituteFontSync(2, 'hi');
      }, /Expected postscript name/);
    });

    it('should throw if no substitution string is provided', function() {
      assert.throws(function() {
        fontManager.substituteFontSync(postscriptName);
      }, /Expected substitution string/);
    });

    it('should throw if substitution string is not a string', function() {
      assert.throws(function() {
        fontManager.substituteFontSync(postscriptName, 2);
      }, /Expected substitution string/);
    });

    it('should substituteFont synchronously', function() {
      var font = fontManager.substituteFontSync(postscriptName, '汉字');
      assert.equal(typeof font, 'object');
      assert(!Array.isArray(font));
      assertFontDescriptor(font);
      assert.notEqual(font.postscriptName, postscriptName);
    });

    it('should return the same font if it already contains the requested characters', function() {
      var font = fontManager.substituteFontSync(postscriptName, 'hi');
      assertFontDescriptor(font);
      assert.equal(font.postscriptName, postscriptName);
    });

    it('should return a default font if no font exists for the given postscriptName', function() {
      var font = fontManager.substituteFontSync('' + Date.now(), '汉字');
      assertFontDescriptor(font);
    });
  });
});
