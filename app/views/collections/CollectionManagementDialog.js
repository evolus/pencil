function CollectionManagementDialog (collectionPanel) {
    Dialog.call(this);

    this.collectionPanel = collectionPanel;
    this.title = "Manage Collections";

    this.loadCollectionList();

    this.bind("click", this.handleItemClick, this.collectionContainer);

    this.collectionContainer.addEventListener("click",function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        var check = node.getAttribute("selected");
        if(check == "true") {
            node.setAttribute("selected", "false");
        } else {
            node.setAttribute("selected", "true");
        };
    }, false);
}
__extend(Dialog, CollectionManagementDialog);

CollectionManagementDialog.prototype.getCollectionIcon = function (collection) {
    return collection.icon || BaseCollectionPane.ICON_MAP[collection.id] || "border_all";
};

CollectionManagementDialog.prototype.handleItemClick = function (event) {
    var control = Dom.findUpwardForNodeWithData(event.target, "_role");
    if (!control) return;
    var view = control._view;
    var collection = view._collection;

    if (control._role == "visible-toggle") {
        var visible = control.checked;
        this.collectionPanel.setVisibleCollection(collection, visible);
        this.collectionPanel.reload();
        view.setAttribute("visible", visible);
    } else if (control._role == "uninstall-button") {
        if (!collection.userDefined) return;
        var thiz = this;

        Dialog.confirm(
            "Are you sure you want to uninstall this collection?",
            "Uninstalling will remove this collection completely from Pencil. Shapes created from this collection will no longer be editable.",
            "Yes, Uninstall", function () {
                CollectionManager.uninstallCollection(collection);
                thiz.collectionPanel.reload();
                view.parentNode.removeChild(view);
            }.bind(thiz),
            "Cancel"
        );
    }
};

CollectionManagementDialog.prototype.createCollectionView = function (collection) {
    var thiz = this;
    var icon = this.getCollectionIcon(collection);
    var id = "check_" + Util.newUUID();

    var holder = {};

    var view = Dom.newDOMElement({
        _name: "vbox",
        "class": "CollectionView",
        _children: [
            {
                _name: "hbox",
                flex: 1,
                _children: [
                    {
                        _name: "i",
                        _text: icon,
                        "class": "Icon"
                    },
                    {
                        _name: "vbox",
                        flex: 1,
                        "class": "Name",
                        _children: [
                            {
                                _name: "strong",
                                _text: collection.displayName
                            },
                            {
                                _name: "span",
                                flex: 1,
                                _text: collection.description
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
                        _name: "input",
                        type: "checkbox",
                        id: id,
                        _id: "checkbox"
                    },
                    {
                        _name: "label",
                        "for": id,
                        _text: "Visible"
                    },
                    {
                        _name: "button",
                        _id: "uninstallButton",
                        title: "Uninstall this collection",
                        _children: [
                            {
                                _name: "i",
                                _text: "delete"
                            }
                        ]
                    }
                ]
            }
        ]
    }, null, holder);

    if (collection.visible) {
        holder.checkbox.setAttribute("checked", "true");
    }

    view.setAttribute("visible", collection.visible);

    holder.checkbox._view = view;
    holder.checkbox._role = "visible-toggle";

    holder.uninstallButton._view = view;
    holder.uninstallButton._role = "uninstall-button";

    if (!collection.userDefined) {
        holder.uninstallButton.disabled = true;
    }

    view._id = collection.displayName;
    view._collection = collection;
    view.setAttribute("selected", "false");
    return view;
}

CollectionManagementDialog.prototype.loadCollectionList = function () {
    Dom.empty(this.collectionContainer);
    var collections = CollectionManager.shapeDefinition.collections;
    for( var i = 0; i < collections.length; i++) {
        this.collectionContainer.appendChild(this.createCollectionView(collections[i]));
    }
}
CollectionManagementDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return [
        Dialog.ACTION_CLOSE,
        {
            type: "extra1", title: "Install From File...",
            run: function () {
                CollectionManager.installNewCollection(function () {
                    thiz.loadCollectionList();
                });
                return false;
            }
        }/*,
        {
            type: "extra1", title: "Install From URL...",
            run: function () {
                CollectionManager.installCollectionFromUrl("https://github.com/Craig-Fisk/BootstrapGlyph-Pencil-Stencil/archive/0.1.zip", () => {
                    thiz.loadCollectionList();
                });
                return false;
            }
        }*/
    ]
};
