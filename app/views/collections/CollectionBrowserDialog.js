function CollectionBrowserDialog (collectionPanel, managerDialog) {
    Dialog.call(this);

    this.collectionPanel = collectionPanel;
    this.managerDialog = managerDialog;
    this.title = "Collection Repository";
    this.subTitle = "Browse the user-contributed collection repository."

    this.collectionRepeater.populator = function (collection, binding) {
        binding.collectionTitle.innerHTML = Dom.htmlEncode(collection.displayName);
        binding.collectionDescription.innerHTML = Dom.htmlEncode(collection.description);
        binding.collectionAuthor.innerHTML = Dom.htmlEncode(collection.author);
        binding.collectionAuthor.parentNode.setAttribute("href", collection.website);

        binding.collectionVersion.innerHTML = "v" + Dom.htmlEncode(collection.version);
        binding.collectionThumb.style.backgroundImage = `url(${collection.thumbnail})`;
        binding._node._collection = collection;

        binding.buttonInstall._progressbar = binding.progressBar;
        binding.buttonInstall._versionLabel = binding.collectionVersion;
        binding.buttonInstall._buttonUninstall = binding.buttonUninstall;
        binding.buttonUninstall._buttonInstall = binding.buttonInstall;

        binding.buttonInstall._role = "button-install";
        binding.buttonUninstall._role = "button-uninstall";
    };

    this.bind("click", function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_role");
        if (!node) { return; }

        this.handleItemClick(node);
    }, this.collectionRepeater.node());
}
__extend(Dialog, CollectionBrowserDialog);

CollectionBrowserDialog.prototype.setup = function() {
    var thiz = this;
    setTimeout(function() {
        thiz.loadCollectionList();
    }, 500);
};

CollectionBrowserDialog.prototype.handleItemClick = function (control) {
    var view = Dom.findUpward(control, (node) => {
        return Dom.hasClass(node, "CollectionView");
    });
    if (!view || !view._collection) { return; }

    var thiz = this;
    var collection = view._collection;

    if (control._role == "button-install" && !control.hasAttribute("disabled")) {
        control._progressbar.style.display = "";
        control._versionLabel.style.display = "none";
        control.setAttribute("disabled", true);
        CollectionManager
            .installCollectionFromUrl(collection.url, (err, newCollection) => {
                control._progressbar.style.display = "none";
                control._versionLabel.style.display = "";
                control.removeAttribute("disabled");

                if (!err) {
                    collection._installed = true;
                    collection.installDirPath = newCollection.installDirPath;
                    collection.userDefined = newCollection.userDefined;

                    control.style.display = "none";
                    control._buttonUninstall.style.display = "";
                    view.setAttribute("installed", "true");

                    thiz.managerDialog.loadCollectionList();
                    thiz.collectionPanel.reload(newCollection.id);

                }
            });
    } else if (control._role == "button-uninstall") {
        control.setAttribute("disabled", true);
        var thiz = this;

        CollectionManager.uninstallCollection(collection, () => {
            thiz.collectionPanel.reload();
            thiz.managerDialog.loadCollectionList();

            collection._installed = false;
            collection.installDirPath = null;
            collection.userDefined = null;

            control.style.display = "none";
            control._buttonInstall.style.display = "";
            view.setAttribute("installed", "false");
            control.removeAttribute("disabled");
        });
    }
};

CollectionBrowserDialog.prototype.loadCollectionList = function () {
    var thiz = this;
    CollectionRepository.loadCollections()
        .then((collections) => {
            thiz.collectionRepeater.node().style.visibility = "hidden";

            window.setTimeout(function () {
                thiz.collectionRepeater.setItems(_.filter(collections, (e) => {
                    return !e._installed;
                }));
                thiz.collectionRepeater.node().style.visibility = "inherit";
            }, 10);
        })
        .catch((ex) => {
            Dialog.error("Could not load collections list");
            console.log(ex);
        })
        .finally(() => {
            thiz.collectionContainer.setAttribute("loaded", true);
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
