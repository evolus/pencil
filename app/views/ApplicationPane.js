function ApplicationPane() {
    BaseTemplatedWidget.call(this);
    this.busyCount = 0;
    Pencil.boot();

    this.canvasPool = new CanvasPool(this, 3);
    this.controller = new Controller(this.canvasPool, this);
    this.rasterizer = new Rasterizer(this.controller);
    this.canvasMenu = new CanvasMenu();

    this._defaultDocumentHandler = new DocumentHandler(this.controller);
    this._useUtilityDocumentHandler = false;

    Object.defineProperty(this, "documentHandler", {
        get() {
            return this._useUtilityDocumentHandler ? this._utilityDocumentHandler : this._defaultDocumentHandler;
        }
    });

    this._utilityDocumentHandler = new DocumentHandler(this.controller);

    Pencil.controller = this.controller;
    Pencil.rasterizer = this.rasterizer;

    this.sharedFontEditor.applicationPane = this;

    //this.toolBarSrollView.setWheelAllow(false);

    this.bind("focusout", function(ev) {
        if (ev.target) {
            this.toolBarSrollView.setWheelAllow(true);
        }
    }, this.toolBarSrollView.node());

    this.bind("focusin", function(ev) {
        if (ev.target) {
            this.toolBarSrollView.setWheelAllow(false);
        }
    }, this.toolBarSrollView.node());

    var thiz = this;
    this.mainMenu = new MainMenu(this.menuIcon);
    this.bind("click", function (event) {
        if (thiz.mainMenu.isVisible()){
            thiz.mainMenu.hide();
            return;
        }
        thiz.mainMenu.showMenu(this.menuIcon, "left-inside", "bottom", 0, 0);
    }, this.menuIcon);

    this.bind("p:DocumentChanged", this.onDocumentChanged, this.node());
    window.globalEventBus.listen("doc-options-change", this.onDocumentOptionsChanged.bind(this));

    this.bind("p:PageInfoChanged", function (event) {
        this.pageListView.handlePageInfoChangedEvent(event);
    });
    this.bind("p:ControllerStatusChanged", function (event) {
        this.invalidateUIForControllerStatus();
    });
    this.bind("p:ZoomChanged", function (event) {
        this.invalidateZoom();
    });

    var lastOverflowX = null;
    var lastOverflowY = null;

    var overflowChecker = function () {
        var pane = thiz.activeCanvas ? thiz.activeCanvas._scrollPane : null;
        if (!pane) {
            window.setTimeout(overflowChecker, 100);
            return;
        }
        var overflowX = pane.scrollWidth > pane.clientWidth;
        var overflowY = pane.scrollHeight > pane.clientHeight;

        if (pane.lastOverflowX == null || pane.lastOverflowX != overflowX || pane.lastOverflowY == null || pane.lastOverflowY != overflowY) {
            pane.setAttribute("overflowx", overflowX);
            pane.setAttribute("overflowy", overflowY);

            pane.style.transform = "";
            pane.style.transform = "translateZ(0)";
        }

        pane.lastOverflowX = overflowX;
        pane.lastOverdlowY = overflowY;

        window.setTimeout(overflowChecker, 100);
    };
    //overflowChecker();


    this.pageListView.setController(this.controller);

    //preventing drag and drop

    document.addEventListener('dragover', function (event) {
        event.preventDefault();
        return false;
    }, false);

    document.addEventListener('drop', function (event) {
        event.preventDefault();
        return false;
    }, false);

    ApplicationPane._instance = this;

    this.bind("dblclick", function (event) {
        if (event.target.nodeName == "input") {
            event.target.select();
        }
    }, this.toolbarContainer)

    Pencil.handleArguments();
    FontLoader.instance.loadFonts();

    this._createUtilCanvas();
}
__extend(BaseTemplatedWidget, ApplicationPane);
ApplicationPane.prototype.onAttached = function () {
    var thiz = this;
    this.invalidateUIForConfig();
    this.showStartupPane();
    window.setTimeout(function () {
        this.leftSidePane.invalidateUI();
        this.rightSidePane.invalidateUI();
    }.bind(this), 200);
    // window.setTimeout(function () {
    //     Pencil.documentHandler.newDocument();
    //     console.log("starting image editor...");
    //     ImageData.fromExternalToImageData("/home/dgthanhan/Pictures/pencil-mac-dragto.png", function (imageData) {
    //         console.log("image data", imageData);
    //         var dialog = new ImageEditorDialog();
    //         dialog.open({
    //             imageData: imageData,
    //             onDone: function (newImageData) {
    //                 console.log("Updated data:", newImageData);
    //             }
    //         });
    //     });
    // }, 100);


};

