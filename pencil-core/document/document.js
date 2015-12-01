function PencilDocument() {
    this.properties = {};
    this.pages = [];
}
PencilDocument.prototype.toDom = function () {
    var dom = document.implementation.createDocument(PencilNamespaces.p, "Document", null);

    //properties
    var propertyContainerNode = dom.createElementNS(PencilNamespaces.p, "Properties");
    dom.documentElement.appendChild(propertyContainerNode);

    for (name in this.properties) {
        var propertyNode = dom.createElementNS(PencilNamespaces.p, "Property");
        propertyContainerNode.appendChild(propertyNode);

        propertyNode.setAttribute("name", name);
        propertyNode.appendChild(dom.createTextNode(this.properties[name].toString()));
    }

    //pages
    var pageContainerNode = dom.createElementNS(PencilNamespaces.p, "Pages");
    dom.documentElement.appendChild(pageContainerNode);

    for (i in this.pages) {
        pageContainerNode.appendChild(this.pages[i].toNode(dom));
    }

    return dom;
};

PencilDocument.prototype.addPage = function (page) {
    this.pages[this.pages.length] = page;
};
PencilDocument.prototype.getPageById = function (id) {
    for (var i in this.pages) {
        if (this.pages[i].properties.id == id) return this.pages[i];
    }

    return null;
};
PencilDocument.prototype.getPageByFid = function (fid) {
    for (var i in this.pages) {
        if (this.pages[i].properties.fid == fid) return this.pages[i];
    }

    return null;
};
PencilDocument.prototype.getFirstPageByName = function (name) {
    for (var i in this.pages) {
        if (this.pages[i].properties.name == name) return this.pages[i];
    }

    return null;
};


function Page(doc) {
    if (!doc) throw Util.getMessage("attempting.to.construct.a.page.outside.the.scope.of.a.valid.document");
    this.doc = doc;
    this.properties = {};
    this.contentNode = null;
    this.bg = {
        lastId: null,
        lastUpdateTimestamp: 0
    };
    this.rasterizeCache = null;
}
Page.prototype.validateLoadedData = function () {
    this.properties.dimBackground = (this.properties.dimBackground == "true");
};
Page.prototype.toNode = function (dom, noContent) {
    var pageNode = dom.createElementNS(PencilNamespaces.p, "Page");

    var propertyContainerNode = dom.createElementNS(PencilNamespaces.p, "Properties");
    pageNode.appendChild(propertyContainerNode);

    for (name in this.properties) {
        var propertyNode = dom.createElementNS(PencilNamespaces.p, "Property");
        propertyContainerNode.appendChild(propertyNode);
        propertyNode.setAttribute("name", name);
        var propValue = this.properties[name];
        if(propValue){
            propertyNode.appendChild(dom.createTextNode(propValue.toString()));
        } else if (name === "name") {
            propertyNode.appendChild(dom.createTextNode(Util.getMessage("untitled.page")));
        }
    }

    if (this.contentNode && !noContent) {
        var contentNode = dom.createElementNS(PencilNamespaces.p, "p:Content");
        for (var i = 0; i < this.contentNode.childNodes.length; i ++) {
            var node = this.contentNode.childNodes[i];
            contentNode.appendChild(dom.importNode(node, true));
        }

        pageNode.appendChild(contentNode);
    }

    return pageNode;
};
Page.prototype.equals = function (page) {
    if (page == null) return false;
    return page.constructor == Page && page.properties.id == this.properties.id;
};
Page.prototype.getBackgroundPage = function () {
    var bgPageId = this.properties.background;
    if (!bgPageId) return null;

    return this.doc.getPageById(bgPageId);
};

Page._validateBackgroundInternal = function (list, page) {
    var newList = [];
    for (var i in list) {
        var p = list[i];
        if (p.equals(page)) throw Util.getMessage("cyclic.ref.found.in.background.settings");
        newList.push(p);
    }
    var nextBg = page.getBackgroundPage();
    if (nextBg) {
        newList.push(page);
        Page._validateBackgroundInternal(newList, nextBg);
    }
};
Page.prototype.validateBackgroundSetting = function () {
    var page = this.getBackgroundPage();
    if (!page) return;

    Page._validateBackgroundInternal([this], page);
};
Page.prototype.canSetBackgroundTo = function (page) {
    try {
        Page._validateBackgroundInternal([this], page);
        return true;
    } catch (e) { return false; }
};

Page.prototype.isBackgroundValid = function () {
    var page = this.getBackgroundPage();
    if (!page) return (this.bgToken ? false : true);
    if (!page.isRasterizeDataCacheValid()) return false;
    if (!page.rasterizeDataCache || (page.rasterizeDataCache.token != this.bgToken)) return false;

    return true;
};

Page.prototype.ensureBackground = function (callback) { // callback: function() {} called when done
//    alert("ensureBackground() for " + this.properties.name);
    if (Config.get("object.snapping.background") == null) {
        Config.set("object.snapping.background", true);
    }

    this._view.canvas.snappingHelper.updateSnappingDataFromBackground(this.getBackgroundPage(), Config.get("object.snapping.background") == false);
    this._view.canvas.setDimBackground(this.properties.dimBackground);
    this.rasterizeDataCache = null;

    var page = this.getBackgroundPage();
    if (!page) {
        this.bgToken = null;
        this._view.canvas.setBackgroundImageData(null);

        if (callback) callback();
        return;
    }
    var thiz = this;
    //alert("ensureBackground(), use bit map of " + page.properties.name  + " as bg for " + this.properties.name);
    page.getRasterizeData(function (rasterizeData) {
        thiz.bgToken = rasterizeData.token;
        //alert([page.properties.name, rasterizeData.image.width, rasterizeData.image.height]);
        try {
            thiz._view.canvas.setBackgroundImageData(rasterizeData.image, thiz.properties.dimBackground);
        } catch (e) {
            Console.dumpError(e);
        }

        if (callback) callback();
    });
};
Page.prototype.getRasterizeData = function (callback) {
    if (this.isRasterizeDataCacheValid()) {
        callback(this.rasterizeDataCache);

        return;
    }
    var thiz = this;
    this.ensureBackground(function () {
        //alert("rasterizing page: " + thiz.properties.name);
        Pencil.rasterizer.rasterizePageToUrl(thiz, function (imageData) {
            thiz.rasterizeDataCache = {
                token: thiz._generateToken(),
                image: imageData
            };
            callback(thiz.rasterizeDataCache);
        });
    });
};
Page.prototype.isRasterizeDataCacheValid = function () {
    return this.rasterizeDataCache && this.isBackgroundValid();
};
Page.prototype._generateToken = function () {
    return this.properties.id + "@" + (new Date().getTime()) + "_" + Math.round(Math.random() * 1000);
};
Page.prototype.generateFriendlyId = function (usedFriendlyIds) {
    var baseName = this.properties.name.replace(/[^a-z0-9 ]+/gi, "").replace(/[ ]+/g, "_").toLowerCase();
    var name = baseName;
    var seed = 1;

    while (usedFriendlyIds.indexOf(name) >= 0) {
        name = baseName + "_" + (seed ++);
    }

    usedFriendlyIds.push(name);
    return name;
};




