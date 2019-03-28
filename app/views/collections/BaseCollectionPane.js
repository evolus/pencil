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

    this.bind("click", function() {
        thiz.searchInput.value = "";
        thiz.searchInput.focus();
        thiz.filterCollections();
    }, this.clearTextButton);

    this.shapeListContainer.addEventListener("dragstart", function (event) {
        nsDragAndDrop.dragStart(event);
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n._def;
        thiz.addDefDataToDataTransfer(def, event);
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
        event.target.collection = def;
    });

    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";

    var searchShapesFunction = function () {
        this.searchTimeout = null;
        this.filterCollections();
    }.bind(this);

    this.bind("keyup", function (event) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(searchShapesFunction, 200);
    }, this.searchInput);

    var ensureVisibleShapeIconsFunction = function() {
        this.revealTimeout = null;
        this.ensureVisibleShapeIcons();
    }.bind(this);

    this.bind("scroll", function() {
        if (this.revealTimeout) {
            clearTimeout(this.revealTimeout);
        }
        this.revealTimeout = setTimeout(ensureVisibleShapeIconsFunction, 100);
    }, this.shapeListContainer);

    UICommandManager.register({
        key: "searchFocusCommand",
        shortcut: "Ctrl+F",
        run: function () {
            thiz.searchInput.focus();
            thiz.searchInput.select();
        }
    });

    UICommandManager.register({
        key: "reloadAllCollectionCommand",
        shortcut: "Shift+F5",
        run: function () {
            CollectionManager.loadStencils("notify");
        }
    });

    UICommandManager.register({
        key: "reloadDeveloperCollectionCommand",
        shortcut: "F5",
        run: function () {
            CollectionManager.reloadDeveloperStencil("notify");
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
    this.updateLayoutSize();
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
    this.settingButton.style.visibility = "inherit";

    for (var i = 0; i < collections.length; i ++) {
        var collection = collections[i];
        if(this.isShowCollection(collection)) {
            var icon = this.getCollectionIcon(collection);
            var typeClass = collection.developerStencil ? "TypeDeveloper" : (collection.userDefined ? "TypeUser" : "TypeSystem");
            var node = Dom.newDOMElement({
                _name: "vbox",
                "class": "Item" + (collection.previewURL ? " WithPreview" : "") + " " + typeClass,
                "tabindex": "0",
                title: collection.displayName,
                _children: [
                    {
                        _name: "div",
                        "class": "Preview",
                        _children: [
                            {
                                _name: "img",
                                src: collection.previewURL
                            }
                        ]
                    },
                    {
                        _name: "div",
                        "class": "ItemInner",
                        _children: [
                            {
                                _name: "i",
                                _text: icon
                            },
                            {
                                _name: "span",
                                _text: collection.displayName
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

            //item.style.height = w + "px";
            //item.firstChild.style.width = "5em";
            //item.firstChild.style.transform = "rotate(-90deg) translate(-" + w + "px, 0px)";
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
    this.clearTextButton.style.display = filter != null && filter.length > 0 ? "block" : "none"
    var collectionNodes = Dom.getList(".//*[@class='Item']", this.selectorPane);
    var hasLast = false;
    var firstNode = null;
    for (var i in collectionNodes) {
        var collectionNode = collectionNodes[i];
        var collection = collectionNodes[i]._collection;
        collection._shapeCount = 0;
        collection._filteredShapes = [];
        if (!filter) {
            delete collection._filteredShapes;
            collection._shapeCount = collection.shapeDefs.length;
        } else {
            for (var j in collection.shapeDefs) {
                var def = collection.shapeDefs[j];
                if (!def || def.system) continue;
                if (def.displayName.toLowerCase().indexOf(filter.toLowerCase()) == -1) continue;
                collection._shapeCount++;
                collection._filteredShapes.push(def);
            }
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
        Dom.empty(this.collectionLayoutContainer);
        this.settingButton.style.visibility = "hidden";
    }
};
BaseCollectionPane.prototype.ensureVisibleShapeIcons = function () {
    var pr = this.shapeListContainer.getBoundingClientRect();
    // console.log("PR:", pr);
    for (var i = 0; i < this.shapeList.childNodes.length; i ++) {
        var node = this.shapeList.childNodes[i];
        if (node._loaded) continue;
        var cr = node.getBoundingClientRect();
        // console.log(cr, pr);
        if ((pr.top - pr.height <= cr.top && cr.top <= (pr.top + pr.height * 2))
            || pr.top - pr.height <= (cr.top + cr.height) && (cr.top + cr.height) <= (pr.top + pr.height * 2)) {
                node._iconNode.src = node._iconNode.getAttribute("data-src");
                node._loaded = true;
            }
    }
};
BaseCollectionPane.prototype.updateLayoutSize = function () {
    if (!this.last || !this.last.customLayout) return;

    this.layoutOriginalSize = {
        width: this.collectionLayoutContainer.firstChild.firstChild.offsetWidth,
        height: this.collectionLayoutContainer.firstChild.firstChild.offsetHeight
    };

    var W = this.collectionLayoutContainer.offsetWidth;
    var r = W / this.layoutOriginalSize.width;
    var H = this.layoutOriginalSize.height * r;

    this.collectionLayoutContainer.style.height = H + "px";
    this.collectionLayoutContainer.firstChild.style.zoom = r;
};
BaseCollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);
    Dom.empty(this.collectionLayoutContainer);
    this.collectionIcon.innerHTML = this.getCollectionIcon(collection);
    this.collectionTitle.innerHTML = Dom.htmlEncode(collection.displayName);
    this.collectionDescription.innerHTML = Dom.htmlEncode(collection.description);
    this.collectionDescription.setAttribute("title", collection.description);
    this.settingButton.style.visibility =  (collection.propertyGroups && collection.propertyGroups.length > 0) ? "inherit" : "hidden";

    this.layoutOriginalSize = null;

    this.layoutItemMap = {};

    var thiz = this;

    var shapeDefs = typeof(collection._filteredShapes) == "undefined" ? collection.shapeDefs : collection._filteredShapes;
    if (collection.customLayout) {
        if (collection.customLayout.parentNode) collection.customLayout.parentNode.removeChild(collection.customLayout);
        this.collectionLayoutContainer.appendChild(collection.customLayout);

        var hasMatched = false;

        Dom.workOn(".//*[@sc-ref]", this.collectionLayoutContainer, function (n) {
            var scName = n.getAttribute("sc-ref");
            var sc = collection.getShortcutByDisplayName(collection.id + ":" + scName);
            n._def = sc;
            n.setAttribute("draggable", "true");
            n.setAttribute("title", scName);
            thiz.layoutItemMap[scName] = n;

            if (collection._filteredShapes) {
                var matched = collection._filteredShapes.indexOf(sc) >= 0;
                if (matched) hasMatched = true;
                n.setAttribute("matched", matched);
            } else {
                n.removeAttribute("matched");
            }
        });
        Dom.workOn(".//*[@ref]", this.collectionLayoutContainer, function (n) {
            var defId = n.getAttribute("ref");
            var def = CollectionManager.shapeDefinition.locateDefinition(defId);
            n._def = def;
            n.setAttribute("draggable", "true");
            n.setAttribute("title", def.displayName);
            thiz.layoutItemMap[defId] = n;
            if (collection._filteredShapes) {
                var matched = collection._filteredShapes.indexOf(def) >= 0;
                if (matched) hasMatched = true;
                n.setAttribute("matched", matched);
            } else {
                n.removeAttribute("matched");
            }
        });
        Dom.workOn(".//*[@pr-ref]", this.collectionLayoutContainer, function (n) {
            if (!collection.builtinPrivateCollection || !collection.builtinPrivateCollection.map) return;
            var defId = n.getAttribute("pr-ref");
            var def = collection.builtinPrivateCollection.map[defId];
            if (!def) return;
            n._def = def;
            n.setAttribute("draggable", "true");
            n.setAttribute("title", def.displayName);
        });

        this.collectionLayoutContainer.style.display = "block";
        // this.collectionLayoutContainer.style.overflow = "hidden";
        this.collectionLayoutContainer.style.visibility = "hidden";
        this.collectionLayoutContainer.style.height = "1px";

        if (!hasMatched && collection._filteredShapes) {
            this.collectionLayoutContainer.style.display = "none";
        } else {
            window.setTimeout(function () {
                thiz.updateLayoutSize();
                thiz.collectionLayoutContainer.style.visibility = "inherit";
            }, 10);
        }
    } else {
        this.collectionLayoutContainer.style.display = "none";
    }

    this.last = collection;
    for (var i = 0; i < shapeDefs.length; i ++) {
        var def = shapeDefs[i];
        if (def.system) continue;

        var itemId = (def instanceof ShapeDef) ? def.id : def.displayName;
        if (this.layoutItemMap[itemId]) continue;

        var icon = def.iconPath;
        if (!icon && def.shape) icon = def.shape.iconPath;

        if (collection.installDirPath && icon.indexOf("data:image") != 0) {
            icon = path.join(collection.installDirPath, icon);
        }

        icon = icon || def.iconData;

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
                                    //src: "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
                                    "data-src": icon
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
        node._iconNode = holder.iconImage;

        this.shapeList.appendChild(node);
        // Util.setupImage(holder.iconImage, def.iconPath || def.iconData, "center-inside");
    }

    this.setLastUsedCollection(collection);
    this.ensureVisibleShapeIcons();

    var thiz = this;
    window.setTimeout(function () {
        thiz.ensureSelectedCollectionVisible(collection);
    }, 10);
    window.setTimeout(function () {
        thiz.ensureVisibleShapeIcons();
    }, 200);

    this.updateLayoutSize();
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
BaseCollectionPane.prototype.reloadDeveloperCollections = function () {
    Dom.doOnAllChildren(this.selectorPane, function (n) {
        if (!n._collection || !n._collection.developerStencil) return;
        var reloadedCollection = CollectionManager.findCollection(n._collection.id);
        if (!reloadedCollection) n.style.display = "none";
        n._collection = reloadedCollection;
    }.bind(this));

    if (this.last && this.last.developerStencil) {
        var last = CollectionManager.findCollection(this.last.id);
        if (!last) {
            Dialog.error("Collection '" + this.last.displayName + "' has been removed.", null, "Close");
            CollectionManager.loadStencils();

            return;
        }
        this.last = last;
        this.openCollection(this.last);
    }
};
