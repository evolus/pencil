function MyCollectionPane() {
    BaseCollectionPane.call(this);
}
__extend(BaseCollectionPane, MyCollectionPane);

MyCollectionPane.prototype.getTitle = function() {
	return "My Shapes";
};
MyCollectionPane.prototype.getIconName = function() {
	return "business_center";
};
MyCollectionPane.prototype.initialize = function () {
    this.bind("contextmenu", function (event) {
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n ? n._def : null;
        var collection = this.last;
        (new PrivateCollectionMenu(this, collection, def)).showMenuAt(event.clientX, event.clientY);
    }, this.shapePane);
    this.collectionManagementButton.style.display = "none";
    this.settingButton.style.display = "none";
    Pencil.privateCollectionPane = this;
    PrivateCollectionManager.loadPrivateCollections();
    // this.loaded = false;
    this.reload();
};
MyCollectionPane.prototype.handleCollectionContextMenu = function (collection, event) {
    (new PrivateCollectionMenu(this, collection)).showMenuAt(event.clientX, event.clientY);
};
MyCollectionPane.prototype.addDefDataToDataTransfer = function (def, event) {
    event.dataTransfer.setData("pencil/privatedef", def.id);
    nsDragAndDrop.setData("pencil/privatedef", def.id);
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
MyCollectionPane.prototype.openCollectionPane = function (collectionId) {
    this.reload(collectionId);
};
