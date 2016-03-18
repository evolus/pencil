function ShowHiddenCollectionDialog(collectionPanel) {
    Dialog.call(this);
    this.collectionPanel = collectionPanel;
    this.title = function () {
        return "Hidden Collection: ";
    };
    this.hiddenCollections = this.getHiddenCollection();
    for( var i = 0; i < this.hiddenCollections.length; i++) {
        this.dialogBody.appendChild(this.createCollectionNode(this.hiddenCollections[i]));
    }
    
}
__extend(Dialog, ShowHiddenCollectionDialog);

ShowHiddenCollectionDialog.prototype.createCollectionNode = function(collection) {
    var node = Dom.newDOMElement({
        _name: "div",
        _children:[{
                _name: "input",
                type: "checkbox",
                id: collection.displayName,
            },
            {
                _name: "Label",
                _text: collection.displayName
            }
        ]
    });
   node._collection = collection;
   return node;
};

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
        { type: "accept", title: "OK", run: function () {
            if(this.hiddenCollections.length > 0) {
                for ( var i = 0; i < this.dialogBody.childNodes.length; i++) {
                    var currentNode = this.dialogBody.childNodes[i];
                    if(currentNode.nodeName == "div") {
                        if(currentNode.childNodes[0].checked == true) {
                           this.collectionPanel.setVisibleCollection(currentNode._collection,true);
                        }
                    }
                }
                this.collectionPanel.reload();
            }
            
            return true;
        }}
    ]
};