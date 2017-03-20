function GeometryEditor() {
    this.svgElement = null;
    this.canvas = null;

    this.resetAccomulatedChanges();
}

GeometryEditor.ANCHOR_SIZE = 4;
GeometryEditor.configDoc = Dom.loadSystemXml("pencil-core/editor/geometryEditor.config.xml");
GeometryEditor.prototype.resetAccomulatedChanges = function () {
    this.adx = 0;
    this.ady = 0;
    this.adw = 0;
    this.adh = 0;
    this.ada = 0;
};
GeometryEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.onScreenEditors.push(this);
    this.svgElement = canvas.ownerDocument.importNode(Dom.getSingle("/p:Config/svg:g", GeometryEditor.configDoc), true);

    this.svgElement.style.visibility = "hidden";
    canvas.installControlSVGElement(this.svgElement);

    this.anchorContainer = Dom.getSingle("./svg:g[@p:name='Anchors']", this.svgElement);
    this.borderRect = Dom.getSingle("./svg:rect[@p:name='Bound']", this.svgElement);

    //this.debugText = Dom.getSingle("./svg:text[@p:name='debug']", this.svgElement).firstChild;

    this.anchor0 = Dom.getSingle(".//svg:rect[@p:name='TopLeft']", this.svgElement);
    this.anchor1 = Dom.getSingle(".//svg:rect[@p:name='Top']", this.svgElement);
    this.anchor2 = Dom.getSingle(".//svg:rect[@p:name='TopRight']", this.svgElement);
    this.anchor3 = Dom.getSingle(".//svg:rect[@p:name='Right']", this.svgElement);
    this.anchor4 = Dom.getSingle(".//svg:rect[@p:name='BottomRight']", this.svgElement);
    this.anchor5 = Dom.getSingle(".//svg:rect[@p:name='Bottom']", this.svgElement);
    this.anchor6 = Dom.getSingle(".//svg:rect[@p:name='BottomLeft']", this.svgElement);
    this.anchor7 = Dom.getSingle(".//svg:rect[@p:name='Left']", this.svgElement);

    Dom.workOn(".//svg:rect[@class='Anchor']", this.svgElement, function (node) {
            node.setAttribute("width", GeometryEditor.ANCHOR_SIZE * 2);
            node.setAttribute("height", GeometryEditor.ANCHOR_SIZE * 2);

            var t = node.getAttribute("transform");
            t = t.replace(/3/g, "" + GeometryEditor.ANCHOR_SIZE);
            node.setAttribute("transform", t);
        });

    this.anchors = [this.anchor0, this.anchor1, this.anchor2, this.anchor3,
                        this.anchor4, this.anchor5, this.anchor6, this.anchor7];

    //mark them as anchor for ease of DOM lookup later. this is to boost up scaling performance
    for (i in this.anchors) {
        this.anchors[i]._editor = this;
        this.anchors[i]._isAnchor = true;
    }

    //dx, dy, dw, dh factors
    this.anchor0._matrix = {dx: 1,  dy: 1,  dw: -1, dh: -1};
    this.anchor1._matrix = {dx: 0,  dy: 1,  dw: 0,  dh: -1};
    this.anchor2._matrix = {dx: 0,  dy: 1,  dw: 1,  dh: -1};
    this.anchor3._matrix = {dx: 0,  dy: 0,  dw: 1,  dh: 0};
    this.anchor4._matrix = {dx: 0,  dy: 0,  dw: 1,  dh: 1};
    this.anchor5._matrix = {dx: 0,  dy: 0,  dw: 0, dh: 1};
    this.anchor6._matrix = {dx: 1,  dy: 0,  dw: -1, dh: 1};
    this.anchor7._matrix = {dx: 1,  dy: 0,  dw: -1, dh: 0};

    //register event
    var thiz = this;

    //registering event on the outmost item to have better UI interation
    var outmostItem = this.svgElement.ownerDocument.documentElement;
    outmostItem.addEventListener("mousedown", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mousedown", arguments.callee, false);
            return;
        }
        thiz.handleMouseDown(ev);
    }, false);
    outmostItem.addEventListener("mouseup", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mouseup", arguments.callee, false);
            return;
        }
        thiz.handleMouseUp(ev);
    }, false);
    outmostItem.addEventListener("mousemove", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mousemove", arguments.callee, false);
            return;
        }
        thiz.handleMouseMove(ev);
    }, false);
};
GeometryEditor.dumpGeo = function (s, geo) {
    var o = {};
    if (geo.ctm) {
        o.ctm = {
            a: geo.ctm.a,
            b: geo.ctm.b,
            c: geo.ctm.c,
            d: geo.ctm.d,
            e: geo.ctm.e,
            f: geo.ctm.f
        };
    }
    if (geo.dim) {
        o.dim = {
            w: geo.dim.w,
            h: geo.dim.h
        };
    }

    debug(s + ": " + o.toSource());
};
GeometryEditor.prototype.attach = function (targetObject) {
    if (!targetObject) return;
    if (targetObject.constructor == TargetSet) {
        this.dettach();
        return;
    }
    this.setTool("scale");
    this.targetObject = targetObject;

    var geo = this.canvas.getZoomedGeo(targetObject);
    this.setEditorGeometry(geo);

    this.svgElement.style.visibility = "visible";

    if (this.targetObject.supportScaling && this.targetObject.supportScaling()) {
        this.svgElement.removeAttributeNS(PencilNamespaces.p, "nobox");
    } else {
        this.svgElement.setAttributeNS(PencilNamespaces.p, "p:nobox", true);
    }
};