Config.UI_CUSTOM_FONT_FAMILY = Config.define("ui.customUIFontFamily", "");
Config.UI_CUSTOM_FONT_SIZE = Config.define("ui.customUIFontSize", "");

ApplicationPane.prototype.invalidateUIForConfig = function () {
    debug("BOOT: invalidating UI using configuration");
    var useCompactLayout = Config.get("view.useCompactLayout", false);
    document.body.setAttribute("compact-layout", useCompactLayout);

    var family = "system-ui"; //Config.get(Config.UI_CUSTOM_FONT_FAMILY);
    if (family) document.body.style.fontFamily = family;

    var size = Config.get(Config.UI_CUSTOM_FONT_SIZE);
    if (size) document.body.style.fontSize = size;

    this.toolBarSrollView.invalidate();
};
ApplicationPane.prototype.invalidateUIForControllerStatus = function () {
    if (this.controller.doc) {
        document.title = this.controller.getDocumentName() + " - Pencil";
        this.pageListView.node().style.display = "inline-block";
        this.pageListView.renderPages()
    } else {
        this.pageListView.node().style.display = "none";
        document.title = "Pencil";
    }

};
ApplicationPane.prototype.getCanvasContainer = function () {
    return this.contentBody;
};
ApplicationPane.prototype.createCanvas = function () {
    var w = 400;
    var h = 400;

    var doc = this.getCanvasContainer().ownerDocument;

    var scrollPane = doc.createElement("hbox");
    Dom.addClass(scrollPane, "CanvasScrollPane");
    scrollPane.setAttribute("flex", "1");

    var wrapper = doc.createElement("div");
    Dom.addClass(wrapper, "CanvasWrapper");
    wrapper.setAttribute("tabindex", 0);
    scrollPane.appendChild(wrapper);

    var container = doc.createElement("div");
    wrapper.appendChild(container);
    container.style.width = w + "px";
    container.style.height = h + "px";
    Dom.addClass(container, "Canvas");

    var stencilToolbar = new StencilShapeCanvasToolbar().into(wrapper);

    var canvas = null;


    scrollPane.addEventListener("mousedown", function (e) {
        scrollPane._mouseDownAt = e.timeStamp;
    });

    scrollPane.addEventListener("mouseup", function (e) {
        if (!scrollPane._mouseDownAt || (e.timeStamp - scrollPane._mouseDownAt) > 150) return;
        if (!Dom.findParentWithClass(e.target, "CanvasWrapper")) {
            if (!canvas.isSelectingRange) canvas.selectNone();
        }
    });

    canvas = new Canvas(container, null, scrollPane);

    this.getCanvasContainer().appendChild(scrollPane);
    wrapper._canvas = canvas;
    scrollPane._canvas = canvas;
    canvas._wrapper = wrapper;
    canvas._scrollPane = scrollPane;

    scrollPane.style.display = "none";

    stencilToolbar.canvas = canvas;

    canvas.element.addEventListener("p:SizeChanged", function () {
        var w = Math.ceil(canvas.width * canvas.zoom);
        var h = Math.ceil(canvas.height * canvas.zoom);
        container.style.width = w + "px";
        container.style.height = h + "px";
        container.parentNode.style.width = w + "px";
        container.parentNode.style.height = h + "px";
    }, false);
    return canvas;
};
ApplicationPane.prototype.onDocumentChanged = function () {
    this.pageListView.currentPage = this.controller.activePage;
    if (this.pageListView.currentPage != null && this.pageListView.currentPage.canvas != null) {
        this.pageListView.currentPage.canvas._sayTargetChanged();
    }
    this.pageListView.renderPages();

    this.onDocumentOptionsChanged();
};
ApplicationPane.prototype.onDocumentOptionsChanged = function () {
    this.getCanvasContainer().setAttribute("stencil-dev-mode", StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection() ? true : false);
};

