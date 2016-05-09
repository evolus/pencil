function PrivateCollectionDialog () {
    WizardDialog.call(this);
    this.title="Create Private Collection Wizard";
    this.index = 0;

    this.myCollection;

    var thiz = this;
    this.bind("click", function(event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "collection");
        if(thiz.activeCollectionNode) {
            thiz.activeCollectionNode.removeAttribute("active");
        }
        top.setAttribute("active","true");
        this.activeCollectionNode = top;
     }, this.collectionList)

     this.browse.addEventListener("click", function(event) {
         thiz.browseIconFile();
     }, false);
}
__extend(WizardDialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setupUI = function (options) {
    this.stepTitle.innerHTML ="Wellcome to create collection wizard";
    this.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
    var collectionItems = [
        {
            displayName: "Create new private collection...",
        }
    ];
    collectionItems = collectionItems.concat(CollectionManager.shapeDefinition.collections);
    var thiz = this;
    collectionItems = collectionItems.concat(CollectionManager.shapeDefinition.collections);
    var setItem = function(collection) {
       var item = Dom.newDOMElement({
           _name: "li",
           _text: collection.displayName
       });
       item.collection = collection;
       item.collectionId = collection.id;
       thiz.collectionList.appendChild(item);
    }

    for (i in collectionItems) {
       setItem(collectionItems[i]);
    }

    this.invalidateSelection = function () {
        switch (thiz.index) {
            case 0:
                if(!thiz.activeCollectionNode) {
                    Dialog.error("Error "," Please select item in list", null);
                    return false;
                }
                return true;
            default: return true;
        }
    };

    this.onSelectionChanged = function () {
        var newIndex = thiz.wizardPanes.indexOf(thiz.activePane);
        switch(newIndex) {
            case 0 :
                thiz.Definition.style.display="block";
                thiz.stepTitle.innerHTML ="Completing the create private collection wizard";
                thiz.stepInfo.innerHTML ="Please enter collection or shape information";
                if(thiz.activeCollectionNode.collectionId) {
                    thiz.collectionDefinition.style.display = "none";
                    thiz.mycollection = thiz.activeCollectionNode.collections;
                } else {
                    thiz.collectionDefinition.style.display = "block";
                }
                break;
            case 1 :
                thiz.stepTitle.innerHTML ="Wellcome to create collection wizard";
                thiz.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
                break;
        }

        this.index = newIndex;
    }
    if(options) {
        if (options.shape) {
            this.shape = options.shape;
        }
        if(options.collection) {
            this.title="Edit My Collection";
            this.stepTitle.innerHTML = "Collection definition";
            this.stepInfo.style.display = "none";
            this.shapeDefinition.style.display = "none";

            this.collectionAuthor.style.display = "flex";
            this.collectionWebsite.style.display =" flex";

            this.mycollection = options.collection;
            this.wizardPanes.splice(0,1);
            this.invalidateSelection = function() {return true};
            this.onSelectionChanged = function() {return true};
        }
    }

}

PrivateCollectionDialog.prototype.browseIconFile = function() {
     var thiz = this;
    dialog.showOpenDialog({
        title: "Open Icon File",
        defaultPath: os.homedir(),
        filters: [
            { name: "Icon File", extensions: ["icon", "png"] }
        ]

    }, function (filenames) {
        if (!filenames || filenames.length <= 0) return;
        thiz.shapeIcon.value = filenames;
        thiz.shape.iconPath = filenames;
    });
}
