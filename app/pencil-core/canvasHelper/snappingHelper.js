function SnappingHelper(canvas) {
    this.canvas = canvas;
    if (Config.get("object.snapping.enabled") == null) {
        Config.set("object.snapping.enabled", true);
    }
    this.init();
};
SnappingHelper.prototype.isGridSnappingEnabled = function () {
    return Config.get("edit.snap.grid") == true;
};
SnappingHelper.prototype.isSnappingEnabled = function () {
    return true;
};
SnappingHelper.prototype.init = function () {
    if (this.initialized) return;

    this.snappingGuideLayer = document.createElementNS(PencilNamespaces.svg, "svg:g");
    this.snappingGuideContainerX = document.createElementNS(PencilNamespaces.svg, "g");
    this.snappingGuideContainerX.setAttributeNS(PencilNamespaces.p, "p:name", "Snapping");
    this.snappingGuideContainerX.setAttribute("transform", "translate(-0.5, -0.5)");

    this.snappingGuideLayer.appendChild(this.snappingGuideContainerX);

    this.snappingGuideContainerY = document.createElementNS(PencilNamespaces.svg, "g");
    this.snappingGuideContainerY.setAttributeNS(PencilNamespaces.p, "p:name", "Snapping");
    this.snappingGuideContainerY.setAttribute("transform", "translate(-0.5, -0.5)");

    this.snappingGuideLayer.appendChild(this.snappingGuideContainerY);

    this.canvas.topGroup.appendChild(this.snappingGuideLayer);

    this.snappingGuide = { };

    this.snapX = 0;
    this.snapY = 0;

    this.unsnapX = Pencil.UNSNAP;
    this.unsnapY = Pencil.UNSNAP;

    this.snappedX = false;
    this.snappedY = false;

    this.initialized = true;
    this.rebuildSnappingGuide();
}
SnappingHelper.prototype.clearSnappingGuide = function () {
    this.clearSnappingGuideX();
    this.clearSnappingGuideY();
};
SnappingHelper.prototype.clearSnappingGuideX = function () {
    if (!this.isSnappingEnabled()) return;
    if (!this._snappingGuideContainerXEmpty) {
        this._snappingGuideContainerXEmpty = true;
        Dom.empty(this.snappingGuideContainerX);
    }
};
SnappingHelper.prototype.clearSnappingGuideY = function () {
    if (!this.isSnappingEnabled()) return;
    if (!this._snappingGuideContainerYEmpty) {
        this._snappingGuideContainerYEmpty = true;
        Dom.empty(this.snappingGuideContainerY);
    }
};
SnappingHelper.prototype.updateSnappingDataFromBackground = function (page, remove) {
    this.rebuildSnappingGuide();
    if (remove) {
        return;
    }

    if (!page || !page._view || !page._view.canvas) {
        return;
    };
    var bgSnappingData = page._view.canvas.snappingHelper.snappingGuide;
    if (bgSnappingData) {
        for (var i in bgSnappingData) {
            this.snappingGuide[i] = bgSnappingData[i];
        }
    }
};
SnappingHelper.prototype.rebuildSnappingGuide = function () {
    if (!this.isSnappingEnabled()) return;
    var thiz = this;
    this.snappingGuide = { };
    Dom.workOn("./svg:g[@p:type]", this.canvas.drawingLayer, function (node) {
        try {
            var c = thiz.canvas.createControllerFor(node);
            if (c.getSnappingGuide) {
                thiz.snappingGuide[c.id] = c.getSnappingGuide();
            }
        } catch (e) {
            error(e);
        }
    });

    if (this.isGridSnappingEnabled()) {
        var grid = Pencil.getGridSize();
        if (grid.w > 0 && grid.h > 0) {
            var z = this.canvas.zoom ? this.canvas.zoom : 1;
            for (var i = grid.w * z, j = grid.h * z; i < this.canvas.width * z; i += grid.w * z, j += grid.h * z) {
                var uid = Util.newUUID();
                this.snappingGuide[uid] = {
                        vertical: [
                            new SnappingData("GridSnap", i, "Left", true, uid)
                        ],
                        horizontal: [
                            new SnappingData("GridSnap", j, "Top", false, uid)
                        ]
                    };
            }
        }
    }

    var margin = (Pencil.controller && !this.canvas.options.ignorePageMarging) ? Pencil.controller.getDocumentPageMargin() : 0;
    margin = parseInt(margin, 10);
    if (isNaN(margin) || margin < 0) margin = 0;
    var uid = Util.newUUID();
    var snap = {
            vertical: [
                new SnappingData("MarginSnap", margin, "Left", true, uid),
                new SnappingData("MarginSnap", this.canvas.width - margin, "Right", true, uid)
            ],
            horizontal: [
                new SnappingData("MarginSnap", margin, "Top", false, uid),
                new SnappingData("MarginSnap", this.canvas.height - margin, "Bottom", false, uid)
            ]
    };
    this.snappingGuide[uid] = snap;

    this.sortData();
};
SnappingHelper.prototype.updateSnappingGuide = function (controller, remove) {
    if (!this.isSnappingEnabled()) return;
    var dirty = false;
    if (!remove) {
        if (controller && controller.getSnappingGuide) {
            dirty = true;
            this.snappingGuide[controller.id] = controller.getSnappingGuide();
        }
    } else {
        if (this.snappingGuide[controller.id]) {
            dirty = true;
            delete this.snappingGuide[controller.id];
        }
    }
    if (dirty) {
        this.sortData();
    }
};
SnappingHelper.prototype.onControllerSnapshot = function (controller) {
    this.lastSnappingGuideSnapshot = (controller && controller.getSnappingGuide) ? controller.getSnappingGuide() : null;
};
SnappingHelper.prototype.sortData = function () {
    var x = [];
    var y = [];
    for (var id in this.snappingGuide) {
        var g = this.snappingGuide[id];
        x = x.concat(g.vertical);
        y = y.concat(g.horizontal);
    }
    this.lastXData = this.sort(x);
    this.lastYData = this.sort(y);

    this.snappedX = false;
    this.snappedY = false;
};
SnappingHelper.prototype.applySnapping = function (dx, dy, controller) {
    if (!this.isSnappingEnabled()) return null;
    if (!this.lastSnappingGuideSnapshot) return null;
    var currentControllerId = controller.id;

    var xsnap = this.applySnappingValue(dx, this.lastSnappingGuideSnapshot.vertical, this.lastXData, controller);
    var ysnap = this.applySnappingValue(dy, this.lastSnappingGuideSnapshot.horizontal, this.lastYData, controller);
    
    this.drawSnaps(xsnap, ysnap);
    
    return {
        xsnap: xsnap,
        ysnap: ysnap
    };
};
SnappingHelper.prototype.drawSnaps = function (xsnap, ysnap) {
    var thiz = this;

    this.clearSnappingGuideX();
    if (xsnap && xsnap.matchingGuides) {
        xsnap.matchingGuides.forEach(function (guide) {
            var verticalGuide = document.createElementNS(PencilNamespaces.svg, "line");

            verticalGuide.setAttribute("class", guide.type);
            verticalGuide.setAttribute("x1", Math.round(guide.pos * thiz.canvas.zoom));
            verticalGuide.setAttribute("y1", 0);
            verticalGuide.setAttribute("x2", Math.round(guide.pos * thiz.canvas.zoom));
            verticalGuide.setAttribute("y2", Math.round(thiz.canvas.height * thiz.canvas.zoom));

            thiz.snappingGuideContainerX.appendChild(verticalGuide);

            thiz._snappingGuideContainerXEmpty = false;
        });
    }
    
    this.clearSnappingGuideY();
    if (ysnap && ysnap.matchingGuides) {
        ysnap.matchingGuides.forEach(function (guide) {
            var horizontalGuide = document.createElementNS(PencilNamespaces.svg, "line");

            horizontalGuide.setAttribute("class", guide.type);
            horizontalGuide.setAttribute("x1", 0);
            horizontalGuide.setAttribute("y1", Math.round(guide.pos * thiz.canvas.zoom));
            horizontalGuide.setAttribute("x2", Math.round(thiz.canvas.width * thiz.canvas.zoom));
            horizontalGuide.setAttribute("y2", Math.round(guide.pos * thiz.canvas.zoom));

            thiz.snappingGuideContainerY.appendChild(horizontalGuide);

            thiz._snappingGuideContainerYEmpty = false;
        });
    }
};
SnappingHelper.prototype.applySnappingValue = function (d, controllerPositions, canvasPositions, controller) {
    var currentControllerId = controller.id;
    var closestDistance = Number.MAX_VALUE;
    var closestDelta = undefined;
    var closestGuide = undefined;
    var matchingGuides = [];
    canvasPositions.forEach(function (canvasGuide) {
        if (!canvasGuide || canvasGuide.id == currentControllerId || canvasGuide.disabled) return;
        if (controller.containsControllerId && controller.containsControllerId(canvasGuide.id)) return;
        
        controllerPositions.forEach(function (controllerGuide) {
            if (!controllerGuide || controllerGuide.disabled) return;
            
            var delta = canvasGuide.pos - (controllerGuide.pos + d);
            var distance = Math.abs(delta);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestDelta = delta;
                closestGuide = canvasGuide;
                matchingGuides = [canvasGuide];
            } else if (delta == closestDelta) {
                matchingGuides.push(canvasGuide);
            }
        });
    });
    
    if (closestDistance <= Pencil.SNAP) {
        return {
            d: d + closestDelta,
            matchingGuides: matchingGuides
        }
    } else {
        return null;
    }
};

SnappingHelper.prototype.sort = function(d) {
    // var d2 = [];
    // var positions = [];
    // d.forEach(function (v) {
    //     if (positions.indexOf(v.pos) >= 0) return;
    //     d2.push(v);
    //     positions.push(v.pos);
    // });
    // d = d2;
    for (var i = 0; i < d.length - 1; i++) {
        for (var j = i + 1; j < d.length; j++) {
            if (d[j].pos < d[i].pos) {
                var k = d[j];
                d[j] = d[i];
                d[i] = k;
            }
        }
    }
    return d;
};
SnappingHelper.prototype.allowSnapping = function (v, x) {
    if (x.applyTo) {
        for (var i = 0; i < x.applyTo.length; i++) {
            if (v.type == x.applyTo[i]) {
                return true;
            }
        }
    }

    return false;
};