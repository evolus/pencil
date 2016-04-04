function PageMenu (pageListView, page) {
    Menu.call(this);
    this.pageListView = pageListView;
    this.page = page;
    this.setup();
}
__extend(Menu, PageMenu);

PageMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};

PageMenu.prototype.setup = function () {
    var thiz = this;

    UICommandManager.register({
        key: "PageMenuDivitor",
        getLabel: function () { return "" },
        isValid: function () { return true },
        run: function () {
        }
    });

    UICommandManager.register({
        key: "PageNewPage",
        icon: "add",
        getLabel: function () { return "New Page " },
        isValid: function () { return true },
        run: function () {
            var dialog = new PageDetailDialog();
            dialog.open({
                onDone: function (page) {
                    if (!page) return;
                    thiz.pageListView.activatePage(page);
                }
            });
        }
    });

    UICommandManager.register({
        key: "PageDuplicate",
        icon: "content_copy",
        getLabel: function () { return "Duplicate" },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page; },
        run: function () {
            var onDone = function () {
                return function (page) {
                    thiz.pageListView.activatePage(page);
                }
            }
            Pencil.controller.duplicatePage(thiz.page, onDone());
        }
    });

    UICommandManager.register({
        key: "PageDelete",
        icon : "remove",
        getLabel: function () { return "Delete" },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page; },
        run: function () {
            console.log("dialog:", dialog);
            //const dialog = require("electron").remote.dialog;
            var dialogResult = dialog.showMessageBox({type: 'warning' , message : 'You realy want to delete this page ?',title :'Confirm', buttons : ['ok', 'cancel']});
            if(dialogResult == 0 ) {
                Pencil.controller.deletePage(thiz.page);
                thiz.pageListView.renderPages();
            }
            // thiz.pageListView.activatePage(Pencil.controller.doc.pages[0]);
        }
    });

    UICommandManager.register({
        key: "PageMoveLeft",
        icon: "keyboard_arrow_left",
        getLabel: function () { return "Move Left" },
        isValid: function () { return true },
        isEnabled: function () {
            return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "left");
        },
        run: function () {
            Pencil.controller.movePage(thiz.page, "left");
        }
    });

    UICommandManager.register({
        key: "PageMoveRight",
        icon: "keyboard_arrow_right",
        getLabel: function () { return "Move Right" },
        isValid: function () { return true },
        isEnabled: function () {
            return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "right");
        },
        run: function () {
            Pencil.controller.movePage(thiz.page, "right");
        }
    });

    UICommandManager.register({
        key: "PageProperties",
        getLabel: function () { return "Properties" },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page; },
        run: function () {
            var dialog = new PageDetailDialog();
            dialog.title = "Edit Page Properties";
            dialog.open({
                defaultPage : thiz.page,
                onDone: function(page) {
                    thiz.pageListView.activatePage(page);
                }
            });
        }
    });

    UICommandManager.register({
        key: "PageEditPageNode",
        getLabel: function () { return "Edit Page Note..." },
        isValid: function () { return true },
        isEnabled: function () { return thiz.page; },
        run: function () {
            var dialog = new EditPageNoteDialog();
            dialog.open({
                defaultPage : thiz.page,
                onDone: function (editor) {
                    console.log("Complete note");
                    thiz.page.note = editor;
                }
            });
        }
    });

    this.register(UICommandManager.getCommand("PageNewPage"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageDuplicate"));
    this.register(UICommandManager.getCommand("PageDelete"));
    this.register(UICommandManager.getCommand("PageMoveLeft"));
    this.register(UICommandManager.getCommand("PageMoveRight"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageProperties"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));

    var createGotoSubMenuElement = function(page) {
        var key = page.name.split(" ").join("") + "Page" ;
        var element = UICommandManager.register({
            key: key,
            label: page.name,
            run: function () {
                thiz.pageListView.activatePage(page);
            }
        });
        var setElement = UICommandManager.getCommand(key);
        return setElement;
    }

    var createGotoSubMenuItem = function() {
        var elements = [];
        for (var i = 0; i < Pencil.controller.doc.pages.length; i ++) {
            elements.push(createGotoSubMenuElement(Pencil.controller.doc.pages[i]));
        }
        return elements;
    }

    var createGotoButton = function() {
        var item = createGotoSubMenuItem();
        var check = false;
        if( item.length > 0 ) check = true;

        thiz.register({
            label: "Go to " ,
            isEnabled: function() { return check },
            run: function () { },
            type: "SubMenu",
            subItems:  item
        });
    }
    createGotoButton();
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageEditPageNode"));
}
