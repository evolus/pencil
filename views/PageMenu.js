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

    UICommandManager.getCommand("PageNewPage").run = function () {
        var dialog = new PageDetailDialog();
        dialog.open({
            onDone: function (page) {
                if (!page) return;
                thiz.pageListView.activatePage(page);
            }
        });
    };
    UICommandManager.getCommand("PageDuplicate").isEnabled = function () { return thiz.page };
    UICommandManager.getCommand("PageDuplicate").run = function () {
        var onDone = function () {
            return function (page) {
            thiz.pageListView.activatePage(page);
            }
        }
        Pencil.controller.duplicatePage(thiz.page, onDone());
    };
    UICommandManager.getCommand("PageDelete").isEnabled = function () { return thiz.page };
    UICommandManager.getCommand("PageDelete").run = function () {
        console.log("dialog:", dialog);
        var dialogResult = dialog.showMessageBox({type: 'warning' , message : 'You realy want to delete this page ?',title :'Confirm', buttons : ['ok', 'cancel']});
        if(dialogResult == 0 ) {
            Pencil.controller.deletePage(thiz.page);
            thiz.pageListView.renderPages();
        }
    };
    UICommandManager.getCommand("PageMoveLeft").isEnabled = function () { return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "left")};
    UICommandManager.getCommand("PageMoveLeft").run = function () {
        Pencil.controller.movePage(thiz.page, "left");
    };
    UICommandManager.getCommand("PageMoveRight").isEnabled = function () {  return thiz.page && Pencil.controller.checkLeftRight(thiz.page, "right") };
    UICommandManager.getCommand("PageMoveRight").run = function () {
        Pencil.controller.movePage(thiz.page, "right");
    };
    UICommandManager.getCommand("PageProperties").isEnabled = function () { return thiz.page };
    UICommandManager.getCommand("PageProperties").run = function () {
        var dialog = new PageDetailDialog();
        dialog.title = "Edit Page Properties";
        dialog.open({
            defaultPage : thiz.page,
            onDone: function(page) {
                thiz.pageListView.activatePage(page);
            }
        });
    };
    UICommandManager.getCommand("PageEditPageNode").isEnabled = function () { return thiz.page };
    UICommandManager.getCommand("PageEditPageNode").run = function () {
        var dialog = new EditPageNoteDialog();
        dialog.open({
            defaultPage : thiz.page,
            onDone: function (editor) {
                console.log("Complete note");
                thiz.page.note = editor;
            }
        });
    };

    this.register(UICommandManager.getCommand("PageNewPage"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageDuplicate"));
    this.register(UICommandManager.getCommand("PageDelete"));
    this.register(UICommandManager.getCommand("PageMoveLeft"));
    this.register(UICommandManager.getCommand("PageMoveRight"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageProperties"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));

    // var createGotoSubMenuElement = function(page) {
    //     var key = page.name.split(" ").join("") + "Page" ;
    //     var element = UICommandManager.register({
    //         key: key,
    //         label: page.name,
    //         run: function () {
    //             thiz.pageListView.activatePage(page);
    //         }
    //     });
    //     var setElement = UICommandManager.getCommand(key);
    //     return setElement;
    // }
    //
    // var createGotoSubMenuItem = function() {
    //     var elements = [];
    //     for (var i = 0; i < Pencil.controller.doc.pages.length; i ++) {
    //         elements.push(createGotoSubMenuElement(Pencil.controller.doc.pages[i]));
    //     }
    //     return elements;
    // }

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

    var createGotoButton = function() {
        var check = false;
        if( subItems.length > 0 ) check = true;

        var ui = UICommandManager.getCommand("GotoNode");
        ui.isEnabled = function () { return check };
        ui.type = "SubMenu";
        ui.subItems = subItems;
    }
    createGotoButton();
    this.register(UICommandManager.getCommand("GotoNode"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageEditPageNode"));
}
