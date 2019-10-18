Pencil.dragObserverClasses = [];
Pencil.registerDragObserver = function (observerClass) {
    Pencil.dragObserverClasses.push(observerClass);
};
Pencil.installDragObservers = function (canvas) {
    for (var factory in Pencil.dragObserverClasses) {
        var constructorFunction = Pencil.dragObserverClasses[factory];
        var observer = new constructorFunction(canvas);
        canvas.dragObservers.push(observer);
    }
};

function ShapeDefDragObserver(canvas) {
    this.canvas = canvas;
    this.name = "ShapeDefDragObserver";
    this.aboutToDelete = false;
    this.deleteDiscarded = false;
    this.lastDragEnterTS = new Date().getTime();
}
ShapeDefDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();

        flavours.appendFlavour("pencil/def");

        return flavours;
    },
    onDragEnter: function (event, session) {
        var now = new Date().getTime();
        var delta = now - this.lastDragEnterExitEventTS;
        this.lastDragEnterExitEventTS = now;

        var defId = event.dataTransfer.getData("pencil/def");
        var defId = nsDragAndDrop.getData("pencil/def");

        this.dragStart = false;

        debug("onDragEnter, defId: " + defId);
        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
        var loc = this.canvas.getEventLocation(event, "withoutZoom");

        this.canvas.insertShapeImpl_(def, new Bound(loc.x, loc.y, null, null));

        //fake move marking:
        this.canvas.startFakeMove(event);

        this.commited = false;
        this.hasDrag = true;
    },
    exit: function (event) {
        //console.log("Event ", event);
        this.aboutToDelete = false;
        if (this.deleteDiscarded) {
            return;
        }
        if (!this.commited && this.hasDrag) {
            var loc = {
                x: event.clientX,
                y: event.clientY
            }
            if (loc.x == 0 && loc.y == 0 ) {
                this.commited = true;
                this.canvas.finishMoving(event);
            } else {
                this.canvas.deleteSelected();
            }
            console.log("event: ", event);
            // var loc = this.canvas.locDrag;
            // var cRect = this.canvas.svg.getBoundingClientRect();
            // var aPane = Pencil.controller.applicationPane.contentBody.getBoundingClientRect();
            // var pane = {
            //     x: Math.round(aPane.left),
            //     y: Math.round(aPane.top),
            //     w: Math.round(aPane.width),
            //     h: Math.round(aPane.height)
            // }
            // //console.log("cRect: ", cRect);
            // var rec = {
            //     x: Math.round(cRect.left),
            //     y: Math.round(cRect.top),
            //     w: Math.round(cRect.width),
            //     h: Math.round(cRect.height)
            // }
            // console.log("rect", rec);
            // console.log("pane", pane);
            // console.log("location: ", loc);
            // if (loc.x >= rec.x && loc.x <= rec.w
            //     && loc.y >= rec.y && loc.y <= rec.h
            //     && loc.x >= pane.x && loc.x <= pane.w
            //     && loc.y >= pane.y && loc.y <= pane.h) {
            //     this.commited = true;
            //     this.canvas.finishMoving(event);
            // } else {
            //     this.canvas.deleteSelected();
            // }
        }
        this.hasDrag = false;
    },
    onDragStart: function (evt, transferData, action) {
        this.dragStart = true;
    },
    onDragExit: function (event, session) {
        this.exit(event);
    },
    onDragOver: function (event, flavour, session) {
        // console.log("drag over", event);
        if (!this.commited && this.hasDrag) {
            if (event.clientX != this._lastScreenX || event.clientY != this._lastScreenY) {
                this.canvas.handleMouseMove(event, "fake");
                this._lastScreenX = event.clientX;
                this._lastScreenY = event.clientY;
            }
        }
    },
    onDrop: function (event, transferData, session) {
        this.commited = true;
        this.canvas.finishMoving(event);
    }
};

Pencil.registerDragObserver(ShapeDefDragObserver);

