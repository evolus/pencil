function Controller(canvasPool, applicationPane) {
    this.canvasPool = canvasPool;
    this.applicationPane = applicationPane;

    var thiz = this;
    this.canvasPool.canvasContentModifiedListener = function (canvas) {
        thiz.handleCanvasModified(canvas);
    };

    Controller._instance = this;
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
        thiz.sayControllerStatusChanged();
        FontLoader.instance.loadFonts();

        // thiz.sayDocumentChanged();
        setTimeout(function () {
            var size = thiz.applicationPane.getPreferredCanvasSize();
            var page = thiz.newPage("Untitled Page", size.w, size.h, null, null, "", null, "activatePage");
            thiz.modified = false;
        }, 50);
    };

    if (this.modified) {
        this.confirmAndSaveDocument(create);
        return;
    }
    create();
};
Controller.prototype.confirmAndclose = function (onClose) {
    var handler = function () {
        if (this.tempDir) this.tempDir.removeCallback();
        this.tempDir = null;
        this.doc = null;
        this.modified = false;

        this.sayControllerStatusChanged();

        if (onClose) onClose();
    }.bind(this);

    if (!this.doc || !this.modified) {
        handler();
    } else {
        this.confirmAndSaveDocument(handler);
    }
}
Controller.prototype.resetDocument = function () {
    if (this.tempDir) this.tempDir.removeCallback();
    this.tempDir = tmp.dirSync({ keep: false, unsafeCleanup: true });

    this.doc = new PencilDocument();
    this.doc.name = "";
    this.documentPath = null;
    this.canvasPool.reset();
    this.activePage = null;
    this.documentPath = null;
    this.pendingThumbnailerMap = null;

    this.applicationPane.pageListView.currentParentPage = null;
    FontLoader.instance.setDocumentRepoDir(path.join(this.tempDir.name, "fonts"));
};
Controller.prototype.findPageById = function (id) {
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].id == id) return this.doc.pages[i];
    }

    return null;
};
Controller.prototype.findPageByFid = function (fid) {
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].fid == fid) return this.doc.pages[i];
    }

    return null;
};
Controller.prototype.findPageByName = function (name) {
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].name == name) return this.doc.pages[i];
    }

    return null;
};
Controller.prototype.findListPageByName = function (name) {
    var pages = [];
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].name.toLowerCase().indexOf(name.toLowerCase()) >= 0) pages.push(this.doc.pages[i]);
    }

    return pages;
}
Controller.prototype.newPage = function (name, width, height, backgroundPageId, backgroundColor, note, parentPageId, activateAfterCreate) {
    var id = Util.newUUID();
    var pageFileName = "page_" + id + ".xml";

    var page = new Page(this.doc);
    page.name = name;
    page.width = width;
    page.height = height;
    if (backgroundColor) {
        page.backgroundColor = backgroundColor;
    }
    page.note = note;
    page.id = id;
    page.pageFileName = pageFileName;
    page.parentPageId = parentPageId;
    if (backgroundPageId) {
        page.backgroundPageId = backgroundPageId;
        page.backgroundPage = this.findPageById(backgroundPageId);
    }

    page.canvas = null;
    page.scrollTop = null;
    page.scrollLeft = null;
    page.zoom = null;

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

    this.invalidateBitmapFilePath(page);
    if (activateAfterCreate) this.activatePage(page);
    this.sayDocumentChanged();

    return page;
};

