function Shape(canvas, svg, forcedDefinition) {
    this.svg = svg;
    this.canvas = canvas;

    if (!this.svg.getAttribute("id")) {
        var uuid = Util.newUUID();
        this.svg.setAttribute("id", uuid);
    }
    this.id = this.svg.getAttribute("id");

    var defId = this.canvas.getType(svg);
    this.def = forcedDefinition || CollectionManager.shapeDefinition.locateDefinition(defId);
    if (!this.def) {
        throw Util.getMessage("shape.definition.not.found", defId);
    }

    //locating metadata node
    this.metaNode = Dom.getSingle("./p:metadata", this.svg);

    //construct the target node map
    this.setupTargetMap("shouldRepair");
    //this.dockingManager = new DockingManager(this);
}
Shape.prototype.setupTargetMap = function (shouldRepair) {
    this.targetMap = {};
    for (i in this.def.behaviors) {
        var name = this.def.behaviors[i].target;
        var target = Dom.getSingle(".//*[@p:name='" + name + "']", this.svg);
        if (!target) {
            if (shouldRepair) {
                console.error("Target '" + name + "' is not found. Repairing now...");
                try {
                    this.repair();
                    console.log("  >>  Target '" + name + "' is repaired.");
                } catch (e) {
                    console.error(e);
                }
                return;
            } else {
                console.error("Target '" + name + "' is not found. Ignoring...");
                continue;
            }
        }
        this.targetMap[name] = target;
    }
};
Shape.prototype.getName = function () {
    return this.def.displayName;
};
Shape.prototype.isFor = function (svg) {
    return this.svg == svg;
};
Shape.prototype.getProperties = function () {
    var properties = {};
    for (var name in this.def.propertyMap) {
        properties[name] = this.getProperty(name);
    }

    return properties;
};
Shape.prototype.getPropertyGroups = function () {
    return this.def.propertyGroups;
};