GeometryEditor.prototype.dettach = function () {
    this.targetObject = null;
    this.svgElement.style.visibility = "hidden";
};
GeometryEditor.prototype.invalidate = function () {
    if (!this.targetObject) return;
    var geo = this.canvas.getZoomedGeo(this.targetObject);
    this.setEditorGeometry(geo);
};

GeometryEditor.prototype.setEditorGeometry = function (geo) {
    //transformation
    Svg.ensureCTM(this.svgElement, geo.ctm);

    //dimension
    Svg.setWidth(this.borderRect, geo.dim.w);
    Svg.setHeight(this.borderRect, geo.dim.h);

    if (geo.loc) {
        Svg.setX(this.borderRect, geo.loc.x);
        Svg.setY(this.borderRect, geo.loc.y);

        this.anchorContainer.setAttribute("transform", "translate(" + [geo.loc.x, geo.loc.y] + ")");
    } else {
        Svg.setX(this.borderRect, 0);
        Svg.setY(this.borderRect, 0);
        this.anchorContainer.removeAttribute("transform");
    }


    //repositioning anchors
    var hx = Math.round((geo.dim.w - this.anchor1.width.baseVal.value + 1) / 2); // half of x
    var fx = geo.dim.w - this.anchor2.width.baseVal.value + 1;
    var hy = Math.round((geo.dim.h - this.anchor3.height.baseVal.value + 1) / 2);
    var fy = geo.dim.h - this.anchor4.height.baseVal.value + 1;

    Svg.setX(this.anchor1, hx);
    Svg.setX(this.anchor2, fx);

    Svg.setX(this.anchor3, fx);
    Svg.setY(this.anchor3, hy);

    Svg.setX(this.anchor4, fx);
    Svg.setY(this.anchor4, fy);

    Svg.setX(this.anchor5, hx);
    Svg.setY(this.anchor5, fy);

    Svg.setY(this.anchor6, fy);

    Svg.setY(this.anchor7, hy);

    this.geo = geo;
};
GeometryEditor.prototype.setBound = function (bound) {
    throw "@method: GeometryEditor.prototype.setBound is now depricated, using setEditorGeometry instead.";

    this.svgElement.setAttribute("transform", "translate(" + bound.x + "," + bound.y + ")");

    Svg.setWidth(this.borderRect, bound.w);
    Svg.setHeight(this.borderRect, bound.h);

    //repositioning anchors
    var hx = Math.round((bound.w - this.anchor1.width.baseVal.value + 1) / 2); // half of x
    var fx = bound.w - this.anchor2.width.baseVal.value + 1;
    var hy = Math.round((bound.h - this.anchor3.height.baseVal.value + 1) / 2);
    var fy = bound.h - this.anchor4.height.baseVal.value + 1;

    Svg.setX(this.anchor1, hx);
    Svg.setX(this.anchor2, fx);

    Svg.setX(this.anchor3, fx);
    Svg.setY(this.anchor3, hy);

    Svg.setX(this.anchor4, fx);
    Svg.setY(this.anchor4, fy);

    Svg.setX(this.anchor5, hx);
    Svg.setY(this.anchor5, fy);

    Svg.setY(this.anchor6, fy);

    Svg.setY(this.anchor7, hy);

    this.bound = bound;
}
GeometryEditor.prototype.findAnchor = function (element) {
    var thiz = this;
    var anchor = Dom.findUpward(element, function (node) {
        return node._isAnchor && (node._editor == thiz);
    });

    return anchor;
};
GeometryEditor.prototype.handleMouseDown = function (event) {
    if (!this.canvas.currentController) return;
    this.currentAnchor = this.findAnchor(event.originalTarget);
    this.oX = event.clientX;
    this.oY = event.clientY;

    this.oGeo = this.geo;

    //calculating sizing constraints
    if (!this.geo) return;

    this._e = this.geo.ctm.e;
    this._f = this.geo.ctm.f;
    this._w = this.geo.dim.w;
    this._h = this.geo.dim.h;

    var minDim = this.getMinDimension();
    var grid = this.getZoomedGridSize();

    var maxX1 = this._e + this._w - minDim.w * this.canvas.zoom;
    this._maxX1 = maxX1 - (maxX1 % grid.x);

    var minX2 = this._e + minDim.w * this.canvas.zoom;
    var r = minX2 % grid.x;
    this._minX2 = r == 0 ? minX2 : (minX2 + grid.x - r);

    var maxY1 = this._f + this._h - minDim.h * this.canvas.zoom;
    this._maxY1 = maxY1 - (maxY1 % grid.y);

    var minY2 = this._f + minDim.h * this.canvas.zoom;
    var r = minY2 % grid.y;
    this._minY2 = r == 0 ? minY2 : (minY2 + grid.y - r);

    this._minDim = minDim;

    try {
        if (this.canvas.currentController.getSnappingGuide) {
            var guides = this.canvas.currentController.getSnappingGuide();
            this._lastGuides = {
                left: null,
                top: null,
                bottom: null,
                right: null
            };


            for (var i = 0; i < guides.vertical.length; i ++) {
                var guide = guides.vertical[i];
                if (guide.type == "Left") this._lastGuides.left = guide;
                if (guide.type == "Right") this._lastGuides.right = guide;
            }
            for (var i = 0; i < guides.horizontal.length; i ++) {
                var guide = guides.horizontal[i];
                if (guide.type == "Top") this._lastGuides.top = guide;
                if (guide.type == "Bottom") this._lastGuides.bottom = guide;
            }
        }
    } catch (e) {
        Console.dumpError(e);
    }
};

