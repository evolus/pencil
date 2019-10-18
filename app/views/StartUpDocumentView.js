function StartUpDocumentView() {
    BaseTemplatedWidget.call(this);

    var gridViewCheck = Config.get("view.startupscreen.gridview.enabled");
    if (gridViewCheck == null) {
        Config.set("view.startupscreen.gridview.enabled", true);
        gridViewCheck = true;
    }
    if (!gridViewCheck) {
        Dom.addClass(this.recentDocumentRepeater.node(), "RowView");
        Dom.addClass(this.listViewButton, "Active");
    } else {
        Dom.addClass(this.gridViewButton, "Active");
    }
    this.recentDocumentRepeater.populator = function (doc, binding) {
        var filePath = doc.filePath;
        var handler = function (error, thumbPath) {
            var stats = fs.statSync(filePath);
            if (stats) {
                binding.name.innerHTML = Dom.htmlEncode(path.basename(filePath));
                binding.info.innerHTML = Dom.htmlEncode(moment(stats.mtime).fromNow());
                if (!gridViewCheck) binding.path.innerHTML = Dom.htmlEncode(filePath);
                var pinDocs = Config.get("pin-documents");
                if (pinDocs && pinDocs.indexOf(filePath) >= 0) Dom.addClass(binding.pin, "Unpin");
                if (thumbPath) {
                    window.setTimeout(function () {
                        Util.setupImage(binding.thumbnailImage, ImageData.filePathToURL(thumbPath), "center-crop", "allowUpscale");
                    }, 10);
                }
                binding._node._filePath = filePath;
                binding._node._pin = doc.pin;
                binding._node.setAttribute("title", filePath);
            }
        };

        if (doc.thumbPath) {
            handler(null, doc.thumbPath);
        } else {
            handler(null, "");
            //Pencil.documentHandler.parseDocumentThumbnail(filePath, handler);
        }
    }

    var thiz = this;
    this.bind ("click", function(ev) {
        var button = Dom.findUpward(ev.target, function(node) {
            if (node == thiz.listViewButton || node == thiz.gridViewButton) return true;
            return false;
        })
        if (button == thiz.gridViewButton) {
            if (gridViewCheck) return;
            gridViewCheck = true;
            Dom.removeClass(thiz.recentDocumentRepeater.node(), "RowView");
            Dom.removeClass(thiz.listViewButton, "Active");
            Dom.addClass(thiz.gridViewButton, "Active");
            Config.set("view.startupscreen.gridview.enabled", true);
            thiz.recentDocumentRepeater.setItems(thiz.startDocs);
        } else {
            if (!gridViewCheck) return;
            gridViewCheck = false;
            Dom.addClass(thiz.recentDocumentRepeater.node(), "RowView");
            Dom.removeClass(thiz.gridViewButton, "Active");
            Dom.addClass(thiz.listViewButton, "Active");
            Config.set("view.startupscreen.gridview.enabled", false);
            thiz.recentDocumentRepeater.setItems(thiz.startDocs);
        }
    }, this.changeViewButtons);

    this.bind("click", function (event) {
        var node = Dom.findUpward(event.target, function(node) {
            if (node.getAttribute("command") == "pinDocument") return true;
            return false;
        })

        var filePath = Dom.findUpwardForData(event.target, "_filePath");
        if (!filePath) return;
        //var pinCheck = Dom.findUpwardForData(event.target, "_pin");

        if (node) {
            var pinFiles = Config.get("pin-documents") || [];
            var pinMaps = Config.get("pin-documents-thumb-map") || {};
            var index = pinFiles.indexOf(filePath);
            if (index < 0) {
                if (pinFiles.length >= 8) {
                    delete pinMaps[pinFiles[7]];
                    pinFiles.pop();
                }
                pinFiles.unshift(filePath);
                var recentMap = Config.get("recent-documents-thumb-map") || null;
                if (recentMap) {
                    pinMaps[filePath] = recentMap[filePath];
                }
                Dom.addClass(node, "Unpin");
            } else {
                pinFiles.splice(index, 1);
                delete pinMaps[filePath];
                Dom.removeClass(node, "Unpin");
            }
            Config.set("pin-documents", pinFiles);
            Config.set("pin-documents-thumb-map", pinMaps);
            return;
        }
        function handler() {
            Pencil.documentHandler.loadDocument(filePath);
        }
        if (Pencil.controller.modified) {
            Pencil.documentHandler.confirmAndSaveDocument(handler);
            return;
        }
        handler();

    }, this.recentDocumentRepeater);

    Dom.doOnAllChildRecursively(this.node(), function (n) {
        if (!n.getAttribute || !n.getAttribute("command")) return;
        var command = n.getAttribute("command");
        UICommandManager.installControl(command, n);
    });

    this.bind("click", function () {
        Controller._instance.handleGlobalScreencapture();
    }, this.takeScreenshotButton);

}

