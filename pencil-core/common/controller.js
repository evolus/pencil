var tmp = require("tmp");
var path = require("path");
var fs = require("fs");

function Controller(canvasPool, applicationPane) {
    this.canvasPool = canvasPool;
    this.applicationPane = applicationPane;
}

Controller.prototype.newDocument = function () {
    if (this.tempDir) this.tempDir.removeCallback();
    this.tempDir = tmp.dirSync();
    this.pages = [];

    var size = this.applicationPane.getPreferredCanvasSize();

    var page = this.newPage("Untitled Page", size.w, size.h, null, null, "");
    this.activatePage(page);
};
Controller.prototype.newPage = function (name, width, height, backgroundPageId, backgroundColor, note) {
    var id = Util.newUUID();
    var page = {
        name: name,
        width: width,
        height: height,
        backgroundPageId: backgroundPageId,
        backgroundColor: backgroundColor,
        note: note,

        id: id,
        canvas: null,
        tempFilePath: path.join(this.tempDir.name, "page_" + id + ".xml")
    }

    this.serializePage(page, page.tempFilePath);
    this.pages.push(page);

    this.sayDocumentChanged();

    return page;
};

Controller.prototype.serializePage = function (page, outputPath) {
    var dom = new DOMParser().parseFromString("<p:Page xmlns:p=\"" + PencilNamespaces.p + "\"></p:Page>", "text/xml");
    var props = dom.createElementNS(PencilNamespaces.p, "p:Properties");
    dom.documentElement.appendChild(props);

    var content = dom.createElementNS(PencilNamespaces.p, "p:Content");
    dom.documentElement.appendChild(content);

    if (page.canvas) {
        var node = dom.importNode(page.canvas.drawingLayer, true);
        content.appendChild(node);
    }

    var serializer = new XMLSerializer();

    var xml = serializer.serializeToString(dom);
    fs.writeFileSync(outputPath, xml, "utf8");

    console.log("write to: " + outputPath);
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
    console.log("Swapping int page: " + page.tempFilePath + " -> " + page.name);

    var dom = new DOMParser().parseFromString(fs.readFileSync(page.tempFilePath, "utf8"), "text/xml");
    console.log("DOM: ", dom);
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
    this.sayDocumentChanged();
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
