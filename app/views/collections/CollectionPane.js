function CollectionPane() {
    BaseCollectionPane.call(this);
    UICommandManager.register({
        key: "openCollectionManagementDialog",
        label: "Open Collection Management Dialog",
        run: function () {
            new CollectionManagementDialog(Pencil.collectionPane).open();
        },
        shortcut: "F3"
    });
}
__extend(BaseCollectionPane, CollectionPane);

CollectionPane.prototype.setVisibleCollection = function (collection, value) { // function Hide collection
    CollectionManager.setCollectionVisible(collection, value);
    this.reload(value ? collection.id : 0);
};
CollectionPane.prototype.initialize = function () {
    var thiz = this;
    this.collectionManagementButton.addEventListener("click", function (event) {
        new CollectionManagementDialog(thiz).open();
    });
    this.bind("click", function (event) {
        if (!this.last) return;
        new CollectionSettingDialog(this.last).open();
    }, this.settingButton);
    // this.loaded = false;
    Pencil.collectionPane = this;
};
CollectionPane.prototype.handleCollectionContextMenu = function (collection, event) {
    var menu = new CollectionMenu(collection, this);
    menu.showMenuAt(event.clientX, event.clientY);
};
CollectionPane.prototype.addDefDataToDataTransfer = function (def, event) {
    if (def.shape) {
        event.dataTransfer.setData("pencil/shortcut", def.id);
        nsDragAndDrop.setData("pencil/shortcut", def.id);
    } else if (def instanceof PrivateShapeDef) {
        event.dataTransfer.setData("pencil/privatedef", def.id);
        nsDragAndDrop.setData("pencil/privatedef", def.id);
    } else {
        event.dataTransfer.setData("pencil/def", def.id);
        nsDragAndDrop.setData("pencil/def", def.id);
    }
    // event.dataTransfer.setData("pencil/def", def.id);
    event.dataTransfer.setData("collectionId", def.collection ? def.collection.id : 0);
    nsDragAndDrop.setData("collectionId", def.collection ? def.collection.id : 0);
};
CollectionPane.prototype.getCollections = function () {
    return CollectionManager.shapeDefinition.collections;
};
CollectionPane.prototype.isShowCollection = function (collection) {
    return collection.visible == true;
};
CollectionPane.prototype.getLastUsedCollection = function () {
    return CollectionManager.getLastUsedCollection();
};
CollectionPane.prototype.setLastUsedCollection = function (collection) {
    CollectionManager.setLastUsedCollection(collection);
};
