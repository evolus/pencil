function ShowHiddenCollectionDialog(collectionPanel) {
    Dialog.call(this);
    this.collectionPanel = collectionPanel;
    this.bind("click", this.handleActionClick, this.dialogHeadCommand);
    // this.title = function () {
    //     return "Hidden Collection: ";
    // };
    // this.hiddenCollections = this.getHiddenCollection();
    // for( var i = 0; i < this.hiddenCollections.length; i++) {
    //     this.dialogBody.appendChild(this.createCollectionNode(this.hiddenCollections[i]));
    // }
    this.buttons = {};
    this.hiddenCollections = this.getHiddenCollection();
    var thiz = this;
     for( var i = 0; i < this.hiddenCollections.length; i++) {
        var button = this.collectionContainer.appendChild(this.createCollectionButton(this.hiddenCollections[i]));
        thiz.buttons[button._id] = button;
    }
    this.collectionContainer.addEventListener("click",function(event) {
        if(event.target.tagName == "button") {
            if(thiz.buttons[event.target.id]._show) {
                thiz.buttons[event.target.id]._show = false; 
                thiz.buttons[event.target.id].setAttribute("selected","false");
            } else {
                thiz.buttons[event.target.id]._show = true ;
                thiz.buttons[event.target.id].setAttribute("selected","true");
            }

        }
    },false);
}
__extend(Dialog, ShowHiddenCollectionDialog);

ShowHiddenCollectionDialog.prototype.createCollectionButton = function(collection) {
    var thiz = this;
    var button = document.createElement("button");
    var name = collection.displayName;
    name = name.slice(0,7);
    var buttonText = document.createTextNode(name);
    button.appendChild(buttonText);
    button._show = false;
    button._id = collection.displayName;
    button._collection = collection;
    button.setAttribute("id",collection.displayName);
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
        {   type: "showCollections", title: "Show", run: function() {
            if(this.hiddenCollections.length > 0) {
                for(var i = 0; i < this.hiddenCollections.length; i++) {
                    if(this.buttons[this.hiddenCollections[i].displayName]._show) {
                        this.collectionPanel.setVisibleCollection(this.buttons[this.hiddenCollections[i].displayName]._collection,true);
                    }
                }
                this.collectionPanel.reload();
            }
            return true;
        }},
        {   type: "uninstallCollections", title: "Uninstall Collections", run: function() {
            return true;
        }},
        {   type: "installCollection", title: "Install New Collection", run: function() {
            return true;
        }}
    ]
};