__extend(BaseTemplatedWidget, StartUpDocumentView);


StartUpDocumentView.prototype.reload = function () {
    var recentFiles = Config.get("recent-documents") || [];
    var pinFiles = Config.get("pin-documents") || [];

    var pinMap = Config.get("pin-documents-thumb-map") || {};
    var recentMap = Config.get("recent-documents-thumb-map") || {};

    var recentDocs = [];
    var pinDocs = [];

    var loadFiles = function (files, deletedFiles, pinFlag) {
        var doc = [];
        for (var i = 0; i < Math.min(files.length, 8); i++) {
            var checkExist = fs.existsSync(files[i]);
            if(!checkExist) {
                deletedFiles.push(files[i]);
            } else {
                if (!pinFlag && pinFiles.indexOf(files[i]) >= 0) continue;
                var stats = fs.statSync(files[i]);
                doc.push({
                    filePath: files[i],
                    thumbPath: (pinFlag == true) ? (pinMap[files[i]] || null) : (recentMap[files[i]] || null),
                    pin: pinFlag,
                    time: stats.mtime
                });
            }
        }
        return doc;
    }

    var deleteFiles = [];
    if (recentFiles) {
        recentDocs = loadFiles(recentFiles, deleteFiles, false);
        if (deleteFiles.length > 0) {
            for (var i = 0; i < deleteFiles.length; i++) {
                Pencil.controller.removeRecentFile(deleteFiles[i]);
            }
        }
    }
    if (pinFiles) {
        deleteFiles = [];
        pinDocs = loadFiles(pinFiles, deleteFiles, true);
        if (deleteFiles.length > 0) {
            for (var i = 0; i < deleteFiles.length; i++) {
                if (pinMap[deleteFiles[i]]) delete pinMap[deleteFiles[i]];
                var index = pinFiles.indexOf(deleteFiles[i]);
                pinFiles.splice(index, 1);
            }
            Config.set("pin-documents", pinFiles);
            Config.set("pin-documents-thumb-map", pinMap);
        }
    }
    var startDocs = pinDocs;
    if (startDocs.length < 8 && recentDocs.length > 0) {
        var docLeft = 8 - startDocs.length;
        startDocs = recentDocs.slice(0, Math.min(docLeft, recentDocs.length)).concat(startDocs);
    }
    startDocs.sort(function(a,b){
        var aIndex = recentFiles.indexOf(a.filePath);
        var bIndex = recentFiles.indexOf(b.filePath);
        return aIndex - bIndex;
    });
    this.changeViewButtons.style.visibility = "hidden";
    if (startDocs.length > 0) {
        this.startDocs = startDocs;
        this.changeViewButtons.style.visibility = "inherit";

    }

    var thiz = this;
    this.recentDocumentRepeater.node().style.visibility = "hidden";
    setTimeout(function () {
        thiz.recentDocumentRepeater.setItems(startDocs);
        thiz.recentDocumentRepeater.node().style.visibility = "inherit";
    }, 200);

};
