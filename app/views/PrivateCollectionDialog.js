function PrivateCollectionDialog () {
    WizardDialog.call(this);
    this.title = "Create Private Collection Wizard";
    this.myCollection;

    var thiz = this;
    this.bind("click", function(event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "collection");
        if(thiz.activeCollectionNode) {
            thiz.activeCollectionNode.removeAttribute("active");
        }
        top.setAttribute("active", "true");
        this.activeCollectionNode = top;
        if(top.collection.id) {
            this.valueHolder.collection = top.collection;
        }
     }, this.collectionList)

     this.browse.addEventListener("click", function(event) {
         thiz.browseIconFile();
     }, false);
}
__extend(WizardDialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setupUI = function (options) {
    this.collectionsListPane = this.wizardPanes[0];
    this.collectionsDefinePane = this.wizardPanes[1];

    this.stepTitle.innerHTML = "Wellcome to create collection wizard";
    this.stepInfo.innerHTML = "Select an existing private collection or create new private collection";
    var collectionItems = [
        {
            displayName: "Create new private collection...",
        }
    ];
    collectionItems = collectionItems.concat(PrivateCollectionManager.privateShapeDef.collections);
    var thiz = this;
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

    if(options) {
        if (options.onDone) {
            this.onDone = options.onDone;
        }
        if (options.valueHolder) {
            this.valueHolder = options.valueHolder;
        }
        if (options.shape) {
            this.shape = options.shape;
        }
        if(options.collection) {
            this.title = "Edit My Collection";
            this.stepTitle.innerHTML = "Collection definition";
            this.stepInfo.style.display = "none";
            this.shapeDefinition.style.display = "none";

            this.collectionAuthor.style.display = "flex";
            this.collectionWebsite.style.display = " flex";

            this.mycollection = options.collection;

            this.onSelectionChanged = function () {return true};
            this.invalidateSelection = function () {return true;}

            this.wizardPanes.splice(0, 1);
            // add Finish when edit collection here
        }
    }
}

PrivateCollectionDialog.prototype.onFinish = function () {
    //add Shape
    this.valueHolder.shapeName = this.shapeName.value;
    if (this.shapeIcon.value == "") {
        this.valueHolder.autoGenerateIcon = true;
    } else {
        this.valueHolder.shapeIcon = this.shapeIcon.value;
        this.valueHolder.autoGenerateIcon = false;
    }
    //add new collection
    if(!this.valueHolder.collection) {
        this.valueHolder.collectionName = this.collectionName.value;
        this.valueHolder.collectionDescription = this.collectionDescription.value;
    }

    if(this.onDone) {
        this.onDone(this.valueHolder);
    }
}

PrivateCollectionDialog.prototype.invalidateSelection = function () {
    var thiz = this;
    if(this.activePane == this.collectionsListPane) {
        if(!thiz.activeCollectionNode) {
            Dialog.error("Error ", " Please select item in list", null);
            return false;
        }
    }
    return true;
};

PrivateCollectionDialog.prototype.onSelectionChanged = function (activePane) {
    var thiz = this;
    if(activePane == this.collectionsDefinePane) {
        thiz.definition.style.display = "block";
        thiz.stepTitle.innerHTML = "Completing the create private collection wizard";
        thiz.stepInfo.innerHTML = "Please enter collection or shape information";
        if(thiz.activeCollectionNode.collectionId) {
            thiz.collectionDefinition.style.display = "none";
            thiz.mycollection = thiz.activeCollectionNode.collections;
        } else {
            thiz.collectionDefinition.style.display = "block";
        }
    } else if (activePane == this.collectionsListPane) {
        thiz.stepTitle.innerHTML = "Wellcome to create collection wizard";
        thiz.stepInfo.innerHTML = "Select an existing private collection or create new private collection";
        // add Finish here
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
