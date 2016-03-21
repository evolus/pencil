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
}
__extend(Dialog, ShowHiddenCollectionDialog);


ShowHiddenCollectionDialog.prototype.buildDOMNode = function () {
    var thiz = this;
    var frameTemplate = this.getTemplatePrefix() + "Dialog.xhtml";
    var node = widget.Util.loadTemplateAsNodeSync(frameTemplate, this);
    this.buttons = {};
    var contentNode = widget.Util.loadTemplateAsNodeSync(this.getTemplatePath(), this);
    this.hiddenCollections = this.getHiddenCollection();
    for( var i = 0; i < this.hiddenCollections.length; i++) {
        var button = this.dialogBody.appendChild(this.createCollectionButton(this.hiddenCollections[i]));
        thiz.buttons[button._id] = button;
        button.addEventListener("click",function(event) {
            if(thiz.buttons[event.target.id]._show) {
               thiz.buttons[event.target.id]._show = false;
               //console.log(event.target.id + thiz.buttons[event.target.id]._show);
               thiz.buttons[event.target.id].style.background = "#fff";
            } else {
                thiz.buttons[event.target.id]._show = true ;
                //console.log(event.target.id + thiz.buttons[event.target.id]._show);
                thiz.buttons[event.target.id].style.background = "#000";
            }
        },false);
    }
    return node;
};

ShowHiddenCollectionDialog.prototype.createCollectionButton = function(collection) {
    var thiz = this;
    var button = document.createElement("button");
    var buttonText = document.createTextNode(collection.displayName);
    button.appendChild(buttonText);
    button._show = false;
    button._id = collection.displayName;
    button._collection = collection;
    button.setAttribute("id",collection.displayName);
    // thiz.buttons[collection.displayName] = button;
    // button.addEventListener("click",function(event) {
    //     if(thiz.buttons[event.target.id]._show) {
    //        thiz.buttons[event.target.id]._show = false;
    //        console.log(event.target.id);
    //     } else {
    //         thiz.buttons[event.target.id]._show = true ;
    //         console.log(event.target.id);
    //     }
    // },false)
    return button;
}

// ShowHiddenCollectionDialog.prototype.createCollectionNode = function(collection) {
//     var node = Dom.newDOMElement({
//         _name: "div",
//         _children:[{
//                 _name: "input",
//                 type: "checkbox",
//                 id: collection.displayName,
//             },
//             {
//                 _name: "Label",
//                 _text: collection.displayName
//             }
//         ]
//     });
//    node._collection = collection;
//    return node;
// };

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
        { type: "showCollections", title: "Show", run: function() {
            if(this.hiddenCollections.length > 0) {
                // for ( var i = 0; i < this.dialogBody.childNodes.length; i++) {
                //     var currentNode = this.dialogBody.childNodes[i];
                //     if(currentNode.nodeName == "div") {
                //         if(currentNode.childNodes[0].checked == true) {
                //            this.collectionPanel.setVisibleCollection(currentNode._collection,true);
                //         }
                //     }
                // }
                for(var i = 0; i < this.hiddenCollections.length; i++) {
                    if(this.buttons[this.hiddenCollections[i].displayName]._show) {
                        this.collectionPanel.setVisibleCollection(this.buttons[this.hiddenCollections[i].displayName]._collection,true);
                    }
                }

                this.collectionPanel.reload();
            }
            return true;
        }},
        { type: "uninstallCollections", title: "Uninstall Collections", run: function() {
            return true;
        }},
        { type: "installCollection", title: "Install New Collection", run: function() {
            return true;
        }}
    ]
};

ShowHiddenCollectionDialog.prototype.invalidateElements = function () {
    var actions = this.getDialogActions();

    var startActions = [];
    var endOptions = [];

    this.closeHandler = null;
    this.positiveHandler = null;

    actions.forEach(function (a) {
        a.order = DIALOG_BUTTON_ORDER[a.type];
        if (typeof(a.order) == "undefined") a.order = -99;

        if (a.type == "cancel") {
            this.closeHandler = a.run;
        } else if (a.type == "accept") {
            this.positiveHandler = a.run;
        }
    }, this);

    actions.sort(function (a1, a2) {
        return a1.order - a2.order;
    });

    Dom.empty(this.dialogHeaderMiddlePane);
    Dom.empty(this.dialogHeaderEndPane);
    Dom.empty(this.dialogFooterMiddlePane);

    actions.forEach(function (a) {
        var button = this.createButton(a);
        if (a.order < 0) {
            this.dialogHeaderMiddlePane.appendChild(button);
        } else if (a.order == 0) {
            this.dialogHeaderEndPane.appendChild(button);
        } else {
            this.dialogFooterMiddlePane.appendChild(button);
        }
    }, this);
    // Dom.empty(this.dialogTitle);
    // this.dialogTitle.appendChild(document.createTextNode(this.e(this.title)));
    
    // console.log(this.closeHandler);
    // this.dialogClose.style.display = this.closeHandler ? "inline-block" : "none";
};