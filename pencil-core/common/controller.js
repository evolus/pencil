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
    return this.documentPath ? path.basename(this.documentPath).replace(/\.epz$/, "") : "* Unsaved document";
};
Controller.prototype.newDocument = function () {
    var thiz = this;

    function create() {
        thiz.resetDocument();

        // thiz.sayDocumentChanged();
        var size = thiz.applicationPane.getPreferredCanvasSize();
        var page = thiz.newPage("Untitled Page", size.w, size.h, null, null, "");

        thiz.activatePage(page);
        thiz.modified = false;
    };

    if (this.modified) {
        this.confirmAndSaveDocument(create);
        return;
    }

    create();
};
Controller.prototype.resetDocument = function () {
    if (this.tempDir) this.tempDir.removeCallback();
    this.tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });

    this.doc = new PencilDocument();
    this.documentPath = null;
    this.canvasPool.reset();
    this.activePage = null;
    this.documentPath = null;

    this.applicationPane.pageListView.currentParentPage = null;


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

    var page = new Page(this.doc);
    page.name = name;
    page.width = width;
    page.height = height;
    page.backgroundColor = backgroundColor;
    page.note = note;

    page.id = id;
    page.pageFileName = pageFileName;
    page.parentPageId = parentPageId;
    page.backgroundPageId = backgroundPageId;

    page.backgroundPage = this.findPageById(backgroundPageId);
    page.canvas = null;
    page.tempFilePath = path.join(this.tempDir.name, pageFileName);
    page.invalidatedAfterLoad = true;

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

Controller.prototype.duplicatePage = function (pageIn, onDone) {
    var page = pageIn;
    var name = page.name;
    var width = page.width;
    var height = page.height;
    var backgroundPageId = page.backgroundPage;
    var backgroundColor = page.backgroundColor;
    var parentPageId = page.parentPage && page.parentPage.id;
    var note = page.note;
    var newPage = this.newPage(name, width, height, backgroundPageId, backgroundColor, note, parentPageId);
    newPage.canvas = null;

    // retrieve new page
    this.retrievePageCanvas(newPage);

    // retrieve page
    if(!page.canvas) {
        this.retrievePageCanvas(page, newPage);
    }

    for (var i = 0; i < page.canvas.drawingLayer.childNodes.length; i++) {
        var node = page.canvas.drawingLayer.childNodes[i];
        newPage.canvas.drawingLayer.appendChild(newPage.canvas.ownerDocument.importNode(node, true));
        Dom.renewId(node);
    }

    if (this.activePage && this.activePage.id != page.id) {
        this.swapOut(page);
    }

    newPage.invalidatedAfterLoad = true;

    this.updatePageThumbnail(newPage, function() {
        onDone(newPage);
    });

    this.sayDocumentChanged();

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

        //serialize the page only when the page is in memory
        if (page.canvas) {
            thiz.serializePage(page, page.tempFilePath);
        }

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
Controller.prototype.openDocument = function () {
    var thiz = this;
    function handler() {
        ApplicationPane._instance.busy();
        dialog.showOpenDialog({
            title: "Open pencil document",
            defaultPath: os.homedir(),
            filters: [
                { name: "Stencil files", extensions: ["epz", "ep"] }
            ]

        }, function (filenames) {
            ApplicationPane._instance.unbusy();
            if (!filenames || filenames.length <= 0) return;
            this.loadDocument(filenames[0]);
        }.bind(thiz));
    };

    if (this.modified) {
        this.confirmAndSaveDocument(handler);
        return;
    }

    handler();
};
Controller.prototype.parseOldFormatDocument = function (filePath) {
    var targetDir = this.tempDir.name;
    var thiz = this;
    try {
        if (path.extname(filePath) != ".ep" && path.extname(filePath) != ".epz") throw "Wrong format.";
        var dom = Controller.parser.parseFromString(fs.readFileSync(filePath, "utf8"), "text/xml");

        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            thiz.doc.properties[propNode.getAttribute("name")] = propNode.textContent;
        });

        Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
            var page = new Page(thiz.doc);
            Dom.workOn("./p:Properties/p:Property", pageNode, function (propNode) {
                var name = propNode.getAttribute("name");
                var value = propNode.textContent;
                if(name == "note") {
                    value = RichText.fromString(value);
                }
                if (!Page.PROPERTY_MAP[name]) return;
                page[Page.PROPERTY_MAP[name]] = value;
            });

            var contentNode = Dom.getSingle("./p:Content", pageNode);
            if (contentNode) {
                var node = dom.createElementNS(PencilNamespaces.p, "p:Content");
                node.innerHTML = document.importNode(contentNode, true).innerHTML;
                page._contentNode = node;
            } else page.contentNode = null;

            if (page.width) page.width = parseInt(page.width, 10);
            if (page.height) page.height = parseInt(page.height, 10);

            if (page.backgroundPageId) page.backgroundPage = thiz.findPageById(page.backgroundPageId);

            var pageFileName = "page_" + page.id + ".xml";
            page.pageFileName = pageFileName;
            page.tempFilePath = path.join(thiz.tempDir.name, pageFileName);

            thiz.serializePage(page, page.tempFilePath);
            delete page._contentNode;
            thiz.doc.pages.push(page);
        });

        // update page thumbnails
        var index = -1;
        function next(onDone) {
            index ++;
            if (index >= thiz.doc.pages.length) {
                if (onDone) onDone();
                return;
            }
            var page = thiz.doc.pages[index];
            thiz.updatePageThumbnail(page, function () {
                next(onDone);
            });
        }

        next(function () {
            thiz.sayDocumentChanged();
        });

    } catch (e) {
        console.log("error:", e);
        thiz.newDocument();
    }
};

