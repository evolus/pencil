function PageDetailDialog() {
    Dialog.call(this);
    this.title = "CREATE NEW PAGE";
    this.pageCombo.renderer = function (canvas) {
        return canvas.name;
    };
    this.pageCombo.decorator = function (node, canvas) {
    };

    this.pageSizeCombo.renderer = function (pageSize) {
        if (!pageSize.value) return pageSize.displayName;
        return pageSize.displayName + " (" + pageSize.value + ")";
    }

    this.backgroundCombo.renderer = function (background) {
        return background.displayName;
    };

    var thiz = this;
    this.pageSizeCombo.addEventListener("p:ItemSelected", function (event) {
        var pageSize = thiz.pageSizeCombo.getSelectedItem();
        thiz.widthInput.disabled = pageSize.value;
        thiz.heightInput.disabled = pageSize.value;
    }, false);

    this.backgroundCombo.addEventListener("p:ItemSelected", function (event) {
        var background = thiz.backgroundCombo.getSelectedItem();
        thiz.colorButton.style.display = background.value ? "none" : "block";
    }, false);

    this.colorButton.addEventListener("click", function (event) {
        var color = thiz.colorButton.bgColor ? thiz.colorButton.bgColor : Color.fromString("#FFFFFF");
        thiz.selector.setColor(color);
        thiz.selectorContainer.show(thiz.colorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        var color = thiz.selector.getColor();
        thiz.colorButton.bgColor = color;
        thiz.colorButton.style.backgroundColor = color.toRGBString();
    }, false);
}

__extend(Dialog, PageDetailDialog);

Page.defaultPageSizes = [
    {
        value: "800x600",
        displayName: "Compact Web page"
    },
    {
        value: "960x600",
        displayName: "960 Web page"
    },
    {
        value: "960x900",
        displayName: "960 Web page - long"
    },
    {
        value: "1024x768",
        displayName: "Normal Web page"
    },
    {
        value: "1280x800",
        displayName: "Large Web page"
    },
    {
        value: "774x1052",
        displayName: "A4 at 90dpi"
    },
    {
        value: "2480x3508",
        displayName: "A4 at 90dpi"
    }
];

PageDetailDialog.prototype.setup = function (options) {
    this.options = options;
    if (this.options && this.options.onDone) this.onDone = this.options.onDone;

    var pages = [];
    pages.push({
        name: "None"
    });
    pages = pages.concat(Pencil.controller.pages);
    this.pageCombo.setItems(pages);

    var pageSizes = [];

    var lastSize = Config.get("lastSize");
    if (lastSize) {
        pageSizes.push({
            displayName: "Last used",
            value: lastSize
        });
    }

    var bestFitSize = Pencil.controller.getBestFitSize();
    if (bestFitSize) {
        pageSizes.push({
            displayName: "Best fit",
            value: bestFitSize
        });
    }

    pageSizes.push({
        displayName: "Custome size..."
    });

    pageSizes = pageSizes.concat(Page.defaultPageSizes);
    this.pageSizeCombo.setItems(pageSizes);

    var backgroundItems = [
        {
            displayName: "Transparent Background",
            value: "transparent"
        },
        {
            displayName: "Background Color"
        }
    ];

    var pages = Pencil.controller.pages;
    if (pages) {
        for (var i in pages) {
            var page = pages[i];
            backgroundItems.push({
                displayName: page.name,
                value: page.id
            });
        }
    };

    this.backgroundCombo.setItems(backgroundItems);

    var pageSize = this.pageSizeCombo.getSelectedItem();
    this.widthInput.disabled = pageSize.value;
    this.heightInput.disabled = pageSize.value;

    var background = this.backgroundCombo.getSelectedItem();
    this.colorButton.style.display = background.value ? "none" : "block";
};

const SIZE_RE = /^([0-9]+)x([0-9]+)$/;
PageDetailDialog.prototype.createPage = function () {
    var name = this.pageTitle.value;

    var width = 0;
    var height = 0;
    var pageSize = this.pageSizeCombo.getSelectedItem();
    if (pageSize.value) {
        var size = pageSize.value;
        if (size.match(SIZE_RE)) {
            width = parseInt(RegExp.$1, 10);
            height = parseInt(RegExp.$2, 10);
        }
    } else {
        width = parseInt(this.widthInput.value, 10);
        height = parseInt(this.heightInput.value, 10);
    }

    var backgroundPageId = null;
    var backgroundColor = null;

    var background = this.backgroundCombo.getSelectedItem();
    if (background.value != "transparent") {
        if (typeof(background.value) != "undefined") {
            backgroundColor = this.colorButton.bgColor ? this.colorButton.bgColor.toRGBString() : "#FFFFFF";
        } else {
            backgroundPageId = parseInt(background.value, 10);
        }
    }

    var page = Pencil.controller.newPage(name, width, height, backgroundPageId, backgroundColor, "");

    Config.set("lastSize", [width, height].join("x"));
    return page;
};
PageDetailDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CANCEL,
        {
            type: "accept", title: "APPLY",
            run: function () {
                if (thiz.onDone) thiz.onDone(thiz.createPage());
                return true;
            }
        }
    ];
};
