function ShapeTestCanvasPane() {
    BaseTemplatedWidget.call(this);
    ShapeTestCanvasPane._instance = this;

    this.active = false;

    this.bind("click", this.quitTesting, this.quitButton);

    var thiz = this;
    var f = function () {
        thiz.invalidateSizing();
        window.setTimeout(f, 1000);
    };

    f();
}

__extend(BaseTemplatedWidget, ShapeTestCanvasPane);

ShapeTestCanvasPane.prototype.init = function (collection, shapeDefId) {
    Dom.empty(this.canvasContainer);
    this.node().style.display = "flex";

    var w = this.canvasContainer.offsetWidth;
    var h = this.canvasContainer.offsetHeight;

    var wrapper = document.createElement("div");
    Dom.addClass(wrapper, "CanvasWrapper");
    wrapper.setAttribute("tabindex", 0);
    this.canvasContainer.appendChild(wrapper);

    var container = document.createElement("div");
    wrapper.appendChild(container);
    container.style.width = w + "px";
    container.style.height = h + "px";
    Dom.addClass(container, "Canvas");

    this.canvas = new Canvas(container, {ignorePageMarging: true});
    this.canvas.setSize(w, h);
    ApplicationPane._instance.setActiveCanvas(this.canvas);
    this.node().style.display = "flex";

    var shapeDef = this.collection.shapeDefs[0];
    this.canvas.insertShape(shapeDef, {x: Math.round(w / 2), y: Math.round(h / 2)});

    this.lastW = w;
    this.lastH = h;
    this.active = true;
};

ShapeTestCanvasPane.prototype.invalidateSizing = function () {
    if (!this.active) return;
    var w = this.canvasContainer.offsetWidth;
    var h = this.canvasContainer.offsetHeight;

    if (this.lastW == w && this.lastH == h) return;

    this.canvas.element.style.width = w + "px";
    this.canvas.element.style.height = h + "px";

    this.canvas.setSize(w, h);
    this.lastW = w;
    this.lastH = h;
};

ShapeTestCanvasPane.prototype.startTesting = function (page) {
    this.lastActiveCanvas = ApplicationPane._instance.activeCanvas;
    this.targetPage = page;
    this.builder = new StencilCollectionBuilder(ApplicationPane._instance.controller);

    Dom.setInnerText(this.title, page.name);

    var thiz = this;
    this.builder.buildShapeTest(this.targetPage.id, function () {
        thiz.collection = CollectionManager.loadAdHocCollection(thiz.builder.tempOutputDir.name);
        thiz.init();
    });
};
ShapeTestCanvasPane.prototype.quitTesting = function (target) {
    if (this.builder) this.builder.cleanupShapeTest();

    Dom.empty(this.canvasContainer);
    this.node().style.display = "none";

    if (this.lastActiveCanvas) {
        ApplicationPane._instance.setActiveCanvas(this.lastActiveCanvas);
    }

    this.lastActiveCanvas = null;
    this.active = false;
};