Controller.prototype.setRecentFile = function (filePath) {
        var files = Config.get("recent-documents");
        if (!files) {
            files = [filePath];
        } else {
            for (var i = 0; i < files.length; i ++) {
                if (files[i] == filePath) {
                    //remove it
                    files.splice(i, 1);
                    break;
                }
            }
            files.unshift(filePath);
            if (files.length > 10) {
                files.splice(files.length - 1, 1);
            }
        }
        Config.set("recent-documents", files);
};

Controller.prototype.removeRecentFile = function (filePath) {
        var files = Config.get("recent-documents");
        if (files) {
            for (var i = 0; i < files.length; i ++) {
                if (files[i] == filePath) {
                    //remove it
                    files.splice(i, 1);
                    break;
                }
            }
        }
        Config.set("recent-documents", files);
};


Controller.prototype.loadDocument = function (filePath) {
    this.resetDocument();
    var thiz = this;
    var targetDir = this.tempDir.name;
    fs.exists(filePath, function (exists) {
        if (!exists) {
            dialog.showMessageBox({type: "warning" , message : 'Your file was delete or moved some where else ?',title :"File doesn't exist", buttons : ['ok']});
            thiz.removeRecentFile(filePath);
            return;
        }
    });
    var checkOldFileType = function(callback) {
        var result;
        var unzipParse = unzip.Parse();
        var ob = fs.createReadStream(filePath).pipe(unzipParse);
        unzipParse.on('close', function() {
            callback(result);
        });
        unzipParse.on('error', function() {
            result = false;
            callback(result);
        });
        ob.on('entry', function (entry) {
            var fileName = entry.path;
            if (fileName === "content.xml") {
                result = true;
            }else {
              entry.autodrain();
            }
        });
    }
    var zipcallback = function (rs) {
        if(rs == true) {
            var extractor = unzip.Extract({ path: targetDir });
            extractor.on("close", function () {
                try {
                    var contentFile = path.join(targetDir, "content.xml");
                    if (!fs.existsSync(contentFile)) throw Util.getMessage("content.specification.is.not.found.in.the.archive");
                    var dom = Controller.parser.parseFromString(fs.readFileSync(contentFile, "utf8"), "text/xml");
                    Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
                        var value = propNode.textContent;
                        if (value == "undefined" || value == "null") return;
                        thiz.doc.properties[propNode.getAttribute("name")] = value;
                    });
                    Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
                        var page = new Page(thiz.doc);
                        var pageFileName = pageNode.getAttribute("href");
                        page.pageFileName = pageFileName;
                        page.tempFilePath = path.join(targetDir, pageFileName);
                        thiz.doc.pages.push(page);
                    });

                        thiz.doc.pages.forEach(function (page) {
                            var pageFile = path.join(targetDir, page.pageFileName);
                            if (!fs.existsSync(pageFile)) throw Util.getMessage("page.specification.is.not.found.in.the.archive");
                            var dom = Controller.parser.parseFromString(fs.readFileSync(pageFile, "utf8"), "text/xml");
                            Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
                                var propName = propNode.getAttribute("name");
                                var value = propNode.textContent;
                                if(propName == "note") {
                                    value = RichText.fromString(value);
                                }
                                if (value == "undefined" || value == "null") return;
                                page[propNode.getAttribute("name")] = value;
                            });

                            if (page.width) page.width = parseInt(page.width, 10);
                            if (page.height) page.height = parseInt(page.height, 10);


                            if (page.backgroundPageId) page.backgroundPage = thiz.findPageById(page.backgroundPageId);

                            var thumbPath = path.join(this.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
                            page.thumbPath = thumbPath;
                            page.thumbCreated = new Date();
                            page.canvas = null;
                    }, thiz);
                    thiz.doc.pages.forEach(function (page) {
                        if (page.backgroundPageId) page.backgroundPage = this.findPageById(page.backgroundPageId);
                        if (page.parentPageId) {
                            var parentPage = this.findPageById(page.parentPageId);
                            page.parentPage = parentPage;
                            parentPage.children.push(page);
                        }

                    }, thiz);
                    thiz.documentPath = filePath;
                    thiz.applicationPane.onDocumentChanged();
                    thiz.modified = false;
                    //new file was loaded, update recent file list
                    thiz.setRecentFile(filePath);
                } catch (e) {
                    console.log("error:", e);
                    thiz.newDocument();
                }

            }).on("error", function () {
                // thiz.parseOldFormatDocument(filePath);
            });
            fs.createReadStream(filePath).pipe(extractor);
        } else {
            thiz.parseOldFormatDocument(filePath);
            thiz.setRecentFile(filePath);
        }
    }
    checkOldFileType(zipcallback);
};
Controller.prototype.confirmAndSaveDocument = function (onSaved) {
    dialog.showMessageBox({
        title: "Save pencil document",
        type: "question",
        buttons: ["Discard changes", "Cancel", "Save"],
        defaultId: 2,
        cancelId: 1,
        message: "Save changes to document before closing?",
        detail: "If you don't save, changes will be permanently lost."
    }, function (result) {
        if (result == 0) {
            // discard changes
            if (onSaved) onSaved();
        } else if (result == 2) {
            // save changes
            this.saveDocument(onSaved);
        }
    }.bind(this));
};

