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
        getLabel: function () { return " " },
        isValid: function () { return true },
        run: function () {

        }
    });

    UICommandManager.register({
        key: "PageNewPage",
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
        getLabel: function () { return "Duplicate " },
        isValid: function () { return true },
        run: function () {
            var page = Pencil.controller.duplicatePage();
            thiz.pageListView.activatePage(page);
        }
    });

    UICommandManager.register({
        key: "PageDelete",
        getLabel: function () { return "Delete " },
        isValid: function () { return true },
        run: function () {
             Pencil.controller.deletePage(thiz.page); 
        }
    });

    UICommandManager.register({
        key: "PageMoveLeft",
        getLabel: function () { return "Move Left " },
        isValid: function () { return true },
        run: function () {
            var index = Pencil.controller.pages.indexOf(thiz.page);
            if (index == 0) {
                return;
            } else { 
                thiz.pageListView.activatePage(Pencil.controller.pages[index - 1]);
            }
        }
    });

    UICommandManager.register({
        key: "PageMoveRight",
        getLabel: function () { return "Move Right" },
        isValid: function () { return true },
        run: function () {
            var index = Pencil.controller.pages.indexOf(thiz.page);
            if (index == Pencil.controller.pages.length - 1) {
                return;
            } else { 
                thiz.pageListView.activatePage(Pencil.controller.pages[index + 1]);
            }

        }
    });

    UICommandManager.register({
        key: "PageProperties",
        getLabel: function () { return "Properties" },
        isValid: function () { return true },
        run: function () {
            var dialog = new PageDetailDialog();
            dialog.title = "Edit Page Properties";
            dialog.open({
                defalutPage : thiz.page
            });
            thiz.pageListView.activatePage(thiz.page);
        }
    });

    UICommandManager.register({
        key: "PageEditPageNode",
        getLabel: function () { return "Edit Page Note..." },
        isValid: function () { return true },
        run: function () {

        }
    });

    this.register(UICommandManager.getCommand("PageNewPage"));
    this.register(UICommandManager.getCommand("PageDuplicate"));
    this.register(UICommandManager.getCommand("PageDelete"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageMoveLeft"));
    this.register(UICommandManager.getCommand("PageMoveRight"));
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageProperties"));

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
        for (var i = 0; i < Pencil.controller.pages.length; i ++) {
            elements.push(createGotoSubMenuElement(Pencil.controller.pages[i]));
        }
        return elements;
    }

    var createGotoButton = function() {
        var item = createGotoSubMenuItem();
        var check = false;
        if( item.length > 0 ) check = true;

        thiz.register({
            label: "Go to " , 
            isEnabled: function() { return check},
            run: function () { },
            type: "SubMenu",
            subItems:  item
        });
    }
    createGotoButton();
    this.register(UICommandManager.getCommand("PageMenuDivitor"));
    this.register(UICommandManager.getCommand("PageEditPageNode"));
}
