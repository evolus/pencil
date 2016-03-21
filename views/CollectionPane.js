function CollectionPane() {
    BaseTemplatedWidget.call(this);
    var thiz = this;

    this.selectorPane.addEventListener("contextmenu",function(event) {
        var collection = Dom.findUpwardForData(event.target, "_collection");
        var menu = new CollectionMenu(collection, thiz);
        menu.showMenuAt(event.clientX, event.clientY);
    });

    this.selectorPane.addEventListener("click", function(event) {
        var item = Dom.findUpward(Dom.getTarget(event), function (n) {
            return n._collection;
        });

        if (!item) return;
        Dom.doOnAllChildren(thiz.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == item);
        });
        thiz.openCollection(item._collection);
    });

    this.shapeList.addEventListener("dragstart", function (event) {
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n._def;
        if (def.shape) {
            event.dataTransfer.setData("pencil/shortcut", def.id);
        } else {
            event.dataTransfer.setData("pencil/def", def.id);
        }
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
    });

    CollectionManager.loadStencils();
    this.reload();

    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";

    this.searchInput.addEventListener("keyup", function (event) {
        thiz.filterCollections();
    }, false);

    this.showHiddenCollections.addEventListener("click",function(event) {
        var hiddenCollectionDialog = new ShowHiddenCollectionDialog(thiz);
        hiddenCollectionDialog.open();
    });

    UICommandManager.register({
        key: "searchFocusCommand",
        shortcut: "Ctrl+F",
        run: function () {
            thiz.searchInput.focus();
            thiz.searchInput.select();
        }
    });

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
    CollectionManager.setCollectionVisible(collection,value);
    this.reload();
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
CollectionPane.prototype.reload = function () {
    Dom.empty(this.selectorPane);

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
            if (!lastNode) {
                lastNode = node;
            }
            this.selectorPane.appendChild(node);
        }

    }
    var thiz = this;
    window.setTimeout(function () {
        for (var i = 0; i < thiz.selectorPane.childNodes.length; i ++) {
            var item = thiz.selectorPane.childNodes[i];
            var inner = item.firstChild.firstChild;

            var w = inner.offsetWidth + 4 * Util.em();

            item.style.height = w + "px";
            item.firstChild.style.width = w + "px";
            item.firstChild.style.transform = "rotate(-90deg) translate(-" + w + "px, 0px)"
        }
    }, 100);

    if (lastNode) {
        Dom.doOnAllChildren(this.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == lastNode);
        });

        this.last = lastNode._collection;
        this.openCollection(this.last);
    }
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
            if (!def) continue;
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
        var icon = def.iconPath;
        if (!icon && def.shape) icon = def.shape.iconPath;

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
                                    src: def.iconPath
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
        });

        node._def = def;

        this.shapeList.appendChild(node);
    }
};

Object.defineProperty(CollectionPane.prototype, "foo", {
    set: function (value) {
        console.log("set foo to: " + value);
    }
});
