function CollectionResourceBrowserDialog (collection, options) {
    Dialog.call(this);
    this.collection = collection;

    this.options = options || {};

    this.prefixes = this.options.prefixes || [];
    this.type = this.options.type || CollectionResourceBrowserDialog.TYPE_BITMAP;
    this.returnType = this.options.returnType || CollectionResourceBrowserDialog.RETURN_IMAGEDATA;

    this.title = this.collection.displayName + " Resource Selection";
    this.subTitle = "Select resource provided by collection"

    this.prefixCombo.renderer = function (item) {
        return item.name;
    }

    this.prefixCombo.setItems(this.prefixes);

    this.collectionCombo.renderer = function (item) {
        return item.displayName;
    };
    var availableCollections = collection.RESOURCE_LIST ? [collection] : [];
    var selectedCollection = null;
    for (var c of CollectionManager.shapeDefinition.collections) {
        if (c.id == collection.id || !c.RESOURCE_LIST) continue;

        if (this.options.type) {
            var found = false;
            for (var resource of c.RESOURCE_LIST) {
                if (!resource.type || resource.type == this.options.type) {
                    found = true;
                    break;
                }
            }

            if (!found) continue;
        }

        availableCollections.push(c);
        if (CollectionResourceBrowserDialog.lastCollectionId == c.id) {
            selectedCollection = c;
        }
    }

    if (!selectedCollection) selectedCollection = availableCollections[0];

    this.collectionCombo.setItems(availableCollections);
    this.collectionCombo.selectItem(selectedCollection);

    this.searchTimeout = null;
    var thiz = this;
    this.bind("input", function () {
        if (this.searchTimeout) {
            window.clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        this.searchTimeout = window.setTimeout(function () {
            thiz.search();
        }, 500);
    }, this.filterInput);
    this.bind("keydown", this.handleFilterKeyDown, this.filterInput);


    this.bind("p:ItemSelected", this.search, this.prefixCombo);
    this.bind("p:ItemSelected", this.changeCollection, this.collectionCombo);

    var ensureVisibleItemsContentFunction = function() {
        this.revealTimeout = null;
        this.ensureVisibleItemsContent();
    }.bind(this);

    this.bind("scroll", function() {
        if (this.revealTimeout) {
            clearTimeout(this.revealTimeout);
        }
        this.revealTimeout = setTimeout(ensureVisibleItemsContentFunction, 100);
    }, this.resultContainer);

    this.bind("dblclick", this.handleItemDblClick, this.resultContainer);
    this.bind("keydown", this.handleListKeyDown, this.resultContainer);
    this.resultContainer.addEventListener("focus", this.handleListFocus.bind(this), true);

    this.invalidatePrefixList();

    this.filterInput.value = CollectionResourceBrowserDialog.lastKeyword || "";
    console.log(this.prefixCombo.items);
    for (var p of this.prefixCombo.items) {
        if (p.prefix == CollectionResourceBrowserDialog.lastPrefix) {
            this.prefixCombo.selectItem(p);
            break;
        }
    }
}
__extend(Dialog, CollectionResourceBrowserDialog);

CollectionResourceBrowserDialog.TYPE_SVG = "svg";
CollectionResourceBrowserDialog.TYPE_BITMAP = "bitmap";
CollectionResourceBrowserDialog.RETURN_IMAGEDATA = "ImageData";
CollectionResourceBrowserDialog.RETURN_IMAGEDATA_SVG_GROUP = "ImageDataSVGGroup";
CollectionResourceBrowserDialog.RETURN_CONTENT= "Content";
CollectionResourceBrowserDialog.RETURN_DOMCONTENT= "Document";

CollectionResourceBrowserDialog.optionCache = {};

CollectionResourceBrowserDialog.prototype.getDialogActions = function () {
    return [
            Dialog.ACTION_CANCEL,
            {
                type: "accept", title: "Select",
                run: function () {
                    if (this.selectedView) this.returnDataInSelectedView();
                    return false;
                }
            }
        ]
};

CollectionResourceBrowserDialog.prototype.onShown = function () {
    this.filterInput.focus();
    this.filterInput.select();
    this.search();
};
CollectionResourceBrowserDialog.prototype.invalidatePrefixList = function () {
    var collection = this.collectionCombo.getSelectedItem();
    var prefixes = [];
    if (collection.id == this.collection.id) {
        prefixes = this.prefixes || [];
    } else {
        for (var resource of collection.RESOURCE_LIST) {
            if (!resource.type || resource.type == this.options.type) {
                prefixes.push(resource);
            }
        }
    }

    this.prefixCombo.setItems(prefixes);
};
CollectionResourceBrowserDialog.prototype.changeCollection = function () {
    this.invalidatePrefixList();
    this.focusResult = true;
    this.search();
};
CollectionResourceBrowserDialog.prototype.search = function () {
    this.searchTimeout = null;
    var keyword = this.filterInput.value.trim();
    var items = [];
    var collection = this.collectionCombo.getSelectedItem();
    var dirPath = collection.installDirPath;
    this.prefix = this.prefixCombo.getSelectedItem().prefix;

    CollectionResourceBrowserDialog.lastCollectionId = collection.id;
    CollectionResourceBrowserDialog.lastKeyword = keyword;
    CollectionResourceBrowserDialog.lastPrefix = this.prefix;

    if (this.prefix) {
        var parts = this.prefix.trim().split("/");
        for (var p of parts) {
            dirPath = path.join(dirPath, p);
        }
    }

    this.getMatchingResources(dirPath, this.prefix || "", keyword)
        .then(function (matched) {
            Dom.empty(this.resultContainer);
            var count = 0;
            var previousview = null;
            for (var item of matched) {
                var view = Dom.newDOMElement({
                    _name: "div",
                    _uri: PencilNamespaces.html,
                    title: path.basename(item.name),
                    tabindex: "" + count,
                    "class": "Item",
                    _children: [
                        //imageViewSpec
                    ]
                });
                view._data = item;
                view._index = count;

                if (previousview) previousview._next = view;
                view._prev = previousview;
                previousview = view;

                this.resultContainer.appendChild(view);
                count ++;
            }

            if (this.focusResult) {
                if (this.resultContainer.firstChild && this.resultContainer.firstChild.focus) this.resultContainer.firstChild.focus();
                this.focusResult = false;
            }

            this.ensureVisibleItemsContent();
        }.bind(this))
        .catch (function (err) {
            console.error(err);
        });
};
CollectionResourceBrowserDialog.prototype.handleListFocus = function (e) {
    var view = Dom.findUpwardForNodeWithData(e.target, "_data");
    if (!view) return;
    this.selectedView = view;
};
CollectionResourceBrowserDialog.prototype.returnData = function (data) {
    var collection = this.collectionCombo.getSelectedItem();

    if (this.returnType == CollectionResourceBrowserDialog.RETURN_IMAGEDATA) {
        var id = Pencil.controller.collectionResourceAsRefSync(collection, data.relativePath);
        this.close(new ImageData(data.size.w, data.size.h, ImageData.idToRefString(id)));

    } else if (this.returnType == CollectionResourceBrowserDialog.RETURN_IMAGEDATA_SVG_GROUP) {
        var svg = Dom.parseFile(data.path);
        var g = svg.createElementNS(PencilNamespaces.svg, "g");
        while (svg.documentElement.firstChild) {
            var child = svg.documentElement.firstChild;
            svg.documentElement.removeChild(child);
            g.appendChild(child);
        }

        var xmlData = CollectionResourceBrowserDialog.SVG_IMAGE_DATA_PREFIX + Dom.serializeNode(g);
        this.close(new ImageData(data.size.w, data.size.h, xmlData));
    } else if (this.returnType == CollectionResourceBrowserDialog.RETURN_CONTENT) {
        this.close({
            size: data.size,
            content: new PlainText(fs.readFileSync(data.path))
        });
    } else if (this.returnType == CollectionResourceBrowserDialog.RETURN_DOMCONTENT) {
        this.close({
            size: data.size,
            document: Dom.parseFile(data.path)
        });
    }
};
CollectionResourceBrowserDialog.prototype.returnDataInSelectedView = function () {
    if (!this.selectedView || !this.selectedView._data) return;
    this.returnData(this.selectedView._data);
};
CollectionResourceBrowserDialog.prototype.handleFilterKeyDown = function (e) {
    if (e.keyCode == DOM_VK_ENTER || e.keyCode == DOM_VK_RETURN) {
        if (this.searchTimeout) {
            this.focusResult = true;
        } else {
            if (this.resultContainer.firstChild && this.resultContainer.firstChild.focus) this.resultContainer.firstChild.focus();
        }

        e.stopPropagation();
        e.preventDefault();
    }
};
CollectionResourceBrowserDialog.prototype.handleListKeyDown = function (e) {
    var view = Dom.findUpwardForNodeWithData(e.target, "_data");
    if (!view) return;

    if (e.keyCode == DOM_VK_UP) {
        for (var i = view._index - 1; i >= 0; i --) {
            var other = view.parentNode.childNodes[i];
            if (other && other.offsetLeft == view.offsetLeft) {
                other.focus();
                return;
            }
        }
    } else if (e.keyCode == DOM_VK_DOWN) {
        for (var i = view._index + 1; i < view.parentNode.childNodes.length; i ++) {
            var other = view.parentNode.childNodes[i];
            if (other && other.offsetLeft == view.offsetLeft) {
                other.focus();
                return;
            }
        }
    } else if (e.keyCode == DOM_VK_LEFT) {
        if (view._prev) {
            view._prev.focus();
            return;
        }
    } else if (e.keyCode == DOM_VK_RIGHT) {
        if (view._next) {
            view._next.focus();
            return;
        }
    } else if (e.keyCode == DOM_VK_TAB) {
        this.filterInput.focus();
        this.filterInput.select();
        e.preventDefault();
    } else if (e.keyCode == DOM_VK_ENTER || e.keyCode == DOM_VK_RETURN) {
        this.returnData(view._data);
    }
};
CollectionResourceBrowserDialog.prototype.getMatchingResources = function (dirPath, relativePath, keyword) {
    return new Promise(function (resolve, reject) {
        var items = [];
        var pending = [{
            abs: dirPath,
            rel: relativePath
        }];
        var next = function() {
            if (pending.length == 0) {
                resolve(items);
                return;
            }
            var current = pending.shift();
            fs.readdir(current.abs, "utf8", function (err, files) {
                if (err) {
                    reject(err);
                    return;
                }

                for (var name of files) {
                    var p = path.join(current.abs, name);
                    var stat = fs.statSync(p);
                    if (stat.isDirectory()) {
                        pending.push({
                            abs: p,
                            rel: (current.rel ? (current.rel + "/") : "") + name
                        });
                    } else {
                        if (!this.type || name.endsWith(this.type)) {
                            if (name.toLowerCase().indexOf(keyword) >= 0) {
                                items.push({
                                    path: p,
                                    container: current.rel,
                                    relativePath: (current.rel ? (current.rel + "/") : "") + name,
                                    name: name
                                });
                            }
                        }
                    }
                }

                next();

            });
        };

        next();
    });
};

CollectionResourceBrowserDialog.handleSVGObjectLoaded = function (e) {
    var object = event.target;
    if (!object.parentNode || !object.parentNode.showing) return;

    var svg = object.contentDocument.documentElement;
    var w = svg.getAttribute("width");
    var h = svg.getAttribute("height");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    object.parentNode._data.size = new Dimension(Math.round(parseFloat(w)), Math.round(parseFloat(h)));
};
CollectionResourceBrowserDialog.handleImageLoaded = function (e) {
    var image = event.target;
    if (!image.parentNode || !image.parentNode.showing) return;

    image.parentNode._data.size = new Dimension(image.naturalWidth, image.naturalHeight);
};
CollectionResourceBrowserDialog.prototype.showItem = function (item, shouldShow) {
    if (item.showing == shouldShow) return;

    item.innerHTML = "";
    if (shouldShow) {
        var spec = null;
        if (this.type == CollectionResourceBrowserDialog.TYPE_SVG) {
            spec = [{
                _name: "object",
                _uri: PencilNamespaces.html,
                type: "text/xml+svg",
                data: ImageData.filePathToURL(item._data.path)
            },{
                _name: "div",
                _uri: PencilNamespaces.html,
                "class": "Overlay"
            }]
        } else {
            spec = [{
                _name: "img",
                _uri: PencilNamespaces.html,
                src: ImageData.filePathToURL(item._data.path)
            }];
        }

        var fragment = Dom.newDOMFragment(spec);
        item.appendChild(fragment);

        if (this.type == CollectionResourceBrowserDialog.TYPE_SVG) {
            item.firstChild.addEventListener("load", CollectionResourceBrowserDialog.handleSVGObjectLoaded, false)
        } else if (this.type == CollectionResourceBrowserDialog.TYPE_BITMAP) {
            if (!item._data.size) {
                item.firstChild.addEventListener("load", CollectionResourceBrowserDialog.handleImageLoaded, false)
            }
        }
    }

    item.showing = shouldShow;
};
CollectionResourceBrowserDialog.prototype.ensureVisibleItemsContent = function () {
    var pr = this.resultContainerWrapper.getBoundingClientRect();
    for (var i = 0; i < this.resultContainer.childNodes.length; i ++) {
        var node = this.resultContainer.childNodes[i];
        var cr = node.getBoundingClientRect();
        var shouldShow = (pr.top - pr.height <= cr.top && cr.top <= (pr.top + pr.height * 2))
            || pr.top - pr.height <= (cr.top + cr.height) && (cr.top + cr.height) <= (pr.top + pr.height * 2);

        this.showItem(node, shouldShow);
    }
};
CollectionResourceBrowserDialog.SVG_IMAGE_DATA_PREFIX = "data:image/svg+xml;utf8,";
CollectionResourceBrowserDialog.prototype.handleItemDblClick = function (e) {
    var data = Dom.findUpwardForData (e.target, "_data");
    if (!data) return;

    this.returnData(data);
};

CollectionResourceBrowserDialog.open = function (collection, options, callback) {
    new CollectionResourceBrowserDialog(collection, options).callback(callback).open();
};
