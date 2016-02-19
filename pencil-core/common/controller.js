function Controller(canvasPool, applicationPane) {
    this.canvasPool = canvasPool;
    this.applicationPane = applicationPane;

    var thiz = this;
    this.canvasPool.canvasContentModifiedListener = function (canvas) {
        thiz.handleCanvasModified(canvas);
    };
}

Controller.parser = new DOMParser();
Controller.serializer = new XMLSerializer();

Controller.SUB_THUMBNAILS = "thumbnails";
Controller.SUB_REFERENCE = "refs";
Controller.THUMBNAIL_SIZE = 256;

Controller.prototype.makeSubDir = function (sub) {
    const fs = require("fs");
    var fullPath = path.join(this.tempDir.name, sub);
    try {
        fs.mkdirSync(fullPath);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }

    return fullPath;
};
Controller.prototype.getDocumentName = function () {
    return "Untitled.epz";
};
Controller.prototype.newDocument = function () {
    if (this.tempDir) this.tempDir.removeCallback();
    this.tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });

    this.pages = [];

    var size = this.applicationPane.getPreferredCanvasSize();

    var page = this.newPage("Untitled Page", size.w, size.h, null, null, "");
    this.activatePage(page);
};
Controller.prototype.findPageById = function (id) {
    for (var i in this.pages) {
        if (this.pages[i].id == id) return this.pages[i];
    }

    return null;
};
Controller.prototype.newPage = function (name, width, height, backgroundPageId, backgroundColor, note, parentPageId) {
    var id = Util.newUUID();
    var page = {
        name: name,
        width: width,
        height: height,
        backgroundPage: this.findPageById(backgroundPageId),
        backgroundColor: backgroundColor,
        note: note,

        id: id,
        canvas: null,
        tempFilePath: path.join(this.tempDir.name, "page_" + id + ".xml")
    }
    console.log("background page: " + page.backgroundPage);

    this.serializePage(page, page.tempFilePath);
    this.pages.push(page);

    page.parentPage = null;
    if (parentPageId) {
        var parentPage = this.findPageById(parentPageId);
        if (parentPage) {
            if (!parentPage.children) parentPage.children = [];
            parentPage.children.push(page);
            page.parentPage = parentPage;
        }
    }


    this.sayDocumentChanged();

    return page;
};

Controller.prototype.serializePage = function (page, outputPath) {
    var dom = Controller.parser.parseFromString("<p:Page xmlns:p=\"" + PencilNamespaces.p + "\"></p:Page>", "text/xml");
    var props = dom.createElementNS(PencilNamespaces.p, "p:Properties");
    dom.documentElement.appendChild(props);

    var content = dom.createElementNS(PencilNamespaces.p, "p:Content");
    dom.documentElement.appendChild(content);

    if (page.canvas) {
        var node = dom.importNode(page.canvas.drawingLayer, true);
        while (node.hasChildNodes()) {
            var c = node.firstChild;
            node.removeChild(c);
            content.appendChild(c);
        }
    }

    var xml = Controller.serializer.serializeToString(dom);
    fs.writeFileSync(outputPath, xml, "utf8");

    console.log("write to: " + outputPath);
};

Controller.prototype.getPageSVG = function (page) {
    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + page.width  + "px");
    svg.setAttribute("height", "" + page.height  + "px");

    if (page.canvas) {
        var node = page.canvas.drawingLayer.cloneNode(true);
        while (node.hasChildNodes()) {
            var c = node.firstChild;
            node.removeChild(c);
            svg.appendChild(c);
        }
    } else {
        var dom = Controller.parser.parseFromString(fs.readFileSync(page.tempFilePath, "utf8"), "text/xml");
        var content = Dom.getSingle("/p:Page/p:Content", dom);
        while (content.hasChildNodes()) {
            var c = content.firstChild;
            content.removeChild(c);
            svg.appendChild(c);
        }
    }

    return svg;
};