ApplicationPane.prototype.activatePage = function (page) {
    this.pageListView.activatePage(page);
}
ApplicationPane.prototype.testSave = function () {
    this.documentHandler.newDocument();
    var options = {
        name: "Sample page",
        width: 1000,
        height: 1000,
        backgroundPageId: null,
        backgroundColor: null,
        note: "",
        parentPageId: null,
        activateAfterCreate: false
    };
    var page = this.controller.newPage(options);
    page.canvas = Pencil.activeCanvas;

    this.controller.serializePage(page, page.tempFilePath);
};
ApplicationPane.prototype.setActiveCanvas = function (canvas) {
    if (this.activeCanvas && this.activeCanvas != canvas) {
        this.activeCanvas._cachedState = this.activeCanvas.getCanvasState();

    }

    for (var i = 0; i < this.getCanvasContainer().childNodes.length; i ++) {
        var scrollPane = this.getCanvasContainer().childNodes[i];
        if (!scrollPane.getAttribute) continue;
        scrollPane.style.display = (canvas != null && canvas._scrollPane == scrollPane) ? "flex" : "none";
    }

    Pencil.activeCanvas = canvas;
    this.activeCanvas = canvas;

    if (canvas != null) {
        this.startupDocumentView.node().style.display = "none";
        if (canvas.__dirtyGraphic) {
            canvas.invalidateAll();
            canvas.__dirtyGraphic = false;
        }
        canvas.focus();
    }

    this.invalidateZoom();
    Dom.emitEvent("p:CanvasActived", this.node(), {
        canvas: canvas
    });
};
ApplicationPane.prototype.invalidateZoom = function () {
    this.zoomToolbar.setAttribute("label", Pencil.activeCanvas ? (Math.round(Pencil.activeCanvas.zoom * 100) + "%") : "100%") ;
};
ApplicationPane.prototype.showStartupPane = function () {
    debug("BOOT: Showing startup pane...");
    Pencil.documentHandler.preDocument = null;
    if (Pencil.controller.activePage) {
        Pencil.controller.activePage.canvas.selectNone();
    }
    this.setActiveCanvas(null);
    this.startupDocumentView.reload();
    this.startupDocumentView.node().style.display = "flex";

    this.invalidateUIForControllerStatus();
    debug("BOOT:   >> Done");
};
const NO_CONTENT_VALUE = 22;
ApplicationPane.prototype.getNoContentValue = function () {
    var compact = Config.get("view.useCompactLayout", false);
    return compact ? 10 : NO_CONTENT_VALUE;
}
ApplicationPane.prototype.getCanvasToolbarHeight = function () {
    return StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection() ? Math.round(3 * Util.em()) : 0;
};
ApplicationPane.prototype.getPreferredCanvasSize = function () {
    var toolbarPadding = this.getCanvasToolbarHeight();

    return {
        w: Math.round(this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding()) - this.getNoContentValue(),
        h: Math.round(this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding()) - this.getNoContentValue() - toolbarPadding
    }
};
ApplicationPane.prototype.getBestFitSize = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    var toolbarPadding = this.getCanvasToolbarHeight();

    return [zoom * (this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding() - this.getNoContentValue()),
            zoom * (this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding() - this.getNoContentValue() - toolbarPadding)].join("x");
};
ApplicationPane.prototype.getBestFitSizeObject = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    var toolbarPadding = this.getCanvasToolbarHeight();
    return {width: zoom * (this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding() - this.getNoContentValue()), height: zoom * (this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding() - this.getNoContentValue() - toolbarPadding)};
};
ApplicationPane.prototype.showBusyIndicator = function () {
    this.currentBusyOverlay = document.createElement("div");
    document.body.appendChild(this.currentBusyOverlay);
    this.currentBusyOverlay.style.cssText = "position: absolute; z-index:1000; top: 0px; left: 0px; right: 0px; bottom: 0px; cursor: wait;";
};
ApplicationPane.prototype.hideBusyIndicator = function () {
    if (this.currentBusyOverlay) {
        if (this.currentBusyOverlay.parentNode) this.currentBusyOverlay.parentNode.removeChild(this.currentBusyOverlay);
        this.currentBusyOverlay = null;
    }
};
ApplicationPane.prototype.busy = function () {
    this.busyCount ++;
    if (this.busyCount == 1) this.showBusyIndicator();
};

