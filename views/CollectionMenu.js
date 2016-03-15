function CollectionMenu(collection) {
    Menu.call(this);
    this.collection = collection;
    this.setup();
}
__extend(Menu, CollectionMenu);

CollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
}; // lay duong dan tra ve file Menu.xhtml

CollectionMenu.prototype.setup = function () {
    var thiz = this;

    UICommandManager.register({
        key: "settingCommand",
        getLabel: function () { return "Collection setting" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "hideCollCommand",
        getLabel: function () { return "Hide this collection " },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "uninstallCollCommand",
        getLabel: function () { return "Uninstall this collection" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "aboutCommand",
        getLabel: function () { return "About "  + thiz.collection.displayName },
        isValid: function () { return true },
        run: function () {
            //alert("Fdlskjf");
            this.aboutdg = new AboutDialog(thiz.collection);
            this.aboutdg.open();
            
        }
    });
    UICommandManager.register({
        key: "installCommand",
        getLabel: function () { return "Install new collection..." },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "showhiddentCommand",
        getLabel: function () { return "Show hiddent" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    this.register(UICommandManager.getCommand("settingCommand"));
    this.register(UICommandManager.getCommand("hideCollCommand"));
    this.register(UICommandManager.getCommand("uninstallCollCommand"));
    this.register(UICommandManager.getCommand("aboutCommand"));
    this.register(UICommandManager.getCommand("installCommand"));
    this.register(UICommandManager.getCommand("showhiddentCommand"));
}