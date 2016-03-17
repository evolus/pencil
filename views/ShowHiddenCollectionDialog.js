function ShowHiddenCollectionDialog(collectionPanel) {
    Dialog.call(this);
    this.collectionPanel = collectionPanel;
    this.collectionSelects = [];
    this.title = function () {
        return "Hidden Collection: ";
    };
    var hiddenCollections = collectionPanel.returnHiddenCollection();
    for( var i = 0; i < hiddenCollections.length; i++) {
        this.dialogBody.appendChild(this.createCollectionNode(hiddenCollections[i], this));
    }
    
}
__extend(Dialog, ShowHiddenCollectionDialog);

ShowHiddenCollectionDialog.prototype.createCollectionNode = function(collection, thisDialog) {
    var thiz = thisDialog;
    var node = Dom.newDOMElement({
        _name: "div",
        _children:[{
                _name: "input",
                type: "checkbox",
            },
            {
                _name: "Label",
                _text: collection.displayName
            }
        ]
    });
    node.addEventListener("click",function(e) {
        if( e.target.checked == true && e.target.tagName == "input") {
            thiz.processCollection(collection,true);
        } 
        if(e.target.checked == false && e.target.tagName == "input") {
            thiz.processCollection(collection,false);
        }
   },false)
   return node;
};

ShowHiddenCollectionDialog.prototype.processCollection = function(collection, value) {
    if(value) {
        this.collectionSelects.push(collection);
    } else {
        var index = this.this.collectionSelects.indexOf(collection);
        this.collectionSelects.splice(index,1);
    }

}

ShowHiddenCollectionDialog.prototype.getDialogActions = function () {
    return [
        { type: "accept", title: "OK", run: function () {
            if(this.collectionSelects.length > 0 ) {
                for (var i = 0; i < this.collectionSelects.length; i++) {
                     CollectionManager.setCollectionVisible(this.collectionSelects[i],true);
                     this.collectionPanel.reload();
                 }
            }
            return true;
        }}
    ]
};