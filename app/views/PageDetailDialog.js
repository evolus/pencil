function PageDetailDialog() {
    Dialog.call(this);
    this.modified = false;
    this.title = "Add Page";
    this.subTitle = "Configure page properties";
    this.pageCombo.renderer = function (canvas) {
        return canvas.name;
    };
    this.pageCombo.decorator = function (node, canvas) {
        if (canvas._level) {
            node.style.paddingLeft = canvas._level + "em";
        }
    };

    this.pageSizeCombo.renderer = function (pageSize) {
        if (!pageSize.value) return pageSize.displayName;
        return pageSize.displayName + " (" + pageSize.value + ")";
    }

    this.backgroundCombo.renderer = function (item) {
        return item.name;
    };

    this.backgroundCombo.decorator = function (node, item) {
        if (item._level) {
            node.style.paddingLeft = item._level + "em";
        }
    };

    var thiz = this;
    this.pageCombo.addEventListener("p:ItemSelected", function (event) {
        thiz.modified = true;
    }, false);

    this.pageSizeCombo.addEventListener("p:ItemSelected", function (event) {
        thiz.invalidatePageSizeUI();
        thiz.modified = true;
    }, false);

    this.backgroundCombo.addEventListener("p:ItemSelected", function (event) {
        var background = thiz.backgroundCombo.getSelectedItem();
        thiz.colorButton.disabled = background.value ? true : false;
        thiz.modified = true;
    }, false);

    this.colorButton.addEventListener("click", function (event) {
        var color = thiz.colorButton.style.color ? Color.fromString(thiz.colorButton.style.color) : Color.fromString("#FFFFFF");
        thiz.selector.setColor(color);
        thiz.selectorContainer.show(thiz.colorButton, "left-inside", "bottom", 0, 5);
        event.cancelBubble = true;
    }, false);

    this.selector.addEventListener("ValueChange", function (event) {
        var color = thiz.selector.getColor();
        //thiz.colorButton.bgColor = color;
        thiz.colorButton.style.color = color.toRGBAString();
        thiz.modified = true;
    }, false);

    this.pageTitle.addEventListener("input", function (event) {
        thiz.modified = true;
    }, false);

    this.widthInput.addEventListener("change", function () {
        var value = thiz.widthInput.value;
        if (!value || parseInt(value, 10) < 24) thiz.widthInput.value = 24;
        thiz.modified = true;
    }, false);
    this.heightInput.addEventListener("change", function () {
        var value = thiz.heightInput.value;
        if (!value || parseInt(value, 10) < 24) thiz.heightInput.value = 24;
        thiz.modified = true;
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
        value: (Math.round(8.27 * 96)) + "x" + (Math.round(11.69 * 96)),
        displayName: "A4 at 96dpi"
    },
    {
        value: (Math.round(8.27 * 150)) + "x" + (Math.round(11.69 * 150)),
        displayName: "A4 at 150dpi"
    },
    {
        value: (Math.round(8.27 * 300)) + "x" + (Math.round(11.69 * 300)),
        displayName: "A4 at 300dpi"
    },
    {
        value: "1280x720",
        displayName: "HD ready 720p"
    },
    {
        value: "1920x1080",
        displayName: "Full HD 1080p"
    },
    {
        value: "2560x1440",
        displayName: "WQHD 1440p"
    }
];

const SIZE_RE = /^([0-9]+)x([0-9]+)$/;

PageDetailDialog.prototype.onShown = function () {
    this.pageTitle.focus();
};
PageDetailDialog.prototype.invalidatePageSizeUI = function () {
    var pageSize = this.pageSizeCombo.getSelectedItem();
    var value = pageSize.value;
    this.widthInput.disabled = value;
    this.heightInput.disabled = value;
    if (!value) return;
    if (value.match(SIZE_RE)) {
        this.widthInput.value = Math.max(24, parseInt(RegExp.$1, 10));
        this.heightInput.value = Math.max(24, parseInt(RegExp.$2, 10));
    }
};

PageDetailDialog.prototype.setup = function (options) {
    var thiz = this;
    this.options = options;
    this.originalPage = options.defaultPage;
    this.isCreatePage = !this.originalPage;
    this.modified = false;

    if (this.options && this.options.onDone) this.onDone = this.options.onDone;

    var pageSizes = [];

    var lastSizeConfig = Config.get("lastSize");
    var w = 24;
    var h = 24;

    if (lastSizeConfig && lastSizeConfig.match(SIZE_RE)) {
        w = Math.max(24, parseInt(RegExp.$1, 10));
        h = Math.max(24, parseInt(RegExp.$2, 10));
    }


    var lastSize = w + "x" + h;
    if (lastSize) {
        pageSizes.push({
            displayName: "Last used",
            value: lastSize,
            dontCheckValue: true
        });
    }

    var bestFitSizeText = Pencil.controller.getBestFitSize();
    if (bestFitSizeText && bestFitSizeText.match(SIZE_RE)) {
        w = Math.max(24, parseInt(RegExp.$1, 10));
        h = Math.max(24, parseInt(RegExp.$2, 10));
    }

    var bestFitSize = w + "x" + h;
    if (bestFitSize) {
        pageSizes.push({
            displayName: "Best fit",
            value: bestFitSize,
            dontCheckValue: true
        });
    }

    pageSizes.push({
        displayName: "Custome size...",
        dontCheckValue: true
    });

    pageSizes = pageSizes.concat(Page.defaultPageSizes);
    this.pageSizeCombo.setItems(pageSizes);

    var pages = [].concat(Pencil.controller.doc.pages);

    var parentPageItems = [];
    parentPageItems.push({
        name: "(None)"
    });

    var backgroundItems = [
        {
            name: "Transparent Background",
            value: "transparent"
        },
        {
            name: "Background Color"
        }
    ];

    var rejectedBackgroundPageIds = [];
    if (this.originalPage) {
        rejectedBackgroundPageIds.push(this.originalPage.id);
    }

    function selectPageItem(page, level, items, isSelected, shouldCheckChildren, transformer) {
        var selected = isSelected(page);
        if (selected) {
            var item = transformer ? transformer(page) : page;
            item._level = level;
            items.push(item);
        }

        if (!selected && !shouldCheckChildren) return;

        if (!page.children || page.children.length <= 0) return;
        for (var i in page.children) {
            var child = page.children[i];
            selectPageItem(child, level + 1, items, isSelected, shouldCheckChildren, transformer);
        }
    }

    for (var i in pages) {
        var checkedPage = pages[i];
        if (checkedPage.parentPage) continue;

        // build parent page items
        selectPageItem(checkedPage, 0, parentPageItems, function (page) {
            return !thiz.originalPage || thiz.originalPage.id != page.id;
        }, false);

        // build background page items
        selectPageItem(checkedPage, 0, backgroundItems, function (page) {
            var p = page;
            while (p) {
                if (rejectedBackgroundPageIds.indexOf(p.id) >= 0) {
                    rejectedBackgroundPageIds.push(page.id);
                    return false;
                }
                p = p.backgroundPage;
            }
            return true;
        }, true, function (page) {
            return {
                name: page.name,
                value: page.id
            }
        });
    }


    this.pageCombo.setItems(parentPageItems);
    if (this.options && this.options.defaultParentPage) {
        this.pageCombo.selectItem(this.options.defaultParentPage);
    }

    this.backgroundCombo.setItems(backgroundItems);

    var pageSize = this.pageSizeCombo.getSelectedItem();

    if (options.parentpage) {
        this.pageCombo.selectItem(options.parentpage);
    }

    if (this.originalPage) {
        this.updateUIWith(this.originalPage);
    }

    this.invalidatePageSizeUI();

    var background = thiz.backgroundCombo.getSelectedItem();
    thiz.colorButton.disabled = background.value ? true : false;
};

PageDetailDialog.prototype.updateUIWith = function (page) {
    if (page.parentPage) {
        this.pageCombo.selectItem(page.parentPage);
    }
    this.pageTitle.value = page.name;

    var pageSizeValue = page.width + "x" + page.height;
    var index = null;
    for (var i in this.pageSizeCombo.items ) {
        if (!this.pageSizeCombo.items[i].dontCheckValue && this.pageSizeCombo.items[i].value == pageSizeValue) {
            index = this.pageSizeCombo.items[i];
        }
    }
    var thiz = this;
    if(index != null) {
        this.pageSizeCombo.selectItem(index);
    } else {
        this.pageSizeCombo.selectItem({
            displayName: "Custome size..."
        });
        this.widthInput.disabled = false;
        this.heightInput.disabled = false;
        this.widthInput.value = page.width;
        this.heightInput.value = page.height;
    }

    if (page.backgroundColor) {
        this.backgroundCombo.selectItem({
             name: "Background Color"
        });
        this.colorButton.style.color = page.backgroundColor ? page.backgroundColor.toRGBAString() : "#000" ;
    }
    if (page.backgroundPage) {
        this.backgroundCombo.selectItem({
             name: page.backgroundPage.name,
             value: page.backgroundPage.id
        });
        this.colorButton.style.color = page.backgroundPage.backgroundColor ? page.backgroundPage.backgroundColor.toRGBAString() : "#000";
    }

    if (!page.backgroundPageId && !page.backgroundColor) {
        this.backgroundCombo.selectItem({
            name: "Transparent Background",
            value: "transparent"
        });
        this.colorButton.disabled = true;
    }
}

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
        if (typeof(background.value) == "undefined") {
            backgroundColor = this.colorButton.style.color ? Color.fromString(this.colorButton.style.color) : Color.fromString("#FFFFFF");
        } else {
            backgroundPageId = background.value;
        }
    }

    var page = Pencil.controller.newPage(name, width, height, backgroundPageId, backgroundColor, "", this.pageCombo.getSelectedItem().id);

    Config.set("lastSize", [width, height].join("x"));
    return page;
};

