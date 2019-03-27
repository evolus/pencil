function StencilCollectionBuilder(controller) {
    this.controller = controller;
}

StencilCollectionBuilder.COLLECTION_UTIL = `
collection.BOUND_CALCULATOR = {
    L: function (box, v) { return (box.x || 0) + v;},
    T: function (box, v) { return (box.y || 0) + v;},
    R: function (box, v) { return (box.x || 0) + box.w - v;},
    B: function (box, v) { return (box.y || 0) + box.h - v;},
    C: function (box, v) { return (box.x || 0) + box.w / 2 + v;},
    M: function (box, v) { return (box.y || 0) + box.h / 2 + v;},
    H0X: function (box, v, h0, h1) {
        return h0.x + v;
    },
    H0Y: function (box, v, h0, h1) {
        return h0.y + v;
    },
    H1X: function (box, v, h0, h1) {
        return h1.x + v;
    },
    H1Y: function (box, v, h0, h1) {
        return h1.y + v;
    },

    calculate: function (box, spec, h0, h1) {
        var matchResult = null;
        if (matchResult = spec.match(/^(([a-zA-Z0-9]+)\\.)?([A-Z0-9]*[A-Z])([0-9\\-]+)$/)) {
            var bounding = box;
            var targetName = RegExp.$2;
            var func = RegExp.$3;
            var delta = RegExp.$4;
            if (targetName) {
                var shapeNode = Dom.findUpward(F._target, {eval: function (node) {
                    return node.hasAttributeNS && node.getAttributeNS(PencilNamespaces.p, "type") == "Shape";
                }});

                if (shapeNode) {
                    var name = targetName;
                    if (targetName.match(/^text.*/)) name += "text"; //HACK: use text element natural bound

                    var node = Dom.getSingle(".//svg:*[@p:name='" + name + "']", shapeNode);
                    if (node) {
                        var bbox = node.getBBox();
                        if (bbox.width > 0 && bbox.height > 0) {
                            bounding = {
                                x: bbox.x,
                                y: bbox.y,
                                w: bbox.width,
                                h: bbox.height
                            };
                        }
                    }
                }
            }

            return collection.BOUND_CALCULATOR[func](bounding, parseInt(delta, 10), h0, h1);
        }
        return 0;
    }
};
collection.toBounds = function (box, textBounds, h0, h1) {
    var literal = textBounds.value || textBounds.toString();
    var parts = literal.split(",");
    var x = collection.BOUND_CALCULATOR.calculate(box, parts[0], h0, h1);
    var y = collection.BOUND_CALCULATOR.calculate(box, parts[1], h0, h1);
    var w = collection.BOUND_CALCULATOR.calculate(box, parts[2], h0, h1) - x;
    var h = collection.BOUND_CALCULATOR.calculate(box, parts[3], h0, h1) - y;

    return new Bound(x, y, w, h);
};
collection.calculateBoundsFromPolicy = function (box, originalInfo, policy) {
    var hLayout = Group.calculateLayout(originalInfo.x0, originalInfo.w0, originalInfo.gw0, policy.xPolicy, policy.wPolicy, box.w, originalInfo.w0);
    var vLayout = Group.calculateLayout(originalInfo.y0, originalInfo.h0, originalInfo.gh0, policy.yPolicy, policy.hPolicy, box.h, originalInfo.h0);

    return new Bound(Math.round(hLayout.pos), Math.round(vLayout.pos), Math.round(hLayout.size), Math.round(vLayout.size));
};
collection.copyClipboardImage = function (target, imageDataPropName, boxPropName) {
    try {
        var image = clipboard.readImage();
        if (image) {
            var id = Pencil.controller.nativeImageToRefSync(image);

            var size = image.getSize();
            var newImageData = new ImageData(size.width, size.height, ImageData.idToRefString(id));
            target.setProperty(imageDataPropName, newImageData);
            if (boxPropName) target.setProperty(boxPropName, new Dimension(size.width, size.height));
        }
    } catch (e) {
        console.error(e);
    }
};
collection.copyClipboardSVGImage = function (target, imageDataPropName, boxPropName, dontParsePathData) {
    var thiz = target;

    var text = clipboard.readText();

    var dom = Canvas.domParser.parseFromString(text, "text/xml");

    if (!dom || dom.documentElement.namespaceURI != PencilNamespaces.svg) {
        return;
    }

    var width = Svg.getWidth(dom);
    var height = Svg.getHeight(dom);

    //parse the provided svg viewBox
    if (dom.documentElement.viewBox) {
        var viewBox = dom.documentElement.viewBox.baseVal;
        if (viewBox.width > 0 && viewBox.height > 0) {
            width = viewBox.width;
            height = viewBox.height;
        }
    }

    width = Math.round(width);
    height = Math.round(height);

    var data = "";

    if (!dontParsePathData) {
        var parsedData = [];
        Dom.workOn("//svg:path[@d]", dom.documentElement, function (pathNode) {
            var d = pathNode.getAttribute("d");
            var parsed = thiz.def.collection.parsePathData(d);
            var pathInfo = {
                commands: parsed,
                style: pathNode.getAttribute("style")
            };
            parsedData.push(pathInfo);
        });

        var dim = new Dimension(width, height);
        if (boxPropName) target.setProperty(boxPropName, dim);

        data = "json:" + JSON.stringify(parsedData);
    } else {
        data = ImageData.SVG_IMAGE_DATA_PREFIX + "," + text;
    }

    var imageData = new ImageData(width, height, data);
    target.setProperty(imageDataPropName, imageData);
};

collection.buildNPatchModel = function (cells, originalSize, newSize) {
    var totalScaleSize = 0;
    for (var cell of cells) totalScaleSize += (cell.to - cell.from);

    var r = (newSize - (originalSize - totalScaleSize)) / totalScaleSize;

    var models = [];
    var total = 0;
    var scaledTotal = 0;
    var last = false;

    //add a sentinel
    cells = cells.concat([{from: originalSize, to: originalSize + 1}]);

    for (var i = 0; i < cells.length; i ++) {
        var cell = cells[i];
        if (cell.from == cell.to) continue;

        var last = (i == cell.length - 2);

        var model = null;
        if (cell.from > total) {
            model = {
                start: total,
                size: cell.from - total,
                scaledStart: scaledTotal,
                scale: false
            };

            models.push(model);
            total = cell.from;
            scaledTotal += model.size;
        }

        if (cell.from >= originalSize) break;

        var scaledSize = (last ? (newSize - (originalSize - cell.to) - scaledTotal) : (r * (cell.to - cell.from)));

        model = {
            start: total,
            size: cell.to - cell.from,
            scaledStart: scaledTotal,
            scaledSize: scaledSize,
            scale: true
        };

        model.r = model.scaledSize / model.size;

        models.push(model);
        total = cell.to;
        scaledTotal += model.scaledSize;
    }

    return models;
};

collection.parsePathData = function (pathDataLiteral) {
    function normalize(pin) {
        pin.x = Math.round(pin.x);
        if (typeof(pin.y) == "number") pin.y = Math.round(pin.y);
    }
    function normalizeAll(pins) {
        for (var pin of pins) normalize(pin);
    }

    function processMultiPoints(points, current, chunk, relative) {
        var count = Math.ceil(points.length / chunk);
        for (var i = 0; i < count; i ++) {
            var pin = points[i * chunk + (chunk - 1)];

            for (var j = 0; j < (chunk - 1); j ++) {
                var p = points[i * chunk + j];
                if (relative) {
                    p.x += current.x;
                    p.y += current.y;
                }

                p.fixed = true;
            }

            normalize(pin);

            if (relative) {
                pin.x += current.x;
                pin.y += current.y;
            }
            current = pin;
        }

        return current;
    }

    //parse the original data
    var RE = /([A-Z])([^A-Z]*)/gi;
    var commands = [];
    var result = null;
    var current = {x: 0, y: 0};
    while ((result = RE.exec(pathDataLiteral))) {
        var c = result[1];
        var command = {
            command: c.toUpperCase()
        };
        var data = result[2].trim();
        if (data) {
            var DATA_RE = /(\-?[0-9\.]+)(\,(\-?[0-9\.]+))?/g;
            var points = [];
            var result2 = null;
            while ((result2 = DATA_RE.exec(data))) {
                var x = parseFloat(result2[1]);
                var y = result2[3];
                if (y) y = parseFloat(y);
                points.push({
                    x: x,
                    y: y
                });
            }

            if (c == "M" || c == "L" || c == "T") {
                normalizeAll(points);
                command.points = points;
                current = points[points.length - 1];
            } else if (c == "m" || c == "l" || c == "t") {
                for (var p of points) {
                    p.x += current.x;
                    p.y += current.y;

                    current = p;
                }
                normalizeAll(points);
                command.points = points;
            } else if (c == "H") {
                for (var p of points) {
                    console.log("HX:", p.x);
                    p.y = current.y;
                    current = p;
                }
                normalizeAll(points);
                command.points = points;
                command.command = "L";
            } else if (c == "h") {
                for (var p of points) {
                    p.x += current.x;
                    p.y = current.y;
                    current = p;
                }
                normalizeAll(points);
                command.points = points;
                command.command = "L";
            } else if (c == "V") {
                for (var p of points) {
                    p.y = p.x;
                    p.x = current.x;
                    current = p;
                }
                normalizeAll(points);
                command.points = points;
                command.command = "L";
            } else if (c == "v") {
                for (var p of points) {
                    p.y = p.x + current.y;
                    p.x = current.x;
                    current = p;
                }
                normalizeAll(points);
                command.points = points;
                command.command = "L";
            } else if (c == "c" || c == "C") {
                current = processMultiPoints(points, current, 3, c == "c");
                command.points = points;
            } else if (c == "s" || c == "S") {
                current = processMultiPoints(points, current, 2, c == "s");

                command.points = points;
            } else if (c == "q" || c == "Q") {
                current = processMultiPoints(points, current, 2, c == "q");
                command.points = points;
            } else if ((c == "a" || c == "A") && points.length == 5) {
                for (var p of points) {
                    p.fixed = true;
                    p.noRelativeRecalcuate = true;
                    console.log("p.y", p.y);
                }
                var pin = points[4];
                pin.fixed = false;
                pin.noRelativeRecalcuate = false;
                if (c == "a") {
                    pin.x += current.y;
                    pin.y += current.y;
                }
                current = pin;

                normalizeAll(points);
                command.points = points;
                command.command = "A";
            }
        }

        commands.push(command);
    }

    return commands;

};

collection.calculateScaledPosition = function (value, models) {
    if (!models || models.length == 0) return value;
    var m = null;

    if (value < models[0].start) {
        m = models[0];
    } else {
        for (var model of models) {
            if (model.start <= value && value < (model.start + model.size)) {
                m = model;
                break;
            }
        }

        if (!m) m = models[models.length - 1];
    }

    if (m) {
        var d = value - m.start;

        if (m.scale) d *= m.r;

        return d + m.scaledStart;
    }

    return value;
};


collection.scalePathData = function (pathCommands, xCells, yCells, originalSize, newSize) {
    xCells = xCells || [];
    yCells = yCells || [];

    var xModel = collection.buildNPatchModel(xCells, originalSize.w, newSize.w);
    var yModel = collection.buildNPatchModel(yCells, originalSize.h, newSize.h);

    var newData = "";

    for (var command of pathCommands) {
        if (command.points) {
            var last = -1;
            for (var i = 0; i < command.points.length; i ++) {
                var pin = command.points[i];
                if (pin.fixed) {
                    continue;
                }

                var x = collection.calculateScaledPosition(pin.x, xModel);
                var y = collection.calculateScaledPosition(pin.y, yModel);

                for (var j = last + 1; j < i; j ++) {
                    if (command.points[j].noRelativeRecalcuate) continue;
                    command.points[j].x = x + command.points[j].x - pin.x;
                    if (typeof(command.points[j].y) == "number") command.points[j].y = y + command.points[j].y - pin.y;
                }

                pin.x = x;
                pin.y = y;
                last = i;
            }
        }

        if (newData) newData += " ";
        newData += command.command;
        if (command.points) {
            for (var i = 0; i < command.points.length; i ++) {
                var y = command.points[i].y;
                newData += (i > 0 ? " " : "") + command.points[i].x + (typeof(y) == "number" ? ("," + y) : "");
            }
        }
    }

    return newData;
};
collection.generatePathDOM = function (svgPathData, size, keepPathStyle) {
    var specs = [];
    var json = svgPathData.data;
    if (!json.startsWith("json:")) return specs;
    var parsedPathData = JSON.parse(json.substring(5));

    for (var info of parsedPathData) {
        var d = collection.scalePathData(info.commands, svgPathData.xCells, svgPathData.yCells, svgPathData, size);
        specs.push({
            _name: "path",
            _uri: PencilNamespaces.svg,
            d: d,
            style: keepPathStyle ? info.style : ""
        });
    }

    return Dom.newDOMFragment(specs);
};
collection.generateAdvancedRectPathData = function (box, strokeStyle, r, withTop, withRight, withBottom, withLeft, withTopLeftCorner, withTopRightCorner, withBottomRightCorner, withBottomLeftCorner) {
    var x = r * 4 * (Math.sqrt(2) - 1) / 3;
    var w = box.w - strokeStyle.w * ((withLeft ? 0.5 : 0) + (withRight ? 0.5 : 0));
    var h = box.h - strokeStyle.w * ((withTop ? 0.5 : 0) + (withBottom ? 0.5 : 0));
    var parts = [
    ];
    var close = true;
    if (withTop) {
        parts.push(L(w - (withRight && withTopRightCorner ? r : 0),0));
        if (withRight && withTopRightCorner && r > 0) parts.push(c(x,0,r,r-x,r,r));
    } else {
        parts.push(M(w,0));
        close = false;
    }

    if (withRight) {
        parts.push(L(w,h - (withBottom && withBottomRightCorner ? r : 0)));
        if (withBottom && withBottomRightCorner && r > 0) parts.push(c(0,x,x-r,r,0-r,r));
    } else {
        parts.push(M(w,h));
        close = false;
    }

    if (withBottom) {
        parts.push(L(withLeft && withBottomLeftCorner ? r : 0,h));
        if (withLeft && withBottomLeftCorner && r > 0) parts.push(c(x-r,0,0-r,x-r,0-r,0-r));
    } else {
        parts.push(M(0,h));
        close = false;
    }

    if (withLeft) {
        parts.push(L(0,withTop && withTopLeftCorner ? r : 0));
        if (withTop && withTopLeftCorner && r > 0) parts.push(c(0,0-x,r-x,0-r,r,0-r));
    } else {
        parts.push(M(0,0));
        close = false;
    }

    if (close) parts.push(z);

    var firstMove = -1;
    for (var i = 0; i < parts.length; i ++) {
        if (parts[i].indexOf("M") == 0) {
            firstMove = i;
            break;
        }
    }

    if (firstMove > 0) {
        while (firstMove > 0) {
            parts.push(parts.shift());
            firstMove --;
        }
    } else {
        parts.unshift(M(withLeft ? r : 0,0));
    }

    return parts;
};
collection.toColorizedDOMNode = function (svgXML, color) {
    if (!svgXML) return document.createDocumentFragment();

    var svg = Dom.parseDocument(svgXML);

    if (color) {
        var c = color.toRGBAString();
        Dom.workOn("//svg:*", svg, function (node) {
            if (node.style.fill != "none") {
                node.style.fill = c;
            }
            if (node.style.stroke && node.style.stroke != "none") {
                node.style.stroke = c;
            }

            var a = node.getAttribute("fill");
            if (a != "none") node.setAttribute("fill", c);

            a = node.getAttribute("stroke");
            if (a && a != "none") node.setAttribute("stroke", c);
        });
    }

    var g = svg.createElementNS(PencilNamespaces.svg, "g");
    while (svg.documentElement.firstChild) {
        var child = svg.documentElement.firstChild;
        svg.documentElement.removeChild(child);
        g.appendChild(child);
    }

    return g;
};
`;