ApplicationPane.prototype.unbusy = function () {
    if (this.busyCount > 0) this.busyCount --;
    if (this.busyCount == 0) this.hideBusyIndicator();
};
ApplicationPane.prototype.unbusyAfter = function (callback) {
    return function() {
        try {
            callback.apply(this, arguments);
        } finally {
            ApplicationPane._instance.unbusy();
        }
    };
};
ApplicationPane.prototype.invalidatePropertyEditor = function () {
    if (!Pencil.activeCanvas.currentController) {
        this.sharedPropertyEditor.detach();
    }
};
ApplicationPane.prototype.toggleFullscreen = function () {
    var browserWindow = remote.getCurrentWindow();
    var fullscreen = !browserWindow.isFullScreen();
    if (fullscreen) {
        this.shouldRestoreSidePane = this.leftSidePane.isOpen();
    }

    browserWindow.setFullScreen(fullscreen);
    this.validateFullScreen();
};
ApplicationPane.prototype.validateFullScreen = function () {
    var browserWindow = remote.getCurrentWindow();
    var fullscreen = browserWindow.isFullScreen();
    Dom.toggleClass(document.body, "Fullscreen", fullscreen);
    if (fullscreen) {
        this.leftSidePane.collapseAll();
    } else {
        if (this.shouldRestoreSidePane) this.leftSidePane.openLast();
    }
};
ApplicationPane.prototype.toggleLeftPane = function () {
    if (this.leftSidePane.isOpen()) {
        this.leftSidePane.collapseAll();
    } else {
        this.leftSidePane.openLast();
    }
};

ApplicationPane.prototype.setContentVisible = function (visible) {
    this.contentBody.style.visibility = visible ? "visible" : "hidden";
};

