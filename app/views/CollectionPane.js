function CollectionPane() {
    BaseTemplatedWidget.call(this);
    var thiz = this;

    this.selectorPane.addEventListener("contextmenu", function(event) {
        var collectionNode = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (!collectionNode) return;

        collectionNode.focus();
        var collection = collectionNode._collection;
        var menu = new CollectionMenu(collection, thiz);
        menu.showMenuAt(event.clientX, event.clientY);
    },false);

    this.selectorPane.addEventListener("click", function(event) {
        var item = Dom.findUpward(Dom.getTarget(event), function (n) {
            return n._collection;
        });

        if (!item) return;
        Dom.doOnAllChildren(thiz.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == item);
        });
        thiz.openCollection(item._collection);
    },false);

    this.shapeList.addEventListener("dragstart", function (event) {
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");

        var def = n._def;
        if (def.shape) {
            event.dataTransfer.setData("pencil/shortcut", def.id);
        } else {
            event.dataTransfer.setData("pencil/def", def.id);
        }
        event.dataTransfer.setData("pencil/def", def.id);
        event.dataTransfer.setData("collectionId", def.collection.id);
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
        event.target.collection = def;


    });


    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";

    this.searchInput.addEventListener("keyup", function (event) {
        thiz.filterCollections();
    }, false);

    this.collectionManagementButton.addEventListener("click", function (event) {
        new CollectionManagementDialog(thiz).open();
    });

    UICommandManager.register({
        key: "searchFocusCommand",
        shortcut: "Ctrl+F",
        run: function () {
            thiz.searchInput.focus();
            thiz.searchInput.select();
        }
    });

    Pencil.collectionPane = this;
    CollectionManager.loadStencils();
    this.reload();
}
__extend(BaseTemplatedWidget, CollectionPane);

CollectionPane.ICON_MAP = {
    "Evolus.Common": "layers",
    "Evolus.BasicWebElements": "language",
    "Evolus.Sketchy.GUI": "gesture",
    "extJSKitchenSink": "",
    "Evolus.iOS7": "phone",
    "Evolus.Windows7": "web"
};

// Function hide collection --
CollectionPane.prototype.setVisibleCollection = function (collection, value) { // function Hide collection
    CollectionManager.setCollectionVisible(collection, value);
    this.reload(collection.id);
};

CollectionPane.prototype.getTitle = function() {
	return "Shapes";
};

CollectionPane.prototype.getIconName = function() {
	return "layers";
};

