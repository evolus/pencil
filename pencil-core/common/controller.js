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

    this.doc = new PencilDocument();
    this.documentPath = null;

    var size = this.applicationPane.getPreferredCanvasSize();

    var page = this.newPage("Untitled Page", size.w, size.h, null, null, "");
    this.activatePage(page);
};
Controller.prototype.findPageById = function (id) {
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].id == id) return this.doc.pages[i];
    }

    return null;
};
Controller.prototype.newPage = function (name, width, height, backgroundPageId, backgroundColor, note, parentPageId) {
    var id = Util.newUUID();
    var pageFileName = "page_" + id + ".xml";
    var page = {
        name: name,
        width: width,
        height: height,
        backgroundPage: this.findPageById(backgroundPageId),
        backgroundColor: backgroundColor,
        note: note,

        id: id,
        canvas: null,
        pageFileName: pageFileName,
        tempFilePath: path.join(this.tempDir.name, pageFileName)
    }
    console.log("background page: " + page.backgroundPage);

    this.serializePage(page, page.tempFilePath);
    this.doc.pages.push(page);

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

Controller.prototype.duplicatePage = function () {
    var page = this.activePage;
    var name = page.name;
    var width = page.width;
    var height = page.height;
    var backgroundPageId = page.backgroundPage;
    var backgroundColor = page.backgroundColor;
    var parentPageId = page.parentPage && page.parentPage.id;
    var note = page.note;
    var newPage = this.newPage(name, width, height, backgroundPageId, backgroundColor, note, parentPageId);
    if (!this.canvasPool.available()) {
        console.log("No available canvas for swapping in, swapping a LRU page now.");
        var lruPage = null;
        var lru = new Date().getTime();
        for (var i = 0; i < this.doc.pages.length; i ++) {
            var p = this.doc.pages[i];
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
    this.swapIn(newPage, canvas);
    for (var i = 0; i < page.canvas.drawingLayer.childNodes.length; i++) {
        var node = page.canvas.drawingLayer.childNodes[i];
        newPage.canvas.drawingLayer.appendChild(newPage.canvas.ownerDocument.importNode(node, true));
        Dom.renewId(node);
    }
    this.sayDocumentChanged();
    this.canvasPool.show(newPage.canvas);
    newPage.lastUsed = new Date();
    this.activePage = newPage;
};

Controller.prototype.serializeDocument = function (onDone) {
    var dom = this.doc.toDom();
    var xml = Controller.serializer.serializeToString(dom);
    var outputPath = path.join(this.tempDir.name, "content.xml");
    fs.writeFileSync(outputPath, xml, "utf8");

    var index = -1;
    var thiz = this;

    function next() {
        index ++;
        if (index >= thiz.doc.pages.length) {
            if (onDone) onDone();
            return;
        }
        var page = thiz.doc.pages[index];
        thiz.serializePage(page, page.tempFilePath);
        if (page.lastModified
            && (!page.thumbCreated || page.lastModified.getTime() > page.thumbCreated.getTime())) {
            if (thiz.pendingThumbnailerMap[page.id]) {
                var pending = thiz.pendingThumbnailerMap[page.id];
                window.clearTimeout(pending);
                thiz.pendingThumbnailerMap[page.id] = null;
            }
            thiz.updatePageThumbnail(page, next);
        } else {
            next();
        }
    };

    next();
};
Controller.prototype.save = function () {
    if (!this.documentPath) {
        var thiz = this;
        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: path.join(os.homedir(), "Untitled.epz"),
            filters: [
                { name: "Pencil Documents", extensions: ["epz"] }
            ]
        }, function (filePath) {
            if (!filePath) return;
            thiz.documentPath = filePath;
            thiz.save();
        });
        return;
    }

    if (!this.doc) throw "No document";
    if (!this.documentPath) throw "Path not specified";

    this.serializeDocument(function () {
        var archiver = require("archiver");
        var archive = archiver("zip");
        var output = fs.createWriteStream(this.documentPath);
        archive.pipe(output);
        archive.directory(this.tempDir.name, "/", {});
        archive.finalize();
        console.log("Saved");
    }.bind(this));
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
            for (var i = 0; i < this.doc.pages.length; i ++) {
                var p = this.doc.pages[i];
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
    if(page.parentPage) {
      var parentPage = page.parentPage.children;
      var index = parentPage.indexOf(thiz.page);
      parentPage.splice(index, 1);
      this.activatePage(page.parentPage);
    } else {
      var i = this.doc.pages.indexOf(page);
      this.doc.pages.splice(i, 1);
    }
    this.sayDocumentChanged();
};
Controller.prototype.sayDocumentChanged = function () {
    Dom.emitEvent("p:DocumentChanged", this.applicationPane.node(), {
        controller : this
    });
};

Controller.prototype.movePage = function (dir) {
  var page = this.activePage;
  var pages;
  var parentPage = page.parentPage;
  if(!parentPage) {
    pages = this.doc.pages;
  } else {
    pages = page.parentPage.children;
  }
  var index = pages.indexOf(page);
  if(dir == "left") {
    if (index == 0) {
        return;
    } else {
        var pageTmp = pages[index -1];
        pages[index -1 ] = pages[index];
        pages[index] = pageTmp;
        this.activatePage(pages[index - 1]);
    }
  } else {
    if (index == pages.length) {
        return;
    } else {
        var pageTmp = pages[index +1];
        pages[index +1 ] = pages[index];
        pages[index] = pageTmp;
        this.activatePage(pages[index + 1]);
    }
  }
  this.sayDocumentChanged();
}

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
Controller.prototype.updatePageThumbnail = function (page, done) {
    var thumbPath = path.join(this.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
    var scale = Controller.THUMBNAIL_SIZE / page.width;
    if (page.height > page.width) scale = Controller.THUMBNAIL_SIZE / page.height;

    var thiz = this;
    this.applicationPane.rasterizer.rasterizePageToFile(page, thumbPath, function (p, error) {
        page.thumbPath = p;
        page.thumbCreated = new Date();
        Dom.emitEvent("p:PageInfoChanged", thiz.applicationPane, {page: page});
        if (done) done();
    }, scale);
};


// Controller.prototype.pageMoveRight = function () {
//     var pageIndex = this._findPageToEditIndex();
//     if (pageIndex < 0) return;
//     this._movePage(pageIndex, true);
// };
// Controller.prototype.pageMoveLeft = function () {
//     var pageIndex = this._findPageToEditIndex();
//     if (pageIndex < 0) return;
//     this._movePage(pageIndex, false);
// };
// Controller.prototype._movePage = function (index, forward) {
//     debug("Moving: " + [index, forward]);
//     try {
//         if (index < 0 || index >= this.doc.pages.length) return;
//         var otherIndex = index + (forward ? 1 : -1);
//         if (otherIndex < 0 || otherIndex >= this.doc.pages.length) return;
//
//         var page = this.doc.pages[index];
//         var otherPage = this.doc.pages[otherIndex];
//
//         if (!page || !otherPage) return;
//
//         debug("swapping: " + [index, otherIndex]);
//
//         this.doc.pages[index] = otherPage;
//         this.doc.pages[otherIndex] = page;
//
//         this._updatePageFromView();
//         this._clearView();
//         this._pageSetupCount = 0;
//         var thiz = this;
//
//         this.sayDocumentChanged();
//
//         for (p in this.doc.pages) {
//             this._createPageView(this.doc.pages[p], function () {
//                 thiz._pageSetupCount ++;
//                 if (thiz._pageSetupCount == thiz.doc.pages.length) {
//                     thiz._ensureAllBackgrounds(function () {});
//                 }
//             });
//             this._setSelectedPageIndex(otherIndex);
//         }
//     } catch (e) {
//         Console.dumpError(e);
//     }
// };
// Controller.prototype._findPageToEditIndex = function () {
//     for (var i = 0; i < this.doc.pages.length; i ++) {
//         if (this._pageToEdit == this.doc.pages[i]) {
//             return i;
//             break;
//         }
//     }
//     return -1;
// }
