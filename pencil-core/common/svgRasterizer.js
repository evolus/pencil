function Rasterizer(format) {
	//TODO: fix this
	return;
	
    this.format = format;

    //create the window
    var iframe = document.createElementNS(PencilNamespaces.html, "html:iframe");

    var container = document.body;
    if (!container) container = document.documentElement;
    var box = document.createElement("box");
    box.setAttribute("style", "-moz-box-pack: start; -moz-box-align: start;");

    iframe.setAttribute("style", "border: none; min-width: 0px; min-height: 0px; width: 1px; height: 1px; visibility: visible;");
    iframe.setAttribute("src", "blank.html");

    box.appendChild(iframe);
    container.appendChild(box);

    box.style.MozBoxPack = "start";
    box.style.MozBoxAlign = "start";

    var thiz = this;

    this.nextHandler = null;
    
    var start = 0;

    window.addEventListener("DOMFrameContentLoaded", function (event) {
        var win = iframe.contentWindow;
        debug("Rasterizer: DOMFrameContentLoaded, " + win);
        if (!win._initialized) {
            debug("Initializing content window");
            win._isRasterizeFrame = true;
            win.addEventListener("MozAfterPaint", function (event) {
                //debug("MozAfterPaint: " + [event, event.originalTarget, win.document]);

                if (!event.originalTarget._isRasterizeFrame) return;
                if (!thiz.nextHandler) return;
                start = new Date().getTime();
                doLater(function () {
                    if (!thiz.nextHandler) return;

                    var f = thiz.nextHandler;
                    thiz.nextHandler = null;
                    //alert("calling next handler after " + (new Date().getTime() - start) + " ms");
                    f();
                }, 500, win);

                /*if (!event.originalTarget._isRasterizeFrame) return;
                if (!thiz.nextHandler) return;

                var f = thiz.nextHandler;
                thiz.nextHandler = null;
                f();*/

            }, false);

            var document = iframe.contentDocument.documentElement;
            document.style = document.style || {};
            document.style.backgroundColor = "rgba(0, 0, 0, 0)";
            win._initialized = true;
        }
    }, false);

    this.win = iframe.contentWindow;
    this.win.document.body.setAttribute("style", "padding: 0px; margin: 0px;")
};
Rasterizer.prototype.getImageDataFromUrl = function (url, callback) {
    this.win.document.body.innerHTML = "";
    var image = this.win.document.createElementNS(PencilNamespaces.html, "img");

    //pickup the image width & height

    image.addEventListener("load", function (event) {
        try {
            callback(new ImageData(image.width, image.height, url));
        } catch (e) {
            Console.dumpError(e);
        }
    }, false);
    this.win.document.body.appendChild(image);
    image.setAttribute("src", url);
};
Rasterizer.prototype.rasterizePageToUrl = function (page, callback) {
    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + page.properties.width  + "px");
    svg.setAttribute("height", "" + page.properties.height  + "px");

    this._width = page.properties.width;
    this._height = page.properties.height;

    this._backgroundColor = page.properties.transparentBackground == "false" && !page.properties.background ? page.properties.backgroundColor : null;

    if (page._view.canvas.hasBackgroundImage) {
        var bgImage = page._view.canvas.backgroundImage.cloneNode(true);
        bgImage.removeAttribute("transform");
        bgImage.removeAttribute("id");
        svg.appendChild(bgImage);
    }

    var drawingLayer = page._view.canvas.drawingLayer.cloneNode(true);
    drawingLayer.removeAttribute("transform");
    drawingLayer.removeAttribute("id");
    svg.appendChild(drawingLayer);

    var thiz = this;
    this._saveNodeToTempFileAndLoad(svg, function () {
        thiz.rasterizeWindowToUrl(callback);
    });
};

Rasterizer.prototype._prepareWindowForRasterization = function(backgroundColor) {
    var h = 0;
    var w = 0;
    if (this._width && this._height) {
        w = this._width;
        h = this._height;
    } else {
        var d =  this.win.document;
        if( d.compatMode === "CSS1Compat" ) {
          h = d.documentElement.scrollHeight;
          w = d.documentElement.scrollWidth;
        } else {
          h = d.body.scrollHeight;
          w = d.body.scrollWidth;
        }
    }

    var canvas = document.createElementNS(PencilNamespaces.html, "canvas");
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.scale(1, 1);

    var bgr = Color.fromString("#ffffff00");
    if (this._backgroundColor) {
        bgr = Color.fromString(this._backgroundColor);
        ctx.drawWindow(this.win, 0, 0, w, h, bgr.toRGBString());
    } else if (backgroundColor) {
        bgr = Color.fromString(backgroundColor);
        ctx.drawWindow(this.win, 0, 0, w, h, bgr.toRGBString());
    } else {
        ctx.drawWindow(this.win, 0, 0, w, h, bgr.toRGBAString());
    }

    ctx.restore();

    return {
        canvas: canvas,
        width: w,
        height: h
    };
}

