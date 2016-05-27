function BaseCollectionPane() {
    BaseTemplatedWidget.call(this);
    var thiz = this;

    this.bind("contextmenu", function (event) {
        var collectionNode = Dom.findUpwardForNodeWithData(event.target, "_collection");
        if (!collectionNode) return;

        collectionNode.focus();
        var collection = collectionNode._collection;
        this.handleCollectionContextMenu(collection, event);
    }, this.selectorPane);

    this.selectorPane.addEventListener("click", function(event) {
        var item = Dom.findUpward(Dom.getTarget(event), function (n) {
            return n._collection;
        });

        if (!item) return;
        Dom.doOnAllChildren(thiz.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == item);
        });
        thiz.openCollection(item._collection);
    }, false);

    this.shapeList.addEventListener("dragstart", function (event) {
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n._def;
        thiz.addDefDataToDataTransfer(def, event);
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
        event.target.collection = def;
    });

    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";

    this.searchInput.addEventListener("keyup", function (event) {
        thiz.filterCollections();
    }, false);

    UICommandManager.register({
        key: "searchFocusCommand",
        shortcut: "Ctrl+F",
        run: function () {
            thiz.searchInput.focus();
            thiz.searchInput.select();
        }
    });

    this.initialize();
    this.reload();
}
__extend(BaseTemplatedWidget, BaseCollectionPane);

BaseCollectionPane.ICON_MAP = {
    "Evolus.Common": "layers",
    "Evolus.BasicWebElements": "language",
    "Evolus.Sketchy.GUI": "gesture",
    "extJSKitchenSink": "",
    "Evolus.iOS7": "phone",
    "Evolus.Windows7": "web"
};

BaseCollectionPane.prototype.getTemplatePath = function () {
    return this.getTemplatePrefix() + "collections/BaseCollectionPane.xhtml";
};

BaseCollectionPane.prototype.getTitle = function() {
	return "Shapes";
};

BaseCollectionPane.prototype.getIconName = function() {
	return "layers";
};

BaseCollectionPane.prototype.getCollectionIcon = function (collection) {
    return collection.icon || BaseCollectionPane.ICON_MAP[collection.id] || "border_all";
};
BaseCollectionPane.prototype.onSizeChanged = function () {
    if (!this.loaded) {
        setTimeout(this.reload.bind(this), 300);
    }
};
BaseCollectionPane.prototype.reload = function (selectedCollectionId) {
    if (this.node().offsetWidth <= 0) return;
    Dom.empty(this.selectorPane);

    if (!selectedCollectionId) selectedCollectionId = this.getLastUsedCollection();

    this.last = null;
    var lastNode = null;
    var foundNode = null;
    var collections = this.getCollections();

    Dom.empty(this.shapeList);
    Dom.empty(this.collectionIcon);
    Dom.empty(this.collectionTitle);
    Dom.empty(this.collectionDescription);
    this.settingButton.style.visibility = "hidden";

    for (var i = 0; i < collections.length; i ++) {
        var collection = collections[i];
        if(this.isShowCollection(collection)) {
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
                    foundNode = node;
                }
            }
            if (!lastNode) {
                lastNode = node;
            }
            this.selectorPane.appendChild(node);
        }
    }

    if (foundNode) lastNode = foundNode;

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
BaseCollectionPane.prototype.filterCollections = function () {
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
        Dom.empty(this.collectionIcon);
        Dom.empty(this.collectionTitle);
        Dom.empty(this.collectionDescription);
        Dom.empty(this.shapeList);
        this.settingButton.style.visibility = "hidden";
    }
};
BaseCollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);
    this.collectionIcon.innerHTML = this.getCollectionIcon(collection);
    this.collectionTitle.innerHTML = Dom.htmlEncode(collection.displayName);
    this.collectionDescription.innerHTML = Dom.htmlEncode(collection.description);
    this.collectionDescription.setAttribute("title", collection.description);
    this.settingButton.style.visibility = "inherit";

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
            "title": def.displayName,
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
                                    _id: "iconImage",
                                    src: def.iconPath || def.iconData
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
        // Util.setupImage(holder.iconImage, def.iconPath || def.iconData, "center-inside");
    }

    this.setLastUsedCollection(collection);

    var thiz = this;
    window.setTimeout(function () {
        thiz.ensureSelectedCollectionVisible(collection);
    }, 10);
};

BaseCollectionPane.prototype.ensureSelectedCollectionVisible = function (collection) {
    if (!collection) return;
    var position = 0;
    var height = 0;
    for (var i = 0; i < this.selectorPane.childNodes.length; i ++) {
        var item = this.selectorPane.childNodes[i];
        if (item._collection.id == collection.id) {
            height = item.offsetHeight;
            break;
        } else {
            position += item.offsetHeight;
        }
    }
    this.collectionScrollView.ensuareVisible(position, position + height);
};
BaseCollectionPane.prototype.initialize = function () {
};
BaseCollectionPane.prototype.handleCollectionContextMenu = function (collection, event) {
};
BaseCollectionPane.prototype.addDefDataToDataTransfer = function (def, event) {
};
BaseCollectionPane.prototype.getCollections = function () {
    return [];
};
BaseCollectionPane.prototype.isShowCollection = function (collection) {
    return true;
};
BaseCollectionPane.prototype.getLastUsedCollection = function () {
    return null;
};
BaseCollectionPane.prototype.setLastUsedCollection = function (collection) {
};