function PrivateShapeDefDragObserver(canvas) {
    this.canvas = canvas;
    this.name = "PrivateShapeDefDragObserver";
    this.aboutToDelete = false;
    this.deleteDiscarded = false;
    this.lastDragEnterTS = new Date().getTime();
}
PrivateShapeDefDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();
        flavours.appendFlavour("pencil/privatedef");
        return flavours;
    },

    onDragEnter: function (event, session) {
        var now = new Date().getTime();
        var delta = now - this.lastDragEnterExitEventTS;
        this.lastDragEnterExitEventTS = now;

        if (this.aboutToDelete) {
            this.deleteDiscarded = true;
            return;
        }

//        if (delta < 200) return;

        // var transferData = nsTransferable.get(this.getSupportedFlavours(), nsDragAndDrop.getDragData, true);
        // var defId = null;
        // try {
        //     defId = transferData.first.first.data;
        // } catch (e) {
        //     return;
        // }

        var defId = event.dataTransfer.getData("pencil/privatedef");
        var defId = nsDragAndDrop.getData("pencil/privatedef");

        var def = PrivateCollectionManager.locateShapeDefinition(defId);
        if (!def) def = CollectionManager.shapeDefinition.locateBuiltinPrivateShapeDef(defId);
        
        if (!def) {
            console.log("Private def not found", defId);
            return;
        }

        var loc = this.canvas.getEventLocation(event, "withoutZoom");

        this.canvas.insertPrivateShapeImpl_(def, new Bound(loc.x, loc.y, null, null));

        //fake move marking:
        this.canvas.startFakeMove(event);

        this.commited = false;
        this.hasDrag = true;
    },
    exit: function (event) {
        this.aboutToDelete = false;
        if (this.deleteDiscarded) {
            return;
        }


        if (!this.commited && this.hasDrag) {
            console.log("event: ", event);
            var loc = {
                x: event.clientX,
                y: event.clientY
            }
            if (loc.x == 0 && loc.y == 0 ) {
                this.commited = true;
                this.canvas.finishMoving(event);
            } else {
                this.canvas.deleteSelected();
            }
            // var loc = this.canvas.getEventLocation(event);
            // var cRect = this.canvas.svg.getBoundingClientRect();
            // //console.log("cRect: ", cRect);
            // var rec = {
            //     x: Math.round(cRect.left),
            //     y: Math.round(cRect.top),
            //     w: Math.round(cRect.width),
            //     h: Math.round(cRect.height)
            // }
            // console.log("loc: ", loc);
            // console.log("rect: ", rec);
            // if (loc.x >= rec.x && loc.x <= rec.w
            //     && loc.y >= rec.y && loc.y <= rec.h) {
            //     console.log("finishMoving: ", loc);
            //     this.commited = true;
            //     this.canvas.finishMoving(event);
            //     this.canvas.leaveTarget = this.canvas.currentController;
            //
            // } else {
            //     this.canvas.deleteSelected();
            // }
        }


        this.hasDrag = false;
    },
    onDragExit: function (event, session) {
        var thiz = this;

        this.aboutToDelete = true;
        this.deleteDiscarded = false;

        window.setTimeout(function () {
            thiz.exit(event);
        }, 10);
    },
    onDragOver: function (event, flavour, session) {
        if (!this.commited && this.hasDrag) {
            if (event.clientX != this._lastScreenX || event.clientY != this._lastScreenY) {
                this.canvas.handleMouseMove(event, "fake");
                this._lastScreenX = event.clientX;
                this._lastScreenY = event.clientY;
            }
        }
    },
    onDrop: function (event, transferData, session) {
        this.commited = true;
        this.canvas.finishMoving(event);
    }
};

Pencil.registerDragObserver(PrivateShapeDefDragObserver);

//====================================================================================

