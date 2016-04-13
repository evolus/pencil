function ChildPageListMenu(page, onDone) {
    Menu.call(this);
    this.page = page;
    this.onDone = onDone;
    this.setup();
}

__extend(Menu, ChildPageListMenu);

ChildPageListMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};
ChildPageListMenu.prototype.setup = function (page) {
    if (page) {
        this.items = [];
        this.page = page;
    }
    var thiz = this;

    function createSubCommand (page) {
        var key = "open" + page.name +"page";
        UICommandManager.register({
            key:  key,
            label: page.name,
            run: function () {
                thiz.onDone(page);
            },
        });
        return key;
    }
    function createChildMenu (page, subMenu) {
        for(var i = 0; i < page.children.length; i++) {
            var childPage = page.children[i];

            if (childPage.children.length > 0) {
                var subItems = [] ;
                createChildMenu(childPage, subItems);

                var key = "open" + childPage.name +"page";
                UICommandManager.register({
                    key:  key,
                    label: childPage.name,
                    type: "SubMenu",
                    subItems: subItems
                });

                if (subMenu) {
                    subMenu.push(UICommandManager.getCommand(key));
                } else {
                    thiz.register(UICommandManager.getCommand(key));
                }
            } else {
                var key = createSubCommand(childPage);

                if (subMenu) {
                    subMenu.push(UICommandManager.getCommand(key));
                } else {
                    thiz.register(UICommandManager.getCommand(key));
                }
            }
        }
    }
    createChildMenu(this.page);
}