PageDetailDialog.prototype.updatePage = function() {
    var page = this.originalPage;

    var name = this.pageTitle.value;

    var width = parseInt(this.widthInput.value, 10);
    var height = parseInt(this.heightInput.value, 10);
    Config.set("lastSize", [page.width, page.height].join("x"));

    var thiz = this;
    var background = thiz.backgroundCombo.getSelectedItem();
    var backgroundColor = null;
    var backgroundPageId = null;

    if (background.value != "transparent") {
        if (typeof(background.value) == "undefined") {
            backgroundColor = this.colorButton.style.color ? Color.fromString(this.colorButton.style.color) : Color.fromString("#FFFFFF");
        } else {
            backgroundPageId = background.value;
        }
    } else if (background.value == "transparent") {
        backgroundPageId = null;
        backgroundColor = null;
    }

    var parentPageId = this.pageCombo.getSelectedItem().id;
    Pencil.controller.updatePageProperties(page, name, backgroundColor, backgroundPageId, parentPageId, width, height);
    return page;
}
PageDetailDialog.prototype.getDialogActions = function () {
    var thiz = this;

    return [
        {   type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () {
                return true;
                // if (this.modified) {
                //     Dialog.confirm(
                //         "Do you want to save your changes before closing?", null,
                //         "Save", function () {
                //             if (thiz.pageTitle.value == "" ) {
                //                 Dialog.alert("The page name is invalid. Please enter the valid page name.");
                //                 return;
                //             }
                //             if (thiz.isCreatePage) {
                //                 var page = thiz.createPage();
                //                 if (thiz.onDone) thiz.onDone(page);
                //             } else {
                //                 var page = thiz.updatePage();
                //                 if (thiz.onDone) thiz.onDone(page);
                //             }
                //             thiz.close();
                //         },
                //         "No", function () {
                //             thiz.close();
                //         }
                //     );
                // } else {
                //     return true;
                // }
            }
        },
        {
            type: "accept", title: this.originalPage ? "Update" : "Create",
            run: function () {
                var pageName = this.pageTitle.value;
                if (pageName == "" ) {
                    Dialog.error("The page name is invalid. Please enter the valid page name.");
                    return;
                }

                if (this.originalPage && this.originalPage.name != pageName || !this.originalPage) {
                    if (Pencil.controller.findPageByName(pageName)) {
                        Dialog.confirm("The page name '" + pageName + "' has existed. Do you want to continue " + (this.originalPage ? "updating the" : "creating a") + " page with this name?",
                                null,
                                "Yes, continue",
                                function () {
                                    handleAccept();
                                    thiz.close();
                                },
                                "Cancel");
                        return;
                    }
                }

                function handleAccept() {
                    if (thiz.isCreatePage) {
                        var page = thiz.createPage();
                        if (thiz.onDone) thiz.onDone(page);
                    } else {
                        if (thiz.modified) {
                            var page = thiz.updatePage();
                            if (thiz.onDone) thiz.onDone(page);
                        }
                    }
                }

                handleAccept();
                return true;
            }
        }
    ];
};