Shape.prototype.setInitialPropertyValues = function (overridingValueMap) {
    this._evalContext = {collection: this.def.collection};
    F._target = this.svg;

    var hasPostProcessing = false;

    for (var name in this.def.propertyMap) {
        var value = null;
        var prop = this.def.propertyMap[name];

        var currentCollection = this.def.connection;

        if (overridingValueMap && overridingValueMap[name]) {
            var spec = overridingValueMap[name];
            if (spec.initialValueExpression) {
                //temporarily shift the context collection to the one contains the shortcut
                if (overridingValueMap._collection) {
                    this._evalContext.collection = overridingValueMap._collection;
                }
                value = this.evalExpression(spec.initialValueExpression);
            } else {
                value = spec.initialValue;
            }

            if (spec.collection) currentCollection = spec.collection;
        } else {
            if (prop.initialValueExpression) {
                value = this.evalExpression(prop.initialValueExpression);
            } else {
                value = prop.initialValue;
            }
        }

        if (prop.type.performIntialProcessing) {
            var newValue = prop.type.performIntialProcessing(value, this.def, currentCollection);
            if (newValue) {
                hasPostProcessing = true;
                value = newValue;
            }
        }

        this.storeProperty(name, value);
    }

    for (name in this.def.propertyMap) {
        this.applyBehaviorForProperty(name);
    }
};
Shape.prototype.repairShapeProperties = function () {
    this._evalContext = {collection: this.def.collection};

    var hasPostProcessing = false;
    var repaired = false;

    for (var name in this.def.propertyMap) {
        var propNode = this.locatePropertyNode(name);
        if (propNode) continue;

        var value = null;
        var prop = this.def.propertyMap[name];

        var currentCollection = this.def.connection;

        if (prop.initialValueExpression) {
            value = this.evalExpression(prop.initialValueExpression);
        } else {
            value = prop.initialValue;
        }

        if (prop.type.performIntialProcessing) {
            var newValue = prop.type.performIntialProcessing(value, this.def, currentCollection);
            if (newValue) {
                hasPostProcessing = true;
                value = newValue;
            }
        }

        this.storeProperty(name, value);
        repaired = true;
    }

    if (!repaired) return;

    for (name in this.def.propertyMap) {
        this.applyBehaviorForProperty(name);
    }
};
Shape.prototype.renewTargetProperties = function () {
    this._evalContext = {collection: this.def.collection};
    F._target = this.svg;

    var renewed = false;

    for (var name in this.def.propertyMap) {
        var prop = this.def.propertyMap[name];
        if (!prop || !prop.meta || prop.meta.renew != "true") continue;

        var propNode = this.locatePropertyNode(name);
        if (!propNode) continue;

        var value = null;

        var currentCollection = this.def.connection;

        if (prop.initialValueExpression) {
            value = this.evalExpression(prop.initialValueExpression);
        } else {
            value = prop.initialValue;
        }

        if (prop.type.performIntialProcessing) {
            var newValue = prop.type.performIntialProcessing(value, this.def, currentCollection);
            if (newValue) {
                value = newValue;
            }
        }

        this.storeProperty(name, value);
        renewed = true;
    }

    if (!renewed) return false;

    for (name in this.def.propertyMap) {
        this.applyBehaviorForProperty(name);
    }

    return true;
};
Shape.prototype.repair = function () {
    this.canvas.invalidateShapeContent(this.svg, this.def);
    this.setupTargetMap();
    for (var name in this.def.propertyMap) {
        this.applyBehaviorForProperty(name);
    }
};
Shape.prototype.applyBehaviorForProperty = function (name, dontValidateRelatedProperties) {
    var propertyDef = this.def.propertyMap[name];
    if (!propertyDef) return;
    this.prepareExpressionEvaluation();

    //enumerate all related target
    for (var targetName in propertyDef.relatedTargets) {

        //do apply any target that was already processed
        if (this._appliedTargets) {
            for (var i in this._appliedTargets) if (this._appliedTargets[i] == targetName) continue;
            this._appliedTargets.push(targetName);
        }

        var target = this.targetMap[targetName];
        if (!target) {
            console.error("Target '" + targetName + "' is not found. Ignoring...");
            continue;
        }
        F._target = target;

        var behavior = this.def.behaviorMap[targetName];
        for (var i in behavior.items) {
            var item = behavior.items[i];
            var args = [];
            for (var j in item.args) {
                var arg = item.args[j];
                if (!arg.type) {
                    args.push(this.evalExpression(arg.literal));
                } else {
                    //FIXME: this should inspect the type and do the conversion
                    args.push(arg.literal);
                }
            }
            try {
                item.handler.apply(target, args);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }
    try {
        if (!dontValidateRelatedProperties) this.validateRelatedProperties(name);
    } catch (e) {
        Console.dumpError(e, "--to-console");
    }
};
Shape.prototype.validateAll = function (offScreen) {
    this.repairShapeProperties();
    this.prepareExpressionEvaluation();

    for (var b = 0; b < this.def.behaviors.length; b ++) {
        var behavior = this.def.behaviors[b];
        var target = this.targetMap[behavior.target];

        if (!target) {
            warn("Target '" + behavior.target + "' is not found. Ignoring...");
            continue;
        }

        F._target = target;

        for (var i in behavior.items) {
            var item = behavior.items[i];
            if (offScreen && !item.handler._offScreenSupport) {
                continue;
            }
            var args = [];
            for (var j in item.args) {
                var arg = item.args[j];
                if (!arg.type) {
                    args.push(this.evalExpression(arg.literal));
                } else {
                    //FIXME: this should inspect the type and do the conversion
                    args.push(arg.literal);
                }
            }
            try {
                item.handler.apply(target, args);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }
};
Shape.prototype.prepareForEmbedding = function (offScreen) {
    this.prepareExpressionEvaluation();

    for (var b = 0; b < this.def.behaviors.length; b ++) {
        var behavior = this.def.behaviors[b];
        var target = this.targetMap[behavior.target];

        if (!target) {
            warn("Target '" + behavior.target + "' is not found. Ignoring...");
            continue;
        }

        F._target = target;

        for (var i in behavior.items) {
            var item = behavior.items[i];
            if (offScreen && !item.handler._offScreenSupport) {
                continue;
            }
            var args = [];
            for (var j in item.args) {
                var arg = item.args[j];
                if (!arg.type) {
                    args.push(this.evalExpression(arg.literal));
                } else {
                    //FIXME: this should inspect the type and do the conversion
                    args.push(arg.literal);
                }
            }
            try {
                item.handler.apply(target, args);
            } catch (e) {
                Console.dumpError(e);
            }
        }
    }
};
Shape.prototype.validateRelatedProperties = function (name) {
    for (propName in this.def.propertyMap) {
        //if (this.def.isPropertyAffectedBy(name, propName)) continue;

        var property = this.def.propertyMap[propName];

        if (!property.relatedProperties[name]) continue;
        var value = this.getProperty(propName);

        for (meta in property.meta) {
            var functionName = "apply" + meta.substring(0, 1).toUpperCase() + meta.substring(1);
            if (!value[functionName]) continue;

            var f = value[functionName];
            try {
                var metaValue = this.evalExpression("(" + property.meta[meta] + ")");
                f.call(value, metaValue);
            } catch (e) {
                Console.dumpError(e, "--to-console");
            }
        }

        this.storeProperty(propName, value);
        this.applyBehaviorForProperty(propName, "dontValidateRelatedProperties");
    }
};
Shape.prototype.prepareExpressionEvaluation = function () {
    this._evalContext = {properties: this.getProperties(), functions: Pencil.functions, collection: this.def.collection};
};
Shape.prototype.evalExpression = function (expression, value) {

    var defaultValue = value ? value : null;
    if (!expression) return defaultValue;
    if (!this._evalContext) throw Util.getMessage("please.prepare.by.calling.prepareexpressionevaluation.first");

    try {
        return pEval("" + expression, this._evalContext);
    } catch (e) {
        Console.dumpError(e);
        return defaultValue;
    }
};
Shape.prototype.setProperty = function (name, value, nested) {
    if (!nested) {
        this._appliedTargets = [];
        this.canvas.run( function () {
            this.storeProperty(name, value);
            this.applyBehaviorForProperty(name);
        }, this, Util.getMessage("action.set.shape.properties"));
        this._appliedTargets = [];
    } else {
        this.storeProperty(name, value);
        this.applyBehaviorForProperty(name);
    }
    Connector.invalidateInboundConnections(this.canvas, this.svg);
    this.canvas.invalidateEditors();
    if (!nested) {
        Dom.emitEvent("p:ShapeGeometryModified", this.canvas, {setter: null});
        let prop = this.def.getProperty(name);
        try {
            if (prop && (prop.type == PlainText || prop.type == RichText)) {
                //find top most group
                var topGroup = Dom.findTop(this.svg, function (node) {
                    return node.getAttributeNS(PencilNamespaces.p, "type") == "Group";
                });

                if (topGroup) {
                    var controller = this.canvas.createControllerFor(topGroup);
                    if (controller && controller.layoutChildren) {
                        controller.layoutChildren();
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
};
Shape.prototype.getProperty = function (name) {
    var propNode = this.locatePropertyNode(name);
    if (!propNode) {
        //return null;
        var prop = this.def.getProperty(name);
        if (!this._evalContext) {
            this._evalContext = {collection: this.def.collection};
        } else {
            this._evalContext.collection = this.def.collection;
        }

        if (!prop) {
            return null;
        }

        if (prop.initialValueExpression) {
            return this.evalExpression(prop.initialValueExpression);
        } else {
            return prop.initialValue;
        }
    }

    var propType = this.def.getProperty(name).type;
    var literal = propNode.textContent;
    if (!literal) literal = "";
    var value = propType.fromString(literal);

    var attrs = propNode.attributes;
    var meta = null;
    for (var i = attrs.length - 1; i >= 0; i --) {
        if (attrs[i].namespaceURI == PencilNamespaces.p) {
            if (meta == null) meta = {};
            meta[attrs[i].localName] = attrs[i].value;
        }
    }

    value.meta = meta;

    return value;
};
Shape.prototype.setMetadata = function (name, value) {
    return Util.setNodeMetadata(this.svg, name, value);
};
Shape.prototype.getMetadata = function (name) {
    return Util.getNodeMetadata(this.svg, name);
};
Shape.prototype.locatePropertyNode = function (name) {
    return Dom.getSingle("./p:property[@name='" + name +"']", this.metaNode);
};
Shape.prototype.storeProperty = function (name, value) {
    //debug("setting: " + name + " = " + value.toString());
    var propNode = this.locatePropertyNode(name);
    if (!propNode) {
        propNode = this.metaNode.ownerDocument.createElementNS(PencilNamespaces.p, "p:property");
        propNode.setAttribute("name", name);
        this.metaNode.appendChild(propNode);
    }

    Shape.storePropertyToNode(name, value, propNode);
};
Shape.storePropertyToNode = function (name, value, propNode) {
    Dom.empty(propNode);
    var attrs = propNode.attributes;
    for (var i = attrs.length - 1; i >= 0; i --) {
        if (attrs[i].namespaceURI == PencilNamespaces.p) {
            propNode.removeAttributeNS(PencilNamespaces.p, attrs[i].localName);
        }
    }
    if (value.meta) {
        for (var p in value.meta) {
            propNode.setAttributeNS(PencilNamespaces.p, p, value.meta[p]);
        }
    }

    var cdata = propNode.ownerDocument.createCDATASection(value.toString());
    propNode.appendChild(cdata);
};
Shape.TRANSLATE_REGEX = /^translate\(([\-0-9]+)\,([\-0-9]+)\)$/
Shape.prototype.getGeometry = function () {
    var geo = new Geometry();
    geo.ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);
    geo.dim = this.getProperty("box");

    if (!geo.dim) {
        geo.dim = {};
        var bbox = this.svg.getBBox();
        if (bbox) {
            geo.dim.w = bbox.width;
            geo.dim.h = bbox.height;

            geo.loc = {x: bbox.x, y: bbox.y};
        }
    }

    return geo;
};

Shape.prototype.getBoundingSize = function () {
    var rect = this.svg.getBoundingClientRect();
    var parentRect = this.svg.ownerSVGElement.getBoundingClientRect();
    var wPadding = 2 * parentRect.left;
    var hPadding = 2 * parentRect.top;
    return {width: rect.width - wPadding,
            height: rect.height - hPadding};
};

//new imple for geometry editing

Shape.prototype.moveBy = function (dx, dy, targetSet, moving) {
    var matrix = this.svg.ownerSVGElement.createSVGTransform().matrix;
    matrix = matrix.translate(dx, dy);
    var ctm = this.svg.getTransformToElement(this.svg.parentNode);

    matrix = matrix.multiply(ctm);
    Svg.ensureCTM(this.svg, matrix);
    //Connector.invalidateOutboundConnections(this.canvas, this.svg);
    //Connector.invalidateInboundConnections(this.canvas, this.svg);

    //if (Config.get("docking.enabled")) {
    //    this.dockingManager.handleMoveBy(dx, dy, targetSet, moving);
    //}
};
Shape.prototype.scaleTo = function (nw, nh, group) {
    if (this.def.propertyMap["box"]) {
        var box = this.getProperty("box");
        var fw = nw / box.w;
        var fh = nh / box.h;

        this.storeProperty("box", new Dimension(nw, nh));

        //scale the handle
        for (name in this.def.propertyMap) {
            var p = this.def.propertyMap[name];
            if (p.type != Handle || p.meta.noScale) continue;

            var h = this.getProperty(name);
            if (h.meta && h.meta.connectedShapeId) continue;

            //debug("before: " + [h.x, h.y]);
            h.x = h.x * fw;
            h.y = h.y * fh;

            //debug("after: " + [h.x, h.y]);

            this.storeProperty(name, h);
        }

        this.applyBehaviorForProperty("box");
        this.invalidateOutboundConnections();
        this.invalidateInboundConnections();


        //if (Config.get("docking.enabled")) {
        //    this.dockingManager.handleScaleTo(nw, nh, box.w, box.h, group);
        //}
    } else {
        error(this.def.displayName + " does not support scaling.");
    }
};
Shape.prototype.rotateBy = function (da) {
    var ctm = this.svg.getTransformToElement(this.svg.parentNode);

    var x = 0, y = 0;

    var box = this.getProperty("box");

    if (box) {
        x = box.w / 2;
        y = box.h / 2;
    } else {
        var bbox = this.svg.getBBox();
        x = bbox.x + bbox.width / 2;
        y = bbox.y + bbox.height / 2;
    }

    center = Svg.pointInCTM(x, y, ctm);

    ctm = ctm.translate(x, y);
    ctm = ctm.rotate(da);
    ctm = ctm.translate(0 - x, 0 - y);

    Svg.ensureCTM(this.svg, ctm);
    this.invalidateOutboundConnections();
    this.invalidateInboundConnections();

    //if (Config.get("docking.enabled")) {
    //    this.dockingManager.handleRotateBy(da);
    //}
};
Shape.prototype.getBounding = function (to) {
    var context = to ? to : this.canvas.drawingLayer;
    var ctm = this.svg.getTransformToElement(context);

    var bbox = this.svg.getBBox();

    var p = Svg.pointInCTM(bbox.x, bbox.y, ctm);
    var rect = {
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        originalDy: bbox.y,
        originalDx: bbox.x
    };

    Svg.expandRectTo(rect, Svg.pointInCTM(bbox.x + bbox.width, bbox.y, ctm));
    Svg.expandRectTo(rect, Svg.pointInCTM(bbox.x + bbox.width, bbox.y + bbox.height, ctm));
    Svg.expandRectTo(rect, Svg.pointInCTM(bbox.x, bbox.y + bbox.height, ctm));

    return rect;
};
Shape.prototype.supportScaling = function () {
    return this.getProperty("box") ? this.isBoxEnabled() : false;
};

Shape.prototype.isBoxEnabled = function () {
    try {
        this.prepareExpressionEvaluation();

        var meta = this.def.propertyMap["box"].meta;
        var disabled = this.evalExpression(meta.disabled, false);

        return !disabled;
    } catch (e) {
        return true;
    }
};


//~new impl

Shape.prototype.getBoundingRect = function () {
    var rect = {x: 0, y: 0, width: 0, height: 0};
    try {
        rect = this.svg.getBBox();
        if (rect == null) {
            rect = {x: 0, y: 0, width: 0, height: 0};
        }
        var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);

        var rect = Svg.getBoundRectInCTM(rect, ctm.inverse());
        rect = {x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top};
    } catch (e) { }

    return this.canvas.getZoomedRect(rect);
};
Shape.prototype.setGeometry = function (geo) {
    if (geo.ctm) {
        Svg.ensureCTM(this.svg, geo.ctm);
    }
    if (geo.dim) {
        //alert("commiting: " + [geo.dim.w, geo.dim.h]);
        if (this.def.propertyMap["box"]) {
            var box = this.getProperty("box");
            debug("box: " + [box.w, box.h, geo.dim.w, geo.dim.h]);
            var fw = geo.dim.w / box.w;
            var fh = geo.dim.h / box.h;

            debug("factor: " + [fw, fh]);
            this.storeProperty("box", new Dimension(geo.dim.w, geo.dim.h));

            //scale the handle
            for (name in this.def.propertyMap) {
                var p = this.def.propertyMap[name];
                if (p.type != Handle || p.meta.noScale) continue;

                var h = this.getProperty(name);
                debug("before: " + [h.x, h.y]);
                h.x = h.x * fw;
                h.y = h.y * fh;

                debug("after: " + [h.x, h.y]);

                this.storeProperty(name, h);
            }

            this.applyBehaviorForProperty("box");
        }
    }
};

Shape.prototype.getBound = function () {
    throw "@method: Shape.prototype.getBound is now depricated, using getGeometry instead.";

    var box = this.getProperty("box");
    var bound = new Bound(0, 0, box.w, box.h);
    var s = this.svg.getAttribute("transform");
    if (s) {
        s = s.replace(/ /g, "");
        if (s.match(Shape.TRANSLATE_REGEX)) {
            bound.x = parseInt(RegExp.$1, 10);
            bound.y = parseInt(RegExp.$2, 10);
        }
    }

    return bound;
};
Shape.prototype.setBound = function (bound) {
    throw "@method: Shape.prototype.setBound(bound) is now depricated, using setGeometry(geometry) instead.";

    this.setProperty("box", new Dimension(bound.w, bound.h));
    this.move(bound.x, bound.y);
};
Shape.prototype.moveByx = function (x, y, zoomAware) {
    var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);
    var v = Svg.vectorInCTM({x: x / (zoomAware ? this.canvas.zoom : 1), y: y / (zoomAware ? this.canvas.zoom : 1)}, ctm, true);
    ctm = ctm.translate(v.x, v.y);

    Svg.ensureCTM(this.svg, ctm);
};

Shape.prototype.setPositionSnapshot = function () {
/*
    var ctm = this.svg.getTransformToElement(this.canvas.drawingLayer);

    this.svg.transform.baseVal.consolidate();

    var translate = this.svg.ownerSVGElement.createSVGMatrix();
    translate.e = 0;
    translate.f = 0;

    translate = this.svg.transform.baseVal.createSVGTransformFromMatrix(translate);
    this.svg.transform.baseVal.appendItem(translate);

*/
    this._pSnapshot = {lastDX: 0, lastDY: 0};
};
Shape.prototype.moveFromSnapshot = function (dx, dy, dontNormalize, targetSet) {
/*
    var v = Svg.vectorInCTM({x: dx, y: dy},
                            this._pSnapshot.ctm,
                            true);

    var snap = Config.get("edit.snap.grid", true);
    if (!dontNormalize && snap) {
        var grid = Pencil.getGridSize();
        newX = Util.gridNormalize(v.x + this._pSnapshot.x, grid.w);
        newY = Util.gridNormalize(v.y + this._pSnapshot.y, grid.h);

        v.x = newX - this._pSnapshot.x;
        v.y = newY - this._pSnapshot.y;
    }

    this._pSnapshot.translate.matrix.e = v.x;
    this._pSnapshot.translate.matrix.f = v.y;
*/

    this.moveBy(dx - this._pSnapshot.lastDX, dy - this._pSnapshot.lastDY, targetSet);
    this._pSnapshot.lastDX = dx;
    this._pSnapshot.lastDY = dy;
};
Shape.prototype.clearPositionSnapshot = function () {
/*
    delete this._pSnapshot;
    this._pSnapshot = null;
    this.svg.transform.baseVal.consolidate();
*/
    this._pSnapshot = {lastDX: 0, lastDY: 0};
};
Shape.prototype.normalizePositionToGrid = function () {
    this.setPositionSnapshot();
    this.moveFromSnapshot(0, 0);
    this.clearPositionSnapshot();
};
Shape.prototype.deleteTarget = function () {
    this.canvas.snappingHelper.updateSnappingGuide(this, true);
    //this.dockingManager.deleteTarget();
    this.svg.parentNode.removeChild(this.svg);
};
Shape.prototype.bringForward = function () {
    try {
        var next = this.svg.nextSibling;
        if (next) {
            var thiz = this;
            this.canvas.run( function () {
                var parentNode = thiz.svg.parentNode;
                parentNode.removeChild(thiz.svg);
                var next2 = next.nextSibling;
                if (next2) {
                    parentNode.insertBefore(thiz.svg, next2);
                } else {
                    parentNode.appendChild(thiz.svg);
                }
                //this.dockingManager.invalidateChildTargets();
            }, this, Util.getMessage("action.bring.forward"));
        }
    } catch (e) { alert(e); }
};
Shape.prototype.bringToFront = function () {
    try {
        var next = this.svg.nextSibling;
        if (next) {
            var thiz = this;
            this.canvas.run( function () {
                var parentNode = thiz.svg.parentNode;
                parentNode.removeChild(thiz.svg);
                parentNode.appendChild(thiz.svg);
                //this.dockingManager.invalidateChildTargets();
            }, this, Util.getMessage("action.bring.to.front"));
        }
    } catch (e) { alert(e); }
};
Shape.prototype.sendBackward = function () {
    try {
        var previous = this.svg.previousSibling;
        if (previous) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                parentNode.insertBefore(this.svg, previous);
                //this.dockingManager.invalidateChildTargets();
            }, this, Util.getMessage("action.send.backward"));
        }
    } catch (e) { alert(e); }
};
Shape.prototype.sendToBack = function () {
    try {
        var previous = this.svg.previousSibling;
        if (previous) {
            this.canvas.run( function () {
                var parentNode = this.svg.parentNode;
                parentNode.removeChild(this.svg);
                parentNode.insertBefore(this.svg, parentNode.firstChild);
                //this.dockingManager.invalidateChildTargets();
            }, this, Util.getMessage("action.send.to.back"));
        }
    } catch (e) { alert(e); }
};
Shape.prototype.getTextEditingInfo = function (editingEvent) {
    var infos = [];

    this.prepareExpressionEvaluation();
    for (name in this.def.propertyMap) {
        var prop = this.def.propertyMap[name];
        if (prop.meta.editInfo) {
            F._target = this.svg;
            var info = this.evalExpression(prop.meta.editInfo);

            if (info) {
                info.prop = prop;
                info.value = this.getProperty(name);
                info.target = Pencil.findObjectByName(this.svg, info.targetName);
                info.type = prop.type;
                info.readonly = prop.meta.readonly;
                infos.push(info);
            }
        }
        if (prop.type == PlainText) {
            //find a behavior that use this as text content
            var info = null;

            for (target in this.def.behaviorMap) {
                var b = this.def.behaviorMap[target];
                for (i in b.items) {
                    if (b.items[i].handler == Pencil.behaviors.TextContent && b.items[i].args[0].literal.indexOf("properties." + name) != -1) {
                        var obj = {properties: this.getProperties(), functions: Pencil.functions, collection: this.def.collection};
                        var font = null;
                        for (j in b.items) {
                            if (b.items[j].handler == Pencil.behaviors.Font) {
                                var fontArg = b.items[j].args[0];
                                font = pEval("" + fontArg.literal, obj);
                                break;
                            }
                        }
                        var bound = null;
                        var align = null;
                        for (j in b.items) {
                            if (b.items[j].handler == Pencil.behaviors.BoxFit) {
                                bound = pEval("" + b.items[j].args[0].literal, obj);
                                align = pEval("" + b.items[j].args[1].literal, obj);
                                break;
                            }
                        }
                        var targetObject = Dom.getSingle(".//*[@p:name='" + target + "']", this.svg);
                        //checking if the target is ok for use to base the location calculation
                        var ok = true;
                        try {
                            var clientRect = targetObject.getBoundingClientRect();
                            if (clientRect.width == 0 || clientRect.height == 0) {
                                ok = false;
                            }
                        } catch (e) {}

                        if (ok) {
                            info = {prop: prop,
                                    value: this.getProperty(name),
                                    targetName: target,
                                    type: PlainText,
                                    target: targetObject,
                                    bound: bound,
                                    align: align,
                                    readonly: prop.meta.readonly,
                                    font: font};

                            break;
                        }
                    }

                    if (b.items[i].handler == Pencil.behaviors.PlainTextContent && b.items[i].args[0].literal.indexOf("properties." + name) != -1) {
                        var obj = {properties: this.getProperties(), functions: Pencil.functions, collection: this.def.collection};
                        var font = null;
                        for (j in b.items) {
                            if (b.items[j].handler == Pencil.behaviors.Font) {
                                var fontArg = b.items[j].args[0];
                                font = pEval("" + fontArg.literal, obj);
                                break;
                            }
                        }
                        var bound = null;
                        var align = null;

                        bound = pEval("" + b.items[i].args[1].literal, obj);
                        align = pEval("" + b.items[i].args[2].literal, obj);

                        var targetObject = Dom.getSingle(".//*[@p:name='" + target + "']", this.svg);

                        info = {prop: prop,
                                value: this.getProperty(name),
                                targetName: target,
                                type: PlainText,
                                target: targetObject,
                                bound: bound,
                                align: align,
                                readonly: prop.meta.readonly,
                                font: font,
                                multi: true};

                        break;
                    }
                }
                if (info) {
                    infos.push(info);
                    break;
                }
            }
        } else if (prop.type == RichText) {
            var font = null;
            var info = null;

            for (target in this.def.behaviorMap) {
                var b = this.def.behaviorMap[target];
                for (i in b.items) {
                    if (b.items[i].handler == Pencil.behaviors.TextContent && b.items[i].args[0].literal.indexOf("properties." + name) != -1) {
                        var obj = {properties: this.getProperties(), functions: Pencil.functions};
                        var font = null;
                        for (j in b.items) {
                            if (b.items[j].handler == Pencil.behaviors.Font) {
                                var fontArg = b.items[j].args[0];
                                font = pEval("" + fontArg.literal, obj);
                                break;
                            }
                        }
                        var align = null;
                        var bound = null;
                        for (j in b.items) {
                            if (b.items[j].handler == Pencil.behaviors.Bound) {
                                bound = pEval("" + b.items[j].args[0].literal, obj);
                                break;
                            }
                        }
                        if (bound == null) {
                            for (j in b.items) {
                                if (b.items[j].handler == Pencil.behaviors.BoxFit) {
                                    bound = pEval("" + b.items[j].args[0].literal, obj);
                                    align = pEval("" + b.items[j].args[1].literal, obj);
                                    break;
                                }
                            }
                        }

                        if (font) {

                            var targetObject = Dom.getSingle(".//*[@p:name='" + target + "']", this.svg);
                            //checking if the target is ok for use to base the location calculation
                            var ok = true;
                            try {
                                var clientRect = targetObject.getBoundingClientRect();
                                if (clientRect.width == 0 || clientRect.height == 0) {
                                    if(targetObject.style.visibility != "hidden"
                                        && targetObject.style.display != "none") {
                                        clientRect.left = 0;
                                        clientRect.top = 0;
                                        clientRect.width = 10;
                                        clientRect.height = 10;
                                    } else {
                                        ok = false;
                                    }
                                }
                            } catch (e) {}

                            if (ok) {
                                info = {
                                        prop: prop,
                                        targetName: target,
                                        target: targetObject,
                                        value: this.getProperty(name),
                                        font: font,
                                        bound: bound,
                                        align: align,
                                        readonly: prop.meta.readonly,
                                        inlineEditor: prop.meta.inlineEditor,
                                        type: RichText
                                    };

                                    break;
                            }
                        }
                    }
                }
                if (info) {
                    infos.push(info);
                    break;
                }

            }
        }
    }
    debug("infos.length: " + infos.length + ", editingEvent: " + editingEvent);

    if (infos.length == 0) return null;
    var eventDetail = editingEvent;

    if (!editingEvent) return infos[0];

    if (Util.isXul6OrLater()) {
        eventDetail = editingEvent.detail;
    }
    if (!eventDetail || !eventDetail.origTarget) return infos[0];

    var min = 200000;
    var selectedInfo = null;
    for (var i = 0; i < infos.length; i ++) {
        var info = infos[i];
        var clientRect = info.target.getBoundingClientRect();

        debug("target: " + info.target.getAttributeNS(PencilNamespaces.p, "name"));

        var c = {x: clientRect.left + clientRect.width / 2, y: clientRect.top + clientRect.height / 2};
        var dx = editingEvent.clientX - c.x;
        var dy = editingEvent.clientY - c.y;
        var d = Math.sqrt(dx * dx + dy * dy);

        debug("\tclientRect: " + [clientRect.left, clientRect.top, clientRect.width, clientRect.height]);
        debug("\teditingEvent: " + [editingEvent.clientX, editingEvent.clientY]);
        debug("\tcenter: " + [c.x, c.y]);
        debug("\td: " + d);

        if (d < min) {
            selectedInfo = info;
            min = d;
        }
    }

    return selectedInfo;
};

Shape.prototype.createTransferableData = function () {
    return {
                type: ShapeXferHelper.MIME_TYPE,
                isSVG: true,
                dataNode: this.svg.cloneNode(true)
           };
};
Shape.prototype.lock = function () {
    this.svg.setAttributeNS(PencilNamespaces.p, "p:locked", "true");
};

Shape.prototype.markAsMoving = function (moving) {
    //this.dockingManager.moving = moving;
    Svg.optimizeSpeed(this.svg, moving);
};
Shape.prototype.performAction = function (id) {
    //this.prepareExpressionEvaluation();
    var shapeAction = this.def.actionMap[id];
    if (!shapeAction) { return null; }

    return shapeAction.implFunction.apply(this, []);
}

Shape.prototype.getAttachedSlots = function () {
    var r = [];
    var props = this.getPropertyGroups();
    for (var t in props) {
        for (var k in props[t].properties) {
            var p = props[t].properties[k];
            if (p.type == Attachment) {
                var at = this.getProperty(p.name);
                if (at && at.defId) {
                    r.push(p);
                }
            }
        }
    }
    return r;
};
Shape.prototype.canDetach = function () {
    var props = this.getPropertyGroups();
    for (var t in props) {
        for (var k in props[t].properties) {
            var p = props[t].properties[k];
            if (p.type == Attachment) {
                var at = this.getProperty(p.name);
                if (at && at.defId) {
                    return true;
                }
            }
        }
    }
    return false;
};
Shape.prototype.getConnectorOutlets = function () {
    var outlets = this.performAction("getConnectorOutlets");
    if (outlets == null) {
        outlets = ConnectorUtil.generateStandarOutlets(this);
    }
    return outlets;
};
Shape.prototype.getSnappingGuide = function () {
    var b = this.getBounding();

    var vertical = [];
    var horizontal = [];

    vertical.push(new SnappingData("Left", b.x, "Left", true, this.id, false, b.y, b.y + b.height));
    vertical.push(new SnappingData("VCenter", b.x + b.width/2, "VCenter", true, this.id, false, b.y, b.y + b.height));
    vertical.push(new SnappingData("Right", b.x + b.width, "Right", true, this.id, false, b.y, b.y + b.height));

    horizontal.push(new SnappingData("Top", b.y, "Top", false, this.id, false, b.x, b.x + b.width));
    horizontal.push(new SnappingData("HCenter", b.y + b.height/2, "HCenter", false, this.id, false, b.x, b.x + b.width));
    horizontal.push(new SnappingData("Bottom", b.y + b.height, "Bottom", false, this.id, false, b.x, b.x + b.width));

    var customSnappingData = this.performAction("getSnappingGuide");
    if (customSnappingData) {
        for (var i = 0; i < customSnappingData.length; i++) {
            var data = customSnappingData[i];
            var m = this.svg.getTransformToElement(this.canvas.drawingLayer);

            if (data.vertical) {
                if (data.local) {
                    data.pos = Svg.pointInCTM(data.pos, 0, m).x;
                }

                var ik = -1;
                for (var k = 0; k < vertical.length; k++) {
                    if (vertical[k].type == data.type) {
                        ik = k;
                    }
                }
                if (ik != -1) {
                    vertical[ik] = data;
                } else {
                    vertical.push(data);
                }
            } else {
                if (data.local) {
                    data.pos = Svg.pointInCTM(0, data.pos, m).y;
                }
                var ik = -1;
                for (var k = 0; k < horizontal.length; k++) {
                    if (horizontal[k].type == data.type) {
                        ik = k;
                    }
                }
                if (ik != -1) {
                    horizontal[ik] = data;
                } else {
                    horizontal.push(data);
                }
            }
        }
    }

    return {
        vertical: vertical, horizontal: horizontal
    };
};
Shape.prototype.invalidateInboundConnections = function () {
    Connector.invalidateInboundConnectionsForShapeTarget(this);
};
Shape.prototype.invalidateOutboundConnections = function () {
    Connector.invalidateOutboundConnectionsForShapeTarget(this);
};
Shape.prototype.getSymbolName = function () {
    return Svg.getSymbolName(this.svg);
};
Shape.prototype.setSymbolName = function (name) {
    return Svg.setSymbolName(this.svg, name);
};
Shape.prototype.generateShortcutXML = function () {
    new PromptDialog().open({
        title: "Shortcut",
        message: "Please enter shortcut name",
        defaultValue: "Shortcut",
        callback: function (shortcutName) {
            if (!shortcutName) return;
            var fileName = shortcutName.replace(/[^a-z0-9\\-]+/gi, "").toLowerCase() + ".png";

            var dom = Controller.parser.parseFromString("<Document xmlns=\"" + PencilNamespaces.p + "\"></Document>", "text/xml");
            var spec = {
                _name: "Shortcut",
                _uri: PencilNamespaces.p,
                to: this.def.id.replace(this.def.collection.id + ":", ""),
                displayName: shortcutName,
                _children: [

                ]
            };
            for (var name in this.def.propertyMap) {
                var prop = this.def.getProperty(name);
                var value = this.getProperty(name);

                if (prop.type == ImageData && this.def.collection.developerStencil) {
                    if (value.data && value.data.match(/^ref:\/\//)) {
                        var id = ImageData.refStringToId(value.data);
                        if (id) {
                            var filePath = Pencil.controller.refIdToFilePath(id);

                            var bitmapImageFileName = (shortcutName + "-" + name).replace(/[^a-z0-9\\-]+/gi, "").toLowerCase() + ".png";

                            var targetPath = path.join(path.join(this.def.collection.installDirPath, "bitmaps"), bitmapImageFileName);
                            fs.writeFileSync(targetPath, fs.readFileSync(filePath));

                            value = new ImageData(value.w, value.h, "collection://bitmaps/" + bitmapImageFileName, value.xCells, value.yCells);
                        }
                    }
                }

                if (!value) continue;
                if (prop.initialValueExpression) {
                    this._evalContext = {collection: this.def.collection};
                    var v = this.evalExpression(prop.initialValueExpression);
                    if (v && value.toString() == v.toString()) continue;
                }
                if (prop.initialValue) {
                    if (value.toString() == prop.initialValue.toString()) continue;
                }

                spec._children.push({
                    _name: "PropertyValue",
                    _uri: PencilNamespaces.p,
                    name: name,
                    _text: value.toString()
                });
            }

            var next = function () {
                var shortcutNode = Dom.newDOMElement(spec, dom);
                var xml = "    " + Dom.serializeNode(shortcutNode).replace(/<PropertyValue/g, "\n        <PropertyValue").replace("</Shortcut>", "\n    </Shortcut>");

                if (this.def.collection.developerStencil) {
                    var defPath = path.join(this.def.collection.installDirPath, "Definition.xml");
                    var content = fs.readFileSync(defPath, {encoding: "utf8"});
                    content = content.replace(/<\/Shapes>/, xml + "\n</Shapes>");
                    fs.writeFileSync(defPath, content);

                    CollectionManager.reloadDeveloperStencil("notify");
                }
            }.bind(this);

            if (this.def.collection.developerStencil) {
                var targetPath = path.join(path.join(this.def.collection.installDirPath, "icons"), fileName);
                Pencil.rasterizer.rasterizeSelectionToFile(this, targetPath, function (p, error) {
                    if (!error) {
                        spec.icon = "icons/" + fileName;
                        next();
                    }
                });
            } else {
                next();
            }



        }.bind(this)
    });
};

Shape.prototype.getContentEditActions = function (event) {
    var actions = [];
    var editInfo = this.getTextEditingInfo(event);
    if (editInfo) {
        actions.push({
            type: "text",
            editInfo: editInfo
        });
    }
    for (var action of this.def.actions) {
        if (action.meta["content-action"] == "true") {
            actions.push({
                type: "action",
                actionId: action.id
            });
        }
    }

    return actions;
};
Shape.prototype.handleOtherContentEditAction = function (action) {
    if (action.type != "action") return;
    this.performAction(action.actionId);
};
