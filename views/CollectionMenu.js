function CollectionMenu(collection) {
    Menu.call(this);
    this.collection = collection;
    this.setup();
}
__extend(Menu, CollectionMenu);

CollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};

CollectionMenu.prototype.setup = function () {
    var thiz = this;

    UICommandManager.register({
        key: "settingCollectionCommand",
        getLabel: function () { return "Collection setting" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "hideCollectionCommand",
        getLabel: function () { return "Hide this collection " },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "uninstallCollectionCollCommand",
        getLabel: function () { return "Uninstall this collection" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "aboutCollectionCommand",
        getLabel: function () { return "About "  + thiz.collection.displayName },
        isValid: function () { return true },
        run: function () {
            //alert("Fdlskjf");
            this.aboutdg = new AboutCollectionDialog(thiz.collection);
            this.aboutdg.open();
            
        }
    });
    UICommandManager.register({
        key: "installCollectionCommand",
        getLabel: function () { return "Install new collection..." },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    UICommandManager.register({
        key: "showHiddentCollectionCommand",
        getLabel: function () { return "Show hiddent collection" },
        isValid: function () { return true },
        run: function () {
            // thiz.canvas.careTaker.undo();
        }
    });
    this.register(UICommandManager.getCommand("settingCollectionCommand"));
    this.register(UICommandManager.getCommand("hideCollectionCommand"));
    this.register(UICommandManager.getCommand("uninstallCollectionCollCommand"));
    this.register(UICommandManager.getCommand("aboutCollectionCommand"));
    this.register(UICommandManager.getCommand("installCollectionCommand"));
    this.register(UICommandManager.getCommand("showHiddentCollectionCommand"));
}