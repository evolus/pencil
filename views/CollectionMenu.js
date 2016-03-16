function CollectionMenu(collection, collectionPane) {
    Menu.call(this);
    this.collection = collection;
    this.setup();
    this.collectionPane = collectionPane;
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
            
        }
    });
    UICommandManager.register({
        key: "hideCollectionCommand",
        getLabel: function () { return "Hide this collection " },
        isValid: function () { return true },
        run: function () {
            thiz.collectionPane.setVisibleCollection(thiz.collection,false);
        }
    });
    UICommandManager.register({
        key: "uninstallCollectionCollCommand",
        getLabel: function () { return "Uninstall this collection" },
        isValid: function () { return true },
        run: function () {
           
        }
    });
    UICommandManager.register({
        key: "aboutCollectionCommand",
        getLabel: function () { return "About "  + thiz.collection.displayName },
        isValid: function () { return true },
        run: function () {
            this.aboutdg = new AboutCollectionDialog(thiz.collection);
            this.aboutdg.open();
            
        }
    });
    UICommandManager.register({
        key: "installCollectionCommand",
        getLabel: function () { return "Install new collection..." },
        isValid: function () { return true },
        run: function () {
        }
    });
    UICommandManager.register({
        key: "collectionDivitor",
        getLabel: function () { return " " },
        isValid: function () { return true },
        run: function () {
            
        }
    });
    var createShowHiddentCommand = function() {
        var commandName = [];
        var collections = CollectionManager.shapeDefinition.collections;
        for (var i = 0; i < collections.length; i ++) {
            if(collections[i].visible == false) {
                commandName.push(createNode(collections[i]));
            }
        }
        return commandName;
    }

    var createNode = function(collection) {
            var displayName = collection.displayName;
            displayName = displayName.split(" ").join("");
            var element = UICommandManager.register({
                    key: displayName + "Collection",
                    getLabel: function () { return   collection.displayName },
                    run: function () {
                        thiz.collectionPane.setVisibleCollection(collection,true);  
                        thiz.hideMenu();
                    }
            });
            var setElement = UICommandManager.getCommand(displayName + "Collection");
            return setElement;
    }

    this.register(UICommandManager.getCommand("settingCollectionCommand"));
    this.register(UICommandManager.getCommand("hideCollectionCommand"));
    this.register(UICommandManager.getCommand("uninstallCollectionCollCommand"));
    this.register(UICommandManager.getCommand("aboutCollectionCommand"));
    this.register(UICommandManager.getCommand("installCollectionCommand"));
    this.register(UICommandManager.getCommand("collectionDivitor"));
    this.register(UICommandManager.getCommand("showHiddentCollectionCommand"));
    this.register({
        label: "show Hidden Collections ",
        run: function () {return } ,
            type: "SubMenu",
            subItems:  createShowHiddentCommand()
        });
}