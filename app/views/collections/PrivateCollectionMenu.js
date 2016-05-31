function PrivateCollectionMenu(collectionPane, collection, shapeDef) {
    Menu.call(this);
    this.collectionPane = collectionPane;
    this.collection = collection;
    this.shapeDef = shapeDef;
    this.setup();
}
__extend(Menu, PrivateCollectionMenu);

PrivateCollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};
PrivateCollectionMenu.prototype.setup = function () {
    var thiz = this;
    this.register({
        label: "Edit this shape...",
        icon: "mode_edit",
        isEnabled: function () { return thiz.shapeDef },
        handleAction: function () {
            var index = thiz.collection.shapeDefs.indexOf(thiz.shapeDef);

            var applyNewShape = function (shape) {
                console.log(shape);
                thiz.collection.shapeDefs[index] = shape;
                PrivateCollectionManager.savePrivateCollections();
                PrivateCollectionManager.reloadCollectionPane();
            }
            var editShapeDialog = new EditPrivateShapeDialog() ;
            editShapeDialog.open({
                shape: thiz.shapeDef,
                onDone: applyNewShape
            });
        }
    });
    this.register({
        label: "Delete this shape",
        icon: "delete",
        isEnabled: function () { return thiz.shapeDef },
        handleAction: function () {
            PrivateCollectionManager.deleteShape(thiz.collection, thiz.shapeDef);
        }
    });

    this.register(Menu.SEPARATOR);

    this.register({
        label: "Import new private collection...",
        icon: "file_download",
        handleAction: function () {
            PrivateCollectionManager.importNewCollection();
        }
    });
    this.register({
        label: "Export this collection...",
        icon: "file_upload",
        isEnabled: function () { return thiz.collection },
        handleAction: function () {
            PrivateCollectionManager.exportCollection(thiz.collection);
        }
    });
    this.register({
        label: "Edit this collection...",
        icon: "mode_edit",
        isEnabled: function () { return thiz.collection },
        handleAction: function () {
            var index = PrivateCollectionManager.privateShapeDef.collections.indexOf(thiz.collection);
            var applyNewCollection = function (collection) {
                PrivateCollectionManager.privateShapeDef.collections[index] = collection;
                PrivateCollectionManager.savePrivateCollections();
                PrivateCollectionManager.reloadCollectionPane();
            }
            var editDialog = new EditPrivateCollectionDialog() ;
            editDialog.open({
                collection: thiz.collection,
                onDone: applyNewCollection
            });
        }
    });

    this.register(Menu.SEPARATOR);

    this.register({
        label: "Delete this collection",
        icon: "delete",
        isEnabled: function () { return thiz.collection },
        handleAction: function () {
            PrivateCollectionManager.deleteCollection(thiz.collection);
        }
    });
    this.register({
        label: "Delete all collections",
        icon: "delete",
        handleAction: function () {
            PrivateCollectionManager.deleteAllCollection();
        }
    });

    this.register(Menu.SEPARATOR);

    this.register({
        label: "About " + (thiz.collection ? thiz.collection.displayName : "") + "...",
        isAvailable: function () { return thiz.collection },
        isEnabled: function () { return thiz.collection },
        handleAction: function () {
            (new AboutCollectionDialog(thiz.collection)).open();
        }
    });

    this.register({
        label: "Go to",
        isEnabled: function () { return PrivateCollectionManager.privateShapeDef.collections[0]; },
        type: "SubMenu",
        getSubItems:  function () {
            var items = [];
            var collections = PrivateCollectionManager.privateShapeDef.collections;
            for (var i = 0; i < collections.length; i ++) {
                var collection = collections[i];
                items.push({
                        label: collection.displayName,
                        collection: collection,
                        run: function () {
                            console.log("goto:", collection);
                            PrivateCollectionManager.reloadCollectionPane(this.collection.id);
                            thiz.hideMenu();
                        }
                });
            }
            return items;
        }
    });
};