Controller.prototype.duplicatePage = function (pageIn, onDone) {
    var page = pageIn;
    var name = page.name + " (1)";
    var width = page.width;
    var height = page.height;
    var backgroundPageId;
    if(page.backgroundPage) {
        backgroundPageId = page.backgroundPage.id;
    }
    var backgroundColor;
    if (page.backgroundColor) {
         backgroundColor = page.backgroundColor;
    }
    var parentPageId = page.parentPage && page.parentPage.id;
    var note = page.note;

    var seed = 2;
    while (this.findPageByName(name)) {
        name = page.name  + " (" + seed + ")";
        seed ++;
    };

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
    this.doc.properties.activeId = this.activePage.id;
    var dom = this.doc.toDom();
    var xml = Controller.serializer.serializeToString(dom);
    var outputPath = path.join(this.tempDir.name, "content.xml");
    fs.writeFileSync(outputPath, xml, "utf8");

    var index = -1;
    var thiz = this;

    var embeddableFontFaces = [];

    function embedFonts() {
        if (embeddableFontFaces.length <= 0) return;
        FontLoader.instance.embedToDocumentRepo(embeddableFontFaces);
    }

    function next() {
        index ++;
        if (index >= thiz.doc.pages.length) {
            embedFonts();
            if (onDone) onDone();
            return;
        }
        var page = thiz.doc.pages[index];

        //serialize the page only when the page is in memory
        if (page.canvas) {
            thiz.serializePage(page, page.tempFilePath);
        }

        var pageEmbeddableFontFaces = thiz.findEmbeddableFontFaces(page);
        if (pageEmbeddableFontFaces) {
            pageEmbeddableFontFaces.forEach(function (face) {
                if (embeddableFontFaces.indexOf(face) < 0) embeddableFontFaces.push(face);
            });
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

Controller.prototype.findEmbeddableFontFaces = function (page) {
    var contextNode = null;
    if (page.canvas) {
        contextNode = page.canvas.drawingLayer;
    } else {
        var dom = Controller.parser.parseFromString(fs.readFileSync(page.tempFilePath, "utf8"), "text/xml");
        contextNode = Dom.getSingle("/p:Page/p:Content", dom);
    }

    var faces = [];

    Dom.workOn(".//svg:g[@p:type='Shape']", contextNode, function (node) {
        var defId = node.getAttributeNS(PencilNamespaces.p, "def");
        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
        if (!def) return;

        Dom.workOn("./p:metadata/p:property", node, function (propNode) {
            var name = propNode.getAttribute("name");
            var propDef = def.getProperty(name);
            if (!propDef || propDef.type != Font) return;
            var value = propNode.textContent;
            var font = Font.fromString(value);
            if (!font) return;

            if (faces.indexOf(font.family) < 0 && FontLoader.instance.isFontExisting(font.family)) {
                faces.push(font.family);
            }
        });
    });

    return faces;
};

Controller.prototype.openDocument = function (callback) {
    var thiz = this;
    function handler() {
        ApplicationPane._instance.busy();
        dialog.showOpenDialog({
            title: "Open pencil document",
            defaultPath: Config.get("document.open.recentlyDirPath", null) || os.homedir(),
            filters: [
                { name: "Stencil files", extensions: ["epz", "ep"] }
            ]

        }, function (filenames) {
            ApplicationPane._instance.unbusy();
            if (!filenames || filenames.length <= 0) return;
            Config.set("document.open.recentlyDirPath", path.dirname(filenames[0]));
            this.loadDocument(filenames[0], callback);
        }.bind(thiz));
    };

    if (this.modified) {
        this.confirmAndSaveDocument(handler);
        return;
    }

    handler();
};
Controller.prototype.invalidateContentNode = function (node, onDoneCallback) {

    var invalidateTasks = [];
    var invalidationIndex = -1;


    function createInvalidationTask(type, name, propertyNode) {
        return function (__callback) {
            var value = type.fromString(propertyNode.textContent);
            type.invalidateValue(value, function (invalidatedValue, error) {
                if (invalidatedValue) {
                    Shape.storePropertyToNode(name, invalidatedValue, propertyNode);
                }
                __callback();
            });
        };
    }

    function runNextValidation(callback) {
        invalidationIndex ++;
        if (invalidationIndex >= invalidateTasks.length) {
            callback();
            return;
        }
        var task = invalidateTasks[invalidationIndex];
        task(function () {
            runNextValidation(callback);
        });
    }

    Dom.workOn("//svg:g[@p:type='Shape']", node, function (shapeNode) {
        var defId = shapeNode.getAttributeNS(PencilNamespaces.p, "def");
        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
        if (!def) return;

        Dom.workOn("./p:metadata/p:property", shapeNode, function (propertyNode) {
            var name = propertyNode.getAttribute("name");
            var propertyDef = def.propertyMap[name];
            if (!propertyDef || !propertyDef.type.invalidateValue) return;
            var type = propertyDef.type;

            invalidateTasks.push(createInvalidationTask(type, name, propertyNode));

        });
    });


    runNextValidation(onDoneCallback);
};
Controller.prototype.parsePageFromNode = function (pageNode, callback) {
    var thiz = this;
    var page = new Page(this.doc);
    Dom.workOn("./p:Properties/p:Property", pageNode, function (propNode) {
        var name = propNode.getAttribute("name");
        var value = propNode.textContent;
        if(name == "note") {
            value = RichText.fromString(value);
        }
        if (!Page.PROPERTY_MAP[name]) return;
        page[Page.PROPERTY_MAP[name]] = value;
    });

    function invalidateAndSerializePage(page) {
        if (page.width) {
            page.width = parseInt(page.width, 10);
        } else page.width = 0;

        if (page.height) {
            page.height = parseInt(page.height, 10);
        } else page.height = 0;

        if (page.backgroundColor) page.backgroundColor = Color.fromString(page.backgroundColor);

        if (page.backgroundPageId) page.backgroundPage = thiz.findPageById(page.backgroundPageId);

        var pageFileName = "page_" + page.id + ".xml";
        page.pageFileName = pageFileName;
        page.tempFilePath = path.join(thiz.tempDir.name, pageFileName);

        thiz.serializePage(page, page.tempFilePath);
        delete page._contentNode;
        thiz.doc.pages.push(page);
    }

    var contentNode = Dom.getSingle("./p:Content", pageNode);
    if (contentNode) {
        var node = document.importNode(contentNode.cloneNode(true), true);
        this.invalidateContentNode(node, function () {
            page._contentNode = node;
            invalidateAndSerializePage(page);
            callback();
        });
    } else {
        page._contentNode = null;
        invalidateAndSerializePage(page);
        callback();
    }
};
Controller.prototype.parseOldFormatDocument = function (filePath, callback) {
    var targetDir = this.tempDir.name;
    var thiz = this;
    this.pathToRefCache = null;
    try {
        if (path.extname(filePath) != ".ep" && path.extname(filePath) != ".epz") throw "Wrong format.";

        this.documentPath = filePath;
        this.oldPencilDoc = true;
        var dom = Controller.parser.parseFromString(fs.readFileSync(filePath, "utf8"), "text/xml");

        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            thiz.doc.properties[propNode.getAttribute("name")] = propNode.textContent;
        });

        var pageNodes = Dom.getList("./p:Pages/p:Page", dom.documentElement);

        var pageNodeIndex = -1;
        function parseNextPageNode(__callback) {
            pageNodeIndex ++;
            if (pageNodeIndex >= pageNodes.length) {
                __callback();
                return;
            }

            var pageNode = pageNodes[pageNodeIndex];
            thiz.parsePageFromNode(pageNode, function () {
                parseNextPageNode(__callback);
            });
        }

        // update page thumbnails
        var index = -1;
        function generateNextThumbnail(onDone) {
            index ++;
            if (index >= thiz.doc.pages.length) {
                if (onDone) onDone();
                return;
            }
            var page = thiz.doc.pages[index];
            thiz.updatePageThumbnail(page, function () {
                generateNextThumbnail(onDone);
            });
        }


        parseNextPageNode(function () {
            generateNextThumbnail(function () {
                thiz.modified = false;
                thiz.sayControllerStatusChanged();
                if (thiz.doc.pages.length > 0) thiz.activatePage(thiz.doc.pages[0]);
                thiz.pathToRefCache = null;
                if (callback) callback();
                ApplicationPane._instance.unbusy();
            });
        });

        // this.documentPath = filePath;
        this.doc.name = this.getDocumentName();
    } catch (e) {
        // console.log("error:", e);
        thiz.newDocument();
        ApplicationPane._instance.unbusy();
    }
};

Controller.THUMB_CACHE_DIR = "thumbs";
Controller.getThumbCacheDir = function () {
    return Config.getDataFilePath(Controller.THUMB_CACHE_DIR);
};

try {
    fs.mkdirSync(Controller.getThumbCacheDir());
} catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
}

