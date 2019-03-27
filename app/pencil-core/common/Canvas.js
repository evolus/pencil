function Canvas(element, options, containerScrollPane) {
    this.element = element;
    this.oldElement = "";
    this.__delegate("addEventListener", "hasAttribute", "getAttribute", "setAttribute", "setAttributeNS", "removeAttribute", "removeAttributeNS", "dispatchEvent");
    this.element.setAttribute("pencil-canvas", "true");
    this.element.parentNode.setAttribute("tabindex", "0");

    this.xferHelpers = [];
    this.dragObservers = [];

    this.spaceHeld = false;
    this.painterPropertyMap = this.getPainterPropertyMap();
    this.duplicateMode = false;
    this.mouseUp = false;
    this.width;
    this.height;
    // building the content as: box >> svg
    var thiz = this;
    this.lockPointerFunction = null;
    this.autoScrollTimout = null;

    this.options = options || {};

    this.startAutoScrollFunction = function(func) {
        if (this.autoScrollTimout == null) {
            // this.lockPointerFunction = function () {
            //     thiz.element.requestPointerLock();
            // }
            // this.lockPointerFunction();
            this.autoScrollTimout = window.setInterval(func, 50);
        }
    }
    this.stopAutoScrollFunction = function () {
        if (this.autoScrollTimout) {
            // if (thiz.lockPointerFunction != null) {
            //     document.exitPointerLock();
            //     thiz.lockPointerFunction = null;
            // }
            clearInterval(this.autoScrollTimout);
            this.autoScrollTimout = null;
        }
    }
    this.focusableBox = this.element.parentNode;

    this.addEventListener("mousedown", function (event) {
        var inDrawing = Dom.findUpward(event.originalTarget, function (node) {

            return (node == thiz.svg);
        });
        if (!inDrawing) {
            thiz.clearSelection();
            thiz.selectNone();
        }

    }, false);

    this.addEventListener("mouseup", function (event) {
        if (thiz.duplicateMode) {
            thiz.mouseUp = true;
            thiz.duplicateMode = null;
            if (this.controllerHeld && this.currentController
                    && this.currentController.markAsMoving) thiz.finishMoving(event);
        }
    }, false);

    // create the context menu
    this.popup = this.createElementByName("contextPopup");
    this.arrangementMenu = this.createElementByName("arrangementMenu");
    this.linkMenu = this.createElementByName("linkMenu");
    this.arrangementMenu._canvas = this;

    this.undoContextMenu = this.createElementByName("contextUndoMenu");
    this.redoContextMenu = this.createElementByName("contextRedoMenu");

    this.popupSeparator = this.createElementByName("contextPopupSeparator");
    var id = "popup" + Math.round(1000 * Math.random());
    this.popup.setAttribute("id", id);

    this.propertyMenuItem = this.createElementByName("propertyMenuItem");
    this.lockingMenuItem = this.createElementByName("lockingMenuItem");

    this.svg = document.createElementNS(PencilNamespaces.svg, "svg:svg");
    this.svg.setAttribute("version", "1.0");

    // FIXME: this will not be hard-coded
    this.width = this.hasAttribute("width") ? parseInt(this
            .getAttribute("width"), 10) : this.element.offsetWidth;
    this.height = this.hasAttribute("height") ? parseInt(this
            .getAttribute("height"), 10) : this.element.offsetHeight;
    this.element.appendChild(this.svg);

    this.topGroup = document.createElementNS(PencilNamespaces.svg, "svg:g");

    var fixTarget = this.topGroup;
    var fixRef = this.svg;

    // window.setTimeout(function () {
    //     try {
    //         var matrix = fixTarget.getScreenCTM();
    //         var dx = matrix.e - Math.floor(matrix.e);
    //         var dy = matrix.f - Math.floor(matrix.f);
    //
    //         if ((dx != 0 || dy != 0) && thiz.zoom == 1) {
    //             matrix = fixRef.getScreenCTM();
    //             dx = (matrix.e - Math.floor(matrix.e)) / thiz.zoom;
    //             dy = (matrix.f - Math.floor(matrix.f)) / thiz.zoom;
    //
    //             var t = "translate(" + (0 - dx) + "," + (0 - dy) + ")";
    //            fixTarget.setAttribute("transform", t);
    //         }
    //     } catch (e) {
    //     }
    //     window.setTimeout(arguments.callee, 1000);
    // }, 1000);

    this.svg.appendChild(this.topGroup);

    // create the background layer
    this.bgLayer = document.createElementNS(PencilNamespaces.svg, "svg:g");
    this.bgLayer.setAttributeNS(PencilNamespaces.p, "p:name", "Background");
    var rect = document.createElementNS(PencilNamespaces.svg, "svg:rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "2000");
    rect.setAttribute("height", "2000");
    rect.setAttribute("style", "fill: #ffffff; stroke: none; fill-opacity: 0;");
    this.bgLayer.appendChild(rect);

    // background image
    this.backgroundImage = document.createElementNS(PencilNamespaces.svg,
            "svg:image");
    this.backgroundImage.setAttribute("x", "0");
    this.backgroundImage.setAttribute("y", "0");
    this.bgLayer.appendChild(this.backgroundImage);
    this.hasBackgroundImage = false;

    var rect = document.createElementNS(PencilNamespaces.svg, "svg:rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "2000");
    rect.setAttribute("height", "2000");
    rect.setAttributeNS(PencilNamespaces.p, "p:name", "BackgroundDimmer");
    this.bgLayer.appendChild(rect);

    this.topGroup.appendChild(this.bgLayer);

    // create the drawing layer
    this.drawingLayer = document.createElementNS(PencilNamespaces.svg, "svg:g");
    this.topGroup.appendChild(this.drawingLayer);

    // create the control layer
    this.controlLayer = document.createElementNS(PencilNamespaces.svg, "svg:g");
    this.controlLayer.setAttributeNS(PencilNamespaces.p, "p:type",
            "ControlLayer");

    this.topGroup.appendChild(this.controlLayer);

    this.selectionContainer = document.createElementNS(PencilNamespaces.svg,
            "svg:g");
    this.selectionContainer.setAttribute("id", "selectionContainer");
    this.installControlSVGElement(this.selectionContainer);

    this.rangeBoundRect = document.createElementNS(PencilNamespaces.svg,
            "svg:rect");
    this.installControlSVGElement(this.rangeBoundRect);
    Svg.setX(this.rangeBoundRect, 0.5);
    Svg.setY(this.rangeBoundRect, 0.5);
    Svg.setWidth(this.rangeBoundRect, 100);
    Svg.setHeight(this.rangeBoundRect, 100);
    this.rangeBoundRect.setAttributeNS(PencilNamespaces.p, "p:type",
            "RangeBound");

    this.snappingHelper = new SnappingHelper(this);

    this.idSeed = 1;

    this.onScreenEditors = [];

    // register event handler
    this.svg.addEventListener("click", function (event) {
        thiz.handleClick(event);
    }, false);
    (containerScrollPane || this.svg).addEventListener("mousedown", function (event) {
        thiz.movementDisabled = Pencil.controller.movementDisabled || event.ctrlKey;
        // document.commandDispatcher.advanceFocus();
        thiz.focus();
        thiz.handleMouseDown(event);
    }, false);

    this.element.addEventListener("mousewheel", function (event) {
        thiz.focus();
        thiz.handleMouseWheel(event);
    }, false);
    this.svg.ownerDocument.addEventListener("mouseup", function (event) {
        if (thiz.autoScrollTimout) {
            thiz.stopAutoScrollFunction();
        }
        if (!thiz || !thiz.handleMouseUp) {
            document.removeEventListener("mouseup", arguments.callee, false);
            return;
        }
        thiz.handleMouseUp(event);
    }, false);
    this.svg.ownerDocument.addEventListener("mousemove", function (event) {
        if (thiz.autoScrollTimout) {
            thiz.stopAutoScrollFunction();
        }
        if (!thiz || !thiz.handleMouseMove) {
            document.removeEventListener("mousemove", arguments.callee, false);
            return;
        }
        if (thiz.controllerHeld && thiz.currentController && thiz._scrollPane &&
             (thiz._scrollPane.clientHeight < thiz._scrollPane.scrollHeight || thiz._scrollPane.clientWidth < thiz._scrollPane.scrollWidth)) {
            thiz.handleScrollPane(event);
        }
        thiz.handleMouseMove(event);
    }, false);

    this.svg.addEventListener("mousemove", function (event) {
        thiz.lastMouse = {x: event.offsetX / thiz.zoom, y: event.offsetY / thiz.zoom};
    }.bind(this), false);

    this.focusableBox.addEventListener("keydown", function (event) {
        thiz.handleKeyPress(event);
    }, false);

    // this.focusableBox.addEventListener("keyup", function (event) {
    //     if (event.keyCode == DOM_VK_SHIFT) {
    //         if(thiz.duplicateMode) {
    //             thiz.duplicateMode = false;
    //             console.log(thiz.mouseUp);
    //             if (!thiz.mouseUp) {
    //                 thiz.run(function () {
    //                     thiz.currentController.deleteTarget();
    //                 }, thiz, Util.getMessage("action.delete.shape",
    //                         thiz.currentController.getName()));
    //                 thiz.currentController = null;
    //                 thiz._detachEditors();
    //                 thiz.clearSelection();
    //                 thiz._sayTargetChanged();
    //                 event.preventDefault();
    //
    //                 if (thiz.oldTargets) {
    //                     if (!thiz.oldTargets.targets) {
    //                         thiz.addToSelection(thiz.oldTargets);
    //                         thiz.currentController = thiz.oldTargets;
    //                         thiz.reClick = false;
    //                         thiz._attachEditors(thiz.currentController);
    //                     } else {
    //                         for(i in thiz.oldTargets.targets) {
    //                             thiz.addToSelection(thiz.oldTargets.targets[i]);
    //                         }
    //                         thiz.currentController = thiz.oldTargets;
    //                     }
    //                     thiz.oldTargets = null;
    //                     thiz._sayTargetChanged();
    //                 }
    //             }
    //         }
    //     }
    // }, false);

    this.svg.ownerDocument.addEventListener("keydown", function (event) {
        if (event.keyCode == DOM_VK_SPACE && thiz.spaceHeld == false) {
            thiz.spaceHeld = true;
            thiz._lastPX = thiz._currentPX;
            thiz._lastPY = thiz._currentPY;
            thiz._lastScrollX = thiz._scrollPane.scrollLeft || 0;
            thiz._lastScrollY = thiz._scrollPane.scrollTop || 0;
            Dom.addClass(thiz, "PanDown");
        }
    }, false);
    this.svg.ownerDocument.addEventListener("keyup", function (event) {
        if (event.keyCode == DOM_VK_SPACE && thiz.spaceHeld == true) {
            thiz.spaceHeld = false;
            Dom.removeClass(thiz, "PanDown");
        }

    }, false);

    this.propertyMenuItem.addEventListener("command", function (event) {
        // thiz.handlePropertyMenuItemCommand(event);
    }, false);

    this.element.addEventListener("contextmenu", function (event) {
        thiz.handleContextMenuShow(event);
    }, false);

    this.svg.addEventListener("dblclick", function (event) {
        stencilDebug("pCanvas, dblclick");
        thiz.handleDblclick(event);
    }, true);

    this.careTaker = new CanvasCareTaker(this);

    /*
     * this.dragObserver = { getSupportedFlavours : function () { var flavours =
     * new FlavourSet();
     *
     * flavours.appendFlavour("pencil/def");
     * flavours.appendFlavour("pencil/shortcut");
     * flavours.appendFlavour("text/unicode");
     * //flavours.appendFlavour("image/png");
     *
     * return flavours; }, onDragOver: function (evt, flavour, session){},
     * onDrop: function (evt, transferData, session) {
     *
     * var defId = transferData.data; var def =
     * CollectionManager.shapeDefinition.locateDefinition(defId);
     *
     * var loc = thiz.getEventLocation(evt);
     *
     * if (loc.x <0 || loc.y < 0) return;
     *
     * thiz.insertShape(def, new Bound(loc.x, loc.y, null, null)); } };
     */

    this.nVGridPainted = 0;
    this.nHGridPainted = 0;

    this.zoomTo(1);

    Pencil.installEditors(this);
    Pencil.installXferHelpers(this);
    Pencil.installDragObservers(this);
    this.careTaker.reset();

    this.snappingHelper.rebuildSnappingGuide();

    this.dragOverlay = this.element.ownerDocument.createElement("div");
    this.element.appendChild(this.dragOverlay);
    Dom.addClass(this.dragOverlay, "DragOverlay");

    this.focusableBox.addEventListener("focus", function (event) {
        Canvas.activeCanvas = thiz;
        Dom.cancelEvent(event);
    }, true);

    this.setupEventHandlers();
    window.globalEventBus.listen("config-change", function (data) {
        if (["grid.enabled", "edit.gridSize", "edit.gridStyle"].indexOf(data.name) >= 0) {
            CanvasImpl.setupGrid.apply(this);
        }
    }.bind(this));
    window.globalEventBus.listen("doc-options-change", function (data) {
        CanvasImpl.drawMargin.apply(this);
        this.snappingHelper.rebuildSnappingGuide();
    }.bind(this));

    this.resizer = this.element.ownerDocument.createElement("div");
    this.element.appendChild(this.resizer);
    Dom.addClass(this.resizer, "CanvasResizer");
    this.resizeInfoLabel = this.element.ownerDocument.createElement("span");
    this.resizer.appendChild(this.resizeInfoLabel);

    this.resizer.addEventListener("mousedown", function (event) {
        event.preventDefault();
        if (this.element.hasAttribute("resizing")) {
            this.resizing = true;
            this.resizeInfo = {
                ox: event.clientX,
                oy: event.clientY,
                ow: this.width,
                oh: this.height
            };
            this.resizeInfoLabel.innerHTML = this.width + " x " + this.height;
            return;
        }
    }.bind(this), false);
}

SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(elem) {
    return elem.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

Object.defineProperty(Canvas.prototype, "ownerDocument", {
    get: function () {
        return this.element.ownerDocument;
    }
});

Canvas.prototype.createElementByName = function (name) {
    return this.element.ownerDocument.createElement("span");
};
Canvas.prototype.__delegate = function () {
    for (var i = 0; i < arguments.length; i ++) {
        this.__delegateOne(arguments[i]);
    }
};
Canvas.prototype.__delegateOne = function (name) {
    var thiz = this;
    this[name] = function () {
        var f = thiz.element[name];
        var args = [];
        for (var i = 0; i < arguments.length; i ++) {
            args.push(arguments[i]);
        }
        f.apply(thiz.element, args);
    };
};

Canvas.prototype.setupEventHandlers = function () {
    var thiz = this;
    Dom.registerEvent(this.element, "dragenter", function (event) { thiz.__dragenter(event); }, false);
    Dom.registerEvent(this.dragOverlay, "dragleave", function (event) { thiz.__dragleave(event); }, false);
    Dom.registerEvent(this.element, "dragend", function (event) { thiz.__dragend(event); }, false);
    Dom.registerEvent(this.dragOverlay, "dragover", function (event) { thiz.__dragover(event); }, false);
    Dom.registerEvent(this.dragOverlay, "drop", function (event) { thiz.__drop(event); }, false);
};

Canvas.prototype.getEventLocation = function (event, withoutZoom) {

    var rect = this.svg.parentNode.getBoundingClientRect();
    var x = Math.round(event.clientX - rect.left);
    var y = Math.round(event.clientY - rect.top);

    if (withoutZoom) {
        x /= this.zoom;
        y /= this.zoom;
    }

    return {
        x : x,
        y : y
    };

};
Canvas.prototype.addToSelection = function (target) {

    var rect = document.createElementNS(PencilNamespaces.svg, "svg:rect");
    this.selectionContainer.appendChild(rect);
    rect._target = target;

    this._invalidateOneSelection(rect);

};
Canvas.prototype._invalidateOneSelection = function (rect) {

    var bbox = rect._target.getBoundingRect();
    Svg.setX(rect, Math.round(bbox.x));
    Svg.setY(rect, Math.round(bbox.y));
    Svg.setWidth(rect, Math.round(bbox.width));
    Svg.setHeight(rect, Math.round(bbox.height));

};
Canvas.prototype._sayTargetChanged = function () {

    Dom.emitEvent("p:TargetChanged", this.element, {
        canvas : this
    });

};
Canvas.prototype.getSelectedTargets = function () {

    var targets = [];
    for (var i = 0; i < this.selectionContainer.childNodes.length; i++) {
        var rect = this.selectionContainer.childNodes[i];
        if (rect._target)
            targets.push(rect._target);
    }

    return targets;

};
Canvas.prototype.clearSelection = function () {
    while (this.selectionContainer.hasChildNodes()) {
        var child = this.selectionContainer.firstChild;
        this.selectionContainer.removeChild(child);
    }

};
Canvas.prototype.selectSibling = function (next) {

    var targets = this.getSelectedTargets();
    var node = null;

    var sibling = null;

    if (targets && targets[0] && targets[0].svg) {
        node = targets[0].svg;

        if (next) {
            if (node.nextSibling) {
                sibling = node.nextSibling;
            } else {
                sibling = this.drawingLayer.firstChild;
            }
        } else {
            if (node.previousSibling) {
                sibling = node.previousSibling;
            } else {
                sibling = this.drawingLayer.lastChild;
            }
        }

    } else {
        sibling = this.drawingLayer.firstChild;
    }

    if (!sibling)
        return;

    this.selectShape(sibling);

};
Canvas.prototype.invalidateAll = function (callback) {
    if (this.element.clientWidth <= 0) {
        setTimeout(function () {
            this.invalidateAll(callback);
        }.bind(this), 10);
        return;
    }

    try {
        Dom.workOn(".//svg:g[@p:type='Shape']", this.drawingLayer, function (node) {
            try {
                var controller = this.createControllerFor(node);
                if (controller && controller.validateAll) controller.validateAll();
            } catch (e) {
                console.error(e);
            }
        }.bind(this));
    } finally {
        if (callback) callback();
    }
};
Canvas.prototype.selectAll = function () {

    this.clearSelection();
    var thiz = this;
    Dom.workOn("./svg:g[@p:type]", this.drawingLayer, function (node) {
        if (thiz.isShapeLocked(node))
            return;
        try {
            var controller = thiz.createControllerFor(node);
            thiz.addToSelection(controller);
        } catch (e) {
            // alert(e);
        }
    });

    var targets = this.getSelectedTargets();
    this.setAttributeNS(PencilNamespaces.p, "p:selection", targets.length);

    var controller = null;
    if (targets.length > 1) {
        controller = new TargetSet(this, targets);
    } else if (targets.length == 1 && controller == null) {
        controller = targets[0];
    }

    this._detachEditors();
    this.currentController = controller;

    this._attachEditors(this.currentController);
    this._sayTargetChanged();

};
Canvas.prototype.removeFromSelection = function (target) {

    var foundRect = null;
    for (var i = 0; i < this.selectionContainer.childNodes.length; i++) {
        var rect = this.selectionContainer.childNodes[i];
        if (rect._target == target) {
            foundRect = rect;
            break;
        }
    }
    if (foundRect)
        this.selectionContainer.removeChild(foundRect);

};
Canvas.prototype.insertObject = function (obj) {

    this.drawingLayer.appendChild(obj);

};
Canvas.prototype.installControlSVGElement = function (obj) {

    this.controlLayer.appendChild(obj);

};
Canvas.prototype.zoomTo = function (factor) {

    this.zoom = factor;
    this.drawingLayer.setAttribute("transform", "scale("
            + [ this.zoom, this.zoom ] + ")");
    this.svg.setAttribute("width", Math.ceil(this.width * this.zoom));
    this.svg.setAttribute("height", Math.ceil(this.height * this.zoom));
    this.backgroundImage.setAttribute("transform", "scale("
            + [ this.zoom, this.zoom ] + ")");
    CanvasImpl.setupGrid.apply(this);

    this.invalidateEditors();

    Dom.emitEvent("p:SizeChanged", this.element, {
        canvas : this
    });
    Dom.emitEvent("p:ZoomChanged", this.element, {
        canvas : this
    });

};
Canvas.prototype.getZoomedGeo = function (target) {

    if (!target)
        return null;
    var geo = target.getGeometry();
    geo = geo.clone(this.svg);
    geo.ctm.e *= this.zoom;
    geo.ctm.f *= this.zoom;
    geo.dim.w *= this.zoom;
    geo.dim.h *= this.zoom;

    if (geo.loc) {
        geo.loc.x *= this.zoom;
        geo.loc.y *= this.zoom;
    }

    return geo;

};
Canvas.prototype.getSize = function () {

    return {
        width : parseInt(this.svg.getAttribute("width"), 10),
        height : parseInt(this.svg.getAttribute("height"), 10),
    };

};
Canvas.prototype.getZoomedRect = function (rect) {

    rect.x *= this.zoom;
    rect.y *= this.zoom;
    rect.width *= this.zoom;
    rect.height *= this.zoom;

    return rect;

};
Canvas.prototype.setZoomedGeo = function (target, geo, setter) {

    geo = geo.clone(this.svg);
    geo.ctm.e /= this.zoom;
    geo.ctm.f /= this.zoom;
    geo.dim.w /= this.zoom;
    geo.dim.h /= this.zoom;

    this.run(function () {
        target.setGeometry(geo);
    }, this, Util.getMessage("action.canvas.zoom"));

    Dom.emitEvent("p:ShapeGeometryModified", this.element, {
        setter : setter ? setter : null
    });

};
Canvas.prototype.redraw = function () {

    this.drawingLayer.ownerSVGElement.forceRedraw();

};
Canvas.prototype.getType = function (svg) {

    return svg.getAttributeNS(PencilNamespaces.p, "def");

};
Canvas.prototype.insertShape = function (shapeDef, bound, overridingValueMap) {

    this.run(this.insertShapeImpl_, this, Util.getMessage(
            "action.create.shape", shapeDef.displayName), [ shapeDef,
            bound ? bound : null,
            overridingValueMap ? overridingValueMap : null ]);

};
Canvas.prototype.invalidateShapeContent = function (shape, shapeDef) {
    var count = shape.childNodes.length;
    for (var i = count - 1; i >= 0; i --) {
        var child = shape.childNodes[i];
        if (child.namespaceURI == PencilNamespaces.p && child.localName == "metadata") continue;
        shape.removeChild(child);
    }
    for (var i = 0; i < shapeDef.contentNode.childNodes.length; i++) {
        shape.appendChild(this.ownerDocument.importNode(
                shapeDef.contentNode.childNodes[i], true));
    }

    // generate the ids
    Dom.workOn(".//*[@p:name]", shape, function (node) {
        var name = node.getAttributeNS(PencilNamespaces.p, "name");
        var oldId = node.getAttribute("id");
        if (oldId)
            return;

        var uuid = Util.newUUID();
        node.setAttribute("id", uuid);
        node.id = uuid;

        Dom.updateIdRef(shape, name, uuid);
    });

    Dom.renewId(shape);
};
Canvas.prototype.insertShapeImpl_ = function (shapeDef, bound,
        overridingValueMap) {

    // instantiate the shape using the shapedef
    var shape = this.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
    shape.setAttributeNS(PencilNamespaces.p, "p:type", "Shape");
    shape.setAttributeNS(PencilNamespaces.p, "p:def", shapeDef.id);


    if (overridingValueMap && overridingValueMap._shortcut) {
        shape.setAttributeNS(PencilNamespaces.p, "p:sc",
                overridingValueMap._shortcut.displayName);
    }

    shape.appendChild(this.ownerDocument.createElementNS(PencilNamespaces.p,
            "p:metadata"));

    this.invalidateShapeContent(shape, shapeDef);

    // add the newly created shape into the drawing layer
    this.drawingLayer.appendChild(shape);

    // applying defined behaviors into the shape

    var controller = new Shape(this, shape);
    controller.setInitialPropertyValues(overridingValueMap);

    if (bound) {
        var bbox = controller.getBoundingRect();
        controller.moveBy((bound.x - Math.round(bbox.width / (2 * this.zoom))),
                (bound.y - Math.round(bbox.height / (2 * this.zoom))), true);
        controller.normalizePositionToGrid();
    }
    this.selectShape(shape);
    this.snappingHelper.updateSnappingGuide(this.currentController);
    DockingManager.enableDocking(this.currentController);

};
Canvas.prototype.selectShape = function (shape) {

    if (this.isShapeLocked(shape)) return;
    var controller = this.createControllerFor(shape);

    this.currentController = controller;

    this.clearSelection();

    this.addToSelection(this.currentController);
    this.setAttributeNS(PencilNamespaces.p, "p:selection", 1);

    this.lastTop = shape;
    this.hasMoved = true;

    this.focus();

    this._attachEditors(controller);

    this._sayTargetChanged();

};
Canvas.prototype.selectMultiple = function (shapes) {

    this.clearSelection();
    for (i in shapes) {
        if (this.isShapeLocked(shapes[i]))
            continue;
        this.addToSelection(this.createControllerFor(shapes[i]));
    }
    this.setAttributeNS(PencilNamespaces.p, "p:selection", shapes.length);

    var targets = this.getSelectedTargets();
    if (targets.length > 1) {
        controller = new TargetSet(this, targets);
    } else if (targets.length == 1 && controller == null) {
        controller = targets[0];
    }

    this.currentController = controller;

    this.lastTop = null;
    this.hasMoved = true;

    this.focus();

    this._attachEditors(controller);

    this._sayTargetChanged();

};
Canvas.prototype.selectNone = function () {

    this.clearSelection();
    this._detachEditors();
    this.currentController = null;

    this.lastTop = null;
    this.hasMoved = true;

    this.focus();
    this._sayTargetChanged();

};
Canvas.prototype.createControllerFor = function (top) {

    var type = top.getAttributeNS(PencilNamespaces.p, "type");
    if (type == "Shape") {
        try {
            return new Shape(this, top);
        } catch (e) {
        }
    } else if (type == "Group") {
        return new Group(this, top);
    }
    return new Null(this, top);

};
Canvas.prototype._detachEditors = function () {
    for ( var editor in this.onScreenEditors)
        this.onScreenEditors[editor].dettach();
    if (this.propertyPageEditor && this.propertyPageEditor.dettach)
        this.propertyPageEditor.dettach();
    if (this.contextMenuEditor && this.contextMenuEditor.dettach)
        this.contextMenuEditor.dettach();

};
Canvas.prototype.passivateEditors = function () {

    for (editor in this.onScreenEditors)
        this.onScreenEditors[editor].passivated = true;
    if (this.propertyPageEditor)
        this.propertyPageEditor.passivated = true;
    if (this.contextMenuEditor)
        this.contextMenuEditor.passivated = true;

};
Canvas.prototype._attachEditors = function (controller) {
    for (editor in this.onScreenEditors)
        this.onScreenEditors[editor].attach(controller);
    if (this.propertyPageEditor && this.propertyPageEditor.attach)
        this.propertyPageEditor.attach(controller);
    // if (this.contextMenuEditor && this.contextMenuEditor.attach)
    //     this.contextMenuEditor.attach(controller);

};
Canvas.prototype.finishMoving = function (event) {

    if (this.controllerHeld && this.currentController
            && this.currentController.markAsMoving) {
        this.currentController.markAsMoving(false);
        this.currentController.clearPositionSnapshot();
        this.invalidateEditors();

        this.snappingHelper.updateSnappingGuide(this.currentController);
        this.snappingHelper.clearSnappingGuide();

        Dom.emitEvent("p:ShapeGeometryModified", this.element, {
            setter : null
        });

        if (this.hasMoved) {
            // just to save state
            this.run(function () {
            }, this, Util.getMessage("action.shape.finish.moving",
                    this.currentController.getName()));
        }
    }

    this.removeAttributeNS(PencilNamespaces.p, "holding");
    this.controllerHeld = false;

    if (Config.get("quick.editting", false) == true) {
        Dom.emitEvent("p:ShapeInserted", this.currentController.svg, {
            controller : this.currentController,
            origTarget : event.originalTarget,
            clientX : event.clientX,
            clientY : event.clientY
        });
    }
};
Canvas.prototype.handleMouseWheel = function(event) {
    if (event.ctrlKey) {
        Dom.cancelEvent(event);

        const padding = 0;

        var drawingX = this.lastMouse.x;
        var drawingY = this.lastMouse.y;
        var dx = drawingX * this.zoom + padding - this._scrollPane.scrollLeft;
        var dy = drawingY * this.zoom + padding - this._scrollPane.scrollTop;

        if (event.deltaY < 0) {
            this.zoomTo(this.zoom * 1.25);
        } else {
            this.zoomTo(this.zoom / 1.25);
        }

        this._scrollPane.scrollLeft = drawingX * this.zoom + padding - dx;
        this._scrollPane.scrollTop = drawingY * this.zoom + padding - dy;
    }
}

Canvas.prototype.handleScrollPane = function(event) {
    if (!this._scrollPane) return;
    var thiz = this;
    var scrollBarSize = 15;
    var scrollValue = 20;
    var loc = { x: event.clientX, y: event.clientY };
    var pane = thiz._scrollPane.getBoundingClientRect();
    var fun = null;
    var dx = scrollValue / thiz.zoom;
    var dy = scrollValue / thiz.zoom;
    if (loc.x > pane.right - scrollBarSize && loc.x < pane.right) {
        fun = function() {
            if (thiz._scrollPane.scrollLeft >= thiz._scrollPane.scrollWidth - thiz._scrollPane.offsetWidth) {
                thiz._scrollPane.scrollLeft = thiz._scrollPane.scrollWidth;
                thiz.stopAutoScrollFunction();
                return;
            }
            thiz._scrollPane.scrollLeft += scrollValue;
            if (thiz.currentController != null) thiz.currentController.moveBy(dx, 0, false, true);
        }
    }
    if (loc.x < pane.left  && loc.x > pane.left - scrollBarSize) {
        fun = function() {
            if (thiz._scrollPane.scrollLeft <= 0) {
                thiz.stopAutoScrollFunction();
                return;
            }
            thiz._scrollPane.scrollLeft -= scrollValue;
            if (thiz.currentController != null) thiz.currentController.moveBy(-dx, 0, false, true);
        }
    }
    if (loc.y < pane.top  && loc.y > pane.top - scrollBarSize) {
        fun = function() {
            if (thiz._scrollPane.scrollTop <= 0) {
                thiz.stopAutoScrollFunction();
                return;
            }
            thiz._scrollPane.scrollTop -= scrollValue;
            if (thiz.currentController != null) thiz.currentController.moveBy(0, -dy, false, true);
        }
    }
    if (loc.y > pane.bottom - scrollBarSize && loc.y < pane.bottom) {
        fun = function() {
            if (thiz._scrollPane.scrollTop >= thiz._scrollPane.scrollHeight - thiz._scrollPane.offsetHeight) {
                thiz._scrollPane.scrollTop = thiz._scrollPane.scrollHeight;
                thiz.stopAutoScrollFunction();
                return;
            }
            thiz._scrollPane.scrollTop += scrollValue;
            if (thiz.currentController != null) thiz.currentController.moveBy(0, dy, false, true);
        }
    }
    if (fun != null) {
        thiz.startAutoScrollFunction(fun);
    }
}

Canvas.prototype.handleMouseUp = function (event) {
    if (this.resizing) {
        this.commitResize(event);
        this.isSelectingRange = false;
        return;
    }

    if (this.reClick && !this.hasMoved) {
        for (editor in this.onScreenEditors)
            this.onScreenEditors[editor].nextTool();
    }
    if (this.controllerHeld && this.currentController
            && this.currentController.markAsMoving) {
        this.currentController.markAsMoving(false);
        this.currentController.clearPositionSnapshot();
        this.invalidateEditors();

        if (this.hasMoved) {
            Dom.emitEvent("p:ShapeGeometryModified", this.element, {
                setter : null
            });
        }
        
        Connector.prepareInvalidation(this);

        if (this.currentController.invalidateOutboundConnections) {
            this.currentController.invalidateOutboundConnections();
        }
        if (this.currentController.invalidateInboundConnections) {
            this.currentController.invalidateInboundConnections();
        }
        
        Connector.finishInvalidation();
    }
    if (this.controllerHeld && this.hasMoved) {
        // just to save state
        this.run(function () {
        }, this, Util.getMessage("action.move.shape"));
    }

    this.removeAttributeNS(PencilNamespaces.p, "holding");

    this.reClick = false;
    this.hasMoved = true;

    this.controllerHeld = false;
    
    if (this.isSelectingRange) {
        this.setRangeBoundVisibility(false);
        this.isSelectingRange = false;
        // enum objects that are in range
        if (!this.isEventWithControl(event)) {
            this.clearSelection();
        }
        var thiz = this;
        Dom.workOn("./svg:g[@p:type]", this.drawingLayer, function (node) {
            if (thiz.isShapeLocked(node))
                return;
            var controller = thiz.createControllerFor(node);
            var bbox = controller.getBoundingRect();

            if (Svg.isInside(bbox, thiz.currentRange)) {
                if (thiz.isEventWithControl(event)) {
                    var targets = thiz.getSelectedTargets();
                    var foundTarget = null;
                    for (i in targets) {
                        var target = targets[i];
                        if (target.isFor(node)) {
                            foundTarget = target;
                            break;
                        }
                    }

                    if (foundTarget) {
                        thiz.removeFromSelection(foundTarget);
                    } else {
                        var target = thiz.createControllerFor(node);
                        thiz.addToSelection(target);
                    }
                } else {
                    var target = thiz.createControllerFor(node);
                    thiz.addToSelection(target);
                }
            }
        });
        var controller = null;
        var targets = this.getSelectedTargets();
        this.setAttributeNS(PencilNamespaces.p, "p:selection", targets.length);

        if (targets.length > 1) {
            controller = new TargetSet(this, targets);
        } else if (targets.length == 1 && controller == null) {
            controller = targets[0];
        }

        this._detachEditors();
        if (controller) {
            this.currentController = controller;
            this._attachEditors(this.currentController);
        }
        this.currentRange = null;
        this._sayTargetChanged();
    }

    try {
        this.snappingHelper.clearSnappingGuide();

        if (this.currentController) {
            if (this.currentController.constructor == TargetSet) {
                for ( var t in this.currentController.targets) {
                    this.snappingHelper
                            .updateSnappingGuide(this.currentController.targets[t]);
                }
            } else {
                this.snappingHelper.updateSnappingGuide(this.currentController);
            }
        }

        DockingManager.enableDocking(this.currentController);

        // var canvas = Dom.findUpward(event.originalTarget, function (node) {
        //     return node.namespaceURI == PencilNamespaces.xul
        //             && node.localName == "pcanvas";
        // });

        var canvasElement = Dom.findTop(event.originalTarget, function (node) {
            return node.getAttribute && node.getAttribute("pencil-canvas") == "true";
                });

        if (canvasElement && canvasElement == this.element && this.currentController) {
            if (this.isFormatPainterAvailable()
                    && Pencil._painterSourceTarget.svg != this.currentController.svg) {
                var currentTargetProperties = this.currentController
                        .getProperties();
                for (var i = 0; i < this.painterPropertyMap.length; i++) {
                    var name = this.painterPropertyMap[i];
                    var p1 = Pencil._painterSourceProperties[name];
                    var p2 = currentTargetProperties[name];
                    if (p1 && p2) {
                        this.currentController.setProperty(name,
                                Pencil._painterSourceProperties[name]);
                        this.invalidateEditors();
                        this._sayTargetChanged();
                    }
                }
                return;
            }
            this.endFormatPainter();
        }
    } catch (e) {
        Console.dumpError(e);
    }

};
Canvas.prototype.handleClick = function (event) {

    // is it from an html:a?
    var a = Dom
            .findUpward(
                    event.originalTarget,
                    function (node) {
                        return (node && node.nodeType == 1
                                && node.localName.toLowerCase() == "a" && node.namespaceURI == PencilNamespaces.html);
                    });

    if (!a)
        return;

    // is this html:a inside an svg:foreignObject?
    var foreignObject = Dom
            .findUpward(
                    a,
                    function (node) {
                        return (node && node.nodeType == 1
                                && node.localName == "foreignObject" && node.namespaceURI == PencilNamespaces.svg);
                    });

    // ok, it is then prevent it
    if (foreignObject) {
        event.preventDefault();
        event.cancelBubble = true;
    }

};
Canvas.prototype.commitResize = function (event) {
    this.resizing = false;
    if (this.resizeInfo && this.resizeInfo.lastSize) {
        Pencil.controller.setActiveCanvasSize(this.resizeInfo.lastSize.w, this.resizeInfo.lastSize.h)
    }
    this.resizeInfo = null;
    this.element.removeAttribute("resizing");
};
Canvas.prototype.handleResizeMouseMove = function (event) {
    if (this.resizing) {

        var dw = Math.round((event.clientX - this.resizeInfo.ox) / this.zoom);
        var dh = Math.round((event.clientY - this.resizeInfo.oy) / this.zoom);
        
        if (event.shiftKey) dw = 0;

        var newW = this.resizeInfo.ow + dw;
        var newH = this.resizeInfo.oh + dh;

        if (event.ctrlKey) {
            newW = Math.round(newW / 10) * 10;
            newH = Math.round(newH / 10) * 10;
        }

        this.resizeInfo.lastSize = {
            w: newW,
            h: newH
        };

        var w = Math.ceil(newW * this.zoom);
        var h = Math.ceil(newH * this.zoom);
        this.element.style.width = w + "px";
        this.element.style.height = h + "px";

        this.resizeInfoLabel.innerHTML = w + " x " + h;

        return;
    }

    var rect = this.svg.parentNode.getBoundingClientRect();
    var bound = {
        x: rect.left + rect.width - this.resizer.offsetWidth,
        y: rect.top + rect.height - this.resizer.offsetHeight,
        width: this.resizer.offsetWidth,
        height: this.resizer.offsetHeight
    };

    var thiz = this;
    if (event.clientX >= bound.x && event.clientX <= bound.x + bound.width
        && event.clientY >= bound.y && event.clientY <= bound.y + bound.width) {
        if (!this.showResizerTimeout) {
            this.showResizerTimeout = window.setTimeout(function () {
                thiz.showResizerTimeout = null;
                thiz.element.setAttribute("resizing", "true");
                thiz.resizeInfoLabel.innerHTML = thiz.width + " x " + thiz.height;
            }, 1000);
        }
    } else {
        if (this.showResizerTimeout) window.clearTimeout(this.showResizerTimeout);
        this.element.removeAttribute("resizing");
        this.showResizerTimeout = null;
    }
    return false;
};
Canvas.prototype.handleMouseMove = function (event, fake) {
    if (!fake && this.handleResizeMouseMove(event)) return;

    try {
        if (this.duplicateMode && !this.mouseUp) {
            if(this.duplicateFunc) {
                this.duplicateFunc();
            }
        }

        this._currentPX = event.clientX / this.zoom;
        this._currentPY = event.clientY / this.zoom;

        if (this.spaceHeld) {
            var spanx = this._lastScrollX
                    + (this._lastPX - Math.round(this._currentPX)) * this.zoom;
            var spany = this._lastScrollY
                    + (this._lastPY - Math.round(this._currentPY)) * this.zoom;

            this.parentNode.scrollTop = spany;
            this.parentNode.scrollLeft = spanx;

            return;
        }

        if (event.originalTarget
                && event.originalTarget.nodeName
                && "menu,menuitem,menuseparator,toolbar"
                        .indexOf(event.originalTarget.nodeName) == -1) {
            var rect = this.svg.parentNode.getBoundingClientRect();
            var boxObject = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
            var px = this._currentPX - boxObject.x;
            var py = this._currentPY - boxObject.y;
            // shadow 5
            if (px >= 0 && px <= boxObject.width - 5 && py >= 0
                    && py <= boxObject.height - 5) {
                // setTimeout(function () { Util.setPointerPosition(px, py); },
                // 100);
            }
        }

        if (this._button != 0)
            return;

        if (this.controllerHeld && this.currentController) {
            if (!fake) {
                event.preventDefault();
                event.stopPropagation();

                if (this.movementDisabled) return;
            }

            //avoid accidental move when user is trying to select the object
            var msFromClick = event.timeStamp - this._mouseDownAt;
            if (msFromClick < 100) {
                return;
            }

            if (this.currentController.markAsMoving)
                this.currentController.markAsMoving(true);
            var newX = Math.round(event.clientX / this.zoom);
            var newY = Math.round(event.clientY / this.zoom);

            var dx = newX - this.oX;
            var dy = newY - this.oY;
            
            //direction ratios
            var hdr = event.ctrlKey && Math.abs(dx) < Math.abs(dy) ? 0 : 1;
            var vdr = event.ctrlKey && Math.abs(dx) >= Math.abs(dy) ? 0 : 1;

            var accX = Math.abs(newX - this._lastNewX) < 2;
            var accY = Math.abs(newY - this._lastNewY) < 2;

            this._lastNewX = newX;
            this._lastNewY = newY;

            this.currentX = newX;
            this.currentY = newY;


            // this.oX = newX;
            // this.oY = newY;

            this.hasMoved = true;

            var gridSize = Pencil.getGridSize();
            var snap = null;
            if (Config.get("object.snapping.enabled", true) == true) {
                snap = this.snappingHelper.findSnapping(accX
                        && !this.snappingHelper.snappedX, accY
                        && !this.snappingHelper.snappedY, null, null,
                        event.shiftKey);
            }
            if (Config.get("edit.snap.grid", false) == true) {
                var snapGrid = this.snappingHelper.findSnapping(accX
                        && !this.snappingHelper.snappedX, accY
                        && !this.snappingHelper.snappedY, null, gridSize.w / 2,
                        event.shiftKey, true);
                if (snap && snapGrid) {
                    if (snap.dx == 0) {
                        snap.dx = snapGrid.dx;
                    }
                    if (snap.dy == 0) {
                        snap.dy = snapGrid.dy;
                    }
                } else {
                    snap = snapGrid;
                }
                // debug("snap grid: " + [snapGrid.dx, snapGrid.dy]);
            }
            // debug("snap: " + [snap.dx, snap.dy, this.snappedX,
            // this.snappedY]);
            if (!event.shiftKey
                    && snap
                    && ((snap.dx != 0 && !this.snappingHelper.snappedX && accX)
                            || (snap.dy != 0 && !this.snappingHelper.snappedY && accY)
                        )) {
                if (snap.dx != 0 && !this.snappingHelper.snappedX) {
                    this.snappingHelper.snappedX = true;
                    this.snappingHelper.snapX = newX;
                    this.currentController._pSnapshot.lastDX += snap.dx;
                    // debug("snapX");
                }
                if (snap.dy != 0 && !this.snappingHelper.snappedY) {
                    this.snappingHelper.snappedY = true;
                    this.snappingHelper.snapY = newY;
                    this.currentController._pSnapshot.lastDY += snap.dy;
                    // debug("snapY");
                }
                this.currentController.moveBy(snap.dx * hdr, snap.dy * vdr);
            } else {
                var unsnapX = event.shiftKey
                        || (this.snappingHelper.snapX != 0 && (Math
                                .abs(this.snappingHelper.snapX - newX) > this.snappingHelper.unsnapX));
                var unsnapY = event.shiftKey
                        || (this.snappingHelper.snapY != 0 && (Math
                                .abs(this.snappingHelper.snapY - newY) > this.snappingHelper.unsnapY));
                // debug("unsnap: " + [unsnapX, unsnapY]);

                if (!this.snappingHelper.snappedX
                        && !this.snappingHelper.snappedY) {
                    this.currentController.moveFromSnapshot(dx * hdr, dy * vdr);
                } else {
                    if (unsnapX || !this.snappingHelper.snappedX) {
                        this.currentController
                                .moveFromSnapshot(
                                        dx * hdr,
                                        this.snappingHelper.snappedY ? this.currentController._pSnapshot.lastDY * vdr
                                                : dy * vdr);
                    }
                    if (unsnapY || !this.snappingHelper.snappedY) {
                        this.currentController
                                .moveFromSnapshot(
                                        this.snappingHelper.snappedX ? this.currentController._pSnapshot.lastDX * hdr
                                                : dx * hdr, dy * vdr);
                        this.snappingHelper.snapY = 0;
                        this.snappingHelper.snappedY = false;
                    }
                    if (unsnapX || !this.snappingHelper.snappedX) {
                        this.snappingHelper.snapX = 0;
                        this.snappingHelper.snappedX = false;
                    }
                    
                    if (unsnapX) {
                        this.snappingHelper.clearSnappingGuideX();
                    }
                    if (unsnapY) {
                        this.snappingHelper.clearSnappingGuideY();
                    }
                }
            }
            if (this.currentController.dockingManager) {
                this.currentController.dockingManager.altKey = event.altKey;
            }
            return;
        }

        if (this.isSelectingRange) {
            var end = this.getEventLocation(event);
            var x1 = Math.min(end.x, this.lastMousePos.x);
            var x2 = Math.max(end.x, this.lastMousePos.x);
            var y1 = Math.min(end.y, this.lastMousePos.y);
            var y2 = Math.max(end.y, this.lastMousePos.y);

            var w = x2 - x1;
            var h = y2 - y1;

            this.currentRange = {
                x : x1,
                y : y1,
                width : w,
                height : h
            };
            this.setRangeBoundStart(x1, y1);
            this.setRangeBoundSize(w, h);
            this.handleScrollPane(event);
        }
    } catch (ex) {
        error(ex);
    }

};
Canvas.prototype.setRangeBoundStart = function (x, y) {

    Svg.setX(this.rangeBoundRect, x + 0.5);
    Svg.setY(this.rangeBoundRect, y + 0.5);

};
Canvas.prototype.setRangeBoundSize = function (w, h) {

    Svg.setWidth(this.rangeBoundRect, w);
    Svg.setHeight(this.rangeBoundRect, h);

};
Canvas.prototype.setRangeBoundVisibility = function (visible) {

    this.rangeBoundRect.setAttributeNS(PencilNamespaces.p, "p:on",
            visible ? "true" : "false");

};
Canvas.prototype.handleKeyPress = function (event) {
    if (this != Pencil.activeCanvas) return;

    for (editor in this.onScreenEditors) {
        var e = this.onScreenEditors[editor];
        if (e.handleKeyPressEvent) {
            if (e.handleKeyPressEvent(event)) {
                return;
            }
        }
    }
    if (event.keyCode == DOM_VK_UP || event.keyCode == DOM_VK_DOWN
            || event.keyCode == DOM_VK_LEFT
            || event.keyCode == DOM_VK_RIGHT) {
        event.preventDefault();
        if (!this.currentController)
            return;

        var dx = 0;
        var dy = 0;

        if (event.keyCode == DOM_VK_UP)
            dy = -1;
        if (event.keyCode == DOM_VK_DOWN)
            dy = 1;
        if (event.keyCode == DOM_VK_LEFT)
            dx = -1;
        if (event.keyCode == DOM_VK_RIGHT)
            dx = 1;

        var gridSize = Pencil.getGridSize();
        if (event.shiftKey) {
            dx *= gridSize.w * 4;
            dy *= gridSize.h * 4;
        } else if (event.ctrlKey) {
            dx *= gridSize.w;
            dy *= gridSize.h;
        }

        this.run(function () {
            // this.currentController.moveBy(dx, dy);
            this.currentController.moveBy(dx, dy, false, true);
            
            Connector.prepareInvalidation(this);
            if (this.currentController.invalidateOutboundConnections) {
                this.currentController.invalidateOutboundConnections();
            }
            if (this.currentController.invalidateInboundConnections) {
                this.currentController.invalidateInboundConnections();
            }
            Connector.finishInvalidation();

        }, this, Util.getMessage("action.move.shape"));

        if (this.currentController.constructor == TargetSet) {
            for ( var t in this.currentController.targets) {
                this.snappingHelper
                        .updateSnappingGuide(this.currentController.targets[t]);
            }
        } else {
            this.snappingHelper.updateSnappingGuide(this.currentController);
        }

        this.invalidateEditors();
        event.preventDefault();
        Dom.emitEvent("p:ShapeGeometryModified", this.element, {
            setter : null
        });

    } else if (event.keyCode == DOM_VK_DELETE) {
        if (this.currentController) {
            this.run(function () {
                this.currentController.deleteTarget();
            }, this, Util.getMessage("action.delete.shape",
                    this.currentController.getName()));
            this.currentController = null;
            this._detachEditors();
            this.clearSelection();
            this._sayTargetChanged();
            event.preventDefault();
        }
    } else if (event.keyCode == DOM_VK_F2) {
        if (this.currentController && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            Dom.emitEvent("p:TextEditingRequested", this.element, {
                controller : this.currentController
            });
        }
    } else if (event.keyCode == DOM_VK_TAB) {
        if (event.shiftKey) {
            this.selectSibling(false);
        } else {
            this.selectSibling(true);
        }

        event.preventDefault();
    } else if (event.charCode == " ".charCodeAt(0) && event.ctrlKey) {
        event.preventDefault();
        this._showPropertyDialog();
        event.preventDefault();
    } else if (event.charCode == "a".charCodeAt(0) && event.ctrlKey) {
        event.preventDefault();
        this.selectAll();
        event.preventDefault();
    } else if (event.keyCode == DOM_VK_ESCAPE) {
        this.endFormatPainter();
    }
    // else if (event.keyCode == DOM_VK_SHIFT) {
    //     var targets = this.getSelectedTargets();
    //     if (targets.length > 0) {
    //         this.duplicateMode = true;
    //         this.mouseUp = false;
    //     }
    // }

};
Canvas.prototype.updateContextMenu = function (currentAction, prevAction) {

    this.undoContextMenu.setAttribute("label", Util
            .getMessage("menu.undo.label")
            + currentAction);
    this.redoContextMenu.setAttribute("label", Util
            .getMessage("menu.redo.label")
            + prevAction);

};
Canvas.prototype.handleContextMenuShow = function (event) {
    if (this.currentController) {
        // attach now
        if (this.contextMenuEditor) {
            this.contextMenuEditor.attach(this.currentController);
        }

        this.lockingStatus = {
            controller : this.currentController
        };

    } else {
        var top = Dom.findTop(event.originalTarget, function (node) {
            return node.hasAttributeNS
                    && node.hasAttributeNS(PencilNamespaces.p, "type");
                });
        this.currentController = top;
        if (top && this.isShapeLocked(top)) {
            this.lockingStatus = {
                node : top
            };
        }

        if (this.contextMenuEditor) {
            this.contextMenuEditor.dettach();
        }
    }

    ApplicationPane._instance.canvasMenu.showMenuAt(event.clientX, event.clientY);
};
/*
    try {
        this._lastEvent = event;
        Dom.workOn("./xul:menuseparator", this.popup, function (sep) {
            sep.style.display = "";
        });
        for (var i = 0; i < this.popup.childNodes.length; i++) {
            var child = this.popup.childNodes[i];
            var forAtt = child.getAttributeNS(PencilNamespaces.p, "for");
            child._canvas = this;
            if (forAtt) {
                forAtt = "," + forAtt + ",";
                var visible = false;
                if (this.currentController) {
                    if (forAtt.indexOf(","
                            + this.currentController.constructor.name + ",") >= 0) {
                        visible = true;
                    }
                }

                child.style.display = visible ? "" : "none";
                child._controller = this.currentController;
            }
        }

        this.lockingMenuItem.style.display = "none";
        this.lockingStatus = null;

        if (this.currentController) {
            this.lockingStatus = {
                controller : this.currentController
            };
            this.lockingMenuItem.style.display = "";
            this.lockingMenuItem.setAttribute("checked", "false");
        } else {
            var top = Dom.findTop(event.originalTarget, function (node) {
                return node.hasAttributeNS
                        && node.hasAttributeNS(PencilNamespaces.p, "type");
            });
            if (top && this.isShapeLocked(top)) {
                this.lockingStatus = {
                    node : top
                };
                this.lockingMenuItem.style.display = "";
                this.lockingMenuItem.setAttribute("checked", "true");
            }
        }

        // remove all menu items previously created by the on-menu editor
        var parent = this.popupSeparator.parentNode;
        var len = parent.childNodes.length;
        for (var i = len - 1; i >= 0; i--) {
            var child = parent.childNodes[i];
            if (child._isEditor)
                parent.removeChild(child);
        }

        if (this.currentController) {
            // attach now
            if (this.contextMenuEditor) {
                this.contextMenuEditor.attach(this.currentController);
            }
        }

        // this.buildAttachMenuItem();
        // this.buildDetachMenuItem();

        var childs = this.popup.childNodes;
        var shouldHideNextSeparator = true;
        var foundVisibleItem = false;

        for (var i = 0; i < childs.length; i++) {
            var child = childs[i];
            if (child.localName == "menuseparator") {
                if (shouldHideNextSeparator) {
                    child.style.display = "none";
                } else {
                    shouldHideNextSeparator = true;
                }
            } else {
                if (child.style.display != "none") {
                    shouldHideNextSeparator = false;
                }
            }

            if (child.style.display != "none") {
                foundVisibleItem = true;
            }
        }

        for (var i = childs.length - 1; i >= 0; i--) {
            var child = childs[i];
            if (child.localName != "menuseparator"
                    && child.style.display != "none") {
                break;
            }
            child.style.display = "none";
        }
        if (!foundVisibleItem) {
            this.popup.hidePopup();
            return;
        }
    } catch (e) {
        Console.dumpError(e);
    }

*/

Canvas.prototype.buildAttachMenuItem = function () {

    if (this.attachToMenu) {
        this.popup.removeChild(this.attachToMenu);
        this.attachToMenu = null;
    }
    if (!this.currentController)
        return;
    if (this.currentController.supportAttach
            && this.currentController.supportAttach()) {
        var thiz = this;
        var container = this.currentController.getAttachContainer();
        this.attachToMenu = document.createElementNS(PencilNamespaces.xul,
                "menu");
        this.attachToMenu.setAttribute("label", Util
                .getMessage("canvas.merge.label"));
        var attachSlots = this.currentController.getAttachSlots();
        if (attachSlots.length == 1) {
            this.attachToMenu = document.createElementNS(PencilNamespaces.xul,
                    "menuitem");
        }
        var menu = this.popup.insertBefore(this.attachToMenu, document
                .getAnonymousElementByAttribute(this, "aid",
                        "addToMyCollections"));
        if (attachSlots.length > 1) {
            menu.appendChild(document.createElementNS(PencilNamespaces.xul,
                    "menupopup"));
        }
        for (var i = 0; i < attachSlots.length; i++) {
            var displayName = attachSlots[i].displayName;
            var tool = container.getProperty(attachSlots[i].name);
            if (tool && tool != "") {
                displayName += " (" + tool.targetName + ")";
            }
            if (attachSlots.length == 1) {
                this.attachToMenu.setAttribute("label", Util.getMessage(
                        "canvas.merge.label.1", displayName));
                this.attachToMenu._container = container;
                this.attachToMenu._attachSlot = attachSlots[0];
            } else {
                var item = document.createElementNS(PencilNamespaces.xul,
                        "menuitem");
                menu.firstChild.appendChild(item);
                item.setAttribute("label", displayName);
                item._container = container;
                item._attachSlot = attachSlots[i];
            }
        }
        this.attachToMenu.addEventListener("command", function (event) {
            try {
                var containerNode = Dom.findUpward(event.originalTarget,
                        function (node) {
                            return node._container;
                        });
                var attachSlotNode = Dom.findUpward(event.originalTarget,
                        function (node) {
                            return node._attachSlot;
                        });
                if (containerNode && containerNode._container && attachSlotNode
                        && attachSlotNode._attachSlot
                        && containerNode._container._target) {
                    var target = containerNode._container._target;
                    var defId = target.def.id;
                    var name = target.getName ? target.getName() : "";
                    var metaNode = Dom.getSingle("./p:metadata", target.svg);
                    var ctm = target.svg
                            .getTransformToElement(thiz.drawingLayer);
                    var cctm = containerNode._container.svg
                            .getTransformToElement(thiz.drawingLayer);
                    // var uuid = Util.newUUID();
                    // target.svg.setAttribute("id", uuid);
                    var uuid = target.svg.getAttribute("id");
                    containerNode._container.setProperty(
                            attachSlotNode._attachSlot.name, new Attachment(
                                    defId, uuid, name, metaNode, ctm, cctm));
                    thiz.selectShape(containerNode._container.svg);
                }
            } catch (e) {
                Console.dumpError(e);
            }
        }, false);
    }

};
Canvas.prototype.buildDetachMenuItem = function () {

    if (this.detachFromMenu) {
        this.popup.removeChild(this.detachFromMenu);
        this.detachFromMenu = null;
    }
    if (!this.currentController)
        return;
    if (this.currentController.canDetach && this.currentController.canDetach()) {
        var thiz = this;
        var container = this.currentController;
        this.detachFromMenu = document.createElementNS(PencilNamespaces.xul,
                "menu");
        this.detachFromMenu.setAttribute("label", Util
                .getMessage("canvas.split.label"));
        var attachedSlots = this.currentController.getAttachedSlots();
        if (attachedSlots.length == 1) {
            this.detachFromMenu = document.createElementNS(
                    PencilNamespaces.xul, "menuitem");
        }
        var menu = this.popup.insertBefore(this.detachFromMenu, document
                .getAnonymousElementByAttribute(this, "aid",
                        "addToMyCollections"));
        if (attachedSlots.length > 1) {
            menu.appendChild(document.createElementNS(PencilNamespaces.xul,
                    "menupopup"));
        }
        for (var i = 0; i < attachedSlots.length; i++) {
            var displayName = attachedSlots[i].displayName;
            var tool = container.getProperty(attachedSlots[i].name);
            if (tool && tool != "") {
                displayName += " (" + tool.targetName + ")";
            }
            if (attachedSlots.length == 1) {
                this.detachFromMenu.setAttribute("label", Util.getMessage(
                        "canvas.split.label.1", displayName));
                this.detachFromMenu._container = container;
                this.detachFromMenu._detachSlot = attachedSlots[0];
            } else {
                var item = document.createElementNS(PencilNamespaces.xul,
                        "menuitem");
                menu.firstChild.appendChild(item);
                item.setAttribute("label", displayName);
                item._container = container;
                item._detachSlot = attachedSlots[i];
            }
        }
        this.detachFromMenu
                .addEventListener(
                        "command",
                        function (event) {
                            try {
                                var containerNode = Dom.findUpward(
                                        event.originalTarget, function (node) {
                                            return node._container;
                                        });
                                var detachSlotNode = Dom.findUpward(
                                        event.originalTarget, function (node) {
                                            return node._detachSlot;
                                        });
                                if (containerNode && containerNode._container
                                        && detachSlotNode
                                        && detachSlotNode._detachSlot) {
                                    var attachment = containerNode._container
                                            .getProperty(detachSlotNode._detachSlot.name);
                                    if (attachment && attachment.defId) {
                                        var shapeDef = CollectionManager.shapeDefinition
                                                .locateDefinition(attachment.defId);
                                        if (shapeDef) {
                                            thiz.insertShapeImpl_(shapeDef,
                                                    containerNode._container
                                                            .getBounding());
                                            var controller = thiz.currentController;
                                            if (controller) {
                                                Svg.ensureCTM(controller.svg,
                                                        attachment.ctm);
                                                var metaNode = Dom
                                                        .parseToNode(attachment.metaData);
                                                if (metaNode) {
                                                    Dom
                                                            .workOn(
                                                                    "./p:property",
                                                                    metaNode,
                                                                    function (
                                                                            node) {
                                                                        var name = node
                                                                                .getAttribute("name");
                                                                        var value = Dom
                                                                                .getText(node);
                                                                        controller
                                                                                .setProperty(
                                                                                        name,
                                                                                        value);
                                                                    });
                                                }
                                                // var g =
                                                // document.getElementById(attachment.targetId);
                                                var octm = attachment.cctm;
                                                var cctm = containerNode._container.svg
                                                        .getTransformToElement(thiz.drawingLayer);
                                                // var matrix =
                                                // containerNode._container.svg.createSVGTransform().matrix;;
                                                // matrix =
                                                // matrix.multiply(octm);
                                                // var ctm =
                                                // g.getTransformToElement(thiz.drawingLayer);
                                                // Svg.ensureCTM(controller.svg,
                                                // ctm);
                                                controller.moveBy(cctm.e
                                                        - octm.e, cctm.f
                                                        - octm.f);
                                            }
                                        }
                                        containerNode._container
                                                .setProperty(
                                                        detachSlotNode._detachSlot.name,
                                                        new Attachment(null,
                                                                null, null));
                                        thiz
                                                .selectShape(containerNode._container.svg);
                                        thiz.invalidateEditors();
                                    }
                                }
                            } catch (e) {
                                Console.dumpError(e);
                            }
                        }, false);
    }

};
Canvas.prototype.insertEditorContextMenuItem = function (menuItem) {

    var parent = this.popupSeparator.parentNode;
    menuItem._isEditor = true;

    parent.insertBefore(menuItem, this.popupSeparator);

};
Canvas.prototype.invalidateEditors = function (source) {

    for (editor in this.onScreenEditors) {
        var e = this.onScreenEditors[editor];
        if (!source || source != e)
            e.invalidate();
    }

    // Pencil.invalidateSharedEditor();
    // invalidates all selections
    for (var i = 0; i < this.selectionContainer.childNodes.length; i++) {
        var rect = this.selectionContainer.childNodes[i];
        this._invalidateOneSelection(rect);
    }

};
Canvas.prototype._showPropertyDialog = function () {

    if (this.propertyPageEditor && this.currentController) {
        this.propertyPageEditor.showAndAttach(this.currentController);
    }

};
Canvas.prototype.handlePropertyMenuItemCommand = function (event) {

    this._showPropertyDialog();

};
Canvas.prototype.handleDblclick = function (event) {

    stencilDebug("handleDblclick, start finding top");

    // find the top, get the def
    var thiz = this;
    var top = Dom.findTop(event.originalTarget, function (node) {
        return node.hasAttributeNS
                && node.hasAttributeNS(PencilNamespaces.p, "type")
                && node.getAttributeNS(PencilNamespaces.p, "type") == "Shape"
                && !thiz.isShapeLocked(node);
    });

    stencilDebug("handleDblclick, top = " + top);

    if (!top)
        return;

    var target = this.createControllerFor(top);

    stencilDebug("emitting event p:ShapeDoubleClicked");
    Dom.emitEvent("p:ShapeDoubleClicked", top, {
        controller : target,
        origTarget : event.originalTarget,
        clientX : event.clientX,
        clientY : event.clientY
    });

};
Canvas.prototype.focus = function () {

    // document.getElementById("richTextEditorToolbar").focus();
    // document.commandDispatcher.rewindFocus();
    // document.commandDispatcher.advanceFocus();
    this.focusableBox.focus("");

};
Canvas.prototype.doCopy = function () {

    if (!this.currentController)
        return;

    var transferableData = this.currentController.createTransferableData();

    transferableData.dataNode.removeAttribute("p:parentRef");
    var metaNode = Dom.getSingle(".//p:metadata", transferableData.dataNode);
    var childTargetsNode = Dom.getSingle("./p:childTargets", metaNode);
    if (childTargetsNode) {
        childTargetsNode.parentNode.removeChild(childTargetsNode);
    }

    // serialize to string
    var textualData = new XMLSerializer()
            .serializeToString(transferableData.dataNode);

    clipboard.writeText(textualData);
};
Canvas.domParser = new DOMParser();
Canvas.prototype.doPaste = function (withAlternative) {
    this.useAlternativePasting = withAlternative ? true : false;
    var formats = clipboard.availableFormats();
    if (!formats) return;

    var contents = [];

    //the following implementation is electron-specific
    if (formats.indexOf(PlainTextXferHelper.MIME_TYPE) >= 0) {
        //in some cases, XML-based clipboard contents are transfered using plain text
        //we need to try parsing it first instead of directly assuming that the content is just plain text

        var text = clipboard.readText();
        if (text) {
            var parsed = false;

            function parseContent(string) {
                var dom = Canvas.domParser.parseFromString(string, "text/xml");
                if (dom) {
                    var node = dom.documentElement;
                    if (node.namespaceURI == PencilNamespaces.svg) {
                        if (node.localName == "g") {
                            var typeAttribute = node.getAttributeNS(PencilNamespaces.p, "type");
                            return {
                                type: (typeAttribute == "Shape" || typeAttribute == "Group") ? ShapeXferHelper.MIME_TYPE : TargetSetXferHelper.MIME_TYPE,
                                data: dom
                            };
                        } else if (node.localName == "svg") {
                            return {
                                type: SVGXferHelper.MIME_TYPE,
                                data: dom
                            };
                        }
                    }
                }
                return null;
            }

            var content = parseContent(text);
            if (content) {
                contents.push(content);
                parsed = true;
            }

            if (!parsed) {
                var parsedFile = false;
                var fileTypes = [".png", ".jpg", ".jpeg", ".gif", ".svg"];
                var fileType = path.extname(text);
                if (fileType && fileTypes.indexOf(fileType.toLowerCase()) >= 0) {
                    try {
                        var fstat = fsExistSync(text);
                        if (fstat && fstat.isFile()) {

                            if (fileType.toLowerCase() == ".png") {
                                var image = nativeImage.createFromPath(text);
                                if (image) {
                                    var id = Pencil.controller.nativeImageToRefSync(image);

                                    var size = image.getSize();

                                    contents.push({
                                        type: PNGImageXferHelper.MIME_TYPE,
                                        data: new ImageData(size.width, size.height, ImageData.idToRefString(id))
                                    });
                                    parsedFile = true;
                                }
                            } else if (fileType.toLowerCase() == ".svg") {
                                var fileContent = fs.readFileSync(text, "utf8");
                                var svgContent = parseContent(fileContent);
                                if (svgContent) {
                                    contents.push(svgContent);
                                    parsedFile = true;
                                }
                            } else {
                                contents.push({
                                    type: JPGGIFImageXferHelper.MIME_TYPE,
                                    data: text
                                });
                                parsedFile = true;
                            }
                        }

                    } catch (e) {
                        Console.dumpError(e);
                    }
                }

                if (!parsedFile) {
                    contents.push({
                        type: PlainTextXferHelper.MIME_TYPE,
                        data: text
                    });
                }
            }
        }
    }

    if (formats.indexOf(RichTextXferHelper.MIME_TYPE) >= 0) {
        var html = clipboard.readHtml();
        if (html) {
            contents.push({
                type: RichTextXferHelper.MIME_TYPE,
                data: html
            });
        }
    }

    if (formats.indexOf(PNGImageXferHelper.MIME_TYPE) >= 0) {
        var image = clipboard.readImage();
        if (image) {
            var id = Pencil.controller.nativeImageToRefSync(image);
            var size = image.getSize();
            
            contents.push({
                type: PNGImageXferHelper.MIME_TYPE,
                data: new ImageData(size.width, size.height, ImageData.idToRefString(id))
            });
        }
    }

    //initial impl: use first win approach
    for (var j = 0; j < contents.length; j ++) {
        var content = contents[j];
        var handled = false;

        for (var i in this.xferHelpers) {
            var helper = this.xferHelpers[i];

            if (helper.type == content.type) {
                try {
                    helper.handleData(content.data);
                    handled = true;
                    break;
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (handled) break;
    }

};

Canvas.prototype.handleMouseDown = function (event) {
    this._mouseDownAt = event.timeStamp;
    event.preventDefault();

    tick("begin");
    Dom.emitEvent("p:CanvasMouseDown", this.element, {});

    var canvasList = Pencil.getCanvasList();
    for (var i = 0; i < canvasList.length; i++) {
        if (canvasList[i] != this) {
            canvasList[i].selectNone();
        }
    }

    this.snappingHelper.clearSnappingGuide();

    this._button = event.button;

    var thiz = this;
    var isInControlLayer = Dom.findUpward(event.originalTarget, function (node) {
        return (node == thiz.controlLayer);
    });
    if (isInControlLayer) return;

    var top = Dom.findTop(event.originalTarget, function (node) {
        return node.hasAttributeNS
                && node.hasAttributeNS(PencilNamespaces.p, "type");
    });
    
    if (top && this.isShapeLocked(top)) top = null;
        
    if (!top) {
        this.lastTop = null;
        // this.clearSelection();
        // this._detachEditors();
        this.currentController = null;
        // this.setAttributeNS(PencilNamespaces.p, "p:selection", 0);

        this.isSelectingRange = true;
        this.lastMousePos = this.getEventLocation(event);
        this.setRangeBoundStart(this.lastMousePos.x, this.lastMousePos.y);
        this.setRangeBoundVisibility(true);
        this.setRangeBoundSize(0, 0);
        this.currentRange = {
            w : this.lastMousePos.x,
            y : this.lastMousePos.y,
            width : 0,
            height : 0
        };
        
        this._sayTargetChanged();
        this.endFormatPainter();

        return;
    }

    var controller = null;

    var targets = this.getSelectedTargets();

    var foundTarget = null;
    for (i in targets) {
        var target = targets[i];
        if (target.isFor(top)) {
            foundTarget = target;
            break;
        }
    }
    if (event.shiftKey) {
        if (!foundTarget && top) {
            thiz.clearSelection();
            thiz.addToSelection(thiz.createControllerFor(top));
        }
        this.duplicateMode = true;
        this.mouseUp = false;

        var thiz = this;
        this.duplicateFunc = function () {
            var target =thiz.currentController.createTransferableData();
            var contents = [];

            target.dataNode.removeAttribute("p:parentRef");
            var metaNode = Dom.getSingle(".//p:metadata", target.dataNode);
            var childTargetsNode = Dom.getSingle("./p:childTargets", metaNode);
            if (childTargetsNode) {
                childTargetsNode.parentNode.removeChild(childTargetsNode);
            }

            // serialize to string
            var textualData = new XMLSerializer()
                    .serializeToString(target.dataNode);

            var dom = Canvas.domParser.parseFromString(textualData, "text/xml");
            dom.copySamePlace = true;
            var node = dom.documentElement;
            if (node.namespaceURI == PencilNamespaces.svg) {
                if (node.localName == "g") {
                    var typeAttribute = node.getAttributeNS(PencilNamespaces.p, "type");
                    contents.push({
                        type: (typeAttribute == "Shape" || typeAttribute == "Group") ? ShapeXferHelper.MIME_TYPE : TargetSetXferHelper.MIME_TYPE,
                        data: dom
                    });

                } else if (node.localName == "svg") {
                    contents.push({
                        type: SVGXferHelper.MIME_TYPE,
                        data: dom
                    })
                }
            }

            for (var j = 0; j < contents.length; j ++) {
                var content = contents[j];
                var handled = false;

                for (var i in thiz.xferHelpers) {
                    var helper = thiz.xferHelpers[i];

                    if (helper.type == content.type) {
                        try {
                            helper.handleData(content.data);
                            handled = true;
                            break;
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                if (handled) break;
            }
            thiz.controllerHeld = true;

            thiz.oX = Math.round(event.clientX / thiz.zoom);
            thiz.oY = Math.round(event.clientY / thiz.zoom);

            thiz._lastNewX = Math.round(event.clientX / thiz.zoom);
            thiz._lastNewY = Math.round(event.clientY / thiz.zoom);

            thiz.oldPos = thiz.currentController.getGeometry();

            tick("before setPositionSnapshot");
            thiz.currentController.setPositionSnapshot();
            tick("after setPositionSnapshot");

            thiz.duplicateFunc = null;
        }
    } else if (this.isEventWithControl(event)) {
        if (foundTarget) {
            this.removeFromSelection(foundTarget);
        } else {
            var newController = this.createControllerFor(top);
            this.addToSelection(newController);
        }
    } else {
        if (!foundTarget || targets.length == 1) {
            this.clearSelection();
            controller = this.createControllerFor(top);
            this.addToSelection(controller);
        }
    }

    var targets = this.getSelectedTargets();
    if (targets.length > 1) {
        controller = new TargetSet(this, targets);
    } else if (targets.length == 1 && controller == null) {
        controller = targets[0];
    }

    this.setAttributeNS(PencilNamespaces.p, "p:selection", targets.length);

    if (controller) {
        try {
            this.currentController = controller;
            this.controllerHeld = true;

            this.oX = Math.round(event.clientX / this.zoom);
            this.oY = Math.round(event.clientY / this.zoom);

            this._lastNewX = Math.round(event.clientX / this.zoom);
            this._lastNewY = Math.round(event.clientY / this.zoom);

            this.oldPos = this.currentController.getGeometry();

            tick("before setPositionSnapshot");
            this.currentController.setPositionSnapshot();
            tick("after setPositionSnapshot");

            if (event.button == 0)
                this.setAttributeNS(PencilNamespaces.p, "p:holding", "true");

            if (top != this.lastTop || event.ctrlKey || event.button != 0) {
                this.reClick = false;
                this._attachEditors(controller);
            } else {
                if (event.detail != 2)
                    this.reClick = true;
            }

            this.hasMoved = false;
            this.lastTop = top;
            this._sayTargetChanged();
            tick("done");
        } catch (e) {
            Console.dumpError(e);
        }
    }

};

Canvas.prototype.isEventWithControl = function (event) {
    return (event.ctrlKey && !IS_MAC) || (event.metaKey && IS_MAC);
};
Canvas.prototype.doGroup = function () {

    this.run(this.doGroupImpl_, this, Util.getMessage("action.group.shapes"));

};

Canvas.prototype.doGroupImpl_ = function () {

    var targets = this.getSelectedTargets();
    if (targets.length <= 1)
        return;

    // create an svg:g to box all the selected target
    var g = this.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
    g.setAttributeNS(PencilNamespaces.p, "p:type", "Group");

    var nodes = [];
    var rect = null;
    Dom.workOn("./svg:g[@p:type]", this.drawingLayer, function (node) {
        for (t in targets) {
            if (targets[t].isFor(node)) {
                nodes.push(node);
                var childRect = targets[t].getBounding();
                rect = rect ? Svg.joinRect(rect, childRect) : childRect;
            }
        }
    });

    for (n in nodes) {
        var node = nodes[n];
        node.parentNode.removeChild(node);
        g.appendChild(node);
    }

    this.drawingLayer.appendChild(g);

    for (t in targets) {
        targets[t].moveBy(0 - rect.x, 0 - rect.y, true);
    }

    g.setAttribute("transform", "translate(" + [ rect.x, rect.y ] + ")");

    this.selectShape(g);

    this.currentController.processNewGroup();

    this.snappingHelper.updateSnappingGuide(this.currentController);
    for ( var t in this.currentController.targets) {
        this.snappingHelper.updateSnappingGuide(
                this.currentController.targets[t], true);
    }

};
Canvas.prototype.ensureControllerInView = function () {

};
Canvas.prototype.doUnGroup = function () {

    this.run(this.doUnGroupImpl_, this, Util
            .getMessage("action.ungroup.shapes"));

};
Canvas.prototype.doUnGroupImpl_ = function () {

    if (!this.currentController)
        return;
    if (this.currentController.constructor != Group)
        return;

    // remove group
    this.snappingHelper.updateSnappingGuide(this.currentController, true);

    var nodes = this.currentController.ungroup();

    this.selectMultiple(nodes);

    if (this.currentController.constructor == TargetSet) {
        for ( var t in this.currentController.targets) {
            this.snappingHelper
                    .updateSnappingGuide(this.currentController.targets[t]);
        }
    } else {
        this.snappingHelper.updateSnappingGuide(this.currentController);
    }

};
Canvas.prototype.isShapeLocked = function (shape) {

    return shape.getAttributeNS(PencilNamespaces.p, "locked") == "true";

};
Canvas.prototype.toggleLocking = function () {

    this.run(this.toggleLockingImpl_, this, Util.getMessage("action.lock.shape"));

};
Canvas.prototype.toggleLockingImpl_ = function () {
    if (!this.lockingStatus)
        return;
    if (this.lockingStatus.controller && this.lockingStatus.controller.lock) {
        this.lockingStatus.controller.lock();
        this.selectNone();
    } else if (this.lockingStatus.node) {
        this.lockingStatus.node.removeAttributeNS(PencilNamespaces.p, "locked");
        this.selectShape(this.lockingStatus.node);
    }

};
Canvas.prototype.deleteSelected = function () {

    this.run(this.deleteSelectedImpl_, this, Util
            .getMessage("action.delete.shape"));

};
Canvas.prototype.deleteSelectedImpl_ = function () {

    // this.snappingHelper.updateSnappingGuide(this.currentController, true);
    this.currentController.deleteTarget();
    this.currentController = null;
    this._detachEditors();
    this.clearSelection();
    this._sayTargetChanged();

};
Canvas.prototype._sayContentModified = function () {

    Dom.emitEvent("p:ContentModified", this.element);

};
Canvas.prototype._saveMemento = function (actionName) {

    this.careTaker.save(actionName);

};
Canvas.prototype.getMemento = function (actionName) {
    return new CanvasMemento(this.drawingLayer.cloneNode(true), {width: this.width, height: this.height}, actionName);
};

Canvas.prototype.setMemento = function (memento) {

    this.selectNone();
    Dom.empty(this.drawingLayer);

    // alert("copy back: " + memento.node.childNodes.length + " nodes");
    var fragment = this.drawingLayer.ownerDocument.createDocumentFragment();
    for (var i = 0; i < memento.node.childNodes.length; i++) {
        fragment.appendChild(this.drawingLayer.ownerDocument.importNode(
                memento.node.childNodes[i], true));
    }
    this.drawingLayer.appendChild(fragment);

    this.focusableBox.style.visibility = "hidden";
    this.focusableBox.style.visibility = "visible";

    var width = parseInt(memento.metadata.width, 10) || this.width;
    var height = parseInt(memento.metadata.height, 10) || this.height;

    if (this.width != width || this.height != height) {
        this.setSizeImpl_(width, height);
    }

    this._sayContentModified();

};
Canvas.prototype.run = function (job, targetObject, actionName, args) {
    try {
        // console.log();
        job.apply(targetObject, args);
    } catch (e) {
        Console.dumpError(e);
    } finally {
        this._saveMemento(actionName);
        if (Pencil.controller && !Pencil.controller.activePageLoading) this._sayContentModified();
    }

};
Canvas.prototype.getCanvasState = function () {
    var state = {
        zoom: this.zoom,
    }

    if (this._scrollPane) {
        state.scrollTop = this._scrollPane.scrollTop;
        state.scrollLeft = this._scrollPane.scrollLeft;
    }

    return state;
};
Canvas.prototype.setCanvasState = function (state) {
    if (state) {
        this.zoomTo(state.zoom);
        if (this._scrollPane) {
            window.setTimeout(function () {
                this._scrollPane.scrollTop = state.scrollTop;
                this._scrollPane.scrollLeft = state.scrollLeft;
            }.bind(this), 10);
        }
    } else {
        this.zoomTo(1);
        if (this._scrollPane) {
            window.setTimeout(function () {
                this._scrollPane.scrollTop = 0;
                this._scrollPane.scrollLeft = 0;
            }.bind(this), 10);
        }
    }
};
Canvas.prototype.setBackgroundColor = function (color) {
    if(color) {
        this.element.style.backgroundColor = color.toRGBAString();
    } else {
        this.element.style.backgroundColor = "";
    }


};

Canvas.prototype.setSize = function (width, height) {
    this.run(this.setSizeImpl_, this, Util.getMessage(
            "action.canvas.resize"), [width, height]);
};
Canvas.prototype.setSizeImpl_ = function (width, height) {
    var thiz = this;

    // this.run()
    this.width = width;
    this.height = height;

    this.svg.setAttribute("width", 10);
    this.svg.setAttribute("height", 10);

    window.setTimeout(function () {
        thiz.svg.setAttribute("width", Math.ceil(thiz.width * thiz.zoom));
        thiz.svg.setAttribute("height", Math.ceil(thiz.height * thiz.zoom));

        CanvasImpl.setupGrid.apply(thiz);
    }, 50);

    Dom.emitEvent("p:SizeChanged", this.element, {
        canvas : this
    });

    this.snappingHelper.rebuildSnappingGuide();
};

Canvas.prototype.setBackgroundImageData = function (image, dimBackground) {

    if (!image) {
        this.backgroundImage.setAttributeNS(PencilNamespaces.xlink,
                "xlink:href", "");
        this.backgroundImage.style.display = "none";
        this.hasBackgroundImage = false;
        this.removeAttributeNS(PencilNamespaces.p, "with-background");
        return;
    }

    this.backgroundImage.setAttributeNS(PencilNamespaces.xlink, "xlink:href",
            image.url);
    this.backgroundImage.setAttribute("width", image.width);
    this.backgroundImage.setAttribute("height", image.height);
    this.backgroundImage.style.display = "";
    this.hasBackgroundImage = true;
    this.setAttributeNS(PencilNamespaces.p, "p:with-background", "true");
    if (!dimBackground) {
        this.removeAttributeNS(PencilNamespaces.p, "with-background-dimmer");
    } else {
        this.setAttributeNS(PencilNamespaces.p, "p:with-background-dimmer",
                "true");
    }

};
Canvas.prototype.setDimBackground = function (dimBackground) {

    if (!dimBackground) {
        this.removeAttributeNS(PencilNamespaces.p, "with-background-dimmer");
    } else {
        this.setAttributeNS(PencilNamespaces.p, "p:with-background-dimmer",
                "true");
    }

};
Canvas.prototype.sizeToContent = function (hPadding, vPadding) {
    var newSize = null;
    var thiz = this;
    this.run(function () {
        newSize = thiz.sizeToContent__ (hPadding, vPadding);
    }, this, Util.getMessage("action.canvas.resize"));
    return newSize;
};
Canvas.prototype.sizeToContent__ = function (hPadding, vPadding) {
    var pageMargin = Pencil.controller.getDocumentPageMargin() || 0;

    hPadding += pageMargin;
    vPadding += pageMargin;

    this.zoomTo(1.0);

    var thiz = this;
    var maxBox = null;
    function out(name, rect) {
        console.log(name, "left: ", rect.left, "top: ", rect.top, "width: ", rect.width, "height: ", rect.height);
    }
    out("this.svg", this.svg.getBoundingClientRect());
    Dom.workOn("./svg:g[@p:type]", this.drawingLayer, function (node) {
        try {
            var controller = thiz.createControllerFor(node);
            if (controller.def && controller.def.meta.excludeSizeCalculation) return;
            var bbox = controller.getBoundingRect();
            //HACK: inspect the strokeWidth attribute to fix half stroke bbox issue
            var box = {
                x1 : bbox.x,
                y1 : bbox.y,
                x2 : bbox.x + bbox.width,
                y2 : bbox.y + bbox.height
            };

            if (controller.getGeometry) {
                var geo = controller.getGeometry();
                if (geo.ctm && geo.ctm.a == 1 && geo.ctm.b == 0 && geo.ctm.c == 0 && geo.ctm.d == 1 && geo.dim) {
                    box.x1 = geo.ctm.e;
                    box.y1 = geo.ctm.f;
                    box.x2 = box.x1 + geo.dim.w;
                    box.y2 = box.y1 + geo.dim.h;
                }
            }

            if (maxBox == null) {
                maxBox = box;
            } else {
                maxBox = {
                    x1 : Math.min(maxBox.x1, box.x1),
                    y1 : Math.min(maxBox.y1, box.y1),
                    x2 : Math.max(maxBox.x2, box.x2),
                    y2 : Math.max(maxBox.y2, box.y2)
                };
            }
        } catch (e) {
            Util.error(Util.getMessage("error.title"), e, Util
                    .getMessage("button.cancel.close"));
        }
    });
    if (maxBox == null) {
        Util.info(Util.getMessage("error.title"), Util
                .getMessage("the.current.document.is.empty.sizing.is.failed"),
                Util.getMessage("button.cancel.close"));
        return;
    }
    maxBox.x1 = Math.floor(maxBox.x1);
    maxBox.x2 = Math.ceil(maxBox.x2);
    maxBox.y1 = Math.floor(maxBox.y1);
    maxBox.y2 = Math.ceil(maxBox.y2);

    var width = maxBox.x2 - maxBox.x1 + 2 * hPadding;
    var height = maxBox.y2 - maxBox.y1 + 2 * vPadding;

    // moving
    var dx = 0 - maxBox.x1 + hPadding;
    var dy = 0 - maxBox.y1 + vPadding;

    Dom.workOn("./svg:g[@p:type]", this.drawingLayer, function (node) {
        try {
            var controller = thiz.createControllerFor(node);
            var bbox = controller.getBoundingRect();
            controller.moveBy(dx, dy);
        } catch (e) {
            alert(e);
        }
    });

    this.setSizeImpl_(width, height);

    this.selectNone();

    return {
        width : width,
        height : height
    };
};
Canvas.prototype.addSelectedToMyCollection = function () {
    if (!this.currentController) return;

    var data = {
        collections : PrivateCollectionManager.privateShapeDef.collections,
        valueHolder : {}
    };

    var run = function (data) {
        try {
            var target = Pencil.getCurrentTarget();
            // generating text/xml+svg
            var svg = target.svg.cloneNode(true);

            var fakeDom = Controller.parser.parseFromString("<Document xmlns=\"" + PencilNamespaces.p + "\"></Document>", "text/xml");
            fakeDom.documentElement.appendChild(svg);

            Pencil.controller.prepareForEmbedding(fakeDom, function () {
                fakeDom.documentElement.removeChild(svg);
                var valueHolder = data.valueHolder;
                if (!valueHolder.shapeName)
                    return;

                var shapeDef = new PrivateShapeDef();
                shapeDef.displayName = valueHolder.shapeName;
                shapeDef.content = svg;
                shapeDef.id = shapeDef.displayName.replace(/\s+/g, "_").toLowerCase()
                        + "_" + (new Date()).getTime();

                var collection = valueHolder.collection;
                var isNewCollection = (collection == null || collection == -1);

                if (isNewCollection) {
                    // debug("creating new collection...");
                    collection = new PrivateCollection();
                    collection.displayName = valueHolder.collectionName;
                    collection.description = valueHolder.collectionDescription;
                    collection.id = collection.displayName.replace(/\s+/g, "_")
                            .toLowerCase()
                            + "_" + (new Date()).getTime();

                    collection.shapeDefs.push(shapeDef);
                }
                Config.set("PrivateCollection.lastUsedCollection.id", collection.id);
                Config.set("PrivateCollection.lastSelectCollection.id", collection.id);
                debug("generating icon... :", valueHolder.autoGenerateIcon);
                if (valueHolder.autoGenerateIcon) {
                    Util.generateIcon(target, 64, 64, 2, null, function (icondata) {
                        debug("\t done generating icon.");
                        shapeDef.iconData = icondata;
                        if (isNewCollection) {
                            PrivateCollectionManager.addShapeCollection(collection);
                        } else {
                            PrivateCollectionManager.addShapeToCollection(collection,
                                    shapeDef);
                        }
                        return;
                    });
                } else {
                    var filePath = valueHolder.shapeIcon;
                    var image = nativeImage.createFromPath(filePath);

                    shapeDef.iconData = image.toDataURL();
                    if (isNewCollection) {
                        PrivateCollectionManager.addShapeCollection(collection);
                    } else {
                        PrivateCollectionManager.addShapeToCollection(collection,
                                shapeDef);
                    }

                }
            });

        } catch (e) {
            Console.dumpError(e);
        }
    };

    var myCollectionDialog = new PrivateCollectionDialog();
    myCollectionDialog.open({
        valueHolder: data.valueHolder,
        onDone: function (data) {
            data.valueHolder = data;
            run(data);
        }
    });
};
Canvas.prototype.insertPrivateShape = function (shapeDef, bound) {

    this.run(this.insertPrivateShapeImpl_, this, Util.getMessage(
            "action.create.shape", shapeDef.displayName), [ shapeDef,
            bound ? bound : null ]);

};
Canvas.prototype.insertPrivateShapeImpl_ = function (shapeDef, bound) {

    // debug("inserting private shape: " + shapeDef.displayName + ", id: " +
    // shapeDef.id);
    var g = this.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
    g.appendChild(shapeDef.content);

    // validate
    var shape = Dom.getSingle("/svg:g[@p:type='Shape' or @p:type='Group']", g);
    if (!shape) {
        return;
    }

    shape = this.ownerDocument.importNode(shape, true);

    // generate the ids
    Dom.workOn(".//*[@p:name]", shape, function (node) {
        var name = node.getAttributeNS(PencilNamespaces.p, "name");
        var oldId = node.getAttribute("id");
        if (oldId)
            return;

        var uuid = Util.newUUID();
        node.setAttribute("id", uuid);
        node.id = uuid;

        Dom.updateIdRef(shape, name, uuid);
    });

    Dom.renewId(shape);

    shape.style.visibility = "hidden";
    this.setAttributeNS(PencilNamespaces.p, "p:holding", "true");

    this.drawingLayer.appendChild(shape);

    Pencil.controller.invalidateContentNode(shape, function () {
        this.selectShape(shape);
        if (this.currentController.validateAll) this.currentController.validateAll();
        if (bound) {
            var bbox = this.currentController.getBounding();
            //note: the returned bbox is NOT zoomed
            this.currentController.moveBy(
                    Math.round(bound.x - bbox.x - bbox.width / 2),
                    Math.round(bound.y - bbox.y - bbox.height / 2),
                    true);
        }
        shape.style.visibility = "visible";
        this.removeAttributeNS(PencilNamespaces.p, "holding");

        this.ensureControllerInView();
        this.snappingHelper.updateSnappingGuide(this.currentController);
        DockingManager.enableDocking(this.currentController);

        this.invalidateEditors();
    }.bind(this));
};
Canvas.prototype.endFormatPainter = function () {
    Pencil._painterSourceTarget = null;
    Pencil._painterSourceProperties = null;
    Pencil.setPainterCommandChecked(false);
    return true;

};
Canvas.prototype.isFormatPainterAvailable = function () {

    return Pencil._painterSourceTarget && Pencil._painterSourceProperties;

};
Canvas.prototype.getPainterPropertyMap = function () {

    var ppm = Config.get("painterPropertyMap");
    if (ppm == null || ppm == "") {
        ppm = "fillColor,foreColor,textColor,strokeColor,borderColor,"
                + "strokeStyle,textAlign,textFont,shadowStyle,shadowColor,"
                + "withBlur,withShadow,textPadding,startFillColor,endFillColor"
        Config.set("painterPropertyMap", ppm);
    }
    return ppm.split(",");

};
Canvas.prototype.startFakeMove = function (event) {

    this._button = 0;
    this.currentController = this.getSelectedTargets()[0];
    this.controllerHeld = true;

    this.oX = Math.round(event.clientX / this.zoom);
    this.oY = Math.round(event.clientY / this.zoom);
    this.oldPos = this.currentController.getGeometry();

    this.currentController.setPositionSnapshot();

//    OnScreenTextEditor._hide();

    this.setAttributeNS(PencilNamespaces.p, "p:holding", "true");
    this.reClick = false;

    this.hasMoved = false;
    this.lastTop = top;
    this._sayTargetChanged();

};
Canvas.prototype.checkDnDEventTimestamp = function (event) {

    var now = new Date().getTime();
    if (!this.lastDragEnterExitEventTS) {
        this.lastDragEnterExitEventTS = now;
        return true;
    }
    var delta = now - this.lastDragEnterExitEventTS;

    // debug("Even ts delta: " + delta);

    this.lastDragEnterExitEventTS = now;

    return delta > 500;


};

Canvas.prototype.__dragenter = function (event) {
    if (event.target == this.dragOverlay) return;
    if (this.element.getAttribute("is-dragover") == "true") return;
    this.element.setAttribute("is-dragover", "true");

    // debug("PCanvas: drag enter, " + event.originalTarget.localName);

    // find the first DO that accepts this drag session, use its for subsequence
    // events
    // in the same session

    this.currentDragObserver = null;
    for ( var i in this.dragObservers) {
        var observer = this.dragObservers[i];
        try {
            var accepted = nsDragAndDrop.dragEnter(event, observer);
            if (accepted) {
                this.currentDragObserver = observer;
                break;
            }
        } catch (e) {
            Console.dumpError(e);
        }
    }
};
Canvas.prototype.__dragleave = function (event) {
    // this.element.removeAttribute("p:selection");
    if (!this.currentDragObserver)
        return;
    try {
        nsDragAndDrop.dragExit(event, this.currentDragObserver);
    } catch (e) {
        Console.dumpError(e);
    }
    this.element.removeAttribute("is-dragover");
    this.element.removeAttribute("p:holding");
};
Canvas.prototype.__dragend = function (event) {
    this.element.removeAttribute("is-dragover");
    // debug("drag end...");

};
Canvas.prototype.__dragover = function (event) {
    if (!this.currentDragObserver)
        return;

    try {
        nsDragAndDrop.dragOver(event, this.currentDragObserver);
    } catch (e) {
        Console.dumpError(e);
    }

    /*
     *
     *
     * if (!this.currentDragProcessed) { tick("drag over");
     * this.lastAcceptedDragObserver = null; for (var i in this.dragObservers) {
     * var observer = this.dragObservers[i]; try { var accepted =
     * nsDragAndDrop.dragOver(event, observer); if (accepted) {
     * this.lastAcceptedDragObserver = observer; break; } } catch (e) {
     * Console.dumpError(e); } }
     *
     * this.currentDragProcessed = true; }
     *
     * if (this.hasDrag) { if (event.clientX != this._lastScreenX ||
     * event.clientY != this._lastScreenY) { this.handleMouseMove(event,
     * "fake"); this._lastScreenX = event.clientX; this._lastScreenY =
     * event.clientY; }
     *  }
     */

};
Canvas.prototype.__drop = function (event) {
    var thiz =this;
    var data = event.dataTransfer.getData("collectionId");
    var data = nsDragAndDrop.getData("collectionId");
    var collections = CollectionManager.shapeDefinition.collections;
    // for (var i = 0; i < collections.length; i ++) {
    //     if (collections[i].id == data) {
    //         var count = CollectionManager.getCollectionUsage(collections[i]);
    //         count++;
    //         CollectionManager.setCollectionUsage(collections[i], count);
    //     }
    // }
    this.element.removeAttribute("is-dragover");
    if (this.canvasContentModifiedListener) {
        this.canvasContentModifiedListener(thiz);
        this.canvasContentModifiedListener = null;
    }
    if (!this.currentDragObserver) {
        return;
    }

    try {
        nsDragAndDrop.drop(event, this.currentDragObserver);
    } catch (e) {
        Console.dumpError(e);
    }
};