function ShapeShortcutDragObserver(canvas) {
    this.canvas = canvas;
    this.aboutToDelete = false;
    this.deleteDiscarded = false;
    this.lastDragEnterTS = new Date().getTime();
}
ShapeShortcutDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();

        flavours.appendFlavour("pencil/shortcut");

        return flavours;
    },

    onDragEnter: function (event, session) {
        var now = new Date().getTime();
        var delta = now - this.lastDragEnterExitEventTS;
        this.lastDragEnterExitEventTS = now;

        var defId = event.dataTransfer.getData("pencil/shortcut");
        var defId = nsDragAndDrop.getData("pencil/shortcut");

        var shortcut = CollectionManager.shapeDefinition.locateShortcut(defId);
        var def = shortcut.shape;
        var overridingValueMap = shortcut.propertyMap;
        overridingValueMap._shortcut = shortcut;

        var loc = this.canvas.getEventLocation(event, "withoutZoom");

        this.canvas.insertShapeImpl_(def, new Bound(loc.x, loc.y, null, null), overridingValueMap);

        //fake move marking:
        this.commited = false;
        this.hasDrag = true;
        this.canvas.startFakeMove(event);

    },
    exit: function (event) {
        this.aboutToDelete = false;
        if (this.deleteDiscarded) {
            return;
        }

        if (!this.commited && this.hasDrag) {
            // console.log("event: ", event);
            // var loc = this.canvas.getEventLocation(event);
            // var cRect = this.canvas.svg.getBoundingClientRect();
            // //console.log("cRect: ", cRect);
            // var rec = {
            //     x: Math.round(cRect.left),
            //     y: Math.round(cRect.top),
            //     w: Math.round(cRect.width),
            //     h: Math.round(cRect.height)
            // }
            // console.log("loc: ", loc);
            // console.log("rect: ", rec);
            // if (loc.x >= rec.x && loc.x <= rec.w
            //     && loc.y >= rec.y && loc.y <= rec.h) {
            //     console.log("finishMoving: ", loc);
            //     this.commited = true;
            //     this.canvas.finishMoving(event);
            //     this.canvas.leaveTarget = this.canvas.currentController;
            //
            // } else {
            //     this.canvas.deleteSelected();
            // }
            var loc = {
                x: event.clientX,
                y: event.clientY
            }
            if (loc.x == 0 && loc.y == 0 ) {
                this.commited = true;
                this.canvas.finishMoving(event);
            } else {
                this.canvas.deleteSelected();
            }
        }
        this.hasDrag = false;
    },
    onDragExit: function (event, session) {
        this.exit(event);
    },
    onDragOver: function (event, flavour, session) {
        if (!this.commited && this.hasDrag) {
            if (event.clientX != this._lastScreenX || event.clientY != this._lastScreenY) {
                this.canvas.handleMouseMove(event, "fake");
                this._lastScreenX = event.clientX;
                this._lastScreenY = event.clientY;
            }
        }
    },
    onDrop: function (event, transferData, session) {
        this.commited = true;
        this.canvas.finishMoving(event);
    }
};

Pencil.registerDragObserver(ShapeShortcutDragObserver);

//====================================================================================

function RichTextDragObserver(canvas) {
    this.canvas = canvas;
}
RichTextDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();

        flavours.appendFlavour("text/html");

        return flavours;
    },
    onDragOver: function (evt, flavour, session){},
    onDrop: function (evt, transferData, session) {

        var html = transferData.data;
        try {
            var xhtml = Dom.toXhtml(html);
            console.log("html: " + xhtml);
            var textPaneDef = CollectionManager.shapeDefinition.locateDefinition(RichTextXferHelper.SHAPE_DEF_ID);
            if (!textPaneDef) return;

            this.canvas.insertShape(textPaneDef, null);
            if (this.canvas.currentController) {
                this.canvas.currentController.setProperty(RichTextXferHelper.SHAPE_CONTENT_PROP_NAME, new RichText(xhtml));
            }
        } catch (e) {
            throw e;
        }

    }
};

Pencil.registerDragObserver(RichTextDragObserver);

//====================================================================================

function FileDragObserver(canvas) {
    this.canvas = canvas;
}
FileDragObserver.prototype = {
    acceptsDataTransfer : function (dataTransfer) {
        return dataTransfer && dataTransfer.files && dataTransfer.files.length > 0;
    },
    onDragOver: function (evt, flavour, session){},
    onDrop: function (evt, dataTransfer, session) {

        for (var i = 0; i < dataTransfer.files.length; i ++) {
            var file = dataTransfer.files[i];
            var fileType = path.extname(file.path);
            if (!fileType) return;
            fileType = fileType.substring(1).toLowerCase();

            var loc = this.canvas.getEventLocation(evt, "withoutZoom");

            if (FileDragObserver.fileTypeHandler[fileType]) {
                FileDragObserver.fileTypeHandler[fileType](this.canvas, file.path, loc);
            }
        }
    }
};
FileDragObserver.SVG_SHAPE_DEF_ID = "Evolus.Common:SVGImage";