ApplicationPane.prototype._createUtilCanvas = function () {
    var w = 400;
    var h = 400;

    var doc = this.hiddenElementsContainer.ownerDocument;

    var scrollPane = doc.createElement("hbox");
    Dom.addClass(scrollPane, "CanvasScrollPane");
    scrollPane.setAttribute("flex", "1");

    var wrapper = doc.createElement("div");
    Dom.addClass(wrapper, "CanvasWrapper");
    wrapper.setAttribute("tabindex", 0);
    scrollPane.appendChild(wrapper);

    var container = doc.createElement("div");
    wrapper.appendChild(container);
    container.style.width = w + "px";
    container.style.height = h + "px";
    Dom.addClass(container, "Canvas");

    var stencilToolbar = new StencilShapeCanvasToolbar().into(wrapper);

    var canvas = null;


    scrollPane.addEventListener("mousedown", function (e) {
        scrollPane._mouseDownAt = e.timeStamp;
    });

    scrollPane.addEventListener("mouseup", function (e) {
        if (!scrollPane._mouseDownAt || (e.timeStamp - scrollPane._mouseDownAt) > 150) return;
        if (!Dom.findParentWithClass(e.target, "CanvasWrapper")) {
            if (!canvas.isSelectingRange) canvas.selectNone();
        }
    });

    canvas = new Canvas(container, null, scrollPane);

    this.hiddenElementsContainer.appendChild(scrollPane);
    wrapper._canvas = canvas;
    scrollPane._canvas = canvas;
    canvas._wrapper = wrapper;
    canvas._scrollPane = scrollPane;

    stencilToolbar.canvas = canvas;

    canvas.element.addEventListener("p:SizeChanged", function () {
        var w = Math.ceil(canvas.width * canvas.zoom);
        var h = Math.ceil(canvas.height * canvas.zoom);
        container.style.width = w + "px";
        container.style.height = h + "px";
        container.parentNode.style.width = w + "px";
        container.parentNode.style.height = h + "px";
    }, false);

    this._utilCanvas = canvas;
};

ApplicationPane.prototype.loadDesignFromObject = async function (design, alsoOpenAsDocument) {
    let canvas = null;
    if (alsoOpenAsDocument) {
        if (this.controller.doc) {
            var size = this.getPreferredCanvasSize();
            var options = {
                name: "Untitled Page",
                width: design.canvas.width,
                height: design.canvas.height,
                backgroundPageId: null,
                backgroundColor: null,
                note: "",
                parentPageId: null,
                activateAfterCreate: "activatePage"
            };

            var page = this.controller.newPage(options);
        } else {
            await new Promise((resolve, reject) => {
                this.documentHandler.newDocument({ skipFontReload: true }, resolve);
            });
            await sleep(300);
        }

        canvas = this.activeCanvas;
    } else {
        canvas = this._utilCanvas;
    }
    canvas.selectNone();
    Dom.empty(canvas.drawingLayer);

    if (design.canvas?.backgroundColor) canvas.setBackgroundColor(Color.fromString(design.canvas.backgroundColor));
    if (design.canvas?.width && design.canvas?.height) canvas.setSize(design.canvas.width, design.canvas.height);

    let insertRecursive = async (children, x, y) => {
        for (let child of children) {
            if (child.type == "@group") {
                await insertRecursive(child.children, x + child.x, y + child.y)
            } else {
                let shapeDefId = "dgthanhan.MaterialDesktopMockup:" + child.type;
                let shapeDef = CollectionManager.shapeDefinition.locateDefinition(shapeDefId);
                if (!shapeDef) {
                    console.error("Ignoring unknow element: " + shapeDefId);
                    return;
                }

                let valueMap = {};
                for (let k in child.properties) {
                    let pdef = shapeDef.getProperty(k);
                    const valueLiteral = child.properties[k];
                    let value = pdef.type.fromString(valueLiteral);

                    if (value instanceof ImageData) {
                        resolveImageData(value);
                    }

                    // TODO: fix font handling
                    if (value instanceof Font) {
                        value.family = "FiraSans";
                        if (value.weight == "medium") value.weight = "500";
                    }
                    valueMap[k] = {
                        initialValue: value
                    };
                }

                canvas.insertShapeImpl_(shapeDef, null, valueMap);
                canvas.currentController.moveBy(x + child.x, y + child.y, true);
            }
        }
    };

    insertRecursive(design.elements, 0, 0);

    await sleep(100);
    canvas.invalidateEditors();
    canvas._saveMemento("Loading design");

    return canvas;
};

const jsonRenderMutex = new Mutex();

