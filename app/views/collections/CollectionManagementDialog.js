function CollectionManagementDialog (collectionPanel) {
    Dialog.call(this);

    this.collectionPanel = collectionPanel;
    this.title = "Manage Collections";
    this.subTitle = "Browse the list of collections installed in this system.";

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

    this.collectionContainer.addEventListener("mouseover",function (event) {
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (node) {
            if (this.activeNode) {
                this.activeNode.removeAttribute("active");
                this.activeNode = null;
            }
            this.activeNode = node;
            node.setAttribute("active","true");
        }
    }, false);

    var thiz = this;
    this.collectionContainer.addEventListener("dblclick",function (event) {
        var top = Dom.findUpwardForNodeWithData(event.target, "_collection");
        var visible = CollectionManager.isCollectionVisible (top._collection);
        if (!visible) {
            CollectionManager.setCollectionVisible (top._collection, true) ;
        }
        thiz.collectionPanel.reload(top._collection.id);
        thiz.close();
    }, false);

    this.bind("dragstart", function (ev) {
        nsDragAndDrop.dragStart(ev);
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (!node) return;
        ev.dataTransfer.setData("collectionId", node._collection.id);
        ev.dataTransfer.setData("dragType", "collection");
        nsDragAndDrop.setData("collectionId", node._collection.id);
        nsDragAndDrop.setData("dragType", "collection");
        if (this.currentDraggedObject) this.currentDraggedObject.removeAttribute("dragged");
        this.currentDraggedObject = node;
        this.currentDraggedObject.setAttribute("dragged", "true");
    }, this.collectionContainer);

    this.bind("dragover", function (ev) {
        // if (event.dataTransfer.getData("dragType") != "collection") return;
        if (nsDragAndDrop.getData("dragType") != "collection") return;
        if (this.hoverNode) {
            this.hoverNode.removeAttribute("hover");
            this.hoverNode = null;
        }
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (node) {
            node.setAttribute("hover", "true");
            this.hoverNode = node;
        }

    }, this.collectionContainer);

    this.bind("drop", function (ev) {
        // if (event.dataTransfer.getData("dragType") != "collection") return;
        if (nsDragAndDrop.getData("dragType") != "collection") return;

        if (this.hoverNode) {
            this.hoverNode.removeAttribute("hover");
            this.hoverNode = null;
        }
        var node = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (!node) return;
        var draggedCollectionId = ev.dataTransfer.getData("collectionId");
        var draggedCollectionId = nsDragAndDrop.getData("collectionId");
        var targetCollectionId = node._collection.id;
        if (node._collection.id != draggedCollectionId) {
            CollectionManager.reorderCollections(draggedCollectionId, targetCollectionId);
            thiz.loadCollectionList();
            thiz.collectionPanel.reload();
        }
        node.removeAttribute("hover");
    }, this.collectionContainer);

    this.bind("dragend", function (event) {
        if (this.currentDraggedObject) this.currentDraggedObject.removeAttribute("dragged");
        this.currentDraggedObject = null;
    }, this.collectionContainer);

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
        Dialog.confirm(
            "Are you sure you want to uninstall this collection?",
            "Uninstalling will remove this collection completely from Pencil. Shapes created from this collection will no longer be editable.",
            "Yes, Uninstall", function () {
                CollectionManager.uninstallCollection(collection);
                this.collectionPanel.reload();
                view.parentNode.removeChild(view);
            }.bind(this),
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
    view.setAttribute("draggable", "true");

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
                CollectionManager.installNewCollection(function (err, collection) {
                    if (!err && collection) {
                        thiz.collectionPanel.reload(collection.id);
                        NotificationPopup.show("Collection was installed successfully.");
                        thiz.loadCollectionList();
                    }
                });
                return false;
            }
        },
        {
            type: "extra1", title: "Install From Repository...",
            run: function () {
                new CollectionBrowserDialog(thiz.collectionPanel, thiz).open();
                return false;
            }
        }
    ]
};
