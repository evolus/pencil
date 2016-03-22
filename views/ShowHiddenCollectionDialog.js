function ShowHiddenCollectionDialog(collectionPanel) {
    Dialog.call(this);
    this.collectionPanel = collectionPanel;
    this.bind("click", this.handleActionClick, this.dialogHeadCommand);
    this.title = function () {
        return "Hidden Collection: ";
    };
    this.hiddenCollections = this.getHiddenCollection();
    var thiz = this;
     for( var i = 0; i < this.hiddenCollections.length; i++) {
        this.collectionContainer.appendChild(this.createCollectionButton(this.hiddenCollections[i]));
    }
    this.collectionContainer.addEventListener("click",function(event) {
        if(event.target._collection) {
            var check = event.target.getAttribute("selected")
            if(check == "true") {
                event.target.setAttribute("selected","false");
            } else {
                event.target.setAttribute("selected","true");
            }
        }
        else
        {
            // when click in icon or text inside button, it will return parent node then handle on parent node had ._collecttion property : )
        }
    },false);
}
__extend(Dialog, ShowHiddenCollectionDialog);

ShowHiddenCollectionDialog.prototype.createCollectionButton = function(collection) {
    var thiz = this;
    var name = collection.displayName;
    name = name.slice(0,7);
    var button = Dom.newDOMElement({
        _name: "button",
        _text: name
    });
    button._id = collection.displayName;
    button._collection = collection;
    button.setAttribute("selected","false");
    return button;
}

ShowHiddenCollectionDialog.prototype.getHiddenCollection = function() {
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
        {   type: "accept", title: "Show", run: function() {
            if(this.hiddenCollections.length > 0) {
                var node = this.collectionContainer;
                for( var i = 0; i < node.children.length; i++){
                    var check = node.children[i].getAttribute("selected");
                    if(check == "true") {
                        this.collectionPanel.setVisibleCollection(node.children[i]._collection,true);
                    }
                }
                this.collectionPanel.reload();
            }
            return true;
        }},
        {   type: "accept", title: "Uninstall Collections", run: function() {
            return true;
        }},
        {   type: "extra1", title: "Install New Collection", run: function() {
            return true;
        }}
    ]
};