ApplicationPane.prototype.convertDesignJSONToImage = async function (json, useSVG, alsoOpenAsDocument) {
    const release = await jsonRenderMutex.acquire();
    defaultIndicator.busy("Handling remote rendering request...");

    if (!alsoOpenAsDocument) this._useUtilityDocumentHandler = true;

    try {
        if (!alsoOpenAsDocument) this._utilityDocumentHandler.resetTempDir();
        return await this._convertDesignJSONToImageImpl(json, useSVG, alsoOpenAsDocument);
    } finally {
        if (!alsoOpenAsDocument) this._useUtilityDocumentHandler = false;
        defaultIndicator.done();
        release();
    }
}
ApplicationPane.prototype._convertDesignJSONToImageImpl = async function (json, useSVG, alsoOpenAsDocument) {
    let design = JSON.parse(json);
    let canvas = await this.loadDesignFromObject(design, alsoOpenAsDocument);
    await sleep(200);

    let size = canvas.getSize();

    let page = {
        name: "design",
        width: size.width,
        height: size.height,
        canvas: canvas
    };

    if (useSVG) {
        let svgDOM = this.controller.getPageSVG(page);
        return Controller.serializer.serializeToString(svgDOM);
    } else {
        var options = {};
        if (design.canvas?.backgroundColor) {
            options.backgroundColor = design.canvas?.backgroundColor;
        }

        let tempFilePath = Local.newTempFile("design-render", "png");

        await (new Promise((resolve, reject) => {
            this.rasterizer.rasterizePageToFile(page, tempFilePath.name, resolve, undefined, false, options);
        }));

        return tempFilePath.name;
    }
};
function resolveImageData(value) {
    if (!value.data) return;

    let ow = value.w;
    let oh = value.h;

    if (ow == 0 || oh == 0) return;

    if (value.data.startsWith(ImageData.SVG_IMAGE_DATA_PREFIX)) {
        try {
            let svg = value.getDataAsXML();
            fixImageImageSize(value, svg);
        } catch (e) {
            console.error(e);
        }
    } else if (value.data.match(/^icon:\/\/([a-z0-9]+)\/([^ \r\n\t\/]+)$/)) {
        const SUPPORTED_TYPES = {
            cmdi: "icons.CommunityMaterialIcons"
        };

        let type = RegExp.$1;
        let name = RegExp.$2;
        let collectionId = SUPPORTED_TYPES[type];
        if (!collectionId) return;

        let collection = CollectionManager.findCollection(collectionId);
        if (!collection) return;
        let found = null;
        for (let resource of collection.RESOURCE_LIST) {
            if (resource.type != "svg") continue;
            let fp = path.join(collection.installDirPath, resource.prefix, name + "." + resource.type);
            if (fs.existsSync(fp)) {
                found = fp;
                break;
            }
        }

        if (found) {
            console.log("Found", value.data, found);
            let svg = fs.readFileSync(found, "utf8").replace(/^\uFEFF/, '');
            value.w = 10;
            value.h = 10;
            value.data = ImageData.SVG_IMAGE_DATA_PREFIX + ";base64," + Buffer.from(svg).toString('base64');
            fixImageImageSize(value, svg);
        }
    }

    function fixImageImageSize(value, svg) {
        let svgNode = domParser.parseFromString(svg, "text/xml").documentElement;
        
        let viewBox = svgNode.getAttribute("viewBox");
        
        let m = viewBox?.match ? viewBox.match(/^\s*[0-9\.]+\s+[0-9\.]+\s+([0-9\.]+)\s+([0-9\.]+)\s*$/) : null;
        if (m) {
            value.w = Math.round(parseFloat(m[1]));
            value.h = Math.round(parseFloat(m[2]));
            if (value.w != ow || value.h != oh) console.log("Fix w/h using viewBox", viewBox);
        } else {
            let w = svgNode.getAttribute("width");
            let h = svgNode.getAttribute("height");
            if (w && h) {
                value.w = parseInt(w, 10);
                value.h = parseInt(h, 10);

                if (value.w != ow || value.h != oh) console.log("Fix w/h using width/height", { w, h });
            }
        }
    }
}

