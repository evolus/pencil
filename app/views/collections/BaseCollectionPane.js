function BaseCollectionPane() {
    BaseTemplatedWidget.call(this);
    var thiz = this;

    this.collections = [];
    this.pickerRows = [];
    this.pickerHighlightIndex = 0;
    this.appliedShapeFilter = "";

    this.bind("click", function () {
        if (this.picker.isVisible()) {
            this.picker.hide();
        } else {
            this.openPicker();
        }
    }, this.selectorButton);

    this.picker.setPopupClass("CollectionPickerPopup");
    /* Without this the mousedown on the selector button closes the popup, and the
       click that follows on the same button opens it again. */
    this.picker.shouldCloseOnBlur = function (event) {
        return !Dom.isChildOf(thiz.selectorButton, Dom.getTarget(event));
    };
    this.bind("p:PopupShown", function () {
        this.pickerFilterInput.focus();
        this.updatePickerHighlight();
    }, this.picker);
    this.bind("p:PopupHidden", function () {
        this.selectorButton.removeAttribute("expanded");
    }, this.picker);

    this.bind("contextmenu", function (event) {
        if (!this.last) return;
        this.handleCollectionContextMenu(this.last, event);
    }, this.selectorButton);

    this.bind("click", function (event) {
        var row = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_collection");
        if (!row) return;
        this.pickCollection(row._collection);
    }, this.pickerList);

    this.bind("contextmenu", function (event) {
        var row = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_collection");
        if (!row) return;
        this.handleCollectionContextMenu(row._collection, event);
    }, this.pickerList);

    this.bind("input", function () {
        this.pickerHighlightIndex = 0;
        this.renderPickerList();
    }, this.pickerFilterInput);

    this.bind("keydown", this.handlePickerKeyDown, this.pickerFilterInput);

    this.bind("click", function() {
        thiz.searchInput.value = "";
        thiz.searchInput.focus();
        thiz.filterCollections();
    }, this.clearTextButton);

    this.shapeListContainer.addEventListener("dragstart", function (event) {
        /* Images are natively draggable, so without this the custom layout's background
           image and unbound hotspots start a drag that drops nothing. */
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        if (!n) {
            event.preventDefault();
            return;
        }
        nsDragAndDrop.dragStart(event);
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

BaseCollectionPane.RECENT_COLLECTION_MAX = 5;

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
BaseCollectionPane.prototype.createCollectionThumbContent = function (collection) {
    if (collection.previewURL) {
        return Dom.newDOMElement({ _name: "img", src: collection.previewURL });
    }
    return Dom.newDOMElement({ _name: "i", _text: this.getCollectionIcon(collection) });
};
BaseCollectionPane.prototype.getCollectionTooltip = function (collection) {
    return collection.description ? collection.displayName + "\n" + collection.description : collection.displayName;
};
BaseCollectionPane.prototype.onSizeChanged = function () {
    if (!this.loaded) {
        setTimeout(this.reload.bind(this), 300);
    }
    this.updateLayoutSize();
    if (this.picker.isVisible()) {
        this.layoutPicker();
        this.picker.invalidatePosition();
    }
};
BaseCollectionPane.prototype.reload = function (selectedCollectionId) {
    if (this.node().offsetWidth <= 0) return;
    this.closePicker();

    if (!selectedCollectionId) selectedCollectionId = this.getLastUsedCollection();

    this.last = null;
    this.collections = this.getCollections().filter(this.isShowCollection, this);

    var selected = this.collections.find(function (collection) {
        return collection.id == selectedCollectionId;
    }) || this.collections[0];

    if (selected) {
        this.openCollection(selected);
    } else {
        this.showNoCollection();
    }

    this.loaded = true;
};
BaseCollectionPane.prototype.showNoCollection = function () {
    Dom.empty(this.selectorThumb);
    Dom.empty(this.collectionTitle);
    Dom.empty(this.collectionDescription);
    Dom.empty(this.shapeList);
    Dom.empty(this.collectionLayoutContainer);
    this.selectorButton.removeAttribute("title");
    this.settingButton.style.visibility = "hidden";
};
BaseCollectionPane.prototype.isCollectionOffered = function (collection) {
    return !collection._filteredShapes || collection._filteredShapes.length > 0;
};
BaseCollectionPane.prototype.filterCollections = function () {
    var filter = this.searchInput.value;
    this.clearTextButton.style.display = filter != null && filter.length > 0 ? "block" : "none";
    this.appliedShapeFilter = filter || "";

    var query = this.appliedShapeFilter.toLowerCase();
    var hasLast = false;
    var firstMatch = null;

    for (var collection of this.collections) {
        if (!query) {
            delete collection._filteredShapes;
        } else {
            collection._filteredShapes = collection.shapeDefs.filter(function (def) {
                return def && !def.system && def.displayName.toLowerCase().indexOf(query) >= 0;
            });
        }

        if (!this.isCollectionOffered(collection)) continue;
        if (!firstMatch) firstMatch = collection;
        if (collection == this.last) hasLast = true;
    }

    if (hasLast) {
        this.openCollection(this.last);
    } else if (firstMatch) {
        this.openCollection(firstMatch);
    } else {
        this.showNoCollection();
    }

    if (this.picker.isVisible()) this.renderPickerList();
};
BaseCollectionPane.prototype.ensureVisibleShapeIcons = function () {
    var pr = this.shapeListContainer.getBoundingClientRect();
    for (var i = 0; i < this.shapeList.childNodes.length; i ++) {
        var node = this.shapeList.childNodes[i];
        if (node._loaded) continue;
        var cr = node.getBoundingClientRect();
        if ((pr.top - pr.height <= cr.top && cr.top <= (pr.top + pr.height * 2))
            || pr.top - pr.height <= (cr.top + cr.height) && (cr.top + cr.height) <= (pr.top + pr.height * 2)) {
                node._iconNode.src = node._iconNode.getAttribute("data-src");
                node._loaded = true;
            }
    }
};
BaseCollectionPane.prototype.updateLayoutSize = function () {
    if (!this.last || !this.last.customLayout) return;

    var W = this.collectionLayoutContainer.offsetWidth;
    var r = W / this.layoutOriginalSize.width;
    var H = this.layoutOriginalSize.height * r;

    this.collectionLayoutContainer.style.height = H + "px";
    /* transform instead of zoom: a zoom change relayouts and restyles the whole
       layout subtree on every splitter mousemove, a transform change only repaints. */
    this.collectionLayoutContainer.firstChild.style.transform = "scale(" + r + ")";
};
BaseCollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);
    Dom.empty(this.collectionLayoutContainer);
    Dom.empty(this.selectorThumb);
    this.selectorThumb.appendChild(this.createCollectionThumbContent(collection));
    this.collectionTitle.innerHTML = Dom.htmlEncode(collection.displayName);
    this.collectionDescription.innerHTML = Dom.htmlEncode(collection.description);
    this.selectorButton.setAttribute("title", this.getCollectionTooltip(collection));
    this.settingButton.style.visibility =  "inherit";

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
        this.collectionLayoutContainer.style.visibility = "hidden";
        this.collectionLayoutContainer.style.height = "1px";

        this.layoutOriginalSize = {
            width: collection.customLayout.firstChild.offsetWidth,
            height: collection.customLayout.firstChild.offsetHeight
        };

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
    }

    this.setLastUsedCollection(collection);
    this.ensureVisibleShapeIcons();

    window.setTimeout(function () {
        thiz.ensureVisibleShapeIcons();
    }, 200);

    this.updateLayoutSize();
};