FileDragObserver.fileTypeHandler = {
    _handleImageFile: function (canvas, url, loc, transparent) {
        try {
            var def = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
            if (!def) return;

            canvas.insertShape(def, new Bound(loc.x, loc.y, null, null));
            if (!canvas.currentController) return;

            var controller = canvas.currentController;

            var handler = function (imageData) {
                var r = imageData.w / (canvas.width * 0.9);
                r = Math.max(r, imageData.h / (canvas.height * 0.9));

                if (r < 1) r = 1;

                var dim = new Dimension(imageData.w / r, imageData.h / r);
                controller.setProperty("imageData", imageData);
                controller.setProperty("box", dim);
                if (transparent) {
                    controller.setProperty("fillColor", Color.fromString("#ffffff00"));
                }
                canvas.invalidateEditors();
            };

            ImageData.fromExternalToImageData(url, handler);
        } catch (e) {
            Console.dumpError(e);
        }
    },
    png: function (canvas, url, loc) {
        debug(url);
        this._handleImageFile(canvas, url, loc, "transparent");
    },
    jpg: function (canvas, url, loc) {
        this._handleImageFile(canvas, url, loc);
    },
    gif: function (canvas, url, loc) {
        this._handleImageFile(canvas, url, loc, "transparent");
    },
    svg: function (canvas, url, loc) {
        var fileContents = require("fs").readFileSync(url, {encoding: "utf8"});
        FileDragObserver.handleSVGData(fileContents, canvas, loc);
    },
    ep: function (canvas, url) {
        Pencil.documentHandler.loadDocument(url);
    },
    epz: function (canvas, url) {
        Pencil.documentHandler.loadDocument(url);
    },
    epgz: function (canvas, url) {
        Pencil.documentHandler.loadDocument(url);
    }
};

FileDragObserver.handleSVGData = function (svg, canvas, loc) {
    try {
        var domParser = new DOMParser();
        var dom = domParser.parseFromString(svg, "text/xml");
        FileDragObserver.handleSVGDOM(dom, canvas, loc);
    } catch (e) {
        Console.dumpError(e);
    }
}

FileDragObserver.svgMeasuringNode = null;

FileDragObserver.handleSVGDOM = function (dom, canvas, loc) {
    if (!loc) {
        loc = canvas.lastMouse || {x: 10, y: 10};
    }
    var fromOC = dom.documentElement.getAttributeNS(PencilNamespaces.p, "ImageSource");
    var width = Svg.getWidth(dom);
    var height = Svg.getHeight(dom);

    console.log("WxH", [width, height]);
    var dx = 0;
    var dy = 0;

    //parse the provided svg viewBox
    if (dom.documentElement.viewBox) {
        var viewBox = dom.documentElement.viewBox.baseVal;
        if (viewBox.width > 0 && viewBox.height > 0) {
            width = viewBox.width;
            height = viewBox.height;

            dx = viewBox.x;
            dy = viewBox.y;
        }
    }

    var g = dom.createElementNS(PencilNamespaces.svg, "g");
    while (dom.documentElement.childNodes.length > 0) {
        var firstChild = dom.documentElement.firstChild;
        dom.documentElement.removeChild(firstChild);
        g.appendChild(firstChild);
    }

    if (fromOC) {
        g.setAttributeNS(PencilNamespaces.p, "p:ImageSource", fromOC);
        if (fromOC == "OpenClipart.org") {
            Dom.renewId(g, /([a-zA-Z0-9]+)/i);
        }
    }

    // if (!FileDragObserver.svgMeasuringNode) {
    //     var div = document.createElement("div");
    //     div.style.cssText = "position: absolute; left: 0px; top: 0px; width: 5px; height: 5px; overflow: hidden; visibility: hidden;";
    //     document.body.appendChild(div);
    //     var svg = document.createElementNS(PencilNamespaces.svg, "svg:svg");
    //     svg.setAttribute("version", "1.0");
    //     svg.setAttribute("width", 10);
    //     svg.setAttribute("height", 10);
    //
    //     div.appendChild(svg);
    //     FileDragObserver.svgMeasuringNode = svg;
    // }
    //
    // Dom.empty(FileDragObserver.svgMeasuringNode);
    // FileDragObserver.svgMeasuringNode.appendChild(g);
    // FileDragObserver.svgMeasuringNode.removeChild(g);

    //g.setAttribute("transform", "translate(" + (0 - dx) + "," + (0 - dy) + ")");

    var g0 = dom.createElementNS(PencilNamespaces.svg, "g");
    g0.appendChild(g);

    dom.replaceChild(g0, dom.documentElement);

    var def = CollectionManager.shapeDefinition.locateDefinition(FileDragObserver.SVG_SHAPE_DEF_ID);
    canvas.insertShape(def, new Bound(loc.x - width / 2, loc.y - height / 2, null, null));

    if (canvas.currentController) {
        var controller = canvas.currentController;
        var w = width;
        var h = height;

        var maxWidth = canvas.width * 0.9;
        var maxHeight = canvas.height * 0.9;

        if (Config.get("clipartbrowser.scale") == true && (w > maxWidth || h > maxHeight)) {
            var r = Math.max(w / maxWidth, h / maxHeight);
            w /= r;
            h /= r;
        }

        var dim = new Dimension(w, h);
        controller.setProperty("svgXML", new PlainText(Dom.serializeNode(dom.documentElement)));
        controller.setProperty("box", dim);
        controller.setProperty("originalDim", new Dimension(width, height));
    }
}

