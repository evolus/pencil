function MyCollectionPane() {
    BaseCollectionPane.call(this);
}
__extend(BaseCollectionPane, MyCollectionPane);

MyCollectionPane.prototype.getTitle = function() {
	return "My Shapes";
};

MyCollectionPane.prototype.initialize = function () {
    this.collectionManagementButton.style.display = "none";
    Pencil.privateCollectionPane = this;
    PrivateCollectionManager.loadPrivateCollections();
    // this.loaded = false;
    this.reload();
};
MyCollectionPane.prototype.handleCollectionContextMenu = function (collection, event) {

};
MyCollectionPane.prototype.addDefDataToDataTransfer = function (def, event) {
    event.dataTransfer.setData("pencil/privatedef", def.id);
};
MyCollectionPane.prototype.getCollections = function () {
    return PrivateCollectionManager.privateShapeDef.collections;
};
MyCollectionPane.prototype.getLastUsedCollection = function () {
    return PrivateCollectionManager.getLastUsedCollection();
};
MyCollectionPane.prototype.setLastUsedCollection = function (collection) {
    PrivateCollectionManager.setLastUsedCollection(collection);
};