/* The popup lives under document.body, so its width and height are taken from
   the selector button and the pane each time it opens or the pane resizes. */
BaseCollectionPane.prototype.layoutPicker = function () {
    var buttonRect = this.selectorButton.getBoundingClientRect();
    var paneRect = this.shapePane.getBoundingClientRect();
    this.picker.popupContainer.style.width = buttonRect.width + "px";
    this.pickerContent.style.maxHeight = (paneRect.bottom - buttonRect.bottom - Util.em()) + "px";
};
BaseCollectionPane.prototype.openPicker = function () {
    this.selectorButton.setAttribute("expanded", "true");
    this.pickerFilterInput.value = "";
    this.pickerHighlightIndex = 0;
    this.renderPickerList();
    this.layoutPicker();
    this.picker.show(this.selectorButton, "left-inside", "bottom", 0, 2);
};
BaseCollectionPane.prototype.closePicker = function () {
    if (this.picker.isVisible()) this.picker.hide();
};
BaseCollectionPane.prototype.pickCollection = function (collection) {
    this.addRecentCollection(collection);
    this.picker.hide();
    this.openCollection(collection);
};
BaseCollectionPane.prototype.handlePickerKeyDown = function (event) {
    var count = this.pickerRows.length;
    if (event.key == "ArrowDown" || event.key == "ArrowUp") {
        event.preventDefault();
        if (!count) return;
        var step = event.key == "ArrowDown" ? 1 : -1;
        this.pickerHighlightIndex = (this.pickerHighlightIndex + step + count) % count;
        this.updatePickerHighlight();
    } else if (event.key == "Enter") {
        event.preventDefault();
        if (!count) return;
        this.pickCollection(this.pickerRows[this.pickerHighlightIndex]._collection);
    }
};
BaseCollectionPane.prototype.getRecentCollections = function () {
    var collections = this.collections;
    return Config.get(this.getRecentCollectionConfigName(), []).map(function (id) {
        return collections.find(function (collection) { return collection.id == id; });
    }).filter(Boolean);
};
BaseCollectionPane.prototype.addRecentCollection = function (collection) {
    var name = this.getRecentCollectionConfigName();
    var ids = Config.get(name, []).filter(function (id) { return id != collection.id; });
    ids.unshift(collection.id);
    Config.set(name, ids.slice(0, BaseCollectionPane.RECENT_COLLECTION_MAX));
};
BaseCollectionPane.prototype.renderPickerList = function () {
    var query = this.pickerFilterInput.value.trim().toLowerCase();
    var thiz = this;
    var candidates = this.collections.filter(function (collection) {
        if (!thiz.isCollectionOffered(collection)) return false;
        return !query || collection.displayName.toLowerCase().indexOf(query) >= 0;
    });

    Dom.empty(this.pickerList);
    this.pickerRows = [];

    if (!query && !this.appliedShapeFilter) {
        this.appendPickerGroup("Recent", this.getRecentCollections(), query);
    }
    var groups = this.getCollectionGroups();
    groups.forEach(function (label, index) {
        thiz.appendPickerGroup(label, candidates.filter(function (collection) {
            return thiz.getCollectionGroupIndex(collection) == index;
        }), query);
    });

    if (!this.pickerRows.length) {
        this.pickerList.appendChild(Dom.newDOMElement({
            _name: "div",
            "class": "CollectionPickerEmpty",
            _text: "No collection matches."
        }));
    }

    this.pickerHighlightIndex = Math.min(this.pickerHighlightIndex, Math.max(this.pickerRows.length - 1, 0));
    this.updatePickerHighlight();

    this.pickerHint.textContent = this.appliedShapeFilter ? "Showing collections with shapes matching \"" + this.appliedShapeFilter + "\"" : "";
    this.pickerHint.style.display = this.appliedShapeFilter ? "" : "none";
};
BaseCollectionPane.prototype.appendPickerGroup = function (label, collections, query) {
    if (!collections.length) return;
    this.pickerList.appendChild(Dom.newDOMElement({
        _name: "div",
        "class": "CollectionPickerGroup",
        _text: label
    }));
    for (var collection of collections) {
        var row = this.createPickerRow(collection, query);
        this.pickerList.appendChild(row);
        this.pickerRows.push(row);
    }
};
BaseCollectionPane.prototype.createPickerRow = function (collection, query) {
    var name = collection.displayName;
    var at = query ? name.toLowerCase().indexOf(query) : -1;
    var nameParts = at < 0 ? [{ _name: "span", _text: name }] : [
        { _name: "span", _text: name.substring(0, at) },
        { _name: "mark", _text: name.substring(at, at + query.length) },
        { _name: "span", _text: name.substring(at + query.length) }
    ];

    var row = Dom.newDOMElement({
        _name: "div",
        "class": "CollectionPickerRow",
        title: this.getCollectionTooltip(collection),
        current: collection == this.last,
        _children: [
            { _name: "div", "class": "CollectionThumb" },
            {
                _name: "div",
                "class": "Text",
                _children: [
                    { _name: "div", "class": "Name", _children: nameParts },
                    { _name: "div", "class": "Description", _text: collection.description || "" }
                ]
            }
        ]
    });
    row.firstChild.appendChild(this.createCollectionThumbContent(collection));
    row._collection = collection;
    return row;
};
BaseCollectionPane.prototype.updatePickerHighlight = function () {
    for (var i = 0; i < this.pickerRows.length; i ++) {
        var highlighted = i == this.pickerHighlightIndex;
        this.pickerRows[i].setAttribute("highlighted", highlighted);
        if (highlighted) this.pickerRows[i].scrollIntoView({ block: "nearest" });
    }
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
BaseCollectionPane.prototype.getCollectionGroups = function () {
    return ["Collections"];
};
BaseCollectionPane.prototype.getCollectionGroupIndex = function (collection) {
    return 0;
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
    this.collections = this.collections.map(function (collection) {
        return collection.developerStencil ? CollectionManager.findCollection(collection.id) : collection;
    }).filter(Boolean);
    if (this.picker.isVisible()) this.renderPickerList();

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