Controller.prototype.saveAsDocument = function (onSaved) {
    dialog.showSaveDialog({
        title: "Save as",
        defaultPath: path.join(os.homedir(), "Untitled.epz"),
        filters: [
            { name: "Pencil Documents", extensions: ["epz"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.setRecentFile(filePath);
        if (!this.documentPath) this.documentPath = filePath;
        this.saveDocumentImpl(filePath, onSaved);
    }.bind(this));
};
Controller.prototype.saveDocument = function (onSaved) {
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
            thiz.setRecentFile(filePath);
            thiz.documentPath = filePath;
            thiz.saveDocumentImpl(thiz.documentPath, onSaved);
        });
        return;
    }
    this.saveDocumentImpl(this.documentPath, onSaved);
};
Controller.prototype.saveDocumentImpl = function (documentPath, onSaved) {
    if (!this.doc) throw "No document";
    if (!documentPath) throw "Path not specified";

    var thiz = this;
    ApplicationPane._instance.busy();
    this.serializeDocument(function () {
        var archiver = require("archiver");
        var archive = archiver("zip");
        var output = fs.createWriteStream(documentPath);
        output.on("close", function () {
            thiz.sayDocumentSaved();
            ApplicationPane._instance.unbusy();
            if (onSaved) onSaved();
        });
        archive.pipe(output);
        archive.directory(this.tempDir.name, "/", {});
        archive.finalize();
    }.bind(this));
};

