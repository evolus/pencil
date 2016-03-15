function AboutCollectionDialog(collection) {
    Dialog.call(this);
    this.title = function () {
        return collection.displayName;
    };

    //this.title = collection.displayName;
    var node = Dom.newDOMElement({
        _name: "div",
        _children:[
            {
                _name: "p",
                _text: collection.description
            },
            {
                _name : "ul",
                _children :[
                    {
                        _name: "li",
                        _text: collection.author   
                    },
                    {
                        _name: "li",
                        _text: collection.infoUrl
                    }
                ]
            }
        ]
    });
    this.dialogBody.appendChild(node);
}
__extend(Dialog, AboutCollectionDialog);

AboutCollectionDialog.prototype.getDialogActions = function () {
    return [
        // Dialog.ACTION_CANCEL,
        // { type: "extra1", title: "Options...", run: function () {
        //     new AboutDialog().open();
        //     return false;
        // }},
        { type: "accept", title: "OK", run: function () {
            // alert("accepted");
            return true;
        }}
    ]
};