function ChildPageListMenu(page, onDone) {
    Menu.call(this);
    this.page = page;
    this.onDone = onDone;
    this.setup();
}

__extend(Menu, ChildPageListMenu);

ChildPageListMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};
ChildPageListMenu.prototype.setup = function () {
    var thiz = this;

    function createSubCommand (page) {
        var key = "open" + page.name +"page";
        var items = {};
        items["key"] = key;
        items["item"] = {
            key:  key,
            label: page.name,
            run: function () {
                // thiz.onDone(page);
                ApplicationPane._instance.activatePage(page);
            },
        };
        return items;
    }

    function createSubItems (page,subItems) {
        var key = "open" + page.name +"page";
        var items = {"key": key, "item": {
            key:  key,
            label: page.name,
            run: function () {
                ApplicationPane._instance.activatePage(page);
                // thiz.onDone(page);
            },
            type: "SubMenu",
            subItems: subItems
        }};
        return items;
    }

    function createChildMenu (page, subMenu) {
        for(var i = 0; i < page.children.length; i++) {
            var childPage = page.children[i];

            if (childPage.children.length > 0) {
                var subItems = [] ;
                createChildMenu(childPage, subItems);
                var item = createSubItems(childPage,subItems);
                if (subMenu) {
                    subMenu.push(item["item"]);
                } else {
                    thiz.register(item["item"]);
                }
            } else {
                var item = createSubCommand(childPage);
                if (subMenu) {
                    subMenu.push(item["item"]);
                } else {
                    thiz.register(item["item"]);
                }
            }
        }
    }
    createChildMenu(this.page);
}
