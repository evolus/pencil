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
        spec.match(/^([A-Z0-9]*[A-Z])([0-9\-]+)$/)
        return collection.BOUND_CALCULATOR[RegExp.$1](box, parseInt(RegExp.$2, 10), h0, h1);
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
`;

StencilCollectionBuilder.prototype.getPageMargin = function () {
    var pageMargin = Config.get(Config.DEV_USE_PAGE_MARGIN);
    if (!pageMargin) return 0;
    return Config.get(Config.DEV_PAGE_MARGIN_SIZE);
};
StencilCollectionBuilder.prototype.toCollectionReadyImageData = function (imageData, name) {
    var value = ImageData.fromString(imageData.toString());
    if (value.data && value.data.match(/^ref:\/\//)) {
        var id = ImageData.refStringToId(value.data);
        if (id) {
            var filePath = Pencil.controller.refIdToFilePath(id);

            var bitmapImageFileName = (StencilCollectionBuilder._currentPage.name + "-" + name).replace(/[^a-z0-9\\-]+/gi, "").toLowerCase() + ".png";

            if (!fs.existsSync(this.currentBitmapDir)) fs.mkdirSync(this.currentBitmapDir);

            var targetPath = path.join(this.currentBitmapDir, bitmapImageFileName);
            fs.writeFileSync(targetPath, fs.readFileSync(filePath));

            value = new ImageData(value.w, value.h, "collection://bitmaps/" + bitmapImageFileName, value.xCells, value.yCells);
        }
    }
    return value;
};
StencilCollectionBuilder.prototype.build = function () {
    StencilCollectionBuilder.INSTANCE = this;
    var dir = "/home/dgthanhan/Projects/Pencil/V3/Stencils/Generated/Sample1";
    var iconDir = path.join(dir, "icons");

    this.currentDir = dir;
    this.currentBitmapDir = path.join(dir, "bitmaps");

    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir);
    }

    var dom = Controller.parser.parseFromString("<Shapes xmlns=\"" + PencilNamespaces.p + "\"></Shapes>", "text/xml");
    var shapes = dom.documentElement;

    var username = os.userInfo().username;
    var docName = this.controller.getDocumentName().replace(/\*/g, "").trim();

    shapes.setAttribute("id", username + "." + docName.replace(/[^a-z0-9]+/gi, ""));
    shapes.setAttribute("displayName", docName);
    shapes.setAttribute("author", username);
    shapes.setAttribute("description", "");


    shapes.appendChild(Dom.newDOMElement({
        _name: "Script",
        _uri: PencilNamespaces.p,
        comments: "Built-in util script",
        _cdata: StencilCollectionBuilder.COLLECTION_UTIL
    }));

    var pageMargin = this.getPageMargin();
    var ts = new Date().getTime();

    for (var page of this.controller.doc.pages) {
        this.controller.activatePage(page);
        var svg = page.canvas.svg;
        StencilCollectionBuilder._currentPage = page;

        if (page.note) shapes.setAttribute("description", Dom.htmlStrip(page.note));

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
                            _children: properties
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

        var propertyMap = {};

        var contentNode = Dom.newDOMElement({
            _name: "Content",
            _uri: PencilNamespaces.p
        }, dom);

        var snaps = [];

        Dom.workOn(".//svg:g[@p:type='Shape']", svg, function (shapeNode) {
            var c = page.canvas.createControllerFor(shapeNode);
            var contribution = null;
            try {
                contribution = c.performAction("buildShapeContribution");
            } catch (e) {
                console.error("Error in building shape contribution:", e);
                return;
            }

            if (!contribution) return;

            for (var prop of contribution.properties) {
                if (propertyMap[prop.name]) continue;
                if (prop.name == "box") {
                    prop.value = new Dimension(page.width - 2 * pageMargin, page.height - 2 * pageMargin).toString();
                }
                var node = {
                    _name: "Property",
                    _uri: PencilNamespaces.p,
                    name: prop.name,
                    displayName: prop.displayName,
                    type: prop.type.name,
                    _text: prop.value
                };
                if (prop.meta) {
                    for (var metaName in prop.meta) {
                        node["p:" + metaName] = prop.meta[metaName];
                    }
                }

                propertyMap[prop.name] = node;
                properties.push(node);
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
                contentNode.appendChild(contribution.contentFragment);
            }
        });

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
        shape.appendChild(contentNode);
        shapes.appendChild(shape);

        if (fs.existsSync(page.thumbPath)) {
            var thumPath = path.join(iconDir, shapeId + ".png");
            fs.createReadStream(page.thumbPath).pipe(fs.createWriteStream(thumPath));
        }
    }

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
    console.log("Stencil definition saved.");
};
