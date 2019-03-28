function AboutCollectionDialog(collection) {
    Dialog.call(this);
    this.title = function () {
        return collection.displayName;
    };
    this.subTitle = function () {
        return collection.description || "Information about this shape collection";
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
                                _text: "More Information:",
                                "class": "MoreInfor"
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
    this.aboutContent.appendChild(node);
    
    if (collection.userDefined || collection.developerStencil) {
        this.locationButton.innerHTML = "" + collection.installDirPath;
        this.locationButton.addEventListener("click", function () {
            require("electron").shell.openItem(collection.installDirPath);            
        }, false);
    } else {
        this.locationBox.style.display = "none";
    }
}
__extend(Dialog, AboutCollectionDialog);

AboutCollectionDialog.prototype.getDialogActions = function () {
    return [
        {
            type: "accept", title: "Close",
            run: function () { return true; }
        }
    ]
};