Controller.prototype.serializePage = function (page, outputPath) {
    var dom = Controller.parser.parseFromString("<p:Page xmlns:p=\"" + PencilNamespaces.p + "\"></p:Page>", "text/xml");
    var propertyContainerNode = dom.createElementNS(PencilNamespaces.p, "p:Properties");
    dom.documentElement.appendChild(propertyContainerNode);

    for (i in Page.PROPERTIES) {
        var name = Page.PROPERTIES[i];
        if (!page[name]) continue;
        var propertyNode = dom.createElementNS(PencilNamespaces.p, "p:Property");
        propertyContainerNode.appendChild(propertyNode);

        propertyNode.setAttribute("name", name);
        propertyNode.appendChild(dom.createTextNode(page[name] && page[name].toString() || page[name]));
    }

    if (page._contentNode) {
        dom.documentElement.appendChild(page._contentNode);
    } else {
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
    canvas.oldElement = canvas.element.childNodes[0].childNodes[0].childNodes[1].innerHTML;

    console.log("Swapped in page invalidate state: " + page.invalidatedAfterLoad);

    if (!page.invalidatedAfterLoad) {
        this.invalidatePageContent(page);
        page.invalidatedAfterLoad = true;
    }
} ;
Controller.prototype.activatePage = function (page) {
    if (this.activePage && page.id == this.activePage.id) return;

    this.retrievePageCanvas(page);

    this.canvasPool.show(page.canvas);
    page.lastUsed = new Date();
    this.activePage = page;
    // this.sayDocumentChanged();
};
Controller.prototype.invalidatePageContent = function (page) {
    if (!page || !page.canvas) return;

    page.canvas.invalidateAll();

    var children = [];
    while (page.canvas.drawingLayer.hasChildNodes()) {
        var c = page.canvas.drawingLayer.firstChild;
        children.push(c);
        page.canvas.drawingLayer.removeChild(c);
    }

    Dom.empty(page.canvas.drawingLayer);

    while (children.length > 0) {
        var c = children.shift();
        page.canvas.drawingLayer.appendChild(c);
    }
};
Controller.prototype.retrievePageCanvas = function (page, newPage) {
    if (!page.canvas) {
        console.log("Page is not in memory, swapping in now");
        if (!this.canvasPool.available()) {
            console.log("No available canvas for swapping in, swapping a LRU page now.");
            var lruPage = null;
            var lru = new Date().getTime();
            for (var i = 0; i < this.doc.pages.length; i ++) {
                var p = this.doc.pages[i];
                if (!p.canvas || p == newPage ) continue;
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
};
Controller.prototype.deletePage = function (page) {
    if (page.canvas) this.canvasPool.return(page.canvas);
    var parentPage = page.parentPage;
    if (page.children) {
        for( var i = 0; i < page.children.length; i++) {
            page.children[i].parentPage = parentPage;
            if (parentPage) {
                parentPage.children.push(page.children[i]);
            }
        }
    }
    if (page.parentPage) {
        var index = parentPage.children.indexOf(page);
        parentPage.children.splice(index, 1);
    }
    var i = this.doc.pages.indexOf(page);
    this.doc.pages.splice(i, 1);

    fs.unlinkSync(page.tempFilePath);
    fs.unlinkSync(page.thumbPath);

    this.sayDocumentChanged();

    if (this.activePage && this.activePage.id == page.id && parentPage) {
        this.activatePage(parentPage)
    }
};
Controller.prototype.sayDocumentChanged = function () {
    this.modified = true;
    Dom.emitEvent("p:DocumentChanged", this.applicationPane.node(), {
        controller : this
    });
};
Controller.prototype.sayDocumentSaved = function () {
    this.modified = false;
};

Controller.prototype.checkLeftRight = function (page, dir) {
    var pages = [];
    var parentPage = page.parentPage;
    if (parentPage) {
        pages = parentPage.children;
    } else {
        for(var i = 0; i < this.doc.pages.length; i++) {
            if (this.doc.pages[i].parentPage == parentPage) {
                pages.push(this.doc.pages[i]);
            }
        }
    }
    var index = pages.indexOf(page);
    if (dir == "left" ) {
        if (index == 0) return false;
    } else {
        if (index == pages.length - 1) return false;
    }
    return true;
}

Controller.prototype.movePage = function (page, dir) {
    var pages = [];
    var parentPage = page.parentPage;
    if (parentPage) {
        pages = parentPage.children;
    } else {
        for(var i = 0; i < this.doc.pages.length; i++) {
            if (this.doc.pages[i].parentPage == parentPage) {
                pages.push(this.doc.pages[i]);
            }
        }
    }
    var index = pages.indexOf(page);
    var replacePage;
    if (dir == "left" ) {
        if (index == 0) {
            return false;
        } else {
            replacePage = pages[index -1];
        }
    } else {
        if (index == pages.length - 1) {
            return false;
        } else {
            replacePage = pages[index + 1];
        }
    }
    var pageIndex = this.doc.pages.indexOf(page);
    var replaceIndex = this.doc.pages.indexOf(replacePage);
    this.doc.pages[replaceIndex] = page;
    this.doc.pages[pageIndex] = replacePage;

    if (parentPage) {
        index = parentPage.children.indexOf(page);
        if (dir == "left") {
            var pageTmp = parentPage.children[index - 1];
            parentPage.children[index - 1] = parentPage.children[index];
            parentPage.children[index] = pageTmp;
        } else {
            var pageTmp = parentPage.children[index + 1];
            parentPage.children[index + 1] = parentPage.children[index];
            parentPage.children[index] = pageTmp;
        }
    }
    this.sayDocumentChanged();
    return true;
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
} ;

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
    this.modified = true;

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

Controller.prototype.rasterizeCurrentPage = function () {
    var page = this.activePage;
    dialog.showSaveDialog({
        title: "Export page as PNG",
        defaultPath: path.join(os.homedir(), (page.name + ".png")),
        filters: [
            { name: "PNG Image (*.png)", extensions: ["png"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.applicationPane.rasterizer.rasterizePageToFile(page, filePath, function (p, error) {
        });
    }.bind(this));
};

Controller.prototype.rasterizeSelection = function () {
    var target = Pencil.activeCanvas.currentController;
    if (!target || !target.getGeometry) return;

    dialog.showSaveDialog({
        title: "Export selection as PNG",
        defaultPath: path.join(os.homedir(), ""),
        filters: [
            { name: "PNG Image (*.png)", extensions: ["png"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.applicationPane.rasterizer.rasterizeSelectionToFile(target, filePath, function () {});
    }.bind(this));
};

Controller.prototype.copyAsRef = function (sourcePath, callback) {
    var id = Util.newUUID() + path.extname(sourcePath) || ".data";
    var filePath = path.join(this.makeSubDir(Controller.SUB_REFERENCE), id);

    var rd = fs.createReadStream(sourcePath);
    rd.on("error", function (error) {
        callback(null, error);
    });
    var wr = fs.createWriteStream(filePath);
    wr.on("error", function (error) {
        callback(null, error);
    });

    wr.on("close", function (ex) {
        callback(id);
    });

    rd.pipe(wr);
};
Controller.prototype.refIdToUrl = function (id) {
    var fullPath = path.join(this.tempDir.name, Controller.SUB_REFERENCE);
    fullPath = path.join(fullPath, id);

    return ImageData.filePathToURL(fullPath);
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
