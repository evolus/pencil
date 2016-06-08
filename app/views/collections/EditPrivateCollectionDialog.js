function EditPrivateCollectionDialog() {
    Dialog.call(this);
    this.title="Private Collection";
    this.subTitle = "Edit private collection properties";
    this.modified = false;

    this.bind("change",function(event) {this.modified = true;}, this.collectionName);
    this.bind("change",function(event) {this.modified = true;}, this.collectionDescription);
    this.bind("change",function(event) {this.modified = true;}, this.collectionAuthor);
    this.bind("change",function(event) {this.modified = true;}, this.collectionWeb);

}
__extend(Dialog, EditPrivateCollectionDialog);

EditPrivateCollectionDialog.prototype.setup = function (options) {
    if (options && options.collection) {
        this.collection = options.collection;
    }
    if (options && options.onDone) {
        this.onDone = options.onDone;
    }
    console.log(this.collection);
    this.collectionName.value = this.collection.displayName;
    this.collectionDescription.value = this.collection.description;
    this.collectionAuthor.value = this.collection.author;
    this.collectionWeb.value = this.collection.infoUrl;
}


EditPrivateCollectionDialog.prototype.invalidate = function () {
    if (this.collectionName.value == "")
    {
        Dialog.alert("Empty text box","Please enter collection Name ",null);
        return false;
    }
    return true;
}

EditPrivateCollectionDialog.prototype.onFinish = function () {
    var thiz = this;
    thiz.collection.displayName = thiz.collectionName.value;
    thiz.collection.description = this.collectionDescription.value;
    thiz.collection.author = thiz.collectionAuthor.value;
    thiz.collection.infoUrl = thiz.collectionWeb.value;
    if(thiz.onDone) thiz.onDone(thiz.collection);
}
EditPrivateCollectionDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        {
            type: "accept", title: "Save",
            isCloseHandler: true,
            run: function () {
                if(!thiz.invalidate()) return false;
                thiz.onFinish();
                return true;
            }
        },
        {
            type: "cancel", title: "Cancel",
            isCloseHandler: true,
            run: function () {
                if(thiz.modified) {
                    Dialog.confirm(
                        "Do you want to save your changes before closing?", null,
                        "Save", function () {
                            if(!thiz.invalidate()) return false;
                            thiz.onFinish();
                            return true;
                        },
                        "Cancel"
                    )
                }
                return true;
            }
        }
    ]
};
