function PrivateCollectionDialog () {
    WizardDialog.call(this);
    this.title="Create Private Collection Wizard";
    this.myCollection;
}
__extend(WizardDialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setupUI = function (options) {
    this.stepTitle.innerHTML ="Wellcome to create collection wizard";
    this.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
    if(options) {
        if (options.shape) {
            this.shape = options.shape;
        }
        if(options.collection) {
            this.collection = options.collection;
            this.title="Edit My Collection";
            this.stepTitle.innerHTML ="Collection definition";
            this.stepInfo.style.display ="none";
            this.collectionSelector.style.display = "none";
            this.shapeDefinition.style.display = "none";
            this.collectionDefinition.style.display = "block";
            this.Definition.style.display = "block";

            this.collectionAuthor.style.display = "flex";
            this.collectionWebsite.style.display =" flex";

            this.mycollection = options.collection;
            this.wizardPanes.splice(0,1);
        }
    }

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
   var thiz = this;

   this.bind("click", function(event) {
       var top = Dom.findUpwardForNodeWithData(event.target, "collection");
       if(thiz.activeCollectionNode) {
           thiz.activeCollectionNode.removeAttribute("active");
       }
       top.setAttribute("active","true");
       this.activeCollectionNode = top;
    }, this.collectionList)

    this.onNextClick = function () {
        if(thiz.nextable) {
            if(!thiz.activeCollectionNode) {
                Dialog.error("Please choose item in list", "error", null);
                return false;
            } else {
                thiz.collectionSelector.style.display = "none";
                thiz.Definition.style.display="block";
                thiz.stepTitle.innerHTML ="Completing the create private collection wizard";
                thiz.stepInfo.innerHTML ="Please enter collection or shape information";
                if(thiz.activeCollectionNode.collectionId) {
                    thiz.collectionDefinition.style.display = "none";
                } else {
                    thiz.collectionDefinition.style.display = "block";
                }
            }
        }
        if (thiz.activeCollectionNode.id) {
            this.mycollection = thiz.activeCollectionNode.collections;
        }
        return true;
    };

    this.onBackClick = function () {
        if(!thiz.nextable) {
            if(thiz.activeCollectionNode) {
                thiz.collectionSelector.style.display = "block";
                thiz.Definition.style.display="none";
                thiz.stepTitle.innerHTML ="Wellcome to create collection wizard";
                thiz.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
                finalNext = false;
            }
        }
    }
    this.onFinishClick = function() {
        // apply change to this.mycollection
    }
}
