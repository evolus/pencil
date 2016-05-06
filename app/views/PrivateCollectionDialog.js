function PrivateCollectionDialog () {
    Dialog.call(this);
    this.tabCurrentActive;
    this.title="Create My Collection";

}
__extend(Dialog, PrivateCollectionDialog);

PrivateCollectionDialog.prototype.setup = function (options) {
    this.stepTitle.innerHTML ="Wellcome to create collection wizard";
    this.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
    if(options) {
        if(options.collection) {
            this.title="Edit My Collection";
            this.stepTitle.innerHTML ="Wellcome to edit private collection wizard";
            this.stepInfo.innerHTML ="Please enter collection or shape information";
        }
    }

    var collectionItems = [
        {displayName: "Create new private collection..."}
    ];
    for (i in collectionItems) {
        var item = Dom.newDOMElement({
            _name: "li",
            _text: collectionItems[i].displayName,
            _collection: collectionItems[i].value
        });
        this.collectionList.appendChild(item);
    }
}

PrivateCollectionDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "cancel", title: "Close",
            isCloseHandler: true,
            run: function () { return true; }
        },
        {
            type: "cancel", title: "Back",
            //icon: "keyboard_arrow_left",
            isCloseHandler: true,
            run: function () {
                thiz.collectionSelector.style.display = "block";
                thiz.Definition.style.display="none";
                thiz.stepTitle.innerHTML ="Wellcome to create collection wizard";
                thiz.stepInfo.innerHTML ="Select an existing private collection or create new private collection";
            }
        },
        {
            type: "cancel", title: "Next",
            //icon: "keyboard_arrow_right",
            isCloseHandler: true,
            run: function () { thiz.collectionSelector.style.display = "none";
                thiz.Definition.style.display="block";
                thiz.stepTitle.innerHTML ="Completing the create private collection wizard";
                thiz.stepInfo.innerHTML ="Please enter collection or shape information";
            }
        }
    ]
};
