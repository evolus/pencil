function MyCollectionPane() {
    BaseTemplatedWidget.call(this);

}
__extend(BaseTemplatedWidget, MyCollectionPane);

MyCollectionPane.prototype.getTitle = function() {
    return "My Collections";
}
MyCollectionPane.prototype.getIconName = function() {
    return "layers";
}
MyCollectionPane.prototype.reload = function () {
};
MyCollectionPane.prototype.openCollection = function (collection) {
};
