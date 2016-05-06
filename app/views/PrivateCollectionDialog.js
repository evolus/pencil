function PrivateCollectionDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title="Create My Collection";
    this.activeTop;

}
__extend(Dialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setup = function (options) {
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
   var thiz = this;
   this.bind("click", function(event) {
       var top = Dom.findUpwardForNodeWithData(event.target, "collection");
       if(thiz.activeTop) {
           thiz.activeTop.removeAttribute("active");
       }
       top.setAttribute("active","true");
       this.activeTop = top;
    }, this.collectionList)

    if(options) {
        if (options.shape) {
            this.shape = options.shape;
            this.title="Edit My Shape";
            this.stepTitle.innerHTML ="Shape definition";
            this.stepInfo.style.display ="none";
            this.collectionSelector.style.display = "none";
            this.collectionDefinition.style.display = "none";
            this.Definition.style.display = "block";
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
        }
    }
}

PrivateCollectionDialog.prototype.getDialogActions = function () {
    var thiz = this;
    this.finalNext = false;
    return [
        {
            type: "extra3", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        },
        {
            type: "accept", title: "Back",
            //icon: "keyboard_arrow_left",
            isCloseHandler: true,
            isEnabled : function() {
                if(thiz.collection || thiz.shape) return false;
                return true;
            },
            run: function () {
                if(finalNext) {
                    if(thiz.activeTop) {
                        thiz.collectionSelector.style.display = "block";
                        thiz.Definition.style.display="none";
                        thiz.stepTitle.innerHTML ="Wellcome to create collection wizard";
                        thiz.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
                        thiz.activeNode = null;
                        finalNext = false;
                    }
                }
            }
        },
        {
            type: "accept", title: "Next",
            //icon: "keyboard_arrow_right",
            isCloseHandler: true,
            run: function () {
                if(!thiz.finalNext) {
                    if(thiz.activeTop) {
                        thiz.collectionSelector.style.display = "none";
                        thiz.Definition.style.display="block";
                        thiz.stepTitle.innerHTML ="Completing the create private collection wizard";
                        thiz.stepInfo.innerHTML ="Please enter collection or shape information";
                        if(thiz.activeTop.collectionId) {
                            thiz.collectionDefinition.style.display = "none";
                        } else {
                            thiz.collectionDefinition.style.display = "block";
                        }
                        finalNext = true;
                        return;
                    }
                }
                var mycollection;
                if (!thiz.activeTop.id) {
                    // Create collection
                } else {
                    mycollection = thiz.activeTop.collections;
                }
                // Add shape to new collection
            }
        }
    ]
};