GeometryEditor.prototype.handleMouseUp = function (event) {
    try {
        if (this.currentAnchor) {
            this.canvas.run(function () {
                try {
                    if (this.adx != 0 || this.ady != 0) {
                        this.targetObject.moveBy(this.adx / this.canvas.zoom, this.ady / this.canvas.zoom);
                    }
                    if (this.adw != 0 || this.adh != 0) {
                        var geo = this.targetObject.getGeometry();
                        if (!geo.dim) return;
                        this.targetObject.scaleTo(geo.dim.w + this.adw / this.canvas.zoom, geo.dim.h + this.adh / this.canvas.zoom);
                        Dom.emitEvent("p:ShapeGeometryModified", this.canvas, {setter: null});
                    }
                    if (this.ada != 0 && this.targetObject.rotateBy) {
                        this.targetObject.rotateBy(this.ada);
                        Dom.emitEvent("p:ShapeGeometryModified", this.canvas, {setter: null});
                    }
                } finally {
                    this.resetAccomulatedChanges();
                    this.canvas.invalidateEditors();
                }
            }, this, Util.getMessage("action.move.shape"));
        }
    } finally {
        this.currentAnchor = null;
    }
};
GeometryEditor.prototype.nextTool = function () {
    var next = (this.tool == "scale") ? "rotate" : "scale";

    this.setTool(next);
};
GeometryEditor.prototype.setTool = function (tool) {
    this.tool = tool;
    this.svgElement.setAttribute("class", "GeoEditor Tool_" + this.tool);

    Dom.workOn(".//svg:rect[@class='Anchor']", this.svgElement, function (node) {
            if (tool == "rotate") {
                node.setAttribute("rx", GeometryEditor.ANCHOR_SIZE);
                node.setAttribute("ry", GeometryEditor.ANCHOR_SIZE);

                node.setAttributeNS(PencilNamespaces.xlink, "title", "Rotate the shape - click again to resize");
            } else {
                node.removeAttribute("rx");
                node.removeAttribute("ry");

                node.setAttributeNS(PencilNamespaces.xlink, "title", "Resize the shape - click again to rotate");
            }
        });
};
GeometryEditor.prototype.handleMouseMove = function (event) {
    if (!this.currentAnchor) return;
    event.preventDefault();

    var locking = this.getLockingPolicy();
    if (event.ctrlKey) locking.ratio = true;

    if (this.tool == "rotate") {
        if (!locking.rotation) {
            this.rotate(new Point(this.oX, this.oY), new Point(event.clientX, event.clientY), event);
        }
        return;
    }

    if (this.targetObject.dockingManager) {
        this.targetObject.dockingManager.altKey = event.altKey;
    }

    var uPoint1 = Svg.vectorInCTM(new Point(this.oX, this.oY), this.geo.ctm);
    var uPoint2 = Svg.vectorInCTM(new Point(event.clientX, event.clientY), this.geo.ctm);

    var matrix = this.currentAnchor._matrix;
    var t = event.shiftKey ? {x: 1, y: 1} : this.getGridSize(); //Svg.vectorInCTM(this.getGridSize(), this.geo.ctm, true);
    var grid = {w: t.x * this.canvas.zoom, h: t.y * this.canvas.zoom};

    var e = this._e;
    var f = this._f;

    var mdx = uPoint2.x - uPoint1.x;
    var mdy = uPoint2.y - uPoint1.y;

    //FIXME: this is a temp. implementation for ratio locking
    /*if (locking.ratio) {
        if (matrix.dw) {
            mdy = mdx;
        } else if (matrix.dh) {
            mdx = mdy;
        }
    }*/

    var newGeo = new Geometry();

    var dx = 0;
    var dw = 0;
    var dy = 0;
    var dh = 0;

    var controller = this.canvas.currentController;
    var bound = controller.getBounding();

    //HORIZONTAL
    if (!locking.width) {
        dx = matrix.dx * mdx;
        dw = matrix.dw * mdx;
        //console.log([dx, dw]);

        //console.log(["before:  ", dx, dw]);
        if (matrix.dx != 0) {
            var newX = e + dx;
            var newXNormalized = locking.ratio ? newX : Util.gridNormalize(newX, grid.w);
            if (newXNormalized > this._maxX1) newXNormalized = this._maxX1;

            var delta = newXNormalized - newX;

            if (!locking.ratio) {
                var snapping = this._lastGuides.left ? this._lastGuides.left.clone() :
                            new SnappingData("Left", bound.x, "Left", true, Util.newUUID());
                snapping.pos += dx;
                var snap = this.canvas.snappingHelper.findSnapping(true, false, {
                    vertical: [ snapping ], horizontal: []
                }, (grid.w / 2) - 1);

                if (snap && (snap.dx != 0 && !this.canvas.snappingHelper.snappedX)) {
                    this.canvas.snappingHelper.snappedX = true;
                    this.canvas.snappingHelper.snapX = newX;
                    delta = snap.dx;
                } else {
                    var unsnapX = (this.canvas.snappingHelper.snapX != 0 && (Math.abs(this.canvas.snappingHelper.snapX - newX) > grid.w / 2));
                    if (unsnapX || !this.canvas.snappingHelper.snappedX) {
                        this.canvas.snappingHelper.snapX = 0;
                        this.canvas.snappingHelper.snappedX = false;
                        this.canvas.snappingHelper.clearSnappingGuideX();
                    } else {
                        delta = snap.dx;
                    }
                }
            }

            dx += delta;
            dw -= delta;
            //console.log(["<--", e, newX, newXNormalized, delta, dx, dw]);
        } else {
            var newX2 = e + this._w + dw;
            var newX2Normalized = locking.ratio ? newX2 : Util.gridNormalize(newX2, grid.w);
            if (newX2Normalized < this._minX2) newX2Normalized = this._minX2;

            var delta = newX2Normalized - newX2;

            if (!locking.ratio) {
                var snapping = this._lastGuides.right ? this._lastGuides.right.clone() :
                new SnappingData("Right", bound.x + bound.width, "Right", true, Util.newUUID());
                snapping.pos += dw;

                var snap = this.canvas.snappingHelper.findSnapping(true, false, {
                    vertical: [snapping], horizontal: []
                }, (grid.w / 2) - 1);
                if (snap && (snap.dx != 0 && !this.canvas.snappingHelper.snappedX)) {
                    this.canvas.snappingHelper.snappedX = true;
                    this.canvas.snappingHelper.snapX = newX2;
                    delta = snap.dx;
                } else {
                    var unsnapX = (this.canvas.snappingHelper.snapX != 0 && (Math.abs(this.canvas.snappingHelper.snapX - newX2) > grid.w / 2));
                    if (unsnapX || !this.canvas.snappingHelper.snappedX) {
                        this.canvas.snappingHelper.snapX = 0;
                        this.canvas.snappingHelper.snappedX = false;
                        this.canvas.snappingHelper.clearSnappingGuideX();
                    } else {
                        delta = snap.dx;
                    }
                }
            }

            dw += delta;
            //info(["-->", newX2, newX2Normalized, delta, dx, dw]);
        }
    }

    if (locking.ratio && matrix.dh == 0) {
        dy = Math.round(dx * this._minDim.h / this._minDim.w);
        dh = Math.round(dw * this._minDim.h / this._minDim.w);
    } else if (!locking.height && (matrix.dh != 0) ) {
        dy = matrix.dy * mdy;
        dh = matrix.dh * mdy;

        if (matrix.dy != 0) {
            var newY = f + dy;
            var newYNormalized = locking.ratio ? newY : Util.gridNormalize(newY, grid.h);
            if (newYNormalized > this._maxY1) newYNormalized = this._maxY1;

            var delta = newYNormalized - newY;

            if (!locking.ratio) {
                var snapping = this._lastGuides.top ? this._lastGuides.top.clone() :
                new SnappingData("Top", bound.y, "Top", true, Util.newUUID());
                snapping.pos += dy;

                var snap = this.canvas.snappingHelper.findSnapping(false, true, {
                    vertical: [],
                    horizontal: [snapping]
                }, (grid.w / 2) - 1);
                if (snap && (snap.dy != 0 && !this.canvas.snappingHelper.snappedY)) {
                    this.canvas.snappingHelper.snappedY = true;
                    this.canvas.snappingHelper.snapY = newY;
                    delta = snap.dy;
                } else {
                    var unsnapY = (this.canvas.snappingHelper.snapY != 0 && (Math.abs(this.canvas.snappingHelper.snapY - newY) > grid.w / 2));
                    if (unsnapY || !this.canvas.snappingHelper.snappedY) {
                        this.canvas.snappingHelper.snapY = 0;
                        this.canvas.snappingHelper.snappedY = false;
                        this.canvas.snappingHelper.clearSnappingGuideY();
                    } else {
                        delta = snap.dy;
                    }
                }
            }

            dy += delta;
            dh -= delta;
        } else {
            var newY2 = f + this._h + dh;
            var newY2Normalized = locking.ratio ? newY2 : Util.gridNormalize(newY2, grid.h);
            if (newY2Normalized < this._minY2) newY2Normalized = this._minY2;

            var delta = newY2Normalized - newY2;

            if (!locking.ratio) {
                var snapping = this._lastGuides.bottom ? this._lastGuides.bottom.clone() :
                new SnappingData("Bottom", bound.y + bound.height, "Bottom", true, Util.newUUID());
                snapping.pos += dh;


                var snap = this.canvas.snappingHelper.findSnapping(false, true, {
                    vertical: [],
                    horizontal: [snapping]
                }, (grid.w / 2) - 1);
                if (snap && (snap.dy != 0 && !this.canvas.snappingHelper.snappedY)) {
                    this.canvas.snappingHelper.snappedY = true;
                    this.canvas.snappingHelper.snapY = newY2;
                    delta = snap.dy;
                } else {
                    var unsnapY = (this.canvas.snappingHelper.snapY != 0 && (Math.abs(this.canvas.snappingHelper.snapY - newY2) > grid.w / 2));
                    if (unsnapY || !this.canvas.snappingHelper.snappedY) {
                        this.canvas.snappingHelper.snapY = 0;
                        this.canvas.snappingHelper.snappedY = false;
                        this.canvas.snappingHelper.clearSnappingGuideY();
                    } else {
                        delta = snap.dy;
                    }
                }
            }

            dh += delta;
        }

        if (locking.ratio) {
            dx = Math.round(dy * this._minDim.w / this._minDim.h);
            dw = Math.round(dh * this._minDim.w / this._minDim.h);
        }
    }

    //this.currentAnchor = null;

    newGeo.ctm = this.oGeo.ctm.translate(dx, dy);

    if (locking.ratio && !locking.width && !locking.height) {
    	var r = this.oGeo.dim.w / this.oGeo.dim.h;
    	var w = 0, h = 0;
    	if (dw > dh) {
    		w = this.oGeo.dim.w + dw;
    		h = w / r;
    	} else {
    		h = this.oGeo.dim.h + dh;
    		w = h * r;
    	}

    	w = Math.round(w);
    	h = Math.round(h);
        newGeo.dim = new Dimension(w, h);
        dw = w - this.oGeo.dim.w;
        dh = h - this.oGeo.dim.h;
    } else {
        newGeo.dim = new Dimension(Math.round(this.oGeo.dim.w + dw), Math.round(this.oGeo.dim.h + dh));
    }



    var p = Svg.vectorInCTM(new Point(dx, dy), this.geo.ctm.inverse(), true);
    this.adx = p.x;
    this.ady = p.y;
    this.adw = dw;
    this.adh = dh;


    //validate the bound using the current policies
    //TODO: revalidate this

//    this.validateGeometry(newGeo, matrix, locking);
    //this.debugText.nodeValue = [newBound.x, newBound.y, newBound.w, newBound.h].toString();

    this.setEditorGeometry(newGeo);
};
GeometryEditor.prototype.handleMouseMove_old = function (event) {
    event.preventDefault();

    if (!this.currentAnchor) return;

    var locking = this.getLockingPolicy();

    if (this.tool == "rotate") {
        if (!locking.rotation) {
            this.rotate(new Point(this.oX, this.oY), new Point(event.clientX, event.clientY), event);
        }
        return;
    }


    var uPoint1 = Svg.vectorInCTM(new Point(this.oX, this.oY), this.geo.ctm);
    var uPoint2 = Svg.vectorInCTM(new Point(event.clientX, event.clientY), this.geo.ctm);


    dx = uPoint2.x - uPoint1.x;
    dy = uPoint2.y - uPoint1.y;

    var newGeo = new Geometry();

    var matrix = this.currentAnchor._matrix;
    //this.currentAnchor = null;

    dx = (locking.width || (locking.x && matrix.dx != 0)) ? 0 : dx;

    dy = (locking.height || (locking.y && matrix.dy != 0)) ? 0 : dy;

    newGeo.ctm = this.oGeo.ctm.translate(matrix.dx * dx, matrix.dy * dy);
    newGeo.dim = new Dimension(Math.round(this.oGeo.dim.w + matrix.dw * dx), Math.round(this.oGeo.dim.h + matrix.dh * dy));


    //validate the bound using the current policies
    //TODO: revalidate this

    this.validateGeometry(newGeo, matrix, locking);
    //this.debugText.nodeValue = [newBound.x, newBound.y, newBound.w, newBound.h].toString();

    this.setEditorGeometry(newGeo);
};
GeometryEditor.prototype.getLockingPolicy = function () {
    if(!this.targetObject)
        return {x: true, y: true, width: true, height: true, rotation: true, ratio: true};

    var allowScalling = this.targetObject.supportScaling && this.targetObject.supportScaling();
    if(!this.targetObject.def)
        return {x: false, y: false, width: !allowScalling, height: !allowScalling, rotation: false, ratio: false};

    var boxPropDef = this.targetObject.def.propertyMap["box"];
    var lockW = boxPropDef ? (boxPropDef.meta.lockWidth == "true" || boxPropDef.meta.widthExpr) : false;
    var lockH = boxPropDef ? (boxPropDef.meta.lockHeight == "true" || boxPropDef.meta.heightExpr) : false;
    var lockR = boxPropDef ? (boxPropDef.meta.lockRotation == "true") : false;
    var lockRatio = boxPropDef ? (boxPropDef.meta.lockRatio == "true") : false;

    return {x: false, y: false, width: lockW, height: lockH, rotation: lockR, ratio: lockRatio};
};
GeometryEditor.prototype.getMinDimension = function () {
    //FIXME: this value is picked up from either the current shape box constraint or the system fallback constraint
    var min = { w: 2, h: 2 };

    var w = this.geo.dim.w;
    var h = this.geo.dim.h;

    var locking = this.getLockingPolicy();
    if (locking.ratio && (w > 2 || h > 2)) {
        if (w < h) {
            min.h = Math.round(min.h * (h / w));
        } else {
            min.w = Math.round(min.w * (w / h));
        }
    }

    return min;
};
GeometryEditor.prototype.getGridSize = function () {
    //FIXME: this value is defined in either system-wide config or document-wide config
    var grid = Pencil.getGridSize();
    return { x: grid.w, y: grid.h };
};
GeometryEditor.prototype.getZoomedGridSize = function () {
    var size = this.getGridSize();
    return { x: size.x * this.canvas.zoom, y: size.y * this.canvas.zoom };
};
GeometryEditor.prototype.getRotationStep = function () {
    return 15; //degrees
};
GeometryEditor.prototype.getRotationCenterRatio = function () {
    return {rx: 0.5, ry: 0.5 };
};
GeometryEditor.prototype.getRotationCenterScreenLocation = function () {
    var point = Svg.getScreenLocation(this.borderRect);

    var centerRatio = this.getRotationCenterRatio();

    return { x: this.geo.dim.w * centerRatio.rx + point.x, y: this.geo.dim.h * centerRatio.ry + point.y};
};
GeometryEditor.prototype.rotate = function (from, to, event) {
    var centerRatio = this.getRotationCenterRatio();
/*
    var center = Svg.getScreenLocation(this.borderRect);
    center = Svg.vectorInCTM(this.getRotationCenterLocation(), this.geo.ctm);

    { x: this.geo.dim.w * centerRatio.rx, y:  this.geo.dim.h * centerRatio.ry}
    center.x += this.geo.dim.w * centerRatio.rx;
*/
    var d = this.geo.loc ? this.geo.loc : {x: 0, y: 0};
    var center = { x: this.geo.dim.w * centerRatio.rx + d.x, y:  this.geo.dim.h * centerRatio.ry + d.y};
    var centerInScreen = Svg.getScreenLocation(this.borderRect, center);


    var a = Svg.getRelativeAngle(from, to, centerInScreen);
    if (!event || !event.shiftKey) {
        var step = this.getRotationStep();
        a = Math.round(a / step) * step;
    }

    var matrix = Svg.rotateMatrix(a, center, this.borderRect);
    var newGeo = new Geometry();
    newGeo.ctm = this.oGeo.ctm.multiply(matrix);
    newGeo.dim = this.geo.dim;
    newGeo.loc = this.geo.loc ? this.geo.loc : null;

    this.setEditorGeometry(newGeo);

    this.ada = a;
};
GeometryEditor.prototype.validateGeometry = function (geo, matrix, locking) {

    var minDim = this.getMinDimension();

    var grid = this.getGridSize();

    grid = Svg.vectorInCTM(grid, geo.ctm, true);

    var tx = 0;
    var ty = 0;

    if (matrix.dw != 0) {
        if (matrix.dx != 0) {
            if (!locking.x) {
                var x = Math.min(geo.ctm.e, geo.ctm.e - minDim.w + geo.dim.w);
                x = x - x % grid.x;

                geo.dim.w = geo.dim.w + geo.ctm.e - x;
                tx = x - geo.ctm.e;
            }
        } else if (!locking.width) {
            var w = Math.max(minDim.w, geo.dim.w);
            var x2 = w + geo.ctm.e;
            if (x2 % grid.x > 0) w += (grid.x - x2 % grid.x);

            geo.dim.w = w;
        }
    }

    if (matrix.dh != 0) {
        if (matrix.dy != 0) {
            if (!locking.y) {
                var y = Math.min(geo.ctm.f, geo.ctm.f - minDim.h + geo.dim.h);
                y = y - y % grid.y;

                geo.dim.h = geo.dim.h + geo.ctm.f - y;
                ty = y - geo.ctm.f;
            }
        } else if (!locking.height) {
            var h = Math.max(minDim.h, geo.dim.h);
            var y2 = h + geo.ctm.f;
            if (y2 % grid.y > 0) h += (grid.y - y2 % grid.y);

            geo.dim.h = h;
        }
    }

    if (tx != 0 || ty != 0) {
        geo.ctm = geo.ctm.translate(tx, ty);
    }

};

Pencil.registerEditor(GeometryEditor);
