function CollectionMenu(collection, collectionPane) {
    Menu.call(this);
    this.collection = collection;
    this.setup();
    this.collectionPane = collectionPane;
}
__extend(Menu, CollectionMenu);

CollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};

CollectionMenu.prototype.setup = function () {
    var thiz = this;
    if (thiz.collection.propertyGroups.length > 0) {
        this.register({
            getLabel: function () { return "Collection setting..." },
            icon: "tune",
            isValid: function () { return thiz.collection.propertyGroups },
            run: function () {
                var propertiesSettingDialog = new CollectionSettingDialog(thiz.collection);
                propertiesSettingDialog.open()
            }
        });
    }
    this.register({
        getLabel: function () { return "Hide" },
        icon: "visibility_off",
        isValid: function () { return true },
        run: function () {
            thiz.collectionPane.setVisibleCollection(thiz.collection,false);
        }
    });
    this.register({
        getLabel: function () { return "Uninstall" },
        icon: "delete",
        isEnabled: function () {  return thiz.collection.userDefined },
        run: function () {
            Dialog.confirm(
                "Are you sure you want to uninstall this collection?",
                "Uninstalling will remove this collection completely from Pencil. Shapes created from this collection will no longer be editable.",
                "Yes, Uninstall", function () {
                    CollectionManager.uninstallCollection(thiz.collection);
                    thiz.collectionPane.reload();
                }.bind(this),
                "Cancel"
            );
        }
    });
    this.register({
        getLabel: function () { return "About '"  + thiz.collection.displayName + "'..." },
        isValid: function () { return true },
        run: function () {
            this.aboutdg = new AboutCollectionDialog(thiz.collection);
            this.aboutdg.open();

        }
    });

    this.separator();

    this.register({
        label: "Go to",
        type: "SubMenu",
        getSubItems:  function () {
            var items = [];
            var collections = CollectionManager.shapeDefinition.collections;
            for (var i = 0; i < collections.length; i ++) {
                var collection = collections[i];
                items.push({
                        label: collection.displayName,
                        collection: collection,
                        run: function () {
                            console.log("goto:", collection);
                            thiz.collectionPane.setVisibleCollection(this.collection, true);
                            thiz.hideMenu();
                        }
                });
            }
            return items;
        }
    });

    this.register({
        getLabel: function () { return "Manage Collections..." },
        icon: "settings",
        run: function () {
            new CollectionManagementDialog(thiz.collectionPane).open();

        }
    });
}
