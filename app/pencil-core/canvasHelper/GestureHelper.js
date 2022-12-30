function GestureHelper(canvas) {
    this.canvas = canvas;
    this.canvas.gestureHelper = this;

    this.init();
}

GestureHelper.prototype.init = function () {
    var thiz = this;
    this.heldKeyCodes = [];

    this.canvas.registerEventHook({
        mousedown: this._handleGenericEvent.bind(this),
        mousemove: this._handleGenericEvent.bind(this),
        mouseup: this._handleGenericEvent.bind(this)
    });

    this.canvas.focusableBox.addEventListener("keydown", function (event) {
        if (thiz.heldKeyCodes.indexOf(event.keyCode) >= 0) return;

        thiz.heldKeyCodes.push(event.keyCode);
        thiz.updateKeyCodes();
    }, false);

    this.canvas.focusableBox.addEventListener("keyup", function (event) {
        var index = thiz.heldKeyCodes.indexOf(event.keyCode);
        if (index < 0) return;

        thiz.heldKeyCodes.splice(index, 1);
        thiz.updateKeyCodes();
    }, false);

    this.canvas.focusableBox.addEventListener("blur", function (event) {
        thiz.heldKeyCodes.length = 0;
        thiz.updateKeyCodes();
    }, false);

    // sample registry
    this.gestureRegistry = {
        keys: {
            "R": {
                type: "Shape",
                defId: "dgthanhan.MaterialDesktopMockup:rectangle"
            }
        }
    };
};
GestureHelper.prototype._handleGenericEvent = function (event) {
    var activeMode = this.getActiveMode();
    if (!activeMode) return false;
    var f = activeMode[event.type];
    if (!f) return false;
    return f.call(activeMode, event, this.canvas);
};

GestureHelper.prototype.updateKeyCodes = function () {
    if (!GestureHelper._output) {
        GestureHelper._output = document.createElement("div");
        ApplicationPane._instance.contentHeader.appendChild(GestureHelper._output);
    }

    this.activeGestureDef = null;

    for (var code of this.heldKeyCodes) {
        var c = String.fromCharCode(code);
        this.activeGestureDef = this.gestureRegistry.keys[c];
        if (this.activeGestureDef) break;
    }

    GestureHelper._output.innerHTML = this.heldKeyCodes.join(", ") + ":" + this.heldKeyCodes.map(c => {return String.fromCharCode(c)}).join(", ");
};

GestureHelper.fromCanvas = function (canvas) {
    return canvas.gestureHelper;
};

Canvas.registerLifeCycleListener({
    onNewInstance: function (canvas) {
        new GestureHelper(canvas);
    }
});

