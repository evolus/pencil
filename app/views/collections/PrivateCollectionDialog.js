function PrivateCollectionDialog () {
    WizardDialog.call(this);
    this.title = "Private Collection Wizard";
    this.subTitle = "This wizard help you through the process of creating a private collection";
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
        } else {
            this.valueHolder.collection = null;
        }
     }, this.collectionList)

     this.bind("dblclick", function(event) {
         var top = Dom.findUpwardForNodeWithData(event.target, "collection");
         if(thiz.activeCollectionNode) {
             thiz.activeCollectionNode.removeAttribute("active");
         }
         top.setAttribute("active", "true");
         this.activeCollectionNode = top;
         if(top.collection.id) {
             this.valueHolder.collection = top.collection;
         } else {
             this.valueHolder.collection = null;
         }
         this.onNext();

      }, this.collectionList)

     this.bind("change", function() {
         var value = this.generateIconCheck.checked;
         if (value) {
             this.shapeIcon.disabled = "true";
             this.browse.disabled = "true";
         } else {
             this.shapeIcon.disabled = false;
             this.browse.disabled = false;
         }
     }, this.generateIconCheck)

     this.browse.addEventListener("click", function(event) {
         thiz.browseIconFile();
     }, false);
}
__extend(WizardDialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setupUI = function (options) {
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
    }
    this.collectionsListPane = this.wizardPanes[0];
    this.collectionsDefinePane = this.wizardPanes[1];

    this.stepTitle.innerHTML = "Wellcome to create collection wizard";
    this.stepInfo.innerHTML = "Select an existing private collection or create new private collection";
    var collectionItems = [
        {
            displayName: "Create new private collection...",
            value: true
        }
    ];
    collectionItems = collectionItems.concat(PrivateCollectionManager.privateShapeDef.collections);
    var thiz = this;
    var lastSelectCollectionId = Config.get("PrivateCollection.lastSelectCollection.id");

    var addItem = function(collection) {
        var item = Dom.newDOMElement({
            _name: "li",
            _text: collection.displayName
        });
        if (lastSelectCollectionId && collection.id == lastSelectCollectionId) {
            item.setAttribute("active", "true");
            thiz.activeCollectionNode = item;
            thiz.valueHolder.collection = collection;
        }

        if ( collection.value && collection.value == true) {
            item.setAttribute("class", "createPrivateCollection");
        }
        item.collection = collection;
        item.collectionId = collection.id;
        thiz.collectionList.appendChild(item);
    }
    for (i in collectionItems) {
       addItem(collectionItems[i]);
    }
}

PrivateCollectionDialog.prototype.invalidateFinish = function () {
    if (!this.generateIconCheck.checked && this.shapeIcon.value == "" || this.shapeName.value == "" ||
    !this.activeCollectionNode.collection.id && this.collectionName.value == "")
    {
        Dialog.alert("Empty text box","Please enter all require text box",null);
        return false;
    }
    return true;
}
PrivateCollectionDialog.prototype.onFinish = function () {

    //add Shape
    this.valueHolder.shapeName = this.shapeName.value;
    if (this.generateIconCheck.checked) {
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
        thiz.stepTitle.innerHTML = "Completing the create private collection wizard";
        thiz.stepInfo.innerHTML = "Please enter collection or shape information";

        if(thiz.activeCollectionNode.collectionId) {
            thiz.collectionDefinition.style.display = "none";
            thiz.mycollection = thiz.activeCollectionNode.collections;
            thiz.shapeName.focus();
        } else {
            thiz.collectionDefinition.style.display = "block";
            thiz.collectionName.focus();
        }

    } else if (activePane == this.collectionsListPane) {
        thiz.stepTitle.innerHTML = "Wellcome to create collection wizard";
        thiz.stepInfo.innerHTML = "Select an existing private collection or create new private collection";

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
