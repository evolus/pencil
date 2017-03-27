function CollectionResourceBrowserDialog (collection, options) {
    Dialog.call(this);
    this.collection = collection;

    this.options = options || {};

    this.prefixes = this.options.prefixes || {"All": ""};
    this.type = this.options.type || CollectionResourceBrowserDialog.TYPE_BITMAP;
    this.returnType = this.options.returnType || CollectionResourceBrowserDialog.RETURN_IMAGEDATA;

    this.title = this.collection.displayName + " Resource Selection";
    this.subTitle = "Select resource provided by collection"

    this.prefixCombo.renderer = function (item) {
        return item.name;
    }

    this.prefixCombo.setItems(this.prefixes);

    this.searchTimeout = null;
    var thiz = this;
    this.bind("input", function () {
        if (this.searchTimeout) {
            window.clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = window.setTimeout(function () {
            thiz.search();
        }, 500);
    }, this.filterInput);

    this.bind("p:ItemSelected", this.search, this.prefixCombo);

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

    var optionCache = CollectionResourceBrowserDialog.optionCache[this.collection.id];
    if (optionCache) {
        this.filterInput.value = optionCache.keyword || "";
        for (var p of this.prefixes) {
            if (p.prefix == optionCache.prefix) {
                this.prefixCombo.selectItem(p);
                break;
            }
        }
    }
}
__extend(Dialog, CollectionResourceBrowserDialog);

CollectionResourceBrowserDialog.TYPE_SVG = "svg";
CollectionResourceBrowserDialog.TYPE_BITMAP = "bitmap";
CollectionResourceBrowserDialog.RETURN_IMAGEDATA = "ImageData";
CollectionResourceBrowserDialog.RETURN_CONTENT= "Content";
CollectionResourceBrowserDialog.RETURN_DOMCONTENT= "Document";

CollectionResourceBrowserDialog.optionCache = {};

CollectionResourceBrowserDialog.prototype.getDialogActions = function () {
    return [
            Dialog.ACTION_CANCEL,
            {
                type: "accept", title: "Select",
                run: function () {
                    if (this.callback) this.callback();
                    return true;
                }
            }
        ]
};

CollectionResourceBrowserDialog.prototype.onShown = function () {
    this.filterInput.focus();
    this.search();
};

CollectionResourceBrowserDialog.prototype.search = function () {
    var keyword = this.filterInput.value.trim();
    var items = [];
    var dirPath = this.collection.installDirPath;
    this.prefix = this.prefixCombo.getSelectedItem().prefix;

    CollectionResourceBrowserDialog.optionCache[this.collection.id] = {
        keyword: keyword,
        prefix: this.prefix
    };

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
            for (var item of matched) {
                //if (count ++ > 50) break;
                var view = Dom.newDOMElement({
                    _name: "div",
                    _uri: PencilNamespaces.html,
                    title: path.basename(item.name),
                    "class": "Item",
                    _children: [
                        //imageViewSpec
                    ]
                });
                view._data = item;
                this.resultContainer.appendChild(view);
            }

            this.ensureVisibleItemsContent();
        }.bind(this))
        .catch (function (err) {
            console.error(err);
        });
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
    object.parentNode._data.size = new Dimension(w, h);
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

CollectionResourceBrowserDialog.prototype.handleItemDblClick = function (e) {
    var data = Dom.findUpwardForData (e.target, "_data");
    if (!data) return;

    if (this.returnType == CollectionResourceBrowserDialog.RETURN_IMAGEDATA) {
        var id = Pencil.controller.collectionResourceAsRefSync(this.collection, data.relativePath);
        this.close(new ImageData(data.size.w, data.size.h, ImageData.idToRefString(id)))
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

CollectionResourceBrowserDialog.open = function (collection, options, callback) {
    new CollectionResourceBrowserDialog(collection, options).callback(callback).open();
};
