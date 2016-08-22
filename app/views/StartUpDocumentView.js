function StartUpDocumentView() {
    BaseTemplatedWidget.call(this);

    var gridViewCheck = Config.get("view.recentGridView");
    if (gridViewCheck == null) {
        Config.set("view.recentGridView", true);
        gridViewCheck = true;
    }
    if (gridViewCheck) this.currentRepeater = this.recentDocumentRepeater;
    else this.currentRepeater = this.recentDocumentRepeaterRow;

    this.currentRepeater.populator = function (doc, binding) {
        var filePath = doc.filePath;
        var handler = function (error, thumbPath) {
            var stats = fs.statSync(filePath);
            if (stats) {
                binding.name.innerHTML = Dom.htmlEncode(path.basename(filePath));
                binding.info.innerHTML = Dom.htmlEncode(moment(stats.mtime).fromNow());
                if (binding.path) {
                    binding.path.innerHTML = Dom.htmlEncode(filePath);
                }
                if (thumbPath) {
                    window.setTimeout(function () {
                        Util.setupImage(binding.thumbnailImage, ImageData.filePathToURL(thumbPath), "center-crop", "allowUpscale");
                    }, 10);
                }
                binding._node._filePath = filePath;
                binding._node.setAttribute("title", filePath);
            }
        };

        if (doc.thumbPath) {
            handler(null, doc.thumbPath);
        } else {
            Pencil.controller.parseDocumentThumbnail(filePath, handler);
        }
    }

    var thiz = this;
    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function(node) {
            if (node.getAttribute("command") == "pinDocument") return true;
            return false;
        })

        var filePath = Dom.findUpwardForData(event.target, "_filePath");
        if (!filePath) return;

        if (node) {
            var bookFiles = Config.get("favorite-documents");
            for (var i = 0; i < bookFiles.length; i++) {
                if (bookFiles[i] == filePath) {
                    bookFiles.splice(i,1);
                    break;
                }
            }
            Config.set("favorite-documents", bookFiles);

            var recentFile = Config.get("recent-documents");
            recentFile.push(filePath);
            Config.set("recent-document", recentFile);
            thiz.reload();
            return;
        }

        function handler() {
            Pencil.controller.loadDocument(filePath);
        }
        if (Pencil.controller.modified) {
            Pencil.controller.confirmAndSaveDocument(handler);
            return;
        }
        handler();

    }, this.currentRepeater);

    Dom.doOnAllChildRecursively(this.node(), function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        UICommandManager.installControl(command, n);
    });

}

__extend(BaseTemplatedWidget, StartUpDocumentView);

StartUpDocumentView.prototype.reload = function () {
    var files = Config.get("recent-documents");
    var favoriteFiles = Config.get("favorite-documents");
    var map = Config.get("recent-documents-thumb-map") || {};
    var recentDocs = [];
    var favoDocs = [];
    var loadFiles = function (files, deletedFiles) {
        var doc = [];
        for (var i = 0; i < Math.min(files.length, 8); i++) {
            var checkExist = fs.existsSync(files[i]);
            if(!checkExist) {
                deletedFiles.push(files[i]);
            } else {
                doc.push({
                    filePath: files[i],
                    thumbPath: map[files[i]] || null
                });
            }
        }
        return doc;
    }
    var deleteFiles = [];
    if (files) {
        recentdocs = loadFiles(files, deleteFiles);
        if (deleteFiles.length > 0) {
            for (var i = 0; i < deleteFiles.length; i++) {
                Pencil.controller.removeRecentFile(deleteFiles[i]);
            }
        }
    }

    deleteFiles = [];
    if (favoriteFiles) {
        favoDocs = loadFiles(favoriteFiles, deleteFiles);
        if (deleteFiles.length > 0) {
            for (var i = 0; i < deleteFiles.length; i++) {
                favoriteFiles.splice(i, 1);
            }
            Config.set("favorite-documents", favoriteFiles);
        }
    }

    var thiz = this;
    this.currentRepeater.node().style.visibility = "hidden";
    // reload Favorite Documents

    setTimeout(function () {
        thiz.currentRepeater.setItems(recentdocs);
        thiz.currentRepeater.node().style.visibility = "inherit";
    }, 200);
};
