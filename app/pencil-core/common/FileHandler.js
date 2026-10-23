function FileHandler(controller){
    this.controller = controller;
}

FileHandler.ERROR_NOT_FOUND = "ERROR_NOT_FOUND";
FileHandler.ERROR_FILE_LOADING_FAILED = "ERROR_FILE_LOADING_FAILED";
FileHandler.ERROR_FILE_SAVING_FAILED = "ERROR_FILE_SAVING_FAILED";


FileHandler.prototype.parseDocument = function (filePath, callback) {
    var targetDir = Pencil.documentHandler.tempDir.name;
    var oldPencilDocument = Pencil.documentHandler.preDocument;
    var thiz = this;
    try {
        var contentFile = path.join(targetDir, "content.xml");
        if (!fs.existsSync(contentFile)) {
            if (callback) callback(new Error(Util.getMessage("content.specification.is.not.found.in.the.archive")));
            return;
        }

        var dom = Controller.parser.parseFromString(fs.readFileSync(contentFile, "utf8"), "text/xml");
        Dom.workOn("./p:Properties/p:Property", dom.documentElement, function (propNode) {
            var value = propNode.textContent;
            if (value == "undefined" || value == "null") return;
            thiz.controller.doc.properties[propNode.getAttribute("name")] = value;
        });
        Dom.workOn("./p:Pages/p:Page", dom.documentElement, function (pageNode) {
            if (!pageNode) return;
            var pageFileName = pageNode.getAttribute("href");
            if (pageFileName == null) return;
            var pageFile = path.join(targetDir, pageFileName);
            if (!fs.existsSync(pageFile)) {
                return;
            }
            var page = new Page(thiz.controller.doc);
            page.pageFileName = pageFileName;
            page.tempFilePath = pageFile;
            thiz.controller.doc.pages.push(page);
        });

        thiz.controller.doc.pages.forEach(function (page) {
            var pageFile = page.tempFilePath;
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
            } else {
                thiz.controller.invalidateBitmapFilePath(page);
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
                if (parentPage){
                    page.parentPage = parentPage;
                    parentPage.children.push(page);
                } else {
                    console.log("Remove parent page due to does not exist --> " + page.parentPageId);
                    delete page.parentPageId;
                }
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
            var activePage = null;
            if (thiz.controller.doc.properties.activeId) {
                activePage = thiz.controller.findPageById(thiz.controller.doc.properties.activeId);
            }
            if (activePage == null && thiz.controller.doc.pages.length > 0) {
                activePage = thiz.controller.doc.pages[0];
            }
            if (activePage != null) {
                thiz.controller.activatePage(activePage);
            }
            thiz.controller.applicationPane.onDocumentChanged();
            thiz.modified = false;
            if (callback) callback();
        });
        Pencil.documentHandler.preDocument = filePath;
    } catch (e) {
        // Pencil.documentHandler.newDocument()
        console.log(e);
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

        if (page.backgroundPageId) page.backgroundPage = thiz.controller.findPageById(page.backgroundPageId);

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