Controller.prototype.swapOut = function (page) {
    if (!page.canvas) throw "Invalid page state. Unable to swap out un-attached page";
    console.log("Swapping out page: " + page.name + " -> " + page.tempFilePath);
    this.serializePage(page, page.tempFilePath);
    this.canvasPool.return(page.canvas);
    page.canvas = null;
    page.lastUsed = null;
};
Controller.prototype.swapIn = function (page, canvas) {
    if (page.canvas) throw "Invalid page state. Unable to swap in attached page.";

    var dom = Controller.parser.parseFromString(fs.readFileSync(page.tempFilePath, "utf8"), "text/xml");
    var content = Dom.getSingle("/p:Page/p:Content", dom);

    Dom.empty(canvas.drawingLayer);
    if (content) {
        while (content.hasChildNodes()) {
            var c = content.firstChild;
            content.removeChild(c);
            canvas.drawingLayer.appendChild(c);
        }
    }
    page.canvas = canvas;
    canvas.page = page;
    canvas.setSize(page.width, page.height);
};
Controller.prototype.activatePage = function (page) {
    if (!page.canvas) {
        console.log("Page is not in memory, swapping in now");
        if (!this.canvasPool.available()) {
            console.log("No available canvas for swapping in, swapping a LRU page now.");
            var lruPage = null;
            var lru = new Date().getTime();
            for (var i = 0; i < this.pages.length; i ++) {
                var p = this.pages[i];
                if (!p.canvas) continue;
                if (p.lastUsed.getTime() < lru) {
                    lruPage = p;
                    lru = p.lastUsed.getTime();
                }
            }

            if (!lruPage) throw "Invalid state. Unable to find LRU page to swap out";
            console.log("Found LRU page: " + lruPage.name);
            this.swapOut(lruPage);
        }

        var canvas = this.canvasPool.obtain();
        this.swapIn(page, canvas);
    }

    this.canvasPool.show(page.canvas);
    page.lastUsed = new Date();

    this.activePage = page;
    // this.sayDocumentChanged();
};
Controller.prototype.deletePage = function (page) {
    fs.unlinkSync(page.tempFilePath);
    if (page.canvas) this.canvasPool.return(page.canvas);

    var i = this.pages.indexOf(page);
    this.pages.splice(i, 1);
    this.sayDocumentChanged();
};
Controller.prototype.sayDocumentChanged = function () {
    Dom.emitEvent("p:DocumentChanged", this.applicationPane.node(), {
        controller : this
    });
};

Controller.prototype.sizeToContent = function (passedPage, askForPadding) {
    var page = passedPage ? passedPage : this.activePage;
    var canvas = page.canvas;
    if (!canvas) return;
    var padding  = 0;

    var handler = function () {
        var canvas = page.canvas;
        if (!canvas) return;
        var newSize = canvas.sizeToContent(padding, padding);
        console.log("page: ", page);
        if (newSize) {
            page.width = newSize.width;
            page.height = newSize.height;
        }
    };

    if (askForPadding) {
        var paddingDialog = new PromptDialog();
        paddingDialog.open({
            title: "Fit content with padding",
            message: "Please enter the padding",
            defaultValue: "0",
            callback: function (paddingString) {
                if (!paddingString) return;
                padding = parseInt(paddingString, 10);
                if (!padding) padding = 0;
                handler();
            }
        });
        return;
    }

    handler();
};
Controller.prototype.sizeToBestFit = function (passedPage) {
    var page = passedPage ? passedPage : this.activePage;
    var canvas = page.canvas;
    if (!canvas) return;

    var newSize = this.applicationPane.getBestFitSizeObject();
    if (newSize) {
        canvas.setSize(newSize.width, newSize.height);
        page.width = newSize.width;
        page.height = newSize.height;
        Config.set("lastSize", [newSize.width, newSize.height].join("x"));
    }
};
Controller.prototype.getBestFitSize = function () {
    return this.applicationPane.getBestFitSize();
};

Controller.prototype.handleCanvasModified = function (canvas) {
    if (!canvas || !canvas.page) return;
    canvas.page.lastModified = new Date();
    if (!this.pendingThumbnailerMap) this.pendingThumbnailerMap = {};
    var pending = this.pendingThumbnailerMap[canvas.page.id];
    if (pending) {
        window.clearTimeout(pending);
    }

    var thiz = this;
    this.pendingThumbnailerMap[canvas.page.id] = window.setTimeout(function () {
        thiz.pendingThumbnailerMap[canvas.page.id] = null;
        thiz.updatePageThumbnail(canvas.page);
    }, 3000);
};
Controller.prototype.updatePageThumbnail = function (page) {
    var thumbPath = path.join(this.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
    var scale = Controller.THUMBNAIL_SIZE / page.width;
    if (page.height > page.width) scale = Controller.THUMBNAIL_SIZE / page.height;

    var thiz = this;
    this.applicationPane.rasterizer.rasterizePageToFile(page, thumbPath, function (p, error) {
        page.thumbPath = p;
        page.thumbCreated = new Date();
        Dom.emitEvent("p:PageInfoChanged", thiz.applicationPane, {page: page});
    }, scale);
};
