function Rasterizer(controller) {
    this.controller = controller;
    this.getBackend().init();
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

Rasterizer.ipcBasedBackend = {
    TIME_OUT: 10000,
    pendingWorkMap: {},
    init: function () {
        ipcRenderer.send("render-init", {});
    },
    rasterize: function (svgNode, width, height, scale, callback, parseLinks) {
        var id = Util.newUUID();

        ipcRenderer.once(id, function (event, data) {
            var work = Rasterizer.ipcBasedBackend.pendingWorkMap[id];
            if (!work) return;

            callback(parseLinks ? data : data.url);
            window.clearTimeout(work.timeoutId);
            delete Rasterizer.ipcBasedBackend.pendingWorkMap[id];
        });

        w = width * scale;
        h = height * scale;

        if (scale != 1) {
            svgNode.setAttribute("width", w + "px");
            svgNode.setAttribute("height", h + "px");

            svgNode.setAttribute("viewBox", "0 0 " + width + " " + height);
        }

        var xml = Controller.serializer.serializeToString(svgNode);
        ipcRenderer.send("render-request", {svg: xml, width: w, height: h, scale: 1, id: id, processLinks: parseLinks});

        var work = {};
        work.timeoutId = window.setTimeout(function () {
            var work = Rasterizer.ipcBasedBackend.pendingWorkMap[id];
            if (!work) return;
            callback("");
            delete Rasterizer.ipcBasedBackend.pendingWorkMap[id];

            console.log("Rasterizer seems to be crashed, restarting now!!!");
            ipcRenderer.send("render-restart", {});

        }, Rasterizer.ipcBasedBackend.TIME_OUT);

        Rasterizer.ipcBasedBackend.pendingWorkMap[id] = work;
    }
};
Rasterizer.outProcessCanvasBasedBackend = {
    init: function () {
        ipcRenderer.send("canvas-render-init", {});
    },
    rasterize: function (svgNode, width, height, scale, callback, parseLinks) {
        var id = Util.newUUID();
        ipcRenderer.once(id, function (event, data) {
            callback(parseLinks ? data : data.url);
        });

        var xml = Controller.serializer.serializeToString(svgNode);
        ipcRenderer.send("canvas-render-request", {svg: xml, width: width, height: height, scale: scale, id: id, processLinks: parseLinks});
    }
};
Rasterizer.inProcessCanvasBasedBackend = {
    init: function () {
        //the in-process rasterize requires basicly nothing to init :)
    },
    rasterize: function (svgNode, width, height, s, callback) {
        var images = svgNode.querySelectorAll("image");
        var totalImageLength = 0;

        var tasks = [];


        for (var i = 0; i < images.length; i ++) {
            var image = images[i];
            var href = image.getAttributeNS(PencilNamespaces.xlink, "href");
            if (href && href.match("^file://(.+)$")) {
                var sourcePath = decodeURI(RegExp.$1);
                try {
                    fs.accessSync(sourcePath, fs.R_OK);
                } catch (e) {
                    continue;
                }

                tasks.push({
                    image: image,
                    sourcePath: sourcePath
                });
            }
        }

        var index = -1;
        function convertNext() {
            index ++;
            if (index >= tasks.length) {
                onConversionDone();
                return;
            }

            var sourcePath = tasks[index].sourcePath;
            var image = tasks[index].image;

            var ext = (path.extname(sourcePath) || ".jpg").toLowerCase();
            var mime = "image/jpeg";
            if (ext == ".png") mine = "image/png";

            fs.readFile(sourcePath, function (error, bitmap) {
                var url = "data:" + mime + ";base64," + new Buffer(bitmap).toString("base64");

                image.setAttributeNS(PencilNamespaces.xlink, "href", url);
                totalImageLength += url.length;

                convertNext();
            });
        }

        function onConversionDone() {
            // it looks like that the bigger images embedded, the longer time we need to wait for the image to be fully painted into the canvas
            var delay = Math.max(500, totalImageLength / 30000);

            var canvas = document.createElement("canvas");
            canvas.setAttribute("width", width * s);
            canvas.setAttribute("height", height * s);
            var ctx = canvas.getContext("2d");

            var img = new Image();

            img.onload = function () {
                ctx.save();
                ctx.scale(s, s);
                ctx.drawImage(img, 0, 0);
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                setTimeout(function () {
                    callback(canvas.toDataURL());
                    ctx.restore();
                    img.onload = null;
                    img.src = "";
                }, delay);
            };

            var svg = Controller.serializer.serializeToString(svgNode);

            img.setAttribute("src", "data:image/svg+xml;charset=utf-8," + svg);
        }

        convertNext();
    }
};

Rasterizer.prototype.getBackend = function () {
    //TODO: options or condition?
    return Rasterizer.ipcBasedBackend;
    // return Rasterizer.outProcessCanvasBasedBackend;
};
Rasterizer.prototype.rasterizeSVGNodeToUrl = function (svg, callback, scale) {
    var s = (typeof (scale) == "undefined") ? 1 : scale;
    this.getBackend().rasterize(svg, parseFloat(svg.getAttribute("width")), parseFloat(svg.getAttribute("height")), s, callback);
};

Rasterizer.prototype.rasterizePageToUrl = function (page, callback, scale, parseLinks) {
    var svg = this.controller.getPageSVG(page);
    var thiz = this;
    var s = (typeof (scale) == "undefined") ? 1 : scale;
    var f = function () {
        svg.setAttribute("page", page.name);
        var m = Pencil.controller.getDocumentPageMargin() || 0;
        var w = page.width;
        var h = page.height;
        if (m) {
            var g = svg.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
            g.setAttribute("transform", translate(0 - m, 0 - m));
            while (svg.firstChild) {
                g.appendChild(svg.removeChild(svg.firstChild));
            }
            svg.appendChild(g);
            
            w -= 2 * m;
            h -= 2 * m;
            svg.setAttribute("width", w);
            svg.setAttribute("height", h);
        }
        thiz.getBackend().rasterize(svg, w, h, s, callback, parseLinks);
    };

    if (page.backgroundPage) {
        thiz.getPageBitmapFileWithScale(page.backgroundPage, scale, null, function (filePath) {
            var image = svg.ownerDocument.createElementNS(PencilNamespaces.svg, "image");
            image.setAttribute("x", "0");
            image.setAttribute("y", "0");
            image.setAttribute("width", page.backgroundPage.width);
            image.setAttribute("height", page.backgroundPage.height);
            image.setAttributeNS(PencilNamespaces.xlink, "xlink:href", ImageData.filePathToURL(filePath));

            if (svg.firstChild) {
                svg.insertBefore(image, svg.firstChild);
            } else {
                svg.appendChild(image);
            }

            f();
        });
    } else {
        if (page.backgroundColor) {
            var rect = svg.ownerDocument.createElementNS(PencilNamespaces.svg, "rect");
            rect.setAttribute("x", "0");
            rect.setAttribute("y", "0");
            rect.setAttribute("width", page.width);
            rect.setAttribute("height", page.height);
            rect.setAttribute("style", "stroke: none; fill: " + page.backgroundColor.toRGBAString() + ";");

            if (svg.firstChild) {
                svg.insertBefore(rect, svg.firstChild);
            } else {
                svg.appendChild(rect);
            }
        }

        f();
    }
};
Rasterizer.prototype.getPageBitmapFile = function (page, callback) {
    this.getPageBitmapFileWithScale(page, 1, null, callback);
};
Rasterizer.prototype.getPageBitmapFileWithScale = function (page, scale, configuredFilePath, callback) {
    var key = "@" + scale;
    if (page.bitmapCache && page.bitmapCache[key]) {
        var existingFilePath = page.bitmapCache[key];
        if (configuredFilePath && configuredFilePath != existingFilePath) {
            copyFileSync(existingFilePath, configuredFilePath);
            existingFilePath = configuredFilePath;
        }

        callback(existingFilePath);
    } else {
        var filePath = configuredFilePath || tmp.fileSync({ postfix: ".png" }).name;
        this.rasterizePageToFile(page, filePath, function (filePath) {
            if (!page.bitmapCache) page.bitmapCache = {};
            page.bitmapCache[key] = filePath;
            callback(filePath);
        }, scale);
    }
};


Rasterizer.prototype.postBitmapGeneratingTask = function (page, scale, configuredFilePath, callback) {
    if (!this.generatingTaskQueue) this.generatingTaskQueue = new QueueHandler(100);
    this.generatingTaskQueue.submit(function (__callback) {
        this.getPageBitmapFileWithScale(page, scale, configuredFilePath, function (filePath) {
            if (callback) callback(filePath);
            __callback();
        })
    }.bind(this));
};
Rasterizer.prototype.rasterizePageToFile = function (page, filePath, callback, scale, parseLinks) {
    this.rasterizePageToUrl(page, function (data) {
        var dataURI = parseLinks ? data.url : data;

        var actualPath = filePath ? filePath : tmp.fileSync().name;
        const prefix = "data:image/png;base64,";
        var base64Data = dataURI;
        if (base64Data.startsWith(prefix)) base64Data = base64Data.substring(prefix.length);

        var buffer = new Buffer(base64Data, "base64");
        fs.writeFile(actualPath, buffer, "utf8", function (err) {
            callback(parseLinks ? {actualPath: actualPath, objectsWithLinking: data.objectsWithLinking} : actualPath, err);
        });
    }, scale, parseLinks);
};

Rasterizer.prototype.rasterizeSelectionToFile = function (target, filePath, callback, scale) {
    var geo = target.getGeometry();
    if (!geo) {
        //Util.showStatusBarWarning(Util.getMessage("the.selected.objects.cannot.be.exported"), true);
        alert(Util.getMessage("the.selected.objects.cannot.be.exported"));
        return;
    }

    var padding = 2 * Config.get("export.selection.padding", 0);

    //stroke fix?
    var strokeStyle = target.getProperty("strokeStyle");
    if (strokeStyle) {
        padding += strokeStyle.w;
    }

    var w = geo.dim.w + padding;
    var h = geo.dim.h + padding;

    debug("w: " + w);

    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + w  + "px");
    svg.setAttribute("height", "" + h  + "px");

    var content = target.svg.cloneNode(true);
    content.removeAttribute("transform");
    content.removeAttribute("id");

    try  {
        var dx = Math.round((w - geo.dim.w) / 2);
        var dy = Math.round((h - geo.dim.h) / 2);
        content.setAttribute("transform", "translate(" + dx + ", " + dy + ")");
    } catch (e) {
        Console.dumpError(e);
    }
    svg.appendChild(content);

    var thiz = this;
    var s = (typeof (scale) == "undefined") ? 1 : scale;
    thiz.getBackend().rasterize(svg, w, h, s, function (data) {
        var dataURI = data;

        var actualPath = filePath ? filePath : tmp.fileSync().name;
        const prefix = "data:image/png;base64,";
        var base64Data = dataURI;
        if (base64Data.startsWith(prefix)) base64Data = base64Data.substring(prefix.length);

        var buffer = new Buffer(base64Data, "base64");
        fs.writeFile(actualPath, buffer, {}, buffer.length, function (err) {
            callback(actualPath, err);
        });
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
        ctx.drawWindow(this.win, 0, 0, w, h, bgr.toRGBAString());
    } else if (backgroundColor) {
        bgr = Color.fromString(backgroundColor);
        ctx.drawWindow(this.win, 0, 0, w, h, bgr.toRGBAString());
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
        // debug("deleting: " + this.lastTempFile.path);
        try {
            // this.lastTempFile.remove(true);
            this.lastTempFile.removeCallback();
        } catch (e) {
            Console.dumpError(e);
        }
    }
};
Rasterizer.prototype._saveNodeToTempFileAndLoad = function (svgNode, loadCallback) {
    // this.cleanup();
    //
    // this.lastTempFile = Local.newTempFile("raster", "svg");
    // Dom.serializeNodeToFile(svgNode, this.lastTempFile,
    //     "<?xml-stylesheet href=\"chrome://global/skin/\" type=\"text/css\"?>\n" +
    //     "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObject.css\" type=\"text/css\"?>\n" +
    //     "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObjectXUL.css\" type=\"text/css\"?>");
    //
    // var url = ios.newFileURI(this.lastTempFile).spec;
    //
    // debug("Rasterize SVG: " + url);
    //
    // if (loadCallback) {
    //     this.nextHandler = loadCallback;
    // }
    //
    // this.win.location.href = url;

    var xml = "<?xml version=\"1.0\"?>\n";
    xml += "<?xml-stylesheet href=\"chrome://global/skin/\" type=\"text/css\"?>\n" +
    "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObject.css\" type=\"text/css\"?>\n" +
    "<?xml-stylesheet href=\"chrome://pencil/skin/htmlForeignObjectXUL.css\" type=\"text/css\"?>\n";
    xml += Controller.serializer.serializeToString(svgNode);

    this.lastTempFile = tmp.fileSync({postfix: ".svg" });
    fs.writeFileSync(this.lastTempFile.name, xml, XMLDocumentPersister.CHARSET);

    if (loadCallback) loadCallback();
};
Rasterizer.prototype.rasterizeDOMToUrl = function (svgNode, callback) {
    this.rasterizeSVGNodeToUrl(svgNode, function (url) {
        callback({url: url});
    });
};
Rasterizer.prototype.rasterizeDOMToUrl_old = function (svgNode, callback) {
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
