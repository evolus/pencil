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
                        _children :[
                            {
                                _name: "h4",
                                _text: "Author: "
                            },
                            {
                                _name: "p",
                                _text: collection.author
                            }
                        ]
                    },
                    {
                        _name: "li",
                        _children :[
                            {
                                _name: "h4",
                                _text: "More Information: "
                            },
                            {
                                _name: "a",
                                href:collection.infoUrl,
                                _text: collection.infoUrl
                            }
                        ]

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
        {
            type: "accept", title: "OK",
            run: function () { return true; }
        }
    ]
};