StencilCollectionBuilder.COLLECTION_RESOURCE_SCRIPT = `
collection.browseResource = function (setNames, type, returnType, callback) {
    var options = {
        prefixes: [],
        type: type || CollectionResourceBrowserDialog.TYPE_BITMAP,
        returnType: returnType || CollectionResourceBrowserDialog.RETURN_IMAGEDATA
    };

    setNames = (setNames || "").trim();

    for (var resource of collection.RESOURCE_LIST) {
        if ((!resource.type || resource.type == options.type) && (!setNames || setNames.indexOf(resource.name) >= 0)) {
            options.prefixes.push(resource);
        }
    }

    CollectionResourceBrowserDialog.open(collection, options, callback);
};
`;


StencilCollectionBuilder.SUBDIR_BITMAPS = "bitmaps";
StencilCollectionBuilder.SUBDIR_VECTORS = "vectors";

StencilCollectionBuilder.prototype.getPageMargin = function () {
    var pageMargin = Pencil.controller.getDocumentPageMargin();
    return pageMargin || 0;
};
StencilCollectionBuilder.prototype.toCollectionReadyImageData = function (imageData, name, isVectorHint, source) {
    var value = ImageData.fromString(imageData.toString());
    if (value.data && value.data.match(/^ref:\/\//)) {
        var id = ImageData.refStringToId(value.data);
        if (id) {
            var vector = (typeof(isVectorHint) == "boolean") ? isVectorHint : value.data.match(/svg$/);
            console.log("value.data", value.data, vector ? true: false, "hint: " + isVectorHint, source);
            var resourceType = vector ? StencilCollectionBuilder.SUBDIR_VECTORS : StencilCollectionBuilder.SUBDIR_BITMAPS;
            var filePath = Pencil.controller.refIdToFilePath(id);

            var bitmapImageFileName = (StencilCollectionBuilder._currentPage.name + "-" + name).replace(/[^a-z0-9\\-]+/gi, "").toLowerCase() + (vector ? ".svg" : ".png");

            var dir = vector ? this.currentVectorDir : this.currentBitmapDir;

            if (!fs.existsSync(dir)) fs.mkdirSync(dir);

            var targetPath = path.join(dir, bitmapImageFileName);
            fs.writeFileSync(targetPath, fs.readFileSync(filePath));

            value = new ImageData(value.w, value.h, "collection://" + (resourceType) + "/" + bitmapImageFileName, value.xCells, value.yCells);

            this.collectedResourceTypes[resourceType] = true;
        }
    }
    return value;
};
StencilCollectionBuilder.getCurrentDocumentOptions = function () {
    var json = Pencil.controller.doc.properties.stencilBuilderOptions;
    if (json) {
        try {
            return JSON.parse(json);
        } catch (e) {
            console.error(e);
        }
    }

    return null;
};
StencilCollectionBuilder.prototype.setCurrentDocumentOptions = function (options) {
    options.pageMargin = Config.get(Config.DEV_PAGE_MARGIN_SIZE);
    Pencil.controller.doc.properties.stencilBuilderOptions = JSON.stringify(options);

    window.globalEventBus && window.globalEventBus.broadcast("doc-options-change", {});
};
StencilCollectionBuilder.prototype.removeCurrentDocumentOptions = function (options) {
    if (StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection()) {
        Dialog.confirm(
            "Are you sure you want to remove the configuration and stop using this document as a stencil collection?", null,
            "Yes, remove configuration", function () {
                delete Pencil.controller.doc.properties.stencilBuilderOptions;
                window.globalEventBus && window.globalEventBus.broadcast("doc-options-change", {});
            },
            "Cancel", function () {
            }
        );

    }
};
StencilCollectionBuilder.prototype.makeDefaultOptions = function () {
    options = options || {};
    var defaultDocName = Pencil.controller.getDocumentName().replace(/\*/g, "").trim();
    var systemUsername = os.userInfo().username;

    options.displayName = defaultDocName;
    options.id = (systemUsername + "." + defaultDocName.replace(/[^a-z0-9]+/gi, ""));
    options.description = "";
    options.author = systemUsername;
    options.url = "";

    options.extraScript = "";
    options.embedReferencedFonts = true;
    options.resourceSets = [];

    return options;
};
StencilCollectionBuilder.prototype.configure = function () {
    var thiz = this;
    var currentOptions = StencilCollectionBuilder.getCurrentDocumentOptions();
    new StencilCollectionDetailDialog().callback(function (options) {
        thiz.setCurrentDocumentOptions(options);
        if (Pencil.controller.documentPath) {
            Pencil.documentHandler.saveDocument();
        }
    }).open(currentOptions);
};
StencilCollectionBuilder.isDocumentConfiguredAsStencilCollection = function () {
    return Pencil.controller.doc && Pencil.controller.doc.properties && Pencil.controller.doc.properties.stencilBuilderOptions
};
StencilCollectionBuilder.prototype.buildShapeTest = function (pageId, callback) {
    this.cleanupShapeTest();
    var options = StencilCollectionBuilder.getCurrentDocumentOptions() || this.makeDefaultOptions();

    this.tempOutputDir = tmp.dirSync({ keep: false, unsafeCleanup: true });
    options.outputPath = this.tempOutputDir.name;
    options.testMode = true;
    options.testPageId = pageId;
    options.resourceSets = null;

    options.id = "testCollection" + (new Date()).getTime();

    this.buildImpl(options, callback);
};
StencilCollectionBuilder.prototype.cleanupShapeTest = function () {
    if (this.tempOutputDir) {
        try {
            this.tempOutputDir.removeCallback();
        } catch (e) {
        }

        this.tempOutputDir = null;
    }
}
StencilCollectionBuilder.prototype.build = function () {
    var thiz = this;
    function next(options, outputPath) {
        if (options) {
            options.outputPath = outputPath;
            thiz.setCurrentDocumentOptions(options);
            thiz.buildImpl(options);
        } else {
            new StencilCollectionDetailDialog("Build").callback(function (options) {
                options.outputPath = outputPath;
                thiz.setCurrentDocumentOptions(options);
                thiz.buildImpl(options);
            }).open(null);
        }
    }

    var currentOptions = StencilCollectionBuilder.getCurrentDocumentOptions();

    if (!currentOptions
        || !currentOptions.outputPath
        || !fs.existsSync(currentOptions.outputPath)
        || Pencil.controller.doc._lastUsedStencilOutputPath != currentOptions.outputPath) {
        dialog.showOpenDialog(remote.getCurrentWindow(), {
            title: "Select Output Directory",
            defaultPath: (currentOptions && currentOptions.outputPath && fs.existsSync(currentOptions.outputPath)) ? currentOptions.outputPath : os.homedir(),
            properties: ["openDirectory"]
        }, function (filenames) {
            if (!filenames || filenames.length <= 0) return;
            var selectedPath = filenames[0];

            next(currentOptions, selectedPath);
        });

    } else {
        next(currentOptions, currentOptions.outputPath);
    }
};
StencilCollectionBuilder.prototype.buildImpl = function (options, onBuildDoneCallback) {
    if (!options) {
        options = this.makeDefaultOptions();
    }
    StencilCollectionBuilder.INSTANCE = this;
    this.boundDependencyCache = {};
    var dir = options.outputPath;
    this.iconDir = path.join(dir, "icons");

    var thiz = this;

    this.currentDir = dir;
    this.currentBitmapDir = path.join(dir, StencilCollectionBuilder.SUBDIR_BITMAPS);
    this.currentVectorDir = path.join(dir, StencilCollectionBuilder.SUBDIR_VECTORS);

    this.collectedResourceTypes = {};

    if (!fs.existsSync(this.iconDir)) {
        fs.mkdirSync(this.iconDir);
    }

    var dom = Controller.parser.parseFromString("<Shapes xmlns=\"" + PencilNamespaces.p + "\"></Shapes>", "text/xml");
    var shapes = dom.documentElement;

    shapes.setAttribute("id", options.id);
    shapes.setAttribute("displayName", options.displayName);
    shapes.setAttribute("author", options.author);
    shapes.setAttribute("description", options.description);
    shapes.setAttribute("url", options.url);

    shapes.appendChild(Dom.newDOMElement({
        _name: "Script",
        _uri: PencilNamespaces.p,
        comments: "Built-in util script",
        _cdata: StencilCollectionBuilder.COLLECTION_UTIL
    }));

    if (options.extraScript) {
        shapes.appendChild(Dom.newDOMElement({
            _name: "Script",
            _uri: PencilNamespaces.p,
            comments: "Extra script",
            _cdata: "\n" + options.extraScript + "\n"
        }));
    }

    var globalPropertySpecs = [];

    shapes.appendChild(Dom.newDOMElement({
        _name: "Properties",
        _uri: PencilNamespaces.p,
        _children: [
            {
                _name: "PropertyGroup",
                _uri: PencilNamespaces.p,
                name: "Collection Properties",
                _children: []
            }
        ]
    }));
    
    var privateCollection = new PrivateCollection();
    privateCollection.displayName = options.displayName + " (Groups)";
    privateCollection.description = "";
    privateCollection.id = privateCollection.displayName.replace(/\s+/g, "_").toLowerCase();

    var layoutPage = null;

    var pageMargin = this.getPageMargin();
    var ts = new Date().getTime();

    ApplicationPane._instance.setContentVisible(false);

    var embeddableFontFaces = [];

    var finalize = function () {
        var resourceList = [];

        //processing resources
        if (options.resourceSets) {
            var base = path.dirname(Pencil.controller.documentPath);

            var resourceDirName = "resources";
            var resourceDir = path.join(dir, resourceDirName);

            if (!fsExistSync(resourceDir)) {
                fs.mkdirSync(resourceDir);
            }

            for (var set of options.resourceSets) {
                var sourcePath = base ? path.resolve(base, set.path) : set.path;
                if (!fs.existsSync(sourcePath)) {
                    console.error("Resource dir not found: " + sourcePath);
                    continue;
                }

                var name = set.name.replace(/[^a-z0-9]+/gi, "_");
                var destPath = path.join(resourceDir, name);
                resourceList.push({
                    name: name,
                    prefix: resourceDirName + "/" + name
                });

                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath);
                    var files = fs.readdirSync(sourcePath);
                    files.forEach(function (file) {
                        var curSource = path.join(sourcePath, file);
                        if (fs.lstatSync(curSource).isDirectory()) {
                            copyFolderRecursiveSync(curSource, destPath);
                        } else {
                            copyFileSync(curSource, destPath);
                        }
                    });
                }
            }
        }

        console.log(thiz.collectedResourceTypes);

        for (var rt in thiz.collectedResourceTypes) {
            if (thiz.collectedResourceTypes[rt]) {
                resourceList.push({
                    name: (rt == StencilCollectionBuilder.SUBDIR_BITMAPS ? "Built-in bitmaps" : "Built-in vectors"),
                    type: (rt == StencilCollectionBuilder.SUBDIR_BITMAPS ? "bitmap" : "svg"),
                    prefix: rt
                });
            }
        }

        console.log(resourceList);

        if (resourceList.length > 0) {
            var script = "collection.RESOURCE_LIST = " + JSON.stringify(resourceList) + ";\n" + StencilCollectionBuilder.COLLECTION_RESOURCE_SCRIPT;
            shapes.appendChild(Dom.newDOMElement({
                _name: "Script",
                _uri: PencilNamespaces.p,
                comments: "Resource script",
                _cdata: "\n" + script+ "\n"
            }));
        }

        //add fonts
        if (options.embedReferencedFonts && embeddableFontFaces.length > 0) {
            var fontsSpec = {
                _name: "Fonts",
                _uri: PencilNamespaces.p,
                _children: []
            };

            var fontsDirName = "fonts";
            var fontsDir = null;

            embeddableFontFaces.forEach(function (f) {
                var font = FontLoader.instance.userRepo.getFont(f);
                if (!font || !font.variants || font.variants.length <= 0) return;

                if (!fontsDir) {
                    fontsDir = path.join(dir, fontsDirName);
                    if (!fsExistSync(fontsDir)) {
                        fs.mkdirSync(fontsDir);
                    }
                }

                var fontSpec = {
                    _name: "Font",
                    _uri: PencilNamespaces.p,
                    name: f
                };

                var key = f.trim().replace(/[^a-z0-9]+/i, "-");

                var fontDir = path.join(fontsDir, key);
                if (!fsExistSync(fontDir)) {
                    fs.mkdirSync(fontDir);
                }

                font.variants.forEach(function (variant) {
                    var variantName = FontRepository.findVariantName(variant.weight, variant.style);

                    var fileName = path.basename(variant.filePath);
                    var filePath = path.join(fontDir, fileName);
                    var fileRelativePath = fontsDirName + "/" + key + "/" + fileName;
                    copyFileSync(variant.filePath, filePath);

                    fontSpec[variantName] = fileRelativePath;
                });

                fontsSpec._children.push(fontSpec);
            });

            shapes.appendChild(Dom.newDOMElement(fontsSpec));
        }
        
        // console.log("Private collection\n", privateCollection.toXMLDom());

        this.saveResultDom(dom, privateCollection, dir, options, function () {
            var showDone = function () {
                Pencil.controller.doc._lastUsedStencilOutputPath = options.outputPath;

                thiz.progressListener.onTaskDone();
                ApplicationPane._instance.setContentVisible(true);

                var stencilPath = Config.get("dev.stencil.path", null);
                var dirPath = Config.get("dev.stencil.dir", null);

                if (options.testMode) {
                    if (onBuildDoneCallback) onBuildDoneCallback();
                } else {
                    if (stencilPath == options.outputPath || dirPath == path.dirname(options.outputPath)) {
                        CollectionManager.reloadDeveloperStencil(false);
                        NotificationPopup.show("Stencil collection '" + options.displayName + "' was successfully built.\n\nDeveloper stencil was also reloaded.", "View", function () {
                            shell.openItem(options.outputPath);
                        });
                    } else {
                        NotificationPopup.show("Stencil collection '" + options.displayName + "' was successfully built.", "View", function () {
                            shell.openItem(options.outputPath);
                        });
                    }
                }
            };

            if (layoutPage) {
                thiz.generateCollectionLayout(options.id, dir, layoutPage, showDone);
            } else {
                showDone();
            }

        });
    }.bind(this); //END OF FINAL PROCESSING

    var nonStencilPages = [];

    var done = function () {
        var globalPropertyMap = {};

        //append global propert fragment
        if (globalPropertySpecs && globalPropertySpecs.length > 0) {
            var globalGroupNode = Dom.getSingle("/p:Shapes/p:Properties/p:PropertyGroup", dom);
            globalGroupNode.appendChild(Dom.newDOMFragment(globalPropertySpecs, dom));

            for (var spec of globalPropertySpecs) {
                var prop = spec._prop;
                var propValueObject = prop.type.fromString(prop.value);
                globalPropertyMap[prop.name] = propValueObject;

                if (options.embedReferencedFonts && prop.type === Font) {
                    var face = propValueObject.family;
                    if (embeddableFontFaces.indexOf(face) < 0) embeddableFontFaces.push(face);
                }
            }
        }

        //re-fill shape's property fragment
        Dom.workOn("/p:Shapes/p:Shape", dom, function (shapeDefNode) {
            if (shapeDefNode._propertyFragmentSpec && shapeDefNode._propertyFragmentSpec.length > 0) {
                //generalizing global properties
                for (var spec of shapeDefNode._propertyFragmentSpec) {
                    var prop = spec._prop;
                    var value = prop.type.fromString(prop.value);
                    if (!value) continue;

                    var previousDiff = null;

                    for (var globalSpec of globalPropertySpecs) {
                        if (spec.type != globalSpec.type) continue;

                        var globalName = globalSpec._prop.name;
                        var globalPropValue = globalPropertyMap[globalName];
                        if (!globalPropValue || !globalPropValue.generateTransformTo) continue;

                        var transformSpec = globalPropValue.generateTransformTo(value);
                        var diff = globalPropValue.getDiff ? globalPropValue.getDiff(value) : ((transformSpec === "" || transformSpec) ? transformSpec.length : 10000000);
                        if ((transformSpec === "" || transformSpec) && (previousDiff === null || previousDiff > diff)) {
                            delete spec._text;
                            spec._children = [{
                                _name: "E",
                                _uri: PencilNamespaces.p,
                                _text: "$$" + globalName + transformSpec
                            }];

                            previousDiff = diff;
                        }
                    }
                }

                var groupNode = Dom.getSingle("./p:Properties/p:PropertyGroup[@holder='true']", shapeDefNode);
                groupNode.appendChild(Dom.newDOMFragment(shapeDefNode._propertyFragmentSpec, dom));
            }
        });

        this.processShortcuts(nonStencilPages, dom, dir, options, globalPropertySpecs, globalPropertyMap, privateCollection, function () {
            finalize();
        });

    }.bind(this);

    this.progressListener = null;

    var index = -1;
    var pages = this.controller.doc.pages;

    if (options.testPageId) {
        var includedPages = [];
        for (var page of pages) {
            if (page.id == options.testPageId || page.id == StencilCollectionBuilder.lastDetectedCollectionSettingPageId) {
                includedPages.push(page);
            }
        }

        pages = includedPages;
    }


    var next = function() {
        index ++;
        if (index >= pages.length) {
            done();
            return;
        }

        try {
            var page = pages[index];
            this.progressListener.onProgressUpdated(`Exporting '${page.name}...'`, index, pages.length);

            if (page.name.toLowerCase().indexOf("(layout)") >= 0) {
                layoutPage = page;
                if (page.name.toLowerCase() == "(layout)") return;
            }

            ApplicationPane._instance.activatePage(page);
            var svg = page.canvas.svg;
            StencilCollectionBuilder._currentPage = page;

            var properties = [];
            var behaviors = [];
            var actions = [];
            var shapeId = page.name.replace(/[^a-z0-9\-]+/gi, "").toLowerCase();
            var shapeSpec = {
                _name: "Shape",
                _uri: PencilNamespaces.p,
                id: shapeId,
                displayName: page.name,
                icon: "icons/" + shapeId + ".png?token=" + ts,
                _children: [
                    {
                        _name: "Properties",
                        _uri: PencilNamespaces.p,
                        _children: [
                            {
                                _name: "PropertyGroup",
                                _uri: PencilNamespaces.p,
                                name: "Common",
                                holder: "true",
                                _children: []   //leave this blank, actual property definitions will be filled later
                            }
                        ]
                    },
                    {
                        _name: "Behaviors",
                        _uri: PencilNamespaces.p,
                        _children: behaviors
                    },
                    {
                        _name: "Actions",
                        _uri: PencilNamespaces.p,
                        _children: actions
                    }
                ]
            };

            if (page.note) shapeSpec.description = Dom.htmlStrip(page.note);

            var propertyMap = {};

            var contentNode = Dom.newDOMElement({
                _name: "Content",
                _uri: PencilNamespaces.p
            }, dom);

            var contentFragment = dom.createDocumentFragment();
            var clipPathFragment = dom.createDocumentFragment();

            var snaps = [];

            var defs = null;
            var clipPathNodeMap = {};

            var hasContribution = false;

            Dom.workOn(".//svg:g[@p:type='Shape']", svg, function (shapeNode) {
                var c = page.canvas.createControllerFor(shapeNode);

                if (!c.performAction) return;
                var contribution = null;
                try {
                    contribution = c.performAction("buildShapeContribution");
                } catch (e) {
                    console.error("Error in building shape contribution:", e);
                    return;
                }

                if (!contribution) return;

                if (c.def.collection.performPostProcessing) {
                    c.def.collection.performPostProcessing.call(c, contribution);
                }

                for (var prop of contribution.properties) {
                    if (!prop.global) {
                        if (propertyMap[prop.name]) continue;
                        if (prop.name == "box") {
                            prop.value = new Dimension(page.width - 2 * pageMargin, page.height - 2 * pageMargin).toString();
                        }
                    }
                    var node = {
                        _name: "Property",
                        _uri: PencilNamespaces.p,
                        name: prop.name,
                        displayName: prop.displayName,
                        type: prop.type.name,
                        _text: prop.value,
                        _prop: prop
                    };
                    if (prop.meta) {
                        for (var metaName in prop.meta) {
                            node["p:" + metaName] = prop.meta[metaName];
                        }
                    }

                    if (prop.global) {
                        globalPropertySpecs.push(node);
                        StencilCollectionBuilder.lastDetectedCollectionSettingPageId = page.id;
                    } else {
                        propertyMap[prop.name] = node;
                        properties.push(node);
                    }
                }

                for (var targetName in contribution.behaviorMap) {
                    var set = contribution.behaviorMap[targetName];
                    var behaviorSpec = {
                        _name: "For",
                        _uri: PencilNamespaces.p,
                        ref: set.ref,
                        _children: []
                    }
                    for (var item of set.items) {
                        var itemSpec = {
                            _name: item.behavior,
                            _uri: PencilNamespaces.p,
                            _children: []
                        }
                        for (var arg of item.args) {
                            itemSpec._children.push({
                                _name: "Arg",
                                _uri: PencilNamespaces.p,
                                _text: arg
                            })
                        }
                        behaviorSpec._children.push(itemSpec);
                    }

                    behaviors.push(behaviorSpec);
                }

                for (var action of contribution.actions) {
                    var node = {
                        _name: "Action",
                        _uri: PencilNamespaces.p,
                        id: action.id,
                        displayName: action.displayName,
                        _children: [
                            {
                                _name: "Impl",
                                _uri: PencilNamespaces.p,
                                _cdata: action.impl
                            }
                        ]
                    };
                    if (action.meta) {
                        for (var metaName in action.meta) {
                            node["p:" + metaName] = action.meta[metaName];
                        }
                    }

                    actions.push(node);
                }

                if (contribution.snaps) {
                    for (var snap of contribution.snaps) {
                        snap._contribution = contribution;
                        snaps.push(snap);
                    }
                }

                if (contribution.contentFragment && contribution.contentFragment.childNodes.length > 0) {
                    if (contribution.clipPathName) {
                        var clipPathNode = clipPathNodeMap[contribution.clipPathName];
                        if (!clipPathNode) {
                            if (!defs) {
                                defs = contentNode.ownerDocument.createElementNS(PencilNamespaces.svg, "defs");
                                contentNode.appendChild(defs);
                            }

                            clipPathNode = contentNode.ownerDocument.createElementNS(PencilNamespaces.svg, "clipPath");
                            clipPathNode.setAttribute("id", contribution.clipPathName);
                            defs.appendChild(clipPathNode);
                            clipPathNodeMap[contribution.clipPathName] = clipPathNode;
                        }

                        clipPathNode.appendChild(contribution.contentFragment);
                    } else {
                        var e = contribution.contentFragment;
                        if (contribution.clippedByName) {
                            var g = contentNode.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
                            g.appendChild(e);
                            g.setAttribute("style", "clip-path: url(#" + contribution.clippedByName + ");");

                            e = g;
                        }
                        contentFragment.appendChild(e);
                    }
                }

                hasContribution = true;
            });

            if (!hasContribution) {
                nonStencilPages.push(page);
                return;
            }

            contentNode.appendChild(contentFragment);

            // if the shape has 'box', add standard snaps
            if (propertyMap["box"]) {
                snaps = [
                    {name: "Left", accept: "Left", horizontal: true, expression: "0"},
                    {name: "Right", accept: "Right", horizontal: true, expression: "$box.w"},
                    {name: "Top", accept: "Top", horizontal: false, expression: "0"},
                    {name: "Bottom", accept: "Bottom", horizontal: false, expression: "$box.h"},
                    {name: "VCenter", accept: "VCenter", horizontal: true, expression: "Math.round($box.w / 2)"},
                    {name: "HCenter", accept: "HCenter", horizontal: false, expression: "Math.round($box.h / 2)"},
                ].concat(snaps);
            }

            if (snaps.length > 0) {
                var impl = "";
                var header = "";
                var definedProp = {};
                var definedBound = {};
                function replaceReference(expression, snap) {
                    var expression = expression.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                        var name = "__prop_" + one;
                        if (!definedProp[one]) {
                            header += "var " + name + " = this.getProperty(\"" + one + "\");\n";
                            definedProp[one] = true;
                        }

                        return name;
                    });
                    expression = expression.replace(/this\.def\.collection/g, "@@@");
                    expression = expression.replace(/collection\./g, "this.def.collection.");
                    expression = expression.replace(/@@@/g, "this.def.collection");

                    if (expression.indexOf("@boundExpressionLiteral") >= 0) {
                        var boundVarName = "__bound_" + snap._contribution.targetElementName;
                        if (!definedBound[boundVarName]) {
                            header += "var " + boundVarName + " = " + replaceReference(snap._contribution._boundExpressionLiteral, snap) + ";\n";
                            definedBound[boundVarName] = true;
                        }
                        expression = expression.replace(/@boundExpressionLiteral/g, boundVarName);
                    }


                    return expression;
                }
                for (var snap of snaps) {
                    var expression = replaceReference(snap.expression, snap);

                    if (impl) impl += ",\n";
                    impl += "new SnappingData(" + JSON.stringify(snap.name) + ", " + expression + ", " + JSON.stringify(snap.accept) + ", " + snap.horizontal + ", this.id).makeLocal(true)";
                }

                impl = header + "\nvar snaps = [" + impl + "];\nreturn snaps;";

                var snapActionNode = {
                    _name: "Action",
                    _uri: PencilNamespaces.p,
                    id: "getSnappingGuide",
                    _children: [
                        {
                            _name: "Impl",
                            _uri: PencilNamespaces.p,
                            _cdata: "\n" + impl + "\n"
                        }
                    ]
                };

                actions.push(snapActionNode);
            }

            var shape = Dom.newDOMElement(shapeSpec, dom);
            if (!contentNode.hasChildNodes()) return;
            shape.appendChild(contentNode);
            shapes.appendChild(shape);

            if (fs.existsSync(page.thumbPath) && fs.statSync(page.thumbPath).size > 0) {
                var thumPath = path.join(thiz.iconDir, shapeId + ".png");
                copyFileSync(page.thumbPath, thumPath);
            }

            shape._propertyFragmentSpec = properties;
        } finally {
            window.setTimeout(next, 10);
        }
    }.bind(this);   //END OF PAGE PROCESSING

    Util.beginProgressJob("Building collection...", function (listener) {
        thiz.progressListener = listener;
        next();
    });
};

