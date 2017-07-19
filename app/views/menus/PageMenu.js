function PageMenu (pageListView, page) {
    Menu.call(this);
    this.pageListView = pageListView;
    this.page = page;
    this.setup();
}
__extend(Menu, PageMenu);


PageMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};

PageMenu.prototype.setup = function () {
    var thiz = this;

    this.register({
        key: "PageNewPage",
        icon: "add",
        getLabel: function () { return thiz.page ? "New Child Page..." : "New Page..." },
        isValid: function () { return true },
        run: function () {
            var dialog = new PageDetailDialog();
            dialog.open({
                parentpage: thiz.page,
                onDone: function (page) {
                    if (!page) return;
                    thiz.pageListView.activatePage(page);
                }
            });
        }
    });

    this.separator();

    this.register({
        key: "PageDuplicate",
        icon: "content_copy",
        isEnabled: function () { return thiz.page },
        getLabel: function () { return "Duplicate" },
        isValid: function () { return true },
        run: function () {
            var onDone = function () {
                return function (page) {
                    thiz.pageListView.activatePage(page);
                }
           }
           Pencil.controller.duplicatePage(thiz.page, onDone());
       }
    });
    this.register({
        key: "PageDelete",
        icon : "remove",
        getLabel: function () { return "Delete" },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page },
        run: function () {
            Dialog.confirm(
                "Are you sure you really want to delete this page?", null,
                "Delete", function () {
                    var page = Pencil.controller.deletePage(thiz.page);
                    if (page) {
                        thiz.pageListView.activatePage(page);
                    } else {
                        thiz.pageListView.renderPages();
                    }
                },
                "Cancel"
            )
        }
    });
    this.register({
        key: "PageMoveLeft",
        icon: "keyboard_arrow_left",
        getLabel: function () { return "Move Left" },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "left")},
        run: function () {
            Pencil.controller.movePage(thiz.page, "left");
        },
    });

    this.register({
        key: "PageMoveRight",
        icon: "keyboard_arrow_right",
        getLabel: function () { return "Move Right" },
        isValid: function () { return true },
        isEnabled: function () {  return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "right") },
        run: function () {
            Pencil.controller.movePage(thiz.page, "right");
        }
    });
    function createSubCommand (page) {
        var key = "open" + page.name +"page";
        var items = {"key": key, "item": {
            key:  key,
            label: page.name,
            run: function () {
                thiz.pageListView.activatePage(page);
            }
        } };
        return items;
    };
    function createSubItems (page,subItems) {
        var key = "open" + page.name +"page";
        var items = {"key": key, "item": {
            key:  key,
            label: page.name,
            run: function () {
                thiz.pageListView.activatePage(page);
            },
            type: "SubMenu",
            subItems: subItems
        }};
        return items;
    };
    function createChildMenu (page, items) {
        for(var i = 0; i < page.children.length; i++) {
            var childPage = page.children[i];
            var item;
            if (childPage.children.length > 0) {
                var subItem = [] ;
                createChildMenu(childPage, subItem);
                item = createSubItems(childPage,subItem);
            } else {
                item = createSubCommand(childPage);
            }
            items.push(item["item"]);
        }
    }
    var subItems = [];
    for (var i in Pencil.controller.doc.pages) {
        var page = Pencil.controller.doc.pages[i];
        if (!page.parentPage) {
            var item;
            if (page.children.length > 0) {
                var items = [];
                createChildMenu(page, items);
                item = createSubItems(page,items);
            } else {
                item = createSubCommand(page);
            }
            subItems.push(item["item"]);
        }
    }
    var check = false;
    if (subItems.length > 0) check = true;

    this.register({
        key: "PageGotoNode",
        getLabel: function () { return "Goto" },
        isEnabled: function () { return check },
        type: "SubMenu",
        subItems: subItems,
    });

    this.separator();

    this.register({
        key: "PageProperties",
        isEnabled: function () { return thiz.page },
        getLabel: function () { return "Properties..." },
        isValid: function () { return true },
        run: function () {
            var dialog = new PageDetailDialog();
            dialog.title = "Edit Page Properties";
            dialog.open({
                defaultPage : thiz.page,
                onDone: function(page) {
                }
            });
        },
    });
    UICommandManager.getCommand("exportPageAsPNGButton").isEnabled = function () {return thiz.page};
    UICommandManager.getCommand("exportPageAsPNGButton").page = thiz.page;
    this.register(UICommandManager.getCommand("exportPageAsPNGButton"));

    this.register({
        key: "copyPageBitmapCommand",
        label: "Copy Page Bitmap",
        run: function () {
            Pencil.controller.copyPageBitmap(thiz.page);
        },
        shortcut: "Ctrl+Shift+C"
    });

    this.separator();

    this.register({
        key: "PageEditPageNode",
        getLabel: function () { return "Edit Page Note..." },
        isEnabled: function () { return thiz.page },
        isValid: function () { return true },
        run: function () {
            var dialog = new EditPageNoteDialog();
            dialog.open({
                defaultPage : thiz.page,
                onDone: function (editor) {
                    console.log("Complete note");
                    thiz.page.note = editor;
                }
            });
        },
    });
}
