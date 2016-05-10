function PrivateCollectionMenu(collectionPane, collection, shapeDef) {
    Menu.call(this);
    this.collectionPane = collectionPane;
    this.collection = collection;
    this.shapeDef = shapeDef;
    this.setup();
}
__extend(Menu, PrivateCollectionMenu);

PrivateCollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "Menu.xhtml";
};
PrivateCollectionMenu.prototype.setup = function () {
    var thiz = this;
    this.register({
        label: "Edit this shape...",
        isEnabled: function () { return thiz.shapeDef },
        handleAction: function () {

        }
    });
    this.register({
        label: "Delete this shape",
        isEnabled: function () { return thiz.shapeDef },
        handleAction: function () {
            PrivateCollectionManager.deleteShape(thiz.collection, thiz.shapeDef);
        }
    });
    this.register({
        label: "Import new private collection...",
        handleAction: function () {
            PrivateCollectionManager.importNewCollection();
        }
    });
    this.register({
        label: "Export this collection...",
        handleAction: function () {
            PrivateCollectionManager.exportCollection(thiz.collection);
        }
    });
    this.register({
        label: "Edit this collection...",
        handleAction: function () {

        }
    });
    this.register({
        label: "Delete this collection",
        handleAction: function () {
            PrivateCollectionManager.deleteCollection(thiz.collection);
        }
    });
    this.register({
        label: "Delete all collections",
        handleAction: function () {
            PrivateCollectionManager.deleteAllCollection();
        }
    });
    this.register({
        label: "About " + thiz.collection.displayName + "...",
        handleAction: function () {
            (new AboutCollectionDialog(thiz.collection)).open();
        }
    });
};
