function CollectionBrowserDialog (collectionPanel, managerDialog) {
    Dialog.call(this);

    this.collectionPanel = collectionPanel;
    this.managerDialog = managerDialog;
    this.title = "Browse Collections";

    this.bind("click", this.handleItemClick, this.collectionContainer);
}
__extend(Dialog, CollectionBrowserDialog);

CollectionBrowserDialog.prototype.setup = function() {
    var thiz = this;
    setTimeout(function() {
        thiz.loadCollectionList();
    }, 500);
};

CollectionBrowserDialog.prototype.handleItemClick = function (event) {
    var thiz = this;
    var control = Dom.findUpwardForNodeWithData(event.target, "_role");
    if (!control) return;

    var view = control._view;
    var collection = view._collection;

    if (control._role == "install-button" && !control.hasAttribute("disabled")) {
        control._progressbar.style.display = "";
        control.setAttribute("disabled", true);
        CollectionManager
            .installCollectionFromUrl(collection.url, (err, newCollection) => {
                control._progressbar.style.display = "none";

                if (!err) {
                    collection._installed = true;
                    collection.installDirPath = newCollection.installDirPath;
                    collection.userDefined = newCollection.userDefined;

                    control.style.display = "none";
                    control._uninstallButton.style.display = "";
                    view.setAttribute("installed", "true");

                    thiz.managerDialog.loadCollectionList();
                }
                control.removeAttribute("disabled");
            });
    } else if (control._role == "uninstall-button") {
        control.setAttribute("disabled", true);
        var thiz = this;
        
        CollectionManager.uninstallCollection(collection, () => {
            thiz.collectionPanel.reload();
            thiz.managerDialog.loadCollectionList();

            collection._installed = false;
            collection.installDirPath = null;
            collection.userDefined = null;

            control.style.display = "none";
            control._installButton.style.display = "";
            view.setAttribute("installed", "false");
            control.removeAttribute("disabled");
        });
    }
};

CollectionBrowserDialog.prototype.createCollectionView = function (collection) {
    var thiz = this;
    var holder = {};

    var view = Dom.newDOMElement({
        _name: "vbox",
        "class": "CollectionView",
        _children: [
            {
                _name: "vbox",
                flex: 1,
                _children: [
                    {
                        _name: "vbox",
                        "class": "Thumb",
                        _children: [
                            {
                                _id: "thumbnail",
                                _name: "span",
                            }
                        ]
                    },
                    {
                        _name: "vbox",
                        "class": "Title",
                        _children: [
                            {
                                _text: collection.displayName
                            }
                        ]
                    },
                    {
                        _name: "vbox",
                        "class": "Description",
                        _children: [
                            {
                                _text: collection.description,
                                _name: "span",
                            }
                        ]
                    }
                ]
            },
            {
                _name: "hbox",
                "class": "Controls",
                _children: [
                    {
                        _name: "div",
                        _id: "progressBar",
                        "class": "Progressbar",
                        "style": "display:none"
                    },
                    {
                        _children: [{
                            _name: "i",
                            _text: "file_download"
                        }, {
                            _name: "span",
                            _text: "Install"
                        }],
                        _name: "button",
                        _id: "installButton"
                    },
                    {
                        _children: [{
                            _name: "i",
                            _text: "delete"
                        }, {
                            _name: "span",
                            _text: "Uninstall"
                        }],
                        _name: "button",
                        _id: "uninstallButton"
                    }
                ]
            }
        ]
    }, null, holder);

    holder.thumbnail.style.backgroundImage = `url(${collection.thumbnail})`;

    var installButton = holder.installButton;
    var uninstallButton = holder.uninstallButton;
    var progressBar = holder.progressBar;

    installButton._view = view;
    installButton._role = "install-button";
    uninstallButton._view = view;
    uninstallButton._role = "uninstall-button";
    uninstallButton.style.display = "none";

    installButton._progressbar = progressBar;
    installButton._uninstallButton = uninstallButton;
    uninstallButton._installButton = installButton;

    view._id = collection.id;
    view._collection = collection;
    view.setAttribute("installed", collection._installed ? "true" : "false");

    return view;
}

CollectionBrowserDialog.prototype.loadCollectionList = function () {
    Dom.empty(this.collectionContainer);

    var thiz = this;
    CollectionRepository.loadCollections()
        .then((collections) => {
            if (collections) {
                _.forEach(collections, function(e) {
                    if (e._installed) { return; }
                    thiz.collectionContainer.appendChild(thiz.createCollectionView(e));
                })
            }
        })
        .catch((ex) => {
            console.log(ex);
        });
}
CollectionBrowserDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CLOSE,
        {
            type: "extra1", title: "Install From URL...",
            run: function () {
                Dialog.prompt("Enter your url here", "", "OK", function (value) {
                    let url = value;
                    if (!url) { return; }

                    CollectionManager.installCollectionFromUrl(url, () => {
                    });
                }, "Cancel");

                return false;
            }
        }
    ]
};