Pencil.registerDragObserver(FileDragObserver);

function SVGDragObserver(canvas) {
    this.canvas = canvas;
}
SVGDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();

        flavours.appendFlavour("image/svg+xml");

        return flavours;
    },
    onDragOver: function (evt, flavour, session){},
    onDrop: function (evt, transferData, session) {
        var svg = transferData.data;
        var loc = this.canvas.getEventLocation(evt, "withoutZoom");
        FileDragObserver.handleSVGData(svg, this.canvas, loc);
    }
};

Pencil.registerDragObserver(SVGDragObserver);


function PNGDragObserver(canvas) {
    this.canvas = canvas;
}
PNGDragObserver.prototype = {
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();

        flavours.appendFlavour("pencil/png");

        return flavours;
    },
    onDragOver: function (evt, flavour, session){},
    onDrop: function (evt, transferData, session) {

        var url = transferData.data;

        var loc = this.canvas.getEventLocation(evt, "withoutZoom");

        this._handleImageFile(this.canvas, url, loc, "transparent");
    },
    _handleImageFile: function (canvas, url, loc, transparent) {
        try {
            var def = CollectionManager.shapeDefinition.locateDefinition(PNGImageXferHelper.SHAPE_DEF_ID);
            if (!def) return;

            if (Config.get("document.EmbedImages") == null) {
                Config.set("document.EmbedImages", false);
            }
            var embedImages = Config.get("document.EmbedImages")

            canvas.insertShape(def, new Bound(loc.x, loc.y, null, null));
            if (!canvas.currentController) return;

            var controller = canvas.currentController;

            var handler = function (imageData) {
                var w = imageData.w;
                var h = imageData.h;

                var maxWidth = Config.get("clipartbrowser.scale.width");
                var maxHeight = Config.get("clipartbrowser.scale.height");
                if (!maxWidth) {
                    maxWidth = 200;
                    Config.set("clipartbrowser.scale.width", 200);
                }
                if (!maxHeight) {
                    maxHeight = 200;
                    Config.set("clipartbrowser.scale.height", 200);
                }

                if (Config.get("clipartbrowser.scale") == true && (w > maxWidth || h > maxHeight)) {
                    if (w > h) {
                        h = h / (w / maxWidth);
                        w = maxWidth;
                    } else {
                        w = w / (h / maxHeight);
                        h = maxHeight;
                    }
                }
                var dim = new Dimension(w, h);
                controller.setProperty("imageData", imageData);
                controller.setProperty("box", dim);
                if (transparent) {
                    controller.setProperty("fillColor", Color.fromString("#ffffff00"));
                }
            };

            if (!embedImages) {
                ImageData.fromUrl(url, handler);
            } else {
                ImageData.fromUrlEmbedded(url, handler);
            }
            canvas.invalidateEditors();
        } catch (e) {
            Console.dumpError(e);
        }
    }
};
Pencil.registerDragObserver(PNGDragObserver);