Rasterizer.prototype.rasterizeWindowToUrl = function (callback) {
    debug("Rasterizing window to URL");
    canvas = this._prepareWindowForRasterization();
    var dataURL = canvas.canvas.toDataURL("image/png", "");
    
    var path = "/home/dgthanhan/Desktop/tmp.png";
    //this.saveURI(dataURL, path);
    //alert("data saved to " + path);
    
    data = {
        url: dataURL,
        width: canvas.width,
        height: canvas.height
    };
    callback(data);
};
Rasterizer.prototype.cleanup = function () {
    if (this.lastTempFile) {
        debug("deleting: " + this.lastTempFile.path);
        try {
            this.lastTempFile.remove(true);
        } catch (e) {
            Console.dumpError(e);
        }
    }
};
Rasterizer.prototype._saveNodeToTempFileAndLoad = function (svgNode, loadCallback) {
    this.cleanup();

    this.lastTempFile = Local.newTempFile("raster", "svg");
    Dom.serializeNodeToFile(svgNode, this.lastTempFile,
        "<?xml-stylesheet href=\"chrome://global/skin/\" type=\"text/css\"?>\n" +
        "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObject.css\" type=\"text/css\"?>\n" +
        "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObjectXUL.css\" type=\"text/css\"?>");

    var url = ios.newFileURI(this.lastTempFile).spec;

    debug("Rasterize SVG: " + url);

    if (loadCallback) {
        this.nextHandler = loadCallback;
    }

    this.win.location.href = url;
};
Rasterizer.prototype.rasterizeDOMToUrl = function (svgNode, callback) {
    debug("Rasterizing DOM to URL");
    try {
        this._width = svgNode.width.baseVal.value;
        this._height = svgNode.height.baseVal.value;

        var thiz = this;
        this._saveNodeToTempFileAndLoad(svgNode, function () {
            try {
                thiz.rasterizeWindowToUrl(callback);
            } catch (e) {
                Console.dumpError(e);
            }
        });
    } catch(e) {
        Console.dumpError(e);
    }
};
Rasterizer.prototype.rasterizeDOM = function (svgNode, filePath, callback, preprocessor, backgroundColor) {
    debug("Rasterizing DOM");
    this._width = svgNode.width.baseVal.value;
    this._height = svgNode.height.baseVal.value;
    this._backgroundColor = null;

    var thiz = this;
    this._saveNodeToTempFileAndLoad(svgNode, function () {
        try {
            thiz.rasterizeWindow(filePath, callback, preprocessor, backgroundColor);
        } catch (e) {
            Console.dumpError(e);
        }
    });
};

Rasterizer.prototype.rasterizeWindow = function (filePath, callback, preprocessor, backgroundColor) {
    debug("Rasterizing window");
    if (preprocessor && preprocessor.process) {
        debug("Preprocessing document with "  + preprocessor);
        preprocessor.process(this.win.document);
    }
    canvas = this._prepareWindowForRasterization(backgroundColor);
    data = canvas.canvas.toDataURL(); // Defaults to image/png
    this.saveURI(data, filePath);
    callback();
};

Rasterizer.prototype.saveURI = function (url, file) {
    uri = Components.classes["@mozilla.org/network/standard-url;1"].
          createInstance(Components.interfaces.nsIURI);
    uri.spec = url;

    localFile = Components.classes["@mozilla.org/file/local;1"].
                createInstance(Components.interfaces.nsILocalFile)
    localFile.initWithPath(file)

    persistListener = new PersistProgressListener();
    var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
              createInstance(Components.interfaces.nsIWebBrowserPersist);

    persist.progressListener = persistListener;
    persist.saveURI(uri, null, null, null, null, localFile, null);
    //persist.cancelSave();
}

function PersistProgressListener(callback) {
    this.init();
    this.callback = callback ? callback : null;
}

PersistProgressListener.prototype = {
  QueryInterface : function(aIID) {
    if(aIID.equals(Components.interfaces.nsIWebProgressListener))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },
  init : function() {},
  destroy : function() {},
  // nsIWebProgressListener
  onProgressChange : function (aWebProgress, aRequest,
                               aCurSelfProgress, aMaxSelfProgress,
                               aCurTotalProgress, aMaxTotalProgress){},
  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {
    if(aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
        if (this.callback) {
            this.callback();
        }
    }
  },
  onLocationChange : function(aWebProgress, aRequest, aLocation) {},
  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage) {},
  onSecurityChange : function(aWebProgress, aRequest, aState){}
};