Controller.prototype.getCurrentDocumentThumbnail = function () {
    if (!this.doc || !this.doc.pages) return null;
    var firstThumbnailPath = null;

    for (var i = 0; i < this.doc.pages.length; i ++) {
        var page = this.doc.pages[i];
        if (page.thumbPath) {
            try {
                fs.accessSync(page.thumbPath, fs.F_OK);
                firstThumbnailPath = page.thumbPath;
                break;
            } catch (e) {
            }
        }
    }

    if (!firstThumbnailPath) return null;

    var thumbPath = path.join(Controller.getThumbCacheDir(), Util.newUUID() + ".png");
    fs.createReadStream(firstThumbnailPath).pipe(fs.createWriteStream(thumbPath));

    return thumbPath;
};
Controller.prototype.addRecentFile = function (filePath, thumbPath) {
    // Recent documents (Windows & OS X)
    Pencil.app.addRecentDocument(filePath);

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
        if (files.length > 8) {
            files.splice(files.length - 1, 1);
        }
    }

    var thumbs = Config.get("recent-documents-thumb-map");
    if (!thumbs) thumbs = {};

    var newThumbs = {};
    var usedPaths = [];
    files.forEach(function (file) {
        if (file == filePath) {
            newThumbs[file] = thumbPath;
        } else {
            newThumbs[file] = thumbs[file] || null;
        }

        var p = newThumbs[file];
        if (p) usedPaths.push(p);
    });

    //cleanup unused thumb cache
    var cacheDir = Controller.getThumbCacheDir();
    var names = fs.readdirSync(cacheDir);
    names.forEach(function (name) {
        var p = path.join(cacheDir, name);
        if (usedPaths.indexOf(p) < 0) {
            try {
                fs.unlinkSync(p);
            } catch (e) {
            }
        }
    });

    Config.set("recent-documents", files);
    Config.set("recent-documents-thumb-map", newThumbs);
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

    Pencil.app.clearRecentDocuments();
    files.forEach(function(f) {
        Pencil.app.addRecentDocument(f);
    });
};
Controller.prototype.loadDocument = function (filePath, callback) {
    ApplicationPane._instance.busy();
    this.applicationPane.pageListView.resetSearchBar();
    this.resetDocument();
    var thiz = this;
    if (!fs.existsSync(filePath)) {
        Dialog.error("File doesn't exist", "Please check if your file was moved or deleted.");
        thiz.removeRecentFile(filePath);
        ApplicationPane._instance.unbusy();
        thiz.newDocument();
        if (callback) callback();
        return;
    };

    var fd = fs.openSync(filePath, "r");
    var buffer = new Buffer(2);
    var chunkSize = 2;
    fs.read(fd, buffer, 0, chunkSize, 0, function (err, bytes, buff) {
        var content = buff.toString("utf8", 0, chunkSize);
        if (content.toUpperCase() == "PK") {
            thiz.parseDocument(filePath, callback);
        } else {
            thiz.parseOldFormatDocument(filePath, callback);
        }
        fs.close(fd);
    });
};

