function SnappingHelper(canvas) {
    this.canvas = canvas;
    if (Config.get("object.snapping.enabled") == null) {
        Config.set("object.snapping.enabled", true);
    }
    this.init();

    //var this = new SnappingHelper
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
    if (margin) {
        var uid = Util.newUUID();
        this.snappingGuide[uid] = {
                vertical: [
                    new SnappingData("MarginSnap", margin, "Left", true, uid),
                    new SnappingData("MarginSnap", this.canvas.width - margin, "Right", true, uid)
                ],
                horizontal: [
                    new SnappingData("MarginSnap", margin, "Top", false, uid),
                    new SnappingData("MarginSnap", this.canvas.height - margin, "Bottom", false, uid)
                ]
            };

    }

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
SnappingHelper.prototype.findSnapping = function (drawX, drawY, ghost, snap, shift, grid) {
    if (!this.isSnappingEnabled()) return;
    try {
        if (drawX && !grid) {
            this.clearSnappingGuideX();
        }
        if (drawY && !grid) {
            this.clearSnappingGuideY();
        }

        //debug("start ***");
        if (!ghost && (!this.canvas.controllerHeld || !this.canvas.currentController || !this.canvas.currentController.getSnappingGuide)) return null;

        var _snap = snap ? snap : Pencil.SNAP;
        if (shift) {
            _snap = 1;
        }
        
        var b = !ghost ? this.canvas.currentController.getSnappingGuide() : ghost;

        var snappingData = this.findSnappingImpl(this.canvas.currentController, b, _snap, grid);
        var currentDx = Pencil.SNAP + 10;
        var currentDy = Pencil.SNAP + 10;
        if (grid) {
            currentDx = Pencil.getGridSize().w;
            currentDy = Pencil.getGridSize().h;
        }

        var snapDelta = {
            dx: 0, dy: 0
        };

        if (snappingData.bestVertical) {
            if (Math.abs(snappingData.bestVertical.dx) < Math.abs(currentDx)) {
                currentDx = snappingData.bestVertical.dx;
            }

            if (Math.abs(currentDx) < _snap) {
                if (drawX && !grid) {
                    for (var l = 0; l < snappingData.verticals.length; l++) {
                        var verticalGuide = document.createElementNS(PencilNamespaces.svg, "line");

                        verticalGuide.setAttribute("class", snappingData.verticals[l].x.type);
                        verticalGuide.setAttribute("x1", Math.round(snappingData.verticals[l].x.pos) * this.canvas.zoom);
                        verticalGuide.setAttribute("y1", 0);
                        verticalGuide.setAttribute("x2", Math.round(snappingData.verticals[l].x.pos) * this.canvas.zoom);
                        verticalGuide.setAttribute("y2", this.canvas.height * this.canvas.zoom);

                        this.snappingGuideContainerX.appendChild(verticalGuide);

                        this._snappingGuideContainerXEmpty = false;
                    }
                }
                if (grid) {
                    this.unsnapX = (Pencil.getGridSize().w / 2) + 3;
                } else {
                    this.unsnapX = Pencil.UNSNAP;
                }
                snapDelta.dx = currentDx;
            }
        }

        if (snappingData.bestHorizontal) {
            if (Math.abs(snappingData.bestHorizontal.dy) < Math.abs(currentDy)) {
                currentDy = snappingData.bestHorizontal.dy;
            }
            if (Math.abs(currentDy) < _snap) {
                if (drawY && !grid) {
                    for (var l = 0; l < snappingData.horizontals.length; l++) {
                        var horizontalGuide = document.createElementNS(PencilNamespaces.svg, "line");

                        horizontalGuide.setAttribute("class", snappingData.horizontals[l].y.type);
                        horizontalGuide.setAttribute("x1", 0 * this.canvas.zoom);
                        horizontalGuide.setAttribute("y1", Math.round(snappingData.horizontals[l].y.pos) * this.canvas.zoom);
                        horizontalGuide.setAttribute("x2", this.canvas.width * this.canvas.zoom);
                        horizontalGuide.setAttribute("y2", Math.round(snappingData.horizontals[l].y.pos) * this.canvas.zoom);

                        this.snappingGuideContainerY.appendChild(horizontalGuide);

                        this._snappingGuideContainerYEmpty = false;
                    }
                }
                if (grid) {
                    this.unsnapY = (Pencil.getGridSize().h / 2) + 3;
                } else {
                    this.unsnapY = Pencil.UNSNAP;
                }
                snapDelta.dy = currentDy;
            }
        }

        //debug("end ***");
        return snapDelta;
    } catch(e) {
        error(e);
    }

    return null;
};
SnappingHelper.prototype.sort = function(d) {
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
SnappingHelper.prototype.findSnappingImpl = function(controller, ghost, snap, grid) {

    try {
        var c = !ghost ? controller.getSnappingGuide() : ghost;
        var currentControllerId = controller.id;

        var verticals = [];
        var horizontals = [];

        var x = this.lastXData;
        var y = this.lastYData;

        var _minsnap = snap ? snap : Pencil.SNAP;
        
        var bestV = null;
        for (var v = 0; v < c.vertical.length; v++) {
            var vertical = { };
            for (var i = 0; i < x.length; i++) {
                if (!x[i].disabled
                    && !c.vertical[v].disabled
                    && x[i].id != currentControllerId
                    && (!controller.containsControllerId || !controller.containsControllerId(x[i].id))
                    && this.allowSnapping(c.vertical[v], x[i])) {
                    if ((grid && x[i].type == "GridSnap" && Math.abs(x[i].pos - c.vertical[v].pos) <= _minsnap)
                        || (!grid && x[i].type != "GridSnap" && Math.abs(x[i].pos - c.vertical[v].pos) <= _minsnap)) {
                            
                        _minsnap = Math.abs(x[i].pos - c.vertical[v].pos);
                        vertical.x = x[i];
                        vertical.dx = x[i].pos - c.vertical[v].pos;
                        
                        if (!bestV || Math.abs(bestV.dx > vertical.dx)) {
                            bestV = vertical;
                        }
                    }
                }
            }
            if (vertical.x) {
                verticals.push(vertical);
            }
        }

        //debug("found: " + verticals.length);
        //for (var v = 0; v < verticals.length; v++) {
        //    debug(verticals[v].toSource());
        //}

        // if (verticals.length > 0) {
        //     while (Math.abs(verticals[0].dx) != Math.abs(verticals[verticals.length - 1].dx)) {
        //         //debug("delete");
        //         verticals.splice(0, 1);
        //     }
        // }

        var _minsnap = snap ? snap : Pencil.SNAP;
        
        var bestH = null;
        for (var v = 0; v < c.horizontal.length; v++) {
            var horizontal = { };
            for (var i = 0; i < y.length; i++) {
                if (!y[i].disabled
                    && !c.horizontal[v].disabled
                    && y[i].id != currentControllerId
                    && (!controller.containsControllerId || !controller.containsControllerId(y[i].id))
                    && this.allowSnapping(c.horizontal[v], y[i])) {
                    if ((grid && y[i].type == "GridSnap" && Math.abs(y[i].pos - c.horizontal[v].pos) <= _minsnap)
                        || (!grid && y[i].type != "GridSnap" && Math.abs(y[i].pos - c.horizontal[v].pos) <= _minsnap)) {
                            
                        _minsnap = Math.abs(y[i].pos - c.horizontal[v].pos);
                        horizontal.y = y[i];
                        horizontal.dy = y[i].pos - c.horizontal[v].pos;
                        
                        if (!bestH || Math.abs(bestH.dy > horizontal.dy)) {
                            bestH = horizontal;
                        }
                    }
                }
            }
            if (horizontal.y) {
                horizontals.push(horizontal);
            }
        }

        //debug("found: " + horizontals.length);
        //for (var v = 0; v < horizontals.length; v++) {
        //    debug(horizontals[v].toSource());
        //}

        // if (horizontals.length > 0) {
        //     while (Math.abs(horizontals[0].dy) != Math.abs(horizontals[horizontals.length - 1].dy)) {
        //         horizontals.splice(0, 1);
        //     }
        // }

        return {
            verticals: verticals.sort(function (a, b) { return Math.abs(a.dx) - Math.abs(b.dx)}),
            horizontals: horizontals.sort(function (a, b) { return Math.abs(a.dy) - Math.abs(b.dy)}),
            bestVertical: bestV,
            bestHorizontal: bestH
        };
    } catch(e) {
        Console.dumpError(e);
    }
};
