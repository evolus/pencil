function FileHandler(controller){
    this.controller = controller;
}

FileHandler.prototype.parseOldFormatDocument = function (filePath, callback) {
    var targetDir = Pencil.documentHandler.tempDir.name;
    var oldPencilDocument = Pencil.documentHandler.preDocument;
    var thiz = this;
    this.pathToRefCache = null;
    try {
        if (path.extname(filePath) != ".ep" && path.extname(filePath) != ".epz") throw "Wrong format.";

        this.controller.documentPath = filePath;
        this.controller.oldPencilDoc = true;
        var dom = Controller.parser.parseFromString(fs.readFileSync(filePath, "utf8"), "text/xml");

        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            thiz.controller.doc.properties[propNode.getAttribute("name")] = propNode.textContent;
        });

        var pageNodes = Dom.getList("./p:Pages/p:Page", dom.documentElement);
        console.log(pageNodes);
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
            if (index >= thiz.controller.doc.pages.length) {
                if (onDone) onDone();
                return;
            }
            var page = thiz.controller.doc.pages[index];
            thiz.controller.updatePageThumbnail(page, function () {
                generateNextThumbnail(onDone);
            });
        }
        if (pageNodes.length == 0 && index == -1 && pageNodeIndex == -1) throw "Wrong format.";
        parseNextPageNode(function () {
            generateNextThumbnail(function () {
                thiz.controller.modified = false;
                thiz.controller.sayControllerStatusChanged();
                if (thiz.controller.doc.pages.length > 0) thiz.controller.activatePage(thiz.controller.doc.pages[0]);
                thiz.controller.pathToRefCache = null;
                if (callback) callback();
                ApplicationPane._instance.unbusy();
            });
        });

        this.controller.doc.name = this.controller.getDocumentName();
        Pencil.documentHandler.preDocument = filePath;
    } catch (e) {
        console.log(e);

        ApplicationPane._instance.unbusy();
        Dialog.alert("Unexpected error while accessing file: " + path.basename(filePath), null, function() {
            (oldPencilDocument != null) ? Pencil.documentHandler.loadDocument(oldPencilDocument) : function() {
                Pencil.controller.confirmAndclose(function () {
                    Pencil.documentHandler.resetDocument();
                    ApplicationPane._instance.showStartupPane();
                });
            };
        });
    }
};

FileHandler.prototype.parseDocument = function (filePath, callback) {
    var targetDir = Pencil.documentHandler.tempDir.name;
    var oldPencilDocument = Pencil.documentHandler.preDocument;
    var thiz = this;
    try {
        var contentFile = path.join(targetDir, "content.xml");
        if (!fs.existsSync(contentFile)) throw Util.getMessage("content.specification.is.not.found.in.the.archive");
        var dom = Controller.parser.parseFromString(fs.readFileSync(contentFile, "utf8"), "text/xml");
        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            var value = propNode.textContent;
            if (value == "undefined" || value == "null") return;
            thiz.controller.doc.properties[propNode.getAttribute("name")] = value;
        });
        Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
            var page = new Page(thiz.controller.doc);
            var pageFileName = pageNode.getAttribute("href");
            page.pageFileName = pageFileName;
            page.tempFilePath = path.join(targetDir, pageFileName);
            thiz.controller.doc.pages.push(page);
        });

        thiz.controller.doc.pages.forEach(function (page) {
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

            var thumbPath = path.join(this.controller.makeSubDir(Controller.SUB_THUMBNAILS), page.id + ".png");
            if (fs.existsSync(thumbPath)) {
                page.thumbPath = thumbPath;
                page.thumbCreated = new Date();
            }
            page.canvas = null;
        }, thiz);

        thiz.controller.doc.pages.forEach(function (page) {
            if (page.backgroundPageId) {
                page.backgroundPage = this.controller.findPageById(page.backgroundPageId);
                thiz.controller.invalidateBitmapFilePath(page);
            }

            if (page.parentPageId) {
                var parentPage = this.controller.findPageById(page.parentPageId);
                page.parentPage = parentPage;
                parentPage.children.push(page);
            }
        }, thiz);

        thiz.controller.documentPath = filePath;
        thiz.controller.oldPencilDoc = false;
        thiz.controller.doc.name = thiz.controller.getDocumentName();
        thiz.controller.modified = false;
        thiz.controller.addRecentFile(filePath, thiz.controller.getCurrentDocumentThumbnail());
        FontLoader.instance.setDocumentRepoDir(path.join(targetDir, "fonts"));
        FontLoader.instance.loadFonts(function () {
            thiz.controller.sayControllerStatusChanged();
            if (thiz.controller.doc.properties.activeId) {
                thiz.controller.activatePage(thiz.controller.findPageById(thiz.controller.doc.properties.activeId));
            } else {
                if (thiz.controller.doc.pages.length > 0) thiz.controller.activatePage(thiz.controller.doc.pages[0]);
            }
            thiz.controller.applicationPane.onDocumentChanged();
            thiz.modified = false;
            if (callback) callback();
            ApplicationPane._instance.unbusy();
        });
        Pencil.documentHandler.preDocument = filePath;
    } catch (e) {
        // Pencil.documentHandler.newDocument()
        console.error(e);
        ApplicationPane._instance.unbusy();
        Dialog.alert("Unexpected error while accessing file: " + path.basename(filePath), null, function() {
            (oldPencilDocument != null) ? Pencil.documentHandler.loadDocument(oldPencilDocument) : function() {
                Pencil.controller.confirmAndclose(function () {
                    Pencil.documentHandler.resetDocument();
                    ApplicationPane._instance.showStartupPane();
                });
            };
        });
    }
}

FileHandler.prototype.parseDocumentThumbnail = function (filePath, callback) {
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

FileHandler.prototype.parsePageFromNode = function (pageNode, callback) {
    var thiz = this;
    var page = new Page(this.controller.doc);
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
        page.tempFilePath = path.join(Pencil.documentHandler.tempDir.name, pageFileName);

        thiz.controller.serializePage(page, page.tempFilePath);
        delete page._contentNode;
        thiz.controller.doc.pages.push(page);
    }

    var contentNode = Dom.getSingle("./p:Content", pageNode);
    if (contentNode) {
        var node = document.importNode(contentNode.cloneNode(true), true);
        this.controller.invalidateContentNode(node, function () {
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
