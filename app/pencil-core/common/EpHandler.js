function EpHandler(controller) {
    FileHandler.call(this);
    this.controller = controller;
    this.name = "Pencil Document (Legacy)";
    this.type = ".ep";
}
__extend(FileHandler, EpHandler);

EpHandler.prototype.parseOldFormatDocument = function (filePath, callback) {
    var targetDir = Pencil.documentHandler.tempDir.name;
    var oldPencilDocument = Pencil.documentHandler.preDocument;
    var thiz = this;
    this.pathToRefCache = null;
    try {
        if (path.extname(filePath) != ".ep") {
            callback(new Error("Invalid file format."));
            return;
        }

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
            });
        });

        this.controller.doc.name = this.controller.getDocumentName();
        Pencil.documentHandler.preDocument = filePath;
    } catch (e) {
        callback(new Error("Invalid file format."));
    }
};
EpHandler.prototype.loadDocument = function(filePath, callback) {
    var thiz = this;
    return new Promise(function (resolve, reject) {
        if (!fs.existsSync(filePath)) {
            throw new Error("File not found.");
        }

        thiz.parseOldFormatDocument(filePath, function (err) {
            if (err) {
                reject(new Error("Unable to parse file: " + err));
            } else {
                resolve();
            }
        });
    });
}
