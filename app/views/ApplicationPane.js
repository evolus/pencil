function ApplicationPane() {
    BaseTemplatedWidget.call(this);
    this.busyCount = 0;
    Pencil.boot();

    this.canvasPool = new CanvasPool(this, 3);
    this.controller = new Controller(this.canvasPool, this);
    this.rasterizer = new Rasterizer(this.controller);
    this.canvasMenu = new CanvasMenu();

    this.documentHandler = new DocumentHandler(this.controller);

    Pencil.documentHandler = this.documentHandler;
    Pencil.controller = this.controller;
    Pencil.rasterizer = this.rasterizer;

    this.sharedFontEditor.applicationPane = this;

    //this.toolBarSrollView.setWheelAllow(false);

    this.bind("focusout", function(ev) {
        console.log(ev.target);
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
}
__extend(BaseTemplatedWidget, ApplicationPane);
ApplicationPane.prototype.onAttached = function () {
    var thiz = this;
    this.showStartupPane();
    // window.setTimeout(function () {
    //     thiz.controller.newDocument();
    // }, 100);
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

    var canvas = new Canvas(container);

    this.getCanvasContainer().appendChild(scrollPane);
    wrapper._canvas = canvas;
    scrollPane._canvas = canvas;
    canvas._wrapper = wrapper;
    canvas._scrollPane = scrollPane;

    scrollPane.style.display = "none";

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
    this.controller.activePage.canvas._sayTargetChanged();
    this.pageListView.renderPages();
};
ApplicationPane.prototype.activatePage = function (page) {
    this.pageListView.activatePage(page);
}
ApplicationPane.prototype.testSave = function () {
    this.documentHandler.newDocument();
    var page = this.controller.newPage("Sample page", 1000, 1000, null, null, "");
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
    Pencil.documentHandler.preDocument = null;
    if (Pencil.controller.activePage) {
        Pencil.controller.activePage.canvas.selectNone();
    }
    this.setActiveCanvas(null);
    this.startupDocumentView.reload();
    this.startupDocumentView.node().style.display = "flex";

    this.invalidateUIForControllerStatus();
};
const NO_CONTENT_VALUE = 22;
ApplicationPane.prototype.getPreferredCanvasSize = function () {
    return {
        w: Math.round(this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding()) - NO_CONTENT_VALUE,
        h: Math.round(this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding()) - NO_CONTENT_VALUE
    }
};
ApplicationPane.prototype.getBestFitSize = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return [zoom * (this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding() - NO_CONTENT_VALUE),
            zoom * (this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding() - NO_CONTENT_VALUE)].join("x");
};
ApplicationPane.prototype.getBestFitSizeObject = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return {width: zoom * (this.contentBody.offsetWidth - 2 * Pencil._getCanvasPadding() - NO_CONTENT_VALUE), height: zoom * (this.contentBody.offsetHeight - 2 * Pencil._getCanvasPadding() - NO_CONTENT_VALUE)};
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