CollectionPane.prototype.getCollectionIcon = function (collection) {
    return collection.icon || CollectionPane.ICON_MAP[collection.id] || "border_all";
};
CollectionPane.prototype.onSizeChanged = function () {
    if (!this.loaded) {
        setTimeout(this.reload.bind(this), 300);
    }
};
CollectionPane.prototype.reload = function (selectedCollectionId) {
    if (this.node().offsetWidth <= 0) return;
    Dom.empty(this.selectorPane);

    if (!selectedCollectionId) selectedCollectionId = CollectionManager.getLastUsedCollection();

    this.last = null;
    var lastNode = null;
    var collections = CollectionManager.shapeDefinition.collections;
    for (var i = 0; i < collections.length; i ++) {
        var collection = collections[i];
        if(collection.visible == true) {
            console.log("\"" + collection.id + "\": \"\",");
            var icon = this.getCollectionIcon(collection);
            var node = Dom.newDOMElement({
                _name: "vbox",
                "class": "Item",
                "tabindex": "0",
                _children: [
                    {
                        _name: "div",
                        "class": "ItemInner",
                        _children: [
                            {
                                _name: "span",
                                _text: collection.displayName
                            },
                            {
                                _name: "i",
                                _text: icon
                            }
                        ]
                    }
                ]
            });
            node._collection = collection;
            if (selectedCollectionId) {
                if (collection.id == selectedCollectionId) {
                    lastNode = node;
                }
            } else {
                if (!lastNode) {
                    lastNode = node;
                }
            }
            this.selectorPane.appendChild(node);
        }
    }

    var thiz = this;
    window.setTimeout(function () {
        for (var i = 0; i < thiz.selectorPane.childNodes.length; i ++) {
            var item = thiz.selectorPane.childNodes[i];
            var inner = item.firstChild.firstChild;

            var w = inner.clientWidth + 4 * Util.em();

            item.style.height = w + "px";
            item.firstChild.style.width = w + "px";
            item.firstChild.style.transform = "rotate(-90deg) translate(-" + w + "px, 0px)";
        }
        thiz.collectionScrollView.invalidate();
    }, 10);

    if (lastNode) {
        Dom.doOnAllChildren(this.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == lastNode);
        });

        this.last = lastNode._collection;
        this.openCollection(this.last);
    }

    this.loaded = true;
};
CollectionPane.prototype.filterCollections = function () {
    var filter = this.searchInput.value;
    var collectionNodes = Dom.getList(".//*[@class='Item']", this.selectorPane);
    var hasLast = false;
    var firstNode = null;
    for (var i in collectionNodes) {
        var collectionNode = collectionNodes[i];
        var collection = collectionNodes[i]._collection;
        collection._shapeCount = 0;
        collection._filteredShapes = [];
        for (var j in collection.shapeDefs) {
            var def = collection.shapeDefs[j];
            if (!def || def.system) continue;
            if (def.displayName.toLowerCase().indexOf(filter.toLowerCase()) == -1) continue;
            collection._shapeCount++;
            collection._filteredShapes.push(def);
        }
        if (collection._shapeCount <= 0) {
            collectionNode.setAttribute("_hidden", true);
            collectionNode.style.display = "none";
            collectionNode.style.visibility = "hidden";
        } else {
            if (!hasLast) hasLast = collection == this.last;
            if (!firstNode) firstNode = collectionNode;
            collectionNode.removeAttribute("_hidden");
            collectionNode.style.display = "";
            collectionNode.style.visibility = "visible";
        }
    }

    if (hasLast) {
        this.openCollection(this.last);
    } else if (firstNode != null){

        Dom.doOnAllChildren(this.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == firstNode);
        });
        this.openCollection(firstNode._collection);
    } else {
        Dom.empty(this.shapeList);
    }
};
CollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);
    this.collectionIcon.innerHTML = this.getCollectionIcon(collection);
    this.collectionTitle.innerHTML = Dom.htmlEncode(collection.displayName);
    this.collectionDescription.innerHTML = Dom.htmlEncode(collection.description);

    this.last = collection;
    var shapeDefs = typeof(collection._filteredShapes) == "undefined" ? collection.shapeDefs : collection._filteredShapes;
    for (var i = 0; i < shapeDefs.length; i ++) {
        var def = shapeDefs[i];
        if (def.system) continue;
        var icon = def.iconPath;
        if (!icon && def.shape) icon = def.shape.iconPath;

        var holder = {};

        var node = Dom.newDOMElement({
            _name: "li",
            "type": "ShapeDef",
            _children: [
                {
                    _name: "div",
                    "class": "Shape",
                    draggable: "true",
                    _children: [
                        {
                            _name: "div",
                            "class": "Icon",
                            _children: [
                                {
                                    _name: "img",
                                    _id: "iconImage"
                                }
                            ]
                        },
                        {
                            _name: "span",
                            _text: def.displayName
                        }
                    ]
                }
            ]
        }, null, holder);

        node._def = def;

        this.shapeList.appendChild(node);
        Util.setupImage(holder.iconImage, def.iconPath, "center-inside");
    }

    CollectionManager.setLastUsedCollection(collection);

    var thiz = this;
    window.setTimeout(function () {
        thiz.ensureSelectedCollectionVisible(collection);
    }, 10);
};

CollectionPane.prototype.ensureSelectedCollectionVisible = function (collection) {
    if (!collection) return;
    var position = 0;
    for (var i = 0; i < this.selectorPane.childNodes.length; i ++) {
        var item = this.selectorPane.childNodes[i];
        if (item._collection.id == collection.id) {
            break;
        } else {
            position += item.clientHeight;
        }
    }

    this.collectionScrollView.moveTo(position);
};

Object.defineProperty(CollectionPane.prototype, "foo", {
    set: function (value) {
        console.log("set foo to: " + value);
    }
});
