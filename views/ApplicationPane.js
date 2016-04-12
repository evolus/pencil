function ApplicationPane() {
    BaseTemplatedWidget.call(this);
    Pencil.boot();

    this.canvasPool = new CanvasPool(this, 3);
    this.controller = new Controller(this.canvasPool, this);
    this.rasterizer = new Rasterizer(this.controller);

    Pencil.controller = this.controller;

    this.sharedFontEditor.applicationPane = this;

    this.pageCombo.renderer = function (canvas) {
        return canvas.name;
    };
    this.pageCombo.decorator = function (node, canvas) {
    };

    var thiz = this;

    this.bind("click", function (event) {
        console.log("menu icon check");
        if (!this.MainMenu) {
            this.MainMenu = new MainMenu();
        } else {
            this.MainMenu.setup(true);
        }
        this.MainMenu.showMenuAt(event.clientX, event.clientY);
    }, this.menuIcon)

    this.bind("p:DocumentChanged", this.onDocumentChanged, this.node());
    this.bind("click", function () {
        var currentPage = this.pageCombo.getSelectedItem();
        var page = this.controller.newPage("Page " + new Date().getTime(), 800, 600, null, "#FF0000", "");
        // page.backgroundPage = currentPage;

        // this.controller.activatePage(page);
        this.pageListView.activatePage(page);

    }, this.addButton);

    this.bind("p:ItemSelected", function () {
        var page = this.pageCombo.getSelectedItem();
        // this.controller.activatePage(page);
        this.pageListView.activatePage(page);
    }, this.pageCombo.node());

    this.bind("p:PageInfoChanged", function (event) {
        this.pageListView.handlePageInfoChangedEvent(event);
    });

    this.bind("click", function (event) {
        // var thiz = this;
        // var dialog = new PageDetailDialog();
        // dialog.open({
        //     onDone: function (page) {
        //         if (!page) return;
        //         // thiz.controller.activatePage(page);
        //         thiz.pageListView.activatePage(page);
        //     }
        // });
        this.controller.loadOldDocument();
    }, this.testButton);
    this.bind("click", function (event) {
        var currentPage = this.pageCombo.getSelectedItem();
        this.rasterizer.rasterizePageToFile(currentPage, null, function (path, error) {
            console.log(path);
        }, 0.5);
    }, this.rasterizeButton);

    var lastOverflowX = null;
    var lastOverflowY = null;

    var overflowChecker = function () {
        var overflowX = thiz.contentBody.scrollWidth > thiz.contentBody.clientWidth;
        var overflowY = thiz.contentBody.scrollHeight > thiz.contentBody.clientHeight;

        if (lastOverflowX == null || lastOverflowX != overflowX || lastOverflowY == null || lastOverflowY != overflowY) {
            thiz.contentBody.setAttribute("overflowx", overflowX);
            thiz.contentBody.setAttribute("overflowy", overflowY);

            thiz.contentBody.style.transform = "";
            thiz.contentBody.style.transform = "translateZ(0)";
        }

        lastOverflowX = overflowX;
        lastOverdlowY = overflowY;

        window.setTimeout(overflowChecker, 200);
    };
    overflowChecker();

    this.pageListView.setController(this.controller);
}
__extend(BaseTemplatedWidget, ApplicationPane);
ApplicationPane.prototype.onAttached = function () {
    var thiz = this;
    window.setTimeout(function () {
        thiz.controller.newDocument();
    }, 100);
};
ApplicationPane.prototype.getCanvasContainer = function () {
    return this.contentBody;
};
ApplicationPane.prototype.createCanvas = function () {
    var w = 400;
    var h = 400;

    var doc = this.getCanvasContainer().ownerDocument;

    var wrapper = doc.createElement("div");
    Dom.addClass(wrapper, "CanvasWrapper");

    var container = doc.createElement("div");
    wrapper.appendChild(container);
    container.style.width = w + "px";
    container.style.height = h + "px";
    Dom.addClass(container, "Canvas");

    var canvas = new Canvas(container);

    this.getCanvasContainer().appendChild(wrapper);
    wrapper._canvas = canvas;
    canvas._wrapper = wrapper;

    wrapper.style.display = "none";

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
    this.pageCombo.setItems(this.controller.doc.pages);
    if (this.controller.activePage) this.pageCombo.selectItem(this.controller.activePage);
    this.pageListView.currentPage = this.controller.activePage;

    this.pageListView.renderPages();
};
ApplicationPane.prototype.testSave = function () {
    this.controller.newDocument();
    var page = this.controller.newPage("Sample page", 1000, 1000, null, null, "");
    page.canvas = Pencil.activeCanvas;

    this.controller.serializePage(page, page.tempFilePath);
};
ApplicationPane.prototype.setActiveCanvas = function (canvas) {
    for (var i = 0; i < this.getCanvasContainer().childNodes.length; i ++) {
        var wrapper = this.getCanvasContainer().childNodes[i];
        if (!wrapper.getAttribute) continue;
        wrapper.style.display = (canvas._wrapper == wrapper) ? "inline-block" : "none";
    }

    Pencil.activeCanvas = canvas;
    this.activeCanvas = canvas;
};
ApplicationPane.prototype.getPreferredCanvasSize = function () {
    return {
        w: Math.round(this.contentBody.offsetWidth * 0.95),
        h: Math.round(this.contentBody.offsetHeight * 0.95)
    }
};

ApplicationPane.prototype.getBestFitSize = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return [zoom * (this.contentBody.offsetWidth - Pencil._getCanvasPadding()), zoom * (this.contentBody.offsetHeight - Pencil._getCanvasPadding())].join("x");
};
ApplicationPane.prototype.getBestFitSizeObject = function () {
    var zoom = Pencil.activeCanvas ? (1 / Pencil.activeCanvas.zoom) : 1;
    return {width: zoom * (this.contentBody.offsetWidth - Pencil._getCanvasPadding()), height: zoom * (this.contentBody.offsetHeight - Pencil._getCanvasPadding())};
};