StencilCollectionBuilder.prototype.saveResultDom = function (dom, privateCollection, dir, options, callback) {
    var xsltDOM = Dom.parseDocument(
`<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
 xmlns:p="http://www.evolus.vn/Namespace/Pencil">
 <xsl:output omit-xml-declaration="yes" indent="yes" indent-amount="4" cdata-section-elements="p:Impl p:Arg p:Script"/>

    <xsl:template match="node()|@*">
      <xsl:copy>
        <xsl:apply-templates select="node()|@*"/>
      </xsl:copy>
    </xsl:template>
</xsl:stylesheet>`
    );
    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDOM);

    var result = xsltProcessor.transformToDocument(dom);

    Dom.serializeNodeToFile(result, path.join(dir, "Definition.xml"));
    
    if (privateCollection && privateCollection.shapeDefs.length > 0) {
        var xml = PrivateCollectionManager.getCollectionsExportedXML([privateCollection]);
        fs.writeFileSync(path.join(dir, "PrivateCollection.xml"), xml, ShapeDefCollectionParser.CHARSET);
    }

    if (callback) callback();
};

StencilCollectionBuilder.prototype.isShortcutPage = function (page, options) {
    if (options.shortcutPageIds) {
        return options.shortcutPageIds.indexOf(page.id) >= 0;
    } else {
        return page.name.toLowerCase().startsWith("(shortcut");
    }
};

