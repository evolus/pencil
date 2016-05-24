function ShowAllCollectionMenu (onDone) {
    Menu.call(this);
    this.collection = CollectionManager.shapeDefinition.collections;
    this.onDone = onDone;
    this.setup();
}
__extend(Menu, ShowAllCollectionMenu);

ShowAllCollectionMenu.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "menus/Menu.xhtml";
};

ShowAllCollectionMenu.prototype.setup = function () {
    var thiz = this;
    var createItem = function (collection) {
        var key = "select collection " + collection.displayName
        UICommandManager.register({
            key: key,
            label: collection.displayName,
            run: function () {
                thiz.onDone(collection);
            }
        });
        thiz.register(UICommandManager.getCommand(key));
    }
    for (var i in this.collection) {
        createItem(this.collection[i]);
    }
}
