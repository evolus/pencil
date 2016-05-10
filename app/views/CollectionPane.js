function CollectionPane() {
    BaseCollectionPane.call(this);
}
__extend(BaseCollectionPane, CollectionPane);

CollectionPane.prototype.setVisibleCollection = function (collection, value) { // function Hide collection
    CollectionManager.setCollectionVisible(collection, value);
    this.reload(collection.id);
};
CollectionPane.prototype.initialize = function () {
    var thiz = this;
    this.collectionManagementButton.addEventListener("click", function (event) {
        new CollectionManagementDialog(thiz).open();
    });
    // this.loaded = false;
    Pencil.collectionPane = this;
    CollectionManager.loadStencils();
};
CollectionPane.prototype.handleCollectionContextMenu = function (collection, event) {
    var menu = new CollectionMenu(collection, this);
    menu.showMenuAt(event.clientX, event.clientY);
};
CollectionPane.prototype.handleDragStart = function (def, event) {
    if (def.shape) {
        event.dataTransfer.setData("pencil/shortcut", def.id);
    } else {
        event.dataTransfer.setData("pencil/def", def.id);
    }
    event.dataTransfer.setData("pencil/def", def.id);
    event.dataTransfer.setData("collectionId", def.collection ? def.collection.id : 0);
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