StencilCollectionBuilder.prototype.processShortcuts = function (pages, dom, dir, options, globalPropertySpecs, globalPropertyMap, privateCollection, callback) {
    var thiz = this;
    this.saveResultDom(dom, null, dir, options, function () {

        //parse the resulted collection
        var collection = new ShapeDefCollectionParser().parseURL(path.join(dir, "Definition.xml"));
        var shortcutSpecs = [];
        var symbolNameMap = {};
        
        Util.workOnListAsync(pages, function(page, index, __callback) {
            thiz.progressListener.onProgressUpdated(`Processing shortcuts in '${page.name}...'`, index, pages.length);
            ApplicationPane._instance.activatePage(page);
            var svg = page.canvas.drawingLayer;

            var defIdPrefix = collection.id + ":";
            var shapeNodes = Dom.getList("./svg:g[@p:type='Shape']", svg);

            Util.workOnListAsync(shapeNodes, function (shapeNode, index, __callback) {
                thiz.progressListener.onProgressUpdated(`Processing shortcuts in '${page.name}...'`, index, shapeNodes.length);
                var defId = page.canvas.getType(shapeNode);
                var def = null;
                var id = null;
                var effectiveCollection = null;

                if (!defId) {
                    __callback();
                    return;
                }

                if (defId.startsWith(defIdPrefix)) {
                    effectiveCollection = collection
                    id = defId.substring(defIdPrefix.length);
                    def = collection.shapeDefMap[defId];
                } else {
                    if (options.allowExternalShortcuts || (typeof(options.allowExternalShortcuts) === "undefined")) {
                        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
                        id = defId;
                        effectiveCollection = def.collection;
                    } else {
                        __callback();
                        return;
                    }
                }

                if (!def) {
                    __callback();
                    return;
                }

                var shape = new Shape(page.canvas, shapeNode, def);
                var symbolName = shape.getSymbolName();
                
                if (symbolName == "@ignored" || symbolName == "@shape") {
                    __callback();
                    return;
                }
                
                if (!symbolName) {
                    if (page.name.toLowerCase().indexOf("shortcut") >= 0) {
                        symbolName = "@" + def.displayName + (new Date().getTime() + "_" + Math.round(1000 * Math.random()));
                        shape.setSymbolName(symbolName);
                    } else {
                        __callback();
                        return;
                    }
                }
                
                if (symbolNameMap[symbolName]) {
                    console.error("Duplicated Symbol Name: ", symbolName);
                    symbolName = "@" + def.displayName + (new Date().getTime() + "_" + Math.round(1000 * Math.random()));
                    shape.setSymbolName(symbolName);
                    
                    console.error("  > Re-generated as: ", symbolName);
                }
                
                symbolNameMap[symbolName] = true;

                var spec = {
                    _name: "Shortcut",
                    _uri: PencilNamespaces.p,
                    to: id,
                    displayName: symbolName,
                    _children: [

                    ]
                };

                for (var name in def.propertyMap) {
                    var prop = def.getProperty(name);
                    var value = shape.getProperty(name);

                    if (prop.type == ImageData) {
                        if (value.data && value.data.match(/^ref:\/\//)) {
                            if (prop.initialValue && prop.initialValue.data && prop.initialValue.data.match(/^collection:\/\/(.+)$/)) {
                                var declaredPath = RegExp.$1;
                                var ref = ImageData.idToRefString(thiz.controller.generateCollectionResourceRefId(effectiveCollection, declaredPath));
                                if (ref == value.data) continue;
                            }
                            value = thiz.toCollectionReadyImageData(value, spec.displayName + "-" + prop.name, prop.name.indexOf("vector") >= 0 ? true : undefined, symbolName + "." + name);
                        }
                    }

                    if (!value) continue;
                    if (prop.initialValueExpression) {
                        shape._evalContext = {collection: def.collection};
                        var v = shape.evalExpression(prop.initialValueExpression);
                        if (v && value.toString() == v.toString()) continue;
                    }
                    if (prop.initialValue) {
                        if (value.toString() == prop.initialValue.toString()) continue;
                    }

                    var sp = {
                        _name: "PropertyValue",
                        _uri: PencilNamespaces.p,
                        name: name,
                        _text: value.toString()
                    };

                    var previousDiff = null;

                    for (var globalSpec of globalPropertySpecs) {
                        if (prop.type.name != globalSpec.type) continue;

                        var globalName = globalSpec._prop.name;

                        var globalPropValue = globalPropertyMap[globalName];
                        if (!globalPropValue || !globalPropValue.generateTransformTo) continue;

                        var transformSpec = globalPropValue.generateTransformTo(value);

                        var diff = globalPropValue.getDiff ? globalPropValue.getDiff(value) : ((transformSpec === "" || transformSpec) ? transformSpec.length : 10000000);
                        if ((transformSpec === "" || transformSpec) && (previousDiff === null || previousDiff > diff)) {
                            delete sp._text;
                            sp._children = [{
                                _name: "E",
                                _uri: PencilNamespaces.p,
                                _text: "$$" + globalName + transformSpec
                            }];

                            previousDiff = diff;
                        }
                    }

                    spec._children.push(sp);
                }

                var fileName = spec.displayName.replace(/[^a-z0-9\\-]+/gi, "").toLowerCase() + ".png";
                var targetPath = path.join(thiz.iconDir, fileName);
                Pencil.rasterizer.rasterizeSelectionToFile(shape, targetPath, function (p, error) {
                    if (!error) {
                        spec.icon = "icons/" + fileName;
                    }

                    if (fs.statSync(targetPath).size <= 0) {
                        fs.unlinkSync(targetPath);
                    }

                    shortcutSpecs.push(spec);
                    __callback();
                });
            }, function () {
                var groupNodes = Dom.getList("./svg:g[@p:type='Group']", svg);

                Util.workOnListAsync(groupNodes, function (groupNode, index, __callback) {
                    thiz.progressListener.onProgressUpdated(`Processing private shapes in '${page.name}...'`, index, groupNodes.length);
                    var symbolName = Svg.getSymbolName(groupNode);
                    if (!symbolName) {
                        symbolName = "PrivateShapeDef_" + privateCollection.shapeDefs.length;
                        Svg.setSymbolName(groupNode, symbolName);
                    }
                    
                    var defId = symbolName.replace(/\s+/g, "_").toLowerCase() + "_" + (new Date()).getTime();
                    groupNode.setAttributeNS(PencilNamespaces.p, "private-def-id", defId);
                    
                    var svg = groupNode.cloneNode(true);

                    var fakeDom = Controller.parser.parseFromString("<Document xmlns=\"" + PencilNamespaces.p + "\"></Document>", "text/xml");
                    fakeDom.documentElement.appendChild(svg);

                    Pencil.controller.prepareForEmbedding(fakeDom, function () {
                        fakeDom.documentElement.removeChild(svg);
                        var shapeDef = new PrivateShapeDef();
                        shapeDef.displayName = symbolName;
                        shapeDef.content = svg;
                        shapeDef.id = defId;
                        
                        privateCollection.shapeDefs.push(shapeDef);
                        __callback();
                    });
                }, __callback);
            });
            
        }, function () {
            var fragment = Dom.newDOMFragment(shortcutSpecs, dom);
            dom.documentElement.appendChild(fragment);
            if (callback) callback();
        });
    });
};
StencilCollectionBuilder.prototype.generateCollectionLayout = function (collectionId, dir, page, callback) {
    ApplicationPane._instance.activatePage(page);
    var container = page.canvas.drawingLayer;
    var pageMargin = StencilCollectionBuilder.INSTANCE.getPageMargin();

    var pw = parseFloat(page.width) - 2 * pageMargin;
    var ph = parseFloat(page.height) - 2 * pageMargin;

    var items = [];

    const IMAGE_FILE = "layout_image.png";

    Dom.workOn("./svg:g[@p:type='Shape']", container, function (g) {
            var dx = 0; //rect.left;
            var dy = 0; //rect.top;

            var owner = g.ownerSVGElement;

            if (owner.parentNode && owner.parentNode.getBoundingClientRect) {
                var rect = owner.parentNode.getBoundingClientRect();
                dx = rect.left;
                dy = rect.top;
            }

            dx += pageMargin;
            dy += pageMargin;

            rect = g.getBoundingClientRect();

            var linkingInfo = {
                node: g,
                sc: g.getAttributeNS(PencilNamespaces.p, "sc"),
                refId: g.getAttributeNS(PencilNamespaces.p, "def"),
                geo: {
                    x: rect.left - dx,
                    y: rect.top - dy,
                    w: rect.width - 2,
                    h: rect.height - 2
                }
            };

            var shape = page.canvas.createControllerFor(g);
            if (shape) {
                if (shape.getSymbolName) linkingInfo.symbolName = shape.getSymbolName();
                //console.log("calculated " + linkingInfo.sc + ": ", linkingInfo.geo, shape.getGeometry(), shape.getBounding());
                var geo = shape.getGeometry();
                if (geo && linkingInfo.geo.h > 15 && linkingInfo.geo.w > 15) {
                    linkingInfo.geo = {
                        x: geo.ctm.e - pageMargin,
                        y: geo.ctm.f - pageMargin,
                        w: geo.dim.w,
                        h: geo.dim.h
                    };
                }
            }

            items.push(linkingInfo);
    });
    
    var privateShapeItems = [];
    Dom.workOn("./svg:g[@p:type='Group']", container, function (g) {
        var defId = g.getAttributeNS(PencilNamespaces.p, "private-def-id");
        if (!defId) return;
        
        var dx = 0; //rect.left;
        var dy = 0; //rect.top;

        var owner = g.ownerSVGElement;

        if (owner.parentNode && owner.parentNode.getBoundingClientRect) {
            var rect = owner.parentNode.getBoundingClientRect();
            dx = rect.left;
            dy = rect.top;
        }

        dx += pageMargin;
        dy += pageMargin;

        rect = g.getBoundingClientRect();

        var linkingInfo = {
            node: g,
            privateRefId: defId,
            geo: {
                x: rect.left - dx,
                y: rect.top - dy,
                w: rect.width - 2,
                h: rect.height - 2
            }
        };

        var group = page.canvas.createControllerFor(g);
        if (group) {
            if (group.getSymbolName) linkingInfo.symbolName = group.getSymbolName();
            //console.log("calculated " + linkingInfo.sc + ": ", linkingInfo.geo, shape.getGeometry(), shape.getBounding());
            var geo = group.getGeometry();
            if (geo && linkingInfo.geo.h > 15 && linkingInfo.geo.w > 15) {
                linkingInfo.geo = {
                    x: geo.ctm.e - pageMargin,
                    y: geo.ctm.f - pageMargin,
                    w: geo.dim.w,
                    h: geo.dim.h
                };
            }
        }

        items.push(linkingInfo);
    });

    var current = 0;
    var thiz = this;
    var done = function () {
        var html = document.createElementNS(PencilNamespaces.html, "html");

        var body = document.createElementNS(PencilNamespaces.html, "body");
        html.appendChild(body);

        var div = document.createElementNS(PencilNamespaces.html, "div");
        div.setAttribute("style", "position: relative; padding: 0px; margin: 0px; width: " + pw + "px; height: " + ph + "px;");
        body.appendChild(div);

        var bg = document.createElementNS(PencilNamespaces.html, "img");
        bg.setAttribute("style", "width: " + pw + "px; height: " + ph + "px;");
        bg.setAttribute("src", IMAGE_FILE + "?ts=" + (new Date().getTime()));
        div.appendChild(bg);

        for (var i = 0; i < items.length; i ++) {
            var link = items[i];
            var img = document.createElementNS(PencilNamespaces.html, "img");
            img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=");
            if (link.sc) {
                img.setAttribute("sc-ref", link.sc);
            } else if (link.symbolName && link.symbolName != "@shape" && !link.privateRefId) {
                img.setAttribute("sc-ref", link.symbolName);
            } else if (link.privateRefId) {
                img.setAttribute("pr-ref", link.privateRefId);
            } else {
                img.setAttribute("ref", link.refId);
            }
            img.setAttribute("id", link.refId);
            var css = new CSS();
            css.set("position", "absolute");
            css.set("left", "" + link.geo.x + "px");
            css.set("top", "" + link.geo.y + "px");
            css.set("width", "" + link.geo.w + "px");
            css.set("height", "" + link.geo.h + "px");
            img.setAttribute("style", css.toString());

            div.appendChild(img);
        }

        Dom.serializeNodeToFile(html, path.join(dir, "Layout.xhtml"), "");
        if (callback) callback();
    };


    var outputImage = path.join(dir, IMAGE_FILE);
    Pencil.rasterizer.rasterizePageToFile(page, outputImage, function (p, error) {
        done();
    });
};
StencilCollectionBuilder.prototype.generatePrivateShapeDef = function (target, callback) {
    var svg = target.svg.cloneNode(true);

    var fakeDom = Controller.parser.parseFromString("<Document xmlns=\"" + PencilNamespaces.p + "\"></Document>", "text/xml");
    fakeDom.documentElement.appendChild(svg);

    Pencil.controller.prepareForEmbedding(fakeDom, function () {
        fakeDom.documentElement.removeChild(svg);

        var shapeDef = new PrivateShapeDef();
        shapeDef.displayName = target.getSymbolName();
        shapeDef.content = svg;
        shapeDef.id = ("PrivateShapeDef_" + shapeDef.displayName).replace(/\s+/g, "_").toLowerCase();

        Util.generateIcon(target, 64, 64, 2, null, function (icondata) {
            shapeDef.iconData = icondata;
            callback(shapeDef);
        });
    });
};
