function ShowHiddenCollectionDialog (collectionPanel) {
    Dialog.call(this);
    this.hiddenCollections = this.getHiddenCollection();
    if(this.hiddenCollections.length == 0) {
        this.close();
    }
    this.collectionPanel = collectionPanel;
    this.bind("click", this.handleActionClick, this.dialogHeadCommand);
    this.title = function () {
        return "Hidden Collections:";
    };
    this.hiddenCollections = this.getHiddenCollection();
    var thiz = this;
     for( var i = 0; i < this.hiddenCollections.length; i++) {
        this.collectionContainer.appendChild(this.createCollectionButton(this.hiddenCollections[i]));
    }
    this.collectionContainer.addEventListener("click",function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        var check = node.getAttribute("selected");
        if(check == "true") {
            node.setAttribute("selected", "false");
        } else {
            node.setAttribute("selected", "true");
        };
    }, false);
}
__extend(Dialog, ShowHiddenCollectionDialog);

ShowHiddenCollectionDialog.prototype.getCollectionIcon = function (collection) {
    return collection.icon || CollectionPane.ICON_MAP[collection.id] || "border_all";
};

ShowHiddenCollectionDialog.prototype.createCollectionButton = function (collection) {
    var thiz = this;
    var icon = this.getCollectionIcon(collection);
    var button = Dom.newDOMElement({
        _name: "button",
        _children: [
            {
                _name: "i",
                _text: icon
            },
            {
                _name: "span",
                _text: collection.displayName
            }
        ]
    });
    button._id = collection.displayName;
    button._collection = collection;
    button.setAttribute("selected", "false");
    return button;
}

ShowHiddenCollectionDialog.prototype.getHiddenCollection = function () {
    var collections = CollectionManager.shapeDefinition.collections;
    var hiddenCollections = [];
    for (var i = 0; i < collections.length; i++) {
        if(collections[i].visible == false) {
            hiddenCollections.push(collections[i]);
        }
    }
    return hiddenCollections;
}
ShowHiddenCollectionDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        {   type: "accept", title: "Show",
            run: function () {
                if(this.hiddenCollections.length > 0) {
                    var node = this.collectionContainer;
                    for( var i = 0; i < node.children.length; i++){
                        var check = node.children[i].getAttribute("selected");
                        if(check == "true") {
                            this.collectionPanel.setVisibleCollection(node.children[i]._collection, true);
                        }
                    }
                    this.collectionPanel.reload();
                }
                return true;
            }
        },
        {
            type: "extra1", title: "Install New Collection",
            run: function () {
                CollectionManager.installNewCollection();
                return true;
            }
        }
    ]
};
