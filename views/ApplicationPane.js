function ApplicationPane() {
    BaseTemplatedWidget.call(this);
    Pencil.boot();

    this.canvasPool = new CanvasPool(this, 3);
    this.controller = new Controller(this.canvasPool, this);

    this.pageCombo.renderer = function (canvas) {
        return canvas.name;
    };
    this.pageCombo.decorator = function (node, canvas) {
    };
    this.bind("p:DocumentChanged", this.onDocumentChanged, this.node());
    this.bind("click", function () {
        var page = this.controller.newPage("Page " + new Date().getTime(), 800, 600, null, null, "");
        this.controller.activatePage(page);
    }, this.addButton);

    this.bind("p:ItemSelected", function () {
        var page = this.pageCombo.getSelectedItem();
        this.controller.activatePage(page);
    }, this.pageCombo.node());

    this.bind("click", function () {
        var menu = new Menu();
        menu.register({
            getLabel: function () { return "Undo: Move"; },
            icon: "undo",
            shortcut: "Ctrl+Z"
        });
        menu.register({
            label: "Redo",
            icon: "redo",
            shortcut: "Ctrl+Y",
            isEnabled: function () { return false; }
        });

        menu.register({
            type: "Toggle",
            label: "Lock"
        });

        menu.register({
            type: "SubMenu",
            label: "Resize Canvas",
            subItems: [
                {
                    label: "Fit Content"
                },
                {
                    label: "Fit Content with Padding..."
                },
                {
                    label: "Fit Canvas"
                }
            ]
        });

        menu.showMenu(this.testMenu, "left-inside", "bottom");
    }, this.testMenu);

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
        container.style.width = canvas.width + "px";
        container.style.height = canvas.height + "px";
    }, false);
    return canvas;
};
ApplicationPane.prototype.onDocumentChanged = function () {
    this.pageCombo.setItems(this.controller.pages);
    if (this.controller.activePage) this.pageCombo.selectItem(this.controller.activePage);
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