Controller.prototype.parseDocument = function (filePath, callback) {
    var targetDir = this.tempDir.name;
    var thiz = this;
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

                if (page.width) {
                    page.width = parseInt(page.width, 10);
                } else page.width = 0;

                if (page.height) {
                    page.height = parseInt(page.height, 10);
                } else page.height = 0;

                if (page.backgroundColor) page.backgroundColor = Color.fromString(page.backgroundColor);

                if (Config.get("page.show.last_page_zoom") == "undefined") Config.set("page.show.last_page_zoom", true);
                var showLastPageZoom = Config.get("page.show.last_page_zoom");
                if (showLastPageZoom) {
                     page.scrollTop = page.scrollTop ? parseInt(page.scrollTop, 10) : 0;
                     page.scrollLeft = page.scrollLeft ? parseInt(page.scrollLeft, 10) : 0;
                     page.zoom = page.zoom ? page.zoom : 1;
                } else {
                    page.scrollTop = 0;
                    page.scrollLeft = 0;
                    page.zoom = 1;
                }
                // if (page.backgroundPageId) page.backgroundPage = thiz.findPageById(page.backgroundPageId);

                var thumbPath = path.join(this.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
                if (fs.existsSync(thumbPath)) {
                    page.thumbPath = thumbPath;
                    page.thumbCreated = new Date();
                }
                page.canvas = null;
            }, thiz);

            thiz.doc.pages.forEach(function (page) {
                if (page.backgroundPageId) {
                    page.backgroundPage = this.findPageById(page.backgroundPageId);
                    this.invalidateBitmapFilePath(page);
                }

                if (page.parentPageId) {
                    var parentPage = this.findPageById(page.parentPageId);
                    page.parentPage = parentPage;
                    parentPage.children.push(page);
                }
            }, thiz);

            thiz.documentPath = filePath;
            thiz.oldPencilDoc = false;
            thiz.doc.name = thiz.getDocumentName();
            thiz.modified = false;
            //new file was loaded, update recent file list
            thiz.addRecentFile(filePath, thiz.getCurrentDocumentThumbnail());

            FontLoader.instance.setDocumentRepoDir(path.join(targetDir, "fonts"));
            FontLoader.instance.loadFonts(function () {
                thiz.sayControllerStatusChanged();
                if (thiz.doc.properties.activeId) {
                    thiz.activatePage(thiz.findPageById(thiz.doc.properties.activeId));
                } else {
                    if (thiz.doc.pages.length > 0) thiz.activatePage(thiz.doc.pages[0]);
                }
                thiz.applicationPane.onDocumentChanged();
                thiz.modified = false;
                if (callback) callback();
                ApplicationPane._instance.unbusy();
            });
        } catch (e) {
            console.log("error:", e);
            thiz.newDocument();
            ApplicationPane._instance.unbusy();
        }

    }).on("error", function () {
        thiz.parseOldFormatDocument(filePath);
        ApplicationPane._instance.unbusy();
    });
    fs.createReadStream(filePath).pipe(extractor);
}
Controller.prototype.confirmAndSaveDocument = function (onSaved) {
    Dialog.confirm(
        "Save changes to document before closing?",
        "If you don't save, changes will be permanently lost.",
        "Save", function () { this.saveDocument(onSaved); }.bind(this),
        "Cancel", function () { },
        "Discard changes", function () { if (onSaved) onSaved(); }
        );
};
Controller.prototype.parseDocumentThumbnail = function (filePath, callback) {
    var extractPath = null;
    var found = false;
    fs.createReadStream(filePath)
        .pipe(unzip.Parse())
        .on("entry", function (entry) {
            var fileName = entry.path;
            var type = entry.type; // 'Directory' or 'File'
            var size = entry.size;
            if (fileName === "content.xml") {
                var xmlFile = tmp.fileSync({postfix: ".xml", keep: false});
                entry.pipe(fs.createWriteStream(xmlFile.name))
                    .on("close", function () {
                        var dom = Controller.parser.parseFromString(fs.readFileSync(xmlFile.name, "utf8"), "text/xml");
                        xmlFile.removeCallback();

                        Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
                            var pageFileName = pageNode.getAttribute("href");
                            if (!extractPath) {
                                extractPath = "thumbnails/" + pageFileName.replace(/^page_/, "").replace(/\.xml$/, "") + ".png";
                            }
                        });
                    });
            } else if (fileName && fileName == extractPath) {
                var pngFile = tmp.fileSync({postfix: ".png", keep: false});
                entry.pipe(fs.createWriteStream(pngFile.name))
                    .on("close", function () {
                        callback(null, pngFile.name);
                    });
            } else {
                entry.autodrain();
            }
        })
        .on("end", function () {
            if (!found) callback("PARSE ERROR", null);
        });
};
Controller.prototype.saveAsDocument = function (onSaved) {
    var thiz = this;
    dialog.showSaveDialog({
        title: "Save as",
        defaultPath: path.join(this.documentPath && path.dirname(this.documentPath) || Config.get("document.save.recentlyDirPath", null) || os.homedir(),
                        this.documentPath && path.basename(this.documentPath) || "Untitled.epz"),
        filters: [
            { name: "Pencil Documents", extensions: ["epz"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.addRecentFile(filePath, thiz.getCurrentDocumentThumbnail());
        this.documentPath = filePath;
        this.doc.name = this.getDocumentName();
        this.saveDocumentImpl(filePath, onSaved);
    }.bind(this));
};
Controller.prototype.saveDocument = function (onSaved) {
    if (!this.documentPath || this.oldPencilDoc) {
        var thiz = this;
        dialog.showSaveDialog({
            title: "Save as",
            defaultPath: path.join(Config.get("document.save.recentlyDirPath", null) || os.homedir(),
                (this.documentPath && path.basename(this.documentPath).replace(path.extname(this.documentPath), "") + ".epz") || "Untitled.epz"),
            filters: [
                { name: "Pencil Documents", extensions: ["epz"] }
            ]
        }, function (filePath) {
            if (!filePath) return;
            Config.set("document.save.recentlyDirPath", path.dirname(filePath));
            thiz.documentPath = filePath;
            thiz.doc.name = thiz.getDocumentName();
            thiz.saveDocumentImpl(thiz.documentPath, onSaved);
        });
        return;
    }
    this.saveDocumentImpl(this.documentPath, onSaved);
};
Controller.prototype.saveDocumentImpl = function (documentPath, onSaved) {
    if (!this.doc) throw "No document";
    if (!documentPath) throw "Path not specified";

    this.updateCanvasState();
    this.oldPencilDoc = false;

    var thiz = this;
    ApplicationPane._instance.busy();

    this.serializeDocument(function () {
        this.addRecentFile(documentPath, this.getCurrentDocumentThumbnail());

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

    thiz.applicationPane.onDocumentChanged();
    thiz.sayControllerStatusChanged();
};
Controller.serializePageToDom = function (page, noContent) {
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

    // for old format .ep file
    if (page._contentNode) {
        dom.documentElement.appendChild(page._contentNode);
    } else if (!noContent) {
        var content = dom.createElementNS(PencilNamespaces.p, "p:Content");
        dom.documentElement.appendChild(content);

        if (page.canvas) {
            if (page.canvas) {
                var node = dom.importNode(page.canvas.drawingLayer, true);
                while (node.hasChildNodes()) {
                    var c = node.firstChild;
                    node.removeChild(c);
                    content.appendChild(c);
                }
            }
        } else {
            var svg = document.createElementNS(PencilNamespaces.svg, "svg");
            svg.setAttribute("width", "" + page.width  + "px");
            svg.setAttribute("height", "" + page.height  + "px");
            try {
                var dom2 = Controller.parser.parseFromString(fs.readFileSync(page.tempFilePath, "utf8"), "text/xml");
                var content2 = Dom.getSingle("/p:Page/p:Content", dom2);
                while (content2.hasChildNodes()) {
                    var c = content2.firstChild;
                    content2.removeChild(c);
                    svg.appendChild(c);
                }

            } catch (e) {

            }

            var offScreenCanvas = new OffScreenCanvas(svg);
            offScreenCanvas.invalidateAll();

            while (svg.hasChildNodes()) {
                var c = svg.firstChild;
                svg.removeChild(c);
                content.appendChild(c);
            }
        }
    }

    return dom;
};
Controller.prototype.serializePage = function (page, outputPath) {
    var dom = Controller.serializePageToDom(page);

    var xml = Controller.serializer.serializeToString(dom);
    fs.writeFileSync(outputPath, xml, "utf8");
};

Controller.prototype.getPageSVG = function (page) {
    var svg = document.createElementNS(PencilNamespaces.svg, "svg");
    svg.setAttribute("width", "" + page.width  + "px");
    svg.setAttribute("height", "" + page.height  + "px");

    if (page.canvas) {
        if (!page.invalidatedAfterLoad) {
            this.invalidatePageContent(page);
            page.invalidatedAfterLoad = true;
        }

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

        var offScreenCanvas = new OffScreenCanvas(svg);
        offScreenCanvas.invalidateAll();
    }
    return svg;
};
Controller.prototype.swapOut = function (page) {
    if (!page.canvas) throw "Invalid page state. Unable to swap out un-attached page";
    this.serializePage(page, page.tempFilePath);
    page.careTakerTempFile = tmp.fileSync({postfix: ".xml", keep: false});
    page.canvas.careTaker.saveState(page.careTakerTempFile.name);
    page.canvasState = this.canvasPool.getCanvasState(page.canvas);

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
    canvas.careTaker.reset();
    if (page.careTakerTempFile) {
        canvas.careTaker.loadState(page.careTakerTempFile.name);
        page.careTakerTempFile.removeCallback();
        page.careTakerTempFile = null;
    }

    var canvasState = {"scrollTop": page.scrollTop ? page.scrollTop : 0, "scrollLeft": page.scrollLeft ? page.scrollLeft : 0, "zoom": page.zoom ? page.zoom : 1};
    canvas.setCanvasState(canvasState);

    page.canvas = canvas;
    canvas.page = page;
    canvas.setSize(page.width, page.height);


    if (!page.invalidatedAfterLoad) {
        this.invalidatePageContent(page, function () {
            canvas.careTaker.reset();
        });
        page.invalidatedAfterLoad = true;
    }
} ;

Controller.prototype.updateCanvasState = function () {
    if (this.activePage && this.activePage.canvas) {
        var canvasStateTemp = this.activePage.canvas.getCanvasState();
        this.activePage.scrollTop = canvasStateTemp.scrollTop;
        this.activePage.scrollLeft = canvasStateTemp.scrollLeft;
        this.activePage.zoom = canvasStateTemp.zoom;
    }
}

Controller.prototype.activatePage = function (page) {
    if (page == null || this.activePage && page.id == this.activePage.id) return;

    this.updateCanvasState();

    this.retrievePageCanvas(page);

    this.canvasPool.show(page.canvas);

    this.ensurePageCanvasBackground(page);

    page.canvas.setSize(page.width, page.height);
    page.lastUsed = new Date();
    this.activePage = page;
    page.canvas._sayTargetChanged();
    // this.sayDocumentChanged();
};
Controller.prototype.ensurePageCanvasBackground = function (page) {
    if (!page.canvas) return;

    if (page.backgroundPage) {
        var backgroundPage = page.backgroundPage;
        Pencil.rasterizer.getPageBitmapFile(backgroundPage, function (filePath) {
            page.canvas.setBackgroundImageData({
                url: ImageData.filePathToURL(filePath),
                width: backgroundPage.width,
                height: backgroundPage.height
            }, false);
        });
        page.canvas.setBackgroundColor(null);
    } else if (page.backgroundColor) {
        page.canvas.setBackgroundColor(page.backgroundColor);
        page.canvas.setBackgroundImageData(null, false);
    } else {
        page.canvas.setBackgroundColor(null);
        page.canvas.setBackgroundImageData(null, false);
    }
};
Controller.prototype.invalidatePageContent = function (page, callback) {
    if (!page || !page.canvas) {
        if (callback) callback();
        return;
    }

    page.canvas.invalidateAll(function () {
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

        if (callback) callback();
    });
};
Controller.prototype.retrievePageCanvas = function (page, newPage) {
    if (!page.canvas) {
        if (!this.canvasPool.available()) {
            var lruPage = null;
            var lru = new Date().getTime();
            for (var i = 0; i < this.doc.pages.length; i ++) {
                var p = this.doc.pages[i];
                if (!p.canvas || p == newPage ) continue;
                if (p.lastUsed && p.lastUsed.getTime() < lru) {
                    lruPage = p;
                    lru = p.lastUsed.getTime();
                }
            }
            if (!lruPage) throw "Invalid state. Unable to find LRU page to swap out";
            this.swapOut(lruPage);
        }

        var canvas = this.canvasPool.obtain();
        this.swapIn(page, canvas);
    }
};
Controller.prototype.deletePage = function (page) {
    if (page.canvas) this.canvasPool.return(page.canvas);

    //Delete page from parent
    var parentPage = page.parentPage;
    if (parentPage) {
        var index = parentPage.children.indexOf(page);
        parentPage.children.splice(index, 1);
    }

    //Delete page from children
    if (page.children) {
        for( var i in page.children) {
            if (parentPage) {
                page.children[i].parentPage = parentPage;
                page.children[i].parentPageId = parentPage.id;
                parentPage.children.push(page.children[i]);
            } else {
                page.children[i].parentPage = null;
                page.children[i].parentPageId = null;
            }
        }
    }

    //Delete page from List pages
    var i = this.doc.pages.indexOf(page);
    this.doc.pages.splice(i, 1);

    fs.unlinkSync(page.tempFilePath);
    if (page.thumbPath && fs.existsSync(page.thumbPath)) fs.unlinkSync(page.thumbPath);

    var refPages = [];
    for (var i in this.doc.pages) {
        if (this.doc.pages[i].backgroundPageId == page.id) {
            refPages.push(this.doc.pages[i]);
        }
    }

    if (refPages.length > 0) {
        var thiz = this;
        function updateBackgroundPage(pages, backgroundPage) {
            pages.forEach(function (page) {
                if (backgroundPage) {
                    page.backgroundPage = backgroundPage;
                    page.backgroundPageId = backgroundPage.id;
                } else {
                    page.backgroundPage = null;
                    page.backgroundPageId = null;
                }
                thiz.invalidateBitmapFilePath(page);
            });

            var p = thiz.activePage;
            while (p) {
                if (pages.indexOf(p) >= 0) {
                    thiz.ensurePageCanvasBackground(thiz.activePage);
                    break;
                }
                p = p.backgroundPage;
            }
        }

        if (page.backgroundPage) {
            var bgPage = page.backgroundPage;
            Dialog.confirm(
                "This page is the background page of some pages. And the background page of this page is " + bgPage.name
                + ". Do you want to change background of the pages is " + bgPage.name + "?", null,
                "Change background page to " + bgPage.name, function () {
                    updateBackgroundPage(refPages, bgPage);
                },
                "Set no background page", function () {
                    updateBackgroundPage(refPages);
                }
            );
        } else {
            updateBackgroundPage(refPages);
        }
    }

    this.sayDocumentChanged();

    if (this.activePage && this.activePage.id == page.id) {
        if (parentPage) {
            if (parentPage.children.length > 0) {
                return parentPage.children[0];
            } else {
                return parentPage;
            }
        } else {
            for (var i in this.doc.pages) {
                if (!this.doc.pages[i].parentPage) {
                    return this.doc.pages[i];
                }
            }
        }
    };
};
Controller.prototype.sayDocumentChanged = function () {
    this.modified = true;
    Dom.emitEvent("p:DocumentChanged", this.applicationPane.node(), {
        controller : this
    });
};
Controller.prototype.sayControllerStatusChanged = function () {
    Dom.emitEvent("p:ControllerStatusChanged", this.applicationPane.node(), {
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

    var thiz = this;
    var padding  = 0;
    var handler = function () {
        var canvas = page.canvas;
        if (!canvas) return;
        var newSize = canvas.sizeToContent(padding, padding);
        if (newSize) {
            page.width = newSize.width;
            page.height = newSize.height;

            thiz.sayDocumentChanged();
            thiz.invalidateBitmapFilePath(page);
        }
    }.bind(this);

    if (askForPadding) {
        var paddingDialog = new PromptDialog();
        paddingDialog.open({
            title: "Fit content with padding",
            message: "Please enter the padding",
            defaultValue: 0,
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
    if (canvas.zoom != 1) {
        canvas.zoomTo(1);
    }
    var newSize = this.applicationPane.getBestFitSizeObject();
    if (newSize) {
        canvas.setSize(newSize.width, newSize.height);
        page.width = newSize.width;
        page.height = newSize.height;
        Config.set("lastSize", [newSize.width, newSize.height].join("x"));
        this.invalidateBitmapFilePath(page);
        this.sayDocumentChanged();
    }
};
Controller.prototype.getBestFitSize = function () {
    return this.applicationPane.getBestFitSize();
};

Controller.prototype.handleCanvasModified = function (canvas) {
    if (!canvas || !canvas.page) return;
    this.modified = true;
    canvas.page.lastModified = new Date();
    this.invalidateBitmapFilePath(canvas.page);
};
Controller.prototype.updatePageThumbnail = function (page, done) {
    var thumbPath = path.join(this.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
    var scale = Controller.THUMBNAIL_SIZE / page.width;
    if (page.height > page.width) scale = Controller.THUMBNAIL_SIZE / page.height;

    var thiz = this;
    this.applicationPane.rasterizer.postBitmapGeneratingTask(page, scale, thumbPath, function (p) {
        page.thumbPath = p;
        page.thumbCreated = new Date();
        Dom.emitEvent("p:PageInfoChanged", thiz.applicationPane, {page: page});
        if (done) done();
    });
};

Controller.prototype.rasterizeCurrentPage = function (targetPage) {
    var page = targetPage ? targetPage : (this.activePage ? this.activePage : null);
    if (!page) {
        return;
    }

    dialog.showSaveDialog({
        title: "Export page as PNG",
        defaultPath: path.join(this.documentPath && path.dirname(this.documentPath) || os.homedir(), (page.name + ".png")),
        filters: [
            { name: "PNG Image (*.png)", extensions: ["png"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.applicationPane.rasterizer.rasterizePageToFile(page, filePath, function (p, error) {
            if (!error) {
                NotificationPopup.show("Page exprted as '" + path.basename(filePath) + "'.", "View", function () {
                    shell.openItem(filePath);
                });
            }
        });
    }.bind(this));
};

Controller.prototype.rasterizeSelection = function () {
    var target = Pencil.activeCanvas.currentController;
    if (!target || !target.getGeometry) return;

    dialog.showSaveDialog({
        title: "Export selection as PNG",
        defaultPath: path.join(this.documentPath && path.dirname(this.documentPath) || os.homedir(), ""),
        filters: [
            { name: "PNG Image (*.png)", extensions: ["png"] }
        ]
    }, function (filePath) {
        if (!filePath) return;
        this.applicationPane.rasterizer.rasterizeSelectionToFile(target, filePath, function () {});
    }.bind(this));
};

Controller.prototype.copyAsRef = function (sourcePath, callback) {
    var originalSourcePath = sourcePath;

    if (this.pathToRefCache && this.pathToRefCache[originalSourcePath]) {
        callback(this.pathToRefCache[originalSourcePath]);
        return;
    }

    if (!path.isAbsolute(sourcePath)) {
        sourcePath = path.normalize(path.join(path.dirname(this.documentPath), sourcePath));
        console.log("Resolving relative path to: ", sourcePath);
    }

    var id = Util.newUUID() + path.extname(sourcePath) || ".data";
    var filePath = path.join(this.makeSubDir(Controller.SUB_REFERENCE), id);

    if (!this.pathToRefCache) this.pathToRefCache = {};
    this.pathToRefCache[originalSourcePath] = id;

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
Controller.prototype.nativeImageToRefSync = function (nativeImage) {
    var id = Util.newUUID() + ".png";
    var filePath = path.join(this.makeSubDir(Controller.SUB_REFERENCE), id);
    fs.writeFileSync(filePath, nativeImage.toPng());

    return id;
};
Controller.prototype.refIdToFilePath = function (id) {
    var fullPath = path.join(this.tempDir.name, Controller.SUB_REFERENCE);
    fullPath = path.join(fullPath, id);

    return fullPath;
};

Controller.prototype.refIdToUrl = function (id) {
    var filePath = this.refIdToFilePath(id);
    var stat = fs.statSync(filePath);
    return ImageData.filePathToURL(filePath) + "?token=" + stat.mtime.getTime();
};

Controller.prototype._findPageIndex = function (pages, id) {
    for (var i = 0; i < pages.length; i ++) {
        if (pages[i].id == id) return i;
    }
    return -1;
};
Controller.prototype.movePageTo = function (pageId, targetPageId, left) {
    if (pageId == targetPageId) return;
    var page = this.findPageById(pageId);
    if (!page) return;

    var targetPage = this.findPageById(targetPageId);
    if (!targetPage) return;

    var list = page.parentPage ? page.parentPage.children : this.doc.pages;
    var index = list.indexOf(page);
    var targetIndex = list.indexOf(targetPage);

    if (index < 0 || targetIndex < 0) return;

    list.splice(index, 1);
    targetIndex = list.indexOf(targetPage);

    if (!left) targetIndex ++;
    list.splice(targetIndex, 0, page);

    this.sayDocumentChanged();
};
Controller.prototype.scheduleUpdatePageThumbnail = function (page) {
    if (!this.pendingThumbnailerMap) this.pendingThumbnailerMap = {};
    var pending = this.pendingThumbnailerMap[page.id];
    if (pending) {
        window.clearTimeout(pending);
    }

    this.pendingThumbnailerMap[page.id] = window.setTimeout(function () {
        this.updatePageThumbnail(page, function () {
            this.pendingThumbnailerMap[page.id] = null;
        }.bind(this));
    }.bind(this), 2000);

};

Controller.prototype.invalidateBitmapFilePath = function (page, invalidatedIds) {
    if (!invalidatedIds) invalidatedIds = [];
    if (invalidatedIds.indexOf(page.id) >= 0) return;

    if (page.bitmapCache) {
        for (var key in page.bitmapCache) {
            var filePath = page.bitmapCache[key];
            try {
                fs.unlinkSync(page.bitmapFilePath);
            } catch (e) {
            }
        }
        page.bitmapCache = null;
    }

    this.scheduleUpdatePageThumbnail(page);

    invalidatedIds.push(page.id);
    for (let p of this.doc.pages) {
        if (p.backgroundPageId == page.id) this.invalidateBitmapFilePath(p, invalidatedIds);
    }
};
Controller.prototype.updatePageProperties = function (page, name, backgroundColor, backgroundPageId, parentPageId, width, height) {
    page.name = name;
    page.backgroundColor = backgroundColor;
    page.backgroundPageId = backgroundPageId;
    page.backgroundPage = backgroundPageId ? this.findPageById(backgroundPageId) : null;

    if (parentPageId) {
        if (page.parentPageId != parentPageId) {
            if (page.parentPageId) {
                var p = this.findPageById(page.parentPageId);
                var index = p.children.indexOf(page);
                if (index >= 0) p.children.splice(index, 1);
            }
            var parentPage = this.findPageById(parentPageId);
            parentPage.children.push(page);
            page.parentPage = parentPage;
            page.parentPageId = parentPageId;
        }
    } else {
        if (page.parentPageId) {
            var p = this.findPageById(page.parentPageId);
            var index = p.children.indexOf(page);
            if (index >= 0) p.children.splice(index, 1);

            var docIndex = this.doc.pages.indexOf(page);
            if (docIndex >= 0) {
                this.doc.pages.splice(docIndex, 1);
                this.doc.pages.push(page);
            }

            page.parentPage = null;
            page.parentPageId = null;
        }
    }

    page.width = width;
    page.height = height;
    if (page.id == this.activePage.id) {
        page.canvas.setSize(page.width, page.height);
    }

    this.invalidateBitmapFilePath(page);
    var p = this.activePage;
    while (p) {
        if (p.id == page.id) {
            this.ensurePageCanvasBackground(this.activePage);
            break;
        }
        p = p.backgroundPage;
    }

    Pencil.controller.sayDocumentChanged();
};
Controller.prototype.getRootPages = function () {
    if (!this.doc) throw "No document available";
    var rootPages = [];
    this.doc.pages.forEach(function (page) {
        if (!page.parentPage) rootPages.push(page);
    });

    return rootPages;
};
Controller.prototype.exportCurrentDocument = function () {
    Pencil.documentExportManager.exportDocument(this.doc);
};
Controller.prototype.printCurrentDocument = function () {
    Pencil.documentExportManager.exportDocument(this.doc, "PrintingExporter");
};
Controller.prototype.prepareForEmbedding = function (node, onPreparingDoneCallback) {
    var invalidateTasks = [];
    var invalidationIndex = -1;


    function createInvalidationTask(type, name, propertyNode) {
        return function (__callback) {
            var value = type.fromString(propertyNode.textContent);
            type.prepareForEmbedding(value, function (invalidatedValue, error) {
                if (invalidatedValue) {
                    Shape.storePropertyToNode(name, invalidatedValue, propertyNode);
                }
                __callback();
            });
        };
    }

    function runNextValidation(callback) {
        invalidationIndex ++;
        if (invalidationIndex >= invalidateTasks.length) {
            callback();
            return;
        }
        var task = invalidateTasks[invalidationIndex];
        task(function () {
            runNextValidation(callback);
        });
    }

    Dom.workOn("//svg:g[@p:type='Shape']", node, function (shapeNode) {
        var defId = shapeNode.getAttributeNS(PencilNamespaces.p, "def");
        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
        if (!def) return;

        Dom.workOn("./p:metadata/p:property", shapeNode, function (propertyNode) {
            var name = propertyNode.getAttribute("name");
            var propertyDef = def.propertyMap[name];
            if (!propertyDef || !propertyDef.type.prepareForEmbedding) return;
            var type = propertyDef.type;

            invalidateTasks.push(createInvalidationTask(type, name, propertyNode));

        });
    });


    runNextValidation(function () {
        if (onPreparingDoneCallback) onPreparingDoneCallback();
    });
};


window.onbeforeunload = function (event) {
    // Due to a change of Chrome 51, returning non-empty strings or true in beforeunload handler now prevents the page to unload
    var remote = require("electron").remote;
    if (remote.app.devEnable) return;

    if (Controller.ignoreNextClose) {
        Controller.ignoreNextClose = false;
        return;
    }

    if (Controller._instance.doc) {
        setTimeout(function () {
            Controller._instance.confirmAndclose(function () {
                Controller.ignoreNextClose = false;
                var currentWindow = remote.getCurrentWindow();
                currentWindow.close();
            });
        }, 10);
        return true;
    }
};
