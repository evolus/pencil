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
        getLabel: function () { return "Collection setting..." },
        isValid: function () { return true },
        run: function () {
            var propertiesSettingDialog = new CollectionSettingDialog(thiz.collection);
            propertiesSettingDialog.open()
        }
    });
    UICommandManager.register({
        key: "hideCollectionCommand",
        getLabel: function () { return "Hide this collection... " },
        isValid: function () { return true },
        run: function () {
            thiz.collectionPane.setVisibleCollection(thiz.collection,false);
        }
    });
    UICommandManager.register({
        key: "uninstallCollectionCollCommand",
        getLabel: function () { return "Uninstall this collection" },
        isEnabled: function () {  return thiz.collection.userDefined },
        run: function () {
            CollectionManager.uninstallCollection(thiz.collection);
        }
    });
    UICommandManager.register({
        key: "aboutCollectionCommand",
        getLabel: function () { return "About "  + thiz.collection.displayName + "..." },
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
            CollectionManager.installNewCollection();
        }
    });
    UICommandManager.register({
        key: "collectionDivitor",
        getLabel: function () { return " " },
        isValid: function () { return true },
        run: function () {

        }
    });
    var createShowHiddenCommand = function() {
        var commandName = [];
        var collections = CollectionManager.shapeDefinition.collections;
        for (var i = 0; i < collections.length; i ++) {
            if(collections[i].visible == false) {
                commandName.push(createSubMenuItem(collections[i]));
            }
        }
        return commandName;
    }

    var createSubMenuItem = function(collection) {
        var key = collection.displayName.split(" ").join("") + "Collection" ;
            var element = UICommandManager.register({
                    key: key,
                    label: collection.displayName,
                    run: function () {
                        thiz.collectionPane.setVisibleCollection(collection, true);
                        thiz.hideMenu();
                    }
            });
            var setElement = UICommandManager.getCommand(key);
            return setElement;
    }

    this.register(UICommandManager.getCommand("settingCollectionCommand"));
    this.register(UICommandManager.getCommand("hideCollectionCommand"));
    this.register(UICommandManager.getCommand("uninstallCollectionCollCommand"));
    this.register(UICommandManager.getCommand("aboutCollectionCommand"));
    this.register(UICommandManager.getCommand("installCollectionCommand"));
    this.register(UICommandManager.getCommand("collectionDivitor"));

    var enableHiddenMenu = function() {
        var item = createShowHiddenCommand();
        var check = false;
        if( item.length > 0 ) check = true;

        thiz.register({
            label: "Show hidden collections ",
            isEnabled: function() { return check},
            run: function () { },
            type: "SubMenu",
            subItems:  item
        });
    }
    enableHiddenMenu();
}