GestureHelper.prototype.setActiveModeId = function (id) {
    if (!id) {
        GestureHelper.activeMode = null;
    } else {
        for (var m of GestureHelper.MODES) {
            if (m.id == id) {
                GestureHelper.activeMode = m;
                break;
            }
        }
    }

    if (GestureHelper.activeMode) {
        ApplicationPane._instance.getCanvasContainer().setAttribute("gesture-mode", GestureHelper.activeMode.id);
    } else {
        ApplicationPane._instance.getCanvasContainer().removeAttribute("gesture-mode");
    }

    this.canvas.invalidateEditors();
};
GestureHelper.prototype.getActiveModeId = function (id) {
    return GestureHelper.activeMode && GestureHelper.activeMode.id;
};
GestureHelper.prototype.getActiveMode = function (id) {
    return GestureHelper.activeMode;
};
GestureHelper.prototype.getPropertyProvider = function () {
    var mode = this.getActiveMode();
    return mode && mode.getPropertyProvider && mode.getPropertyProvider();
};
GestureHelper.BASE_MODE = {

};
GestureHelper.BASE_SHAPE_MODE = Object.assign({
    _initPropertyProvider: function () {
        this._propertyDefMap = {};
        this._propertyValueMap = {};

        var def = CollectionManager.shapeDefinition.locateDefinition(this.activeShapeDef.defId);
        for (var name in def.propertyMap) {
            var propDef = def.propertyMap[name];
            this._propertyDefMap[name] = propDef;
        }

        var thiz = this;
        this._propertyProvider = {
            def: def,
            getProperty: function (name) { return thiz._propertyValueMap[name]; },
            setProperty: function (name, value) { thiz._propertyValueMap[name] = value; },
            storeProperty: function (name, value) { thiz._propertyValueMap[name] = value; },
            evalExpression: Shape.prototype.evalExpression,
            applyBehaviorForProperty: function () {},
            getGeometry: function () {
                return null;
            },
            getPropertyGroups: function () {
                return def.propertyGroups;
            },
            geometryUnsupported: true,
            getProperties: function () {
                return thiz._propertyValueMap;
            }
        };

        Shape.prototype.setInitialPropertyValues.call(this._propertyProvider, null);
    },
    getPropertyProvider: function () {
        if (!this._propertyProvider) this._initPropertyProvider();

        return this._propertyProvider;
    }
}, GestureHelper.BASE_MODE);
GestureHelper.MODES = [
    {
        id: "selection",
        name: "Select",
        uiIconName: "north_west",
        mousedown: function (event, canvas) {
            return false;
        },
        mouseup: function (event, canvas) {
            return false;
        },
        getPropertyProvider: function () {
            return null;
        }
    },
    Object.assign({
        id: "rectangle",
        name: "Rectangle",
        uiIconName: "crop_landscape",
        mousedown: function (event, canvas) {
            var def = CollectionManager.shapeDefinition.locateDefinition(this.activeShapeDef.defId);
            console.log(def);
            var loc = canvas.getEventLocation(event, true);
            canvas.insertShape(def);

            var controller = canvas.currentController;
            for (var name in this._propertyValueMap) {
                controller.setProperty(name, this._propertyValueMap[name]);
            }

            var bbox = controller.getBoundingRect();
            controller.moveBy(loc.x, loc.y, true);
            controller.setProperty("box", new Dimension(0, 0));

            canvas.selectShape(controller.svg);
            this.active = true;
            var thiz = this;
            window.setTimeout(function () {
                if (!thiz.active) {
                    if (controller && controller.svg) controller.svg.parentNode.removeChild(controller.svg);
                    canvas.selectNone();
                    return;
                }
                canvas.geometryEditor.handleMouseDown(event);
                canvas.geometryEditor.currentAnchor = canvas.geometryEditor.anchor4;
            }.bind(this), 10);

            return true;
        },
        mouseup: function (event, canvas) {
            this.active = false;
            return false;
        },
        activeShapeDef: {
            type: "Shape",
            defId: "dgthanhan.MaterialDesktopMockup:rectangle"
        }
    }, GestureHelper.BASE_SHAPE_MODE),
    Object.assign({
        id: "line",
        name: "Line",
        uiIconName: "horizontal_rule",
        active: false,
        mousedown: function (event, canvas) {
            var def = CollectionManager.shapeDefinition.locateDefinition(this.activeShapeDef.defId);
            var controlInfo = this._findControlInfo(def);
            if (!controlInfo) return false;

            var handleEditor = null;
            canvas.onScreenEditors.forEach(function (e) {
                if (e instanceof HandleEditor) handleEditor = e;
            });

            if (!handleEditor) return false;

            this.active = true;
            this.handleEditor = handleEditor;
            this.controlInfo = controlInfo;
            this.def = def;
            this.startLoc = canvas.getEventLocation(event, true);
            this.inserted = false;
            canvas.selectNone();

            return true;
        },
        _insertShape: function (event, canvas) {
            var loc = canvas.getEventLocation(event, true);
            canvas.insertShape(this.def);

            var controller = canvas.currentController;
            for (var name in this._propertyValueMap) {
                controller.setProperty(name, this._propertyValueMap[name]);
            }

            controller.moveBy(this.startLoc.x, this.startLoc.y, true);

            controller.setProperty(this.controlInfo.h1.name, new Handle(0, 0));
            controller.setProperty(this.controlInfo.h2.name, new Handle(loc.x - this.startLoc.x, loc.y - this.startLoc.y));

            canvas.selectShape(controller.svg);

            this.inserted = true;
            var thiz = this;

            window.setTimeout(function () {
                thiz.handleEditor.handleMouseDown(event, thiz.handleEditor.handleNodeMap[thiz.controlInfo.h2.name]);
            }.bind(this), 10);
        },
        mousemove: function (event, canvas) {
            const DELTA = 3;
            if (this.active && !this.inserted) {
                canvas.careTaker.pause();
                var loc = canvas.getEventLocation(event, true);
                if (Math.abs(loc.x - this.startLoc.x) > DELTA || Math.abs(loc.y - this.startLoc.y) > DELTA) {
                    this._insertShape(event, canvas);
                }

                return false;
            }

            if (this.active) {
                this.handleEditor.applyCurrentHandleValue();
            }
            return false;
        },
        mouseup: function (event, canvas) {
            if (this.active && this.inserted) {
                canvas.careTaker.resume();
                canvas.careTaker.save(this.name);
            }
            this.active = false;
            this.handleEditor = null;
            this.controlInfo = null;
            return false;
        },
        _findControlInfo: function (def) {
            var handles = [];
            for (var name in def.propertyMap) {
                var propDef = def.propertyMap[name];
                if (propDef.type == Handle && (!propDef.meta || typeof(propDef.meta.gesture) == "undefined" || propDef.meta.gesture)) {
                    handles.push(propDef);
                }
            }

            if (handles.length < 2) return null;
            handles.sort(function (a, b) {
                var oa = (a.meta && a.meta.gestureOrder) || 0;
                var ob = (b.meta && b.meta.gestureOrder) || 0;

                if (oa > ob) return 1;
                if (oa < ob) return -1;

                var xa = (a.initialValue && a.initialValue.x) || 0;
                var xb = (b.initialValue && b.initialValue.x) || 0;

                if (xa > xb) return 1;
                if (xa < xb) return -1;

                return 0;
            });

            return {
                h1: handles[0],
                h2: handles[1]
            };
        },
        activeShapeDef: {
            type: "Shape",
            defId: "evolus.QCTools:arrow2"
        }
    }, GestureHelper.BASE_SHAPE_MODE),
    Object.assign({
        id: "freehand",
        name: "Freehand",
        uiIconName: "draw",
        _appendPointFromEvent: function (loc) {
            const MIN = 10;
            var x = loc.x - this.startLoc.x;
            var y = loc.y - this.startLoc.y;
            if (this.lastLoc) {
                if (Math.abs(x - this.lastLoc.x) < MIN && Math.abs(y - this.lastLoc.y) < MIN) return false;
            }
            this.minX = Math.min(this.minX, x);
            this.maxX = Math.max(this.maxX, x);
            this.minY = Math.min(this.minY, y);
            this.maxY = Math.max(this.maxY, y);
            this._points.push([x, y]);

            this.lastLoc = {x: x, y: y};
            return true;
        },
        _generateProperties: function () {
            var map = {};
            var w = this.maxX - this.minX;
            var h = this.maxY - this.minY;

            map.data = new PlainText(JSON.stringify(this._points));
            map.box = new Dimension(w, h);

            return map;
        },
        mousedown: function (event, canvas) {
            var def = CollectionManager.shapeDefinition.locateDefinition(this.activeShapeDef.defId);
            this.startLoc = canvas.getEventLocation(event, true);
            this.minX = this.maxX = this.minY = this.maxY = 0;
            this._points = [];
            this._appendPointFromEvent(this.startLoc);

            canvas.careTaker.pause();
            canvas.insertShape(def);

            var controller = canvas.currentController;
            for (var name in this._propertyValueMap) {
                controller.setProperty(name, this._propertyValueMap[name]);
            }

            controller.moveBy(this.startLoc.x, this.startLoc.y, true);

            canvas.selectNone();

            this.active = true;
            this.controller = controller;
            this.def = def;
            this.generated = false;

            return true;
        },
        mousemove: function (event, canvas) {
            if (!this.active) return;
            var loc = canvas.getEventLocation(event, true);
            var accepted = this._appendPointFromEvent(loc);
            if (!accepted) return false;

            var map = this._generateProperties();
            this.controller.setProperty("box", map.box);
            this.controller.setProperty("originalDim", map.box);
            this.controller.setProperty("data", map.data);

            this.generated = true;

            return false;
        },
        mouseup: function (event, canvas) {
            if (!this.active) return;
            try {
                if (this.generated) {
                    var thiz = this;
                    this._points.forEach(function (p) {
                        p[0] = p[0] - thiz.minX;
                        p[1] = p[1] - thiz.minY;
                    });
                    var map = this._generateProperties();
                    this.controller.setProperty("box", map.box);
                    this.controller.setProperty("originalDim", map.box);
                    this.controller.setProperty("data", map.data);

                    this.controller.moveBy(this.minX, this.minY, true);
                    canvas.selectShape(this.controller.svg);
                } else {
                    this.controller.svg.parentNode.removeChild(this.controller.svg);
                    canvas.selectNone();
                }

                this.active = false;
                return false;
            } catch (e) {

            } finally {
                canvas.careTaker.resume();
                canvas.careTaker.save(this.name);
            }
        },
        activeShapeDef: {
            type: "Shape",
            defId: "Evolus.Common:FreehandPath"
        }
    }, GestureHelper.BASE_SHAPE_MODE),
    Object.assign({
        id: "text",
        name: "Text",
        uiIconName: "title",
        mousedown: function (event, canvas) {
            var def = CollectionManager.shapeDefinition.locateDefinition(this.activeShapeDef.defId);
            var propDef = null;
            for (var name in def.propertyMap) {
                var p = def.propertyMap[name];
                if (p.type == PlainText || p.type == RichText) {
                    propDef = p;
                    break;
                };
            }

            if (!propDef) return false;

            this.propDef = propDef;

            var loc = canvas.getEventLocation(event, true);
            canvas.careTaker.pause();
            canvas.insertShape(def);

            var controller = canvas.currentController;
            for (var name in this._propertyValueMap) {
                controller.setProperty(name, this._propertyValueMap[name]);
            }

            controller.setProperty(propDef.name, propDef.type.fromString(""));

            var bbox = controller.getBoundingRect();
            controller.moveBy(loc.x, loc.y, true);
            controller.setProperty("box", new Dimension(0, 0));

            canvas.selectShape(controller.svg);
            this.active = true;
            var thiz = this;
            window.setTimeout(function () {
                if (!thiz.active) {
                    if (controller && controller.svg) controller.svg.parentNode.removeChild(controller.svg);
                    canvas.selectNone();
                    return;
                }
                canvas.geometryEditor.handleMouseDown(event);
                canvas.geometryEditor.currentAnchor = canvas.geometryEditor.anchor4;
            }.bind(this), 10);

            return true;
        },
        mouseup: function (event, canvas) {
            canvas.careTaker.resume();
            if (this.active) {
                Dom.emitEvent("p:TextEditingRequested", canvas.element, {
                    controller : canvas.currentController
                });
            }
            this.active = false;
            return false;
        },
        activeShapeDef: {
            type: "Shape",
            defId: "dgthanhan.MaterialDesktopMockup:textview"
        }
    }, GestureHelper.BASE_SHAPE_MODE)
];
GestureHelper.activeMode = GestureHelper.MODES[0];

GestureHelper._getSvgPathFromStroke = function (stroke) {
    if (!stroke.length) return ''

    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length]
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
            return acc
        },
        ['M', ...stroke[0], 'Q']
    )

    d.push('Z')
    return d.join(' ')
};
GestureHelper.getSvgPathFromStroke = function (json, options) {
    var points = JSON.parse(json);
    return GestureHelper._getSvgPathFromStroke(freehand.getStroke(points, options));
};
