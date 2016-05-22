var vectorModel = new VectorModel();

var doNoFireClick = false;
function Animator() {
    // controller for animation objects.
    var self = this;
    var intervalRate = 20;
    this.tweenTypes = {
        // % of total distance to move per-frame, total always = 100
        'default' : [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 ],
        'blast' : [ 12, 12, 11, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 ],
        'linear' : [ 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 ]
    }
    this.queue = [];
    this.queueHash = [];
    this.active = false;
    this.timer = null;
    this.createTween = function(start, end, type) {
        // return array of tween coordinate data (start->end)
        type = type || 'default';
        var tween = [ start ];
        var tmp = start;
        var diff = end - start;
        var x = self.tweenTypes[type].length;
        for (var i = 0; i < x; i++) {
            tmp += diff * self.tweenTypes[type][i] * 0.01;
            tween[i] = {};
            tween[i].data = tmp;
            tween[i].event = null;
        }
        return tween;
    };

    this.enqueue = function(o, fMethod, fOnComplete) {
        // add object and associated methods to animation queue
        // writeDebug('animator.enqueue()');
        if (!fMethod) {
            // writeDebug('animator.enqueue(): missing fMethod');
        }
        self.queue.push(o);
        o.active = true;
    };

    this.animate = function() {
        // interval-driven loop: process queue, stop if done
        var active = 0;
        for (var i = 0, j = self.queue.length; i < j; i++) {
            if (self.queue[i].active) {
                self.queue[i].animate();
                active++;
            }
        }
        if (active == 0 && self.timer) {
            // all animations finished
            // writeDebug('Animations complete');
            self.stop();
        } else {
            // writeDebug(active+' active');
        }
    };

    this.start = function() {
        if (self.timer || self.active) {
            // writeDebug('animator.start(): already active');
            return false;
        }
        // writeDebug('animator.start()');
        // report only if started
        self.active = true;
        self.timer = setInterval(self.animate, intervalRate);
    };

    this.stop = function() {
        // writeDebug('animator.stop()',true);
        // reset some things, clear for next batch of animations
        clearInterval(self.timer);
        self.timer = null;
        self.active = false;
        self.queue = [];
    };

};

var animator = new Animator();

function Animation(oParams) {
    // Individual animation sequence
    /*
     * oParams = { from: 200, to: 300, tweenType: 'default', // see
     * animator.tweenTypes (optional) ontween: function(value) { ... }, //
     * method called each time (required) oncomplete: function() { ... } // when
     * finished (optional) }
     */
    var self = this;
    if (typeof oParams.tweenType == 'undefined') {
        oParams.tweenType = 'default';
    }
    this.ontween = (oParams.ontween || null);
    this.oncomplete = (oParams.oncomplete || null);
    this.tween = animator.createTween(oParams.from, oParams.to,
            oParams.tweenType);
    this.frameCount = animator.tweenTypes[oParams.tweenType].length;
    this.frame = 0;
    this.active = false;

    this.animate = function() {
        // generic animation method
        if (self.active) {
            if (self.ontween && self.tween[self.frame]) {
                self.ontween(self.tween[self.frame].data);
            }
            if (self.frame++ >= self.frameCount - 1) {
                // writeDebug('animation(): end');
                self.active = false;
                self.frame = 0;
            if (self.oncomplete) {
                    self.oncomplete();
                }
                return false;
            }
            return true;
        } else {
            return false;
        }
    };

    this.start = function() {
        // add this to the main animation queue
        animator.enqueue(self, self.animate, self.oncomplete);
        if (!animator.active) {
            animator.start();
        }
    };

    this.stop = function() {
        self.active = false;
    };

};

widget.MapView = function() {
    
    function calculateTouchesDistance(touches) {
        var dx = touches[0].screenX - touches[1].screenX;
        var dy = touches[0].screenY - touches[1].screenY;
        
        return Math.sqrt(dx * dx + dy * dy);
    };
    
    function handleMultiTouchMove(event) {
        if (event.touches.length != 2
                || !MapView.heldInstance
                || !MapView.heldInstance.p2z.originals){
            return;
        }
        Dom.cancelEvent(event);
        
        var thiz = MapView.heldInstance;
        
        var d0 = calculateTouchesDistance(thiz.p2z.originals);
        var d1 = calculateTouchesDistance(event.touches);
        
        if (d0 == 0) return;
        var d = Math.abs(d1 - d0);
        if (d < 10) return;
        
        var f = d1 / d0;
        if (isNaN(f)) return;
        
        var r = thiz.ratio * f;
        if (r < thiz.minZoom || r > thiz.maxZoom) {
            return;
        }
        
        var oa = Dom.getTouchOffset(thiz.p2z.originals[0], thiz.container);
        var ob = Dom.getTouchOffset(thiz.p2z.originals[1], thiz.container);
        var ox = (oa.x + ob.x) / 2;
        var oy = (oa.y + ob.y) / 2;

        var dx = (ox - thiz.X) * (f - 1);
        var dy = (oy - thiz.Y) * (f - 1);
        
        if (isNaN(dx) || isNaN(dy)) return;

        thiz.ratio *= f;
        thiz.X -= dx;
        thiz.Y -= dy;
        
        thiz.invalidate();
        thiz.p2z.originals = event.touches;
    }
    
    function globalMouseMoveHandler(event) {
        if (MapView.heldInstance == null || typeof(MapView.heldInstance) == "undefined") {
           // //console..log("Held instance is null");
            return;
        }
        if (event.touches && event.touches.length != 1) {
            //console..log("Handle multitouch...");
            handleMultiTouchMove(event);
            return;
        }
        
        if (MapView.clickIndicator) {
            //console..log("click indicator");
            return;
        }
        Dom.cancelEvent(event);
        if (MapView.heldIndicator) {
            var dx = Dom.getEventScreenX(event) - MapView.navigatorViewIndicator._lastScreenX;
            var dy = Dom.getEventScreenY(event) - MapView.navigatorViewIndicator._lastScreenY;
            var newX = MapView.navigatorViewIndicator._x + dx;
            var newY = MapView.navigatorViewIndicator._y + dy;
            
            MapView.navigatorViewIndicator._lastScreenX = Dom.getEventScreenX(event);
            MapView.navigatorViewIndicator._lastScreenY = Dom.getEventScreenY(event);
            
            var containerBox = Dom.getBoundingClientRect(MapView.navigatorViewContainer);
            var indicatorBox = Dom.getBoundingClientRect(MapView.navigatorViewIndicator);
            var alpha = 5;
            if (newX <= -alpha) newX = -alpha;
            if (newY <= -alpha) newY = -alpha;
            if (newX + indicatorBox.width >= containerBox.width + alpha) newX = MapView.navigatorViewIndicator._x;
            if (newY + indicatorBox.height >= containerBox.height + alpha) newY = MapView.navigatorViewIndicator._y;
            
            MapView.navigatorViewIndicator.style.left = newX + "px"; 
            MapView.navigatorViewIndicator.style.top = newY + "px";
            MapView.navigatorViewIndicator._x = newX;
            MapView.navigatorViewIndicator._y = newY;
            MapView.heldIndicator.moveBy(newX, newY);
            return;
        }
        
        doNoFireClick = true;
        
        var dx = Dom.getEventScreenX(event) - MapView._lastScreenX;
        var dy = Dom.getEventScreenY(event) - MapView._lastScreenY;
        
        if (MapView.heldMovableObject) {
            MapView.heldMovableObject._object.x = MapView.heldMovableObject._ox + Math.round(dx / MapView.heldInstance.ratio);
            MapView.heldMovableObject._object.y = MapView.heldMovableObject._oy + Math.round(dy / MapView.heldInstance.ratio);
            MapView.heldInstance.invalidateObjectView(MapView.heldMovableObject);
            if (dx || dy) MapView.heldInstance.movableMoved = true;
        } else {
            MapView.heldInstance.panBy(dx, dy);
            MapView._lastScreenX = Dom.getEventScreenX(event);
            MapView._lastScreenY = Dom.getEventScreenY(event);
        }
    }
    
    function clickHandler(event) {
        var target = Dom.getTarget(event);
        var container = Dom.findParentWithClass(target, "MapView");
        if (!container) return;
        
        var mapView = container._mapView;
        
        if (mapView.focusedObjectView) {
            mapView.focus(mapView.focusedObjectView, false);
        }
        
        var objectView = Dom.findParentWithClass(target, "Object");
        if (!objectView) return;
        
        var groupedItemLink = Dom.findParentWithAttribute(target, "object-id");
        if (groupedItemLink && groupedItemLink.nodeName.toLowerCase() == "a") {
            Dom.cancelEvent(event);
            var id = groupedItemLink.getAttribute("object-id");
            var targetView = mapView.getViewById(id);
            objectView._object._showingGroupOverview = false;
            objectView._pop.data("bs.popover").options.content = objectView._object.content;
            objectView._pop.data("bs.popover").options.title = objectView._object.title;            
            mapView.setPopOverVisible(targetView, true, "closeAll");
            
            return;
        }
        
        mapView.focus(objectView, true);
    }
    
    function globalMouseUpHandler(event) {
        if (MapView.heldInstance) {
            Dom.removeClass(MapView.heldInstance.container, "Held");
        }          

        MapView.heldIndicator = null;
        MapView.clickIndicator = null;
        
        if (MapView.heldMovableObject && MapView.heldInstance.movableMoved) {
            MapView.heldInstance.movableMoved = false;
            Dom.emitEvent("moved", MapView.heldMovableObject, {});
        }
        
        MapView.heldInstance = null;
        MapView.heldMovableObject = null;
    }
    Dom.registerEvent(window, "load", function () {
        Dom.registerEvent(document, "mousemove", globalMouseMoveHandler, false);
        Dom.registerEvent(document, "touchmove", globalMouseMoveHandler, false);
        
        Dom.registerEvent(document, "mouseup", globalMouseUpHandler, false);
        Dom.registerEvent(document, "touchend", globalMouseUpHandler, false);
    }, false);
    
    
    function MapView(container, options) {
        this.X = 0;
        this.Y = 0;
        this.assets = [];
        this.container = widget.get(container);
        this.container._mapView = this;
        this.options = options || {};
        this.minZoom = options.minZoom || 0.04;
        this.maxZoom = options.maxZoom || 3.5;     
        this.objectViews = [];
        this.shownObjectId = null;
        this.canvas = document.createElement("div");
        this.imageContainer = document.createElement("div");
        this.svgCanvas = vectorModel.createElement('svg');
        this.image = this.options.mapImage;
        this.container.appendChild(this.imageContainer);
        this.container.setAttribute("tabindex", "0");
        
        //shadow overlay
        var shadowOverlay = document.createElement("div");
        this.container.appendChild(shadowOverlay);
        Dom.addClass(shadowOverlay, "ShadowOverlay");
        
        this.imageContainer.appendChild(this.image);
        this.container.appendChild(this.canvas);
        this.mode = this.options.mode ? this.options.mode : null; 
        Dom.addClass(this.canvas, "Canvas");
        Dom.addClass(this.imageContainer, "Canvas");
        Dom.addClass(this.container, "MapView");
        
        this._isAnimateXDone = true;
        this._isAnimateYDone = true;
        Dom.addClass(this.image, "Image");
        Dom.addClass(this.image, "Unselectable");
        this.image.setAttribute("draggable", false);
        this.image.ondragstart = function() {return false;}
        
        this.originalImageWidth = this.image.width;
        this.originalImageHeight = this.image.height;

        this.targetContainer = document.createElement("div");
        Dom.addClass(this.targetContainer, "ObjectContainer");
        this.canvas.appendChild(this.targetContainer);
        
        this.svgCanvas.setAttribute("width", "100%");
        this.svgCanvas.setAttribute("height", "100%");
        this.targetContainer.appendChild(this.svgCanvas);
        
        this.ratio = this.options.initialRatio || 1;
        this._invalidateZoomLevel();
        
        var ARROW_PAN_DISTANCE = 20;
        var thiz = this;
        
        this.navigationControlContainer = Dom.newDOMElement({
            _name: "div",
            "class": "NavigationControlContainer",
            _children: [{
                _name: "div",
                "class": "PanContainer",
                _children: [{
                    _name: "div",
                    "class": "PanContainerInner",
                    _children: [{
                        _name: "button",
                        type: "button",
                        "class": "Left",
                        _children: [{_name: "span", "class": "fa fa-chevron-left"}],
                        _id: "leftNavButton"
                            
                    },{
                        _name: "button",
                        type: "button",
                        "class": "Up",
                        _children: [{_name: "span", "class": "fa fa-chevron-up"}],
                        _id: "upNavButton"
                    },{
                        _name: "button",
                        type: "button",
                        "class": "Down",
                        _children: [{_name: "span", "class": "fa fa-chevron-down"}],
                        _id: "downNavButton"
                    },{
                        _name: "button",
                        type: "button",
                        "class": "Right",
                        _children: [{_name: "span", "class": "fa fa-chevron-right"}],
                        _id: "rightNavButton"
                    }]
                }]
            }, {
                _name: "div",
                "class": "ZoomContainer",
                _children: [{
                    _name: "button",
                    type: "button",
                    "class": "In",
                    _children: [{_name: "span", "class": "fa fa-search-plus"}],
                    _id: "zoomInNavButton"
                },{
                    _name: "button",
                    type: "button",
                    "class": "Out",
                    _children: [{_name: "span", "class": "fa fa-search-minus"}],
                    _id: "zoomOutNavButton"
                }]
            }]
        }, document, this);
        
        Dom.registerEvent(this.leftNavButton, "click", function () {
            thiz.panBy(ARROW_PAN_DISTANCE, 0);
        });
        Dom.registerEvent(this.rightNavButton, "click", function () {
            thiz.panBy(0 - ARROW_PAN_DISTANCE, 0);
        });
        Dom.registerEvent(this.upNavButton, "click", function () {
            thiz.panBy(0, ARROW_PAN_DISTANCE);
        });
        Dom.registerEvent(this.downNavButton, "click", function () {
            thiz.panBy(0, 0 - ARROW_PAN_DISTANCE);
        });
        Dom.registerEvent(this.zoomInNavButton, "click", function () {
            thiz.tryZoomBy(1.2, true);
        });        
        Dom.registerEvent(this.zoomOutNavButton, "click", function () {
            thiz.tryZoomBy(1 / 1.2, true);
        });        
        this.container.appendChild(this.navigationControlContainer);
        
    
        
        this.p2z = {};
        
        Dom.registerEvent(this.container, "wheel", function wheelHandler(event) { thiz.onWheel(event); }, false);
        
        var handleMouseDown = function (event) {
            if (!event.touches || event.touches.length == 1) {
                //Dom.cancelEvent(event);
                //console..log("Set held instance", event);
                MapView.heldInstance = thiz;
                Dom.addClass(thiz.container, "Held");
                MapView._lastScreenX = Dom.getEventScreenX(event);
                MapView._lastScreenY = Dom.getEventScreenY(event);
                
                var target = Dom.getTarget(event);
                var movableObject = Dom.findParentWithClass(target, "MovableObject");
                MapView.heldMovableObject = movableObject;
                if (movableObject) {
                    movableObject._ox = movableObject._object.x;
                    movableObject._oy = movableObject._object.y;
                    this.movableMoved = false;
                }
            } else {
                if (event.touches && event.touches.length == 2) {
                    //start tracking pinch-to-zoom
                    thiz.p2z.originals = event.touches;
                    //console..log(event.touches);
                }
            }
        };
        
        var handleKeyPress = function (event) {
            var event = Dom.getEvent(event);
            var panDistance = ARROW_PAN_DISTANCE;
            if (event.shiftKey) panDistance *= 5;
            var handled = true;
            
            if (event.keyCode == 40) { //down
                thiz.panBy(0, 0 - panDistance);
                
            } else if (event.keyCode == 39) { //right
                thiz.panBy(0 - panDistance, 0);
                
            } else if (event.keyCode == 38) { //up
                thiz.panBy(0, panDistance);
                
            } else if (event.keyCode == 37) { //left
                thiz.panBy(panDistance, 0);
                
            } else if (event.keyCode == 187) { //+
                thiz.tryZoomBy(1.2, true);
                
            } else if (event.keyCode == 189) { //-
                thiz.tryZoomBy(1 / 1.2, true);
                
            } else {
                handled = false;
            }
            
            if (handled) Dom.cancelEvent(event);
        };
        
        Dom.registerEvent(this.container, "mousedown", handleMouseDown, false);
        Dom.registerEvent(this.container, "touchstart", handleMouseDown, false);
        Dom.registerEvent(this.container, "keydown", handleKeyPress, false);
        
        Dom.registerEvent(this.container, "mousemove", function (event) {
            Dom.cancelEvent(event);
            var pos = Dom.getEventOffset(event, thiz.container);
            thiz._lastOffsetX = pos.x;
            thiz._lastOffsetY = pos.y;
        }, false);
        
        Dom.registerEvent(this.container, "click", clickHandler, false);
        
        //creating the navigator view
        var nw = 80;
        this.navigatorViewIndicatorWidth = nw;
        var nh = Math.round(this.originalImageHeight * nw / this.originalImageWidth);
        this.navigatorViewIndicatorHeight = nh;
        
        this.navigatorViewContainerWrapper = document.createElement("div");
        Dom.addClass(this.navigatorViewContainerWrapper, "NavigatorViewContainerWrapper");
        this.container.appendChild(this.navigatorViewContainerWrapper);
        this.navigatorViewContainerWrapper.style.width = (nw + 20) + "px";
        this.navigatorViewContainerWrapper.style.height = (nh + 20) + "px";
        
        this.navigatorViewContainer = document.createElement("div");
        MapView.navigatorViewContainer = this.navigatorViewContainer;
        Dom.addClass(this.navigatorViewContainer, "NavigatorViewContainer");
        this.navigatorViewContainerWrapper.appendChild(this.navigatorViewContainer);
        this.navigatorViewContainer.style.width = nw + "px";
        this.navigatorViewContainer.style.height = nh + "px";
        this.navigatorViewContainer.appendChild(this.image.cloneNode());
        Dom.registerEvent(this.navigatorViewContainer, "mousedown", function(event) {
            Dom.cancelEvent(event);
            if (MapView.heldIndicator) return;
            MapView.clickIndicator = thiz;
        }, false);
        
        this.navigatorViewIndicator = document.createElement("div");
        this.navigatorViewIndicator.style.position = "absolute";
        
        MapView.navigatorViewIndicator = this.navigatorViewIndicator;
        Dom.addClass(this.navigatorViewIndicator, "NavigatorViewIndicator");
        this.navigatorViewContainer.appendChild(this.navigatorViewIndicator);
        Dom.registerEvent(this.navigatorViewIndicator, "mousedown", function(event){
            
            Dom.cancelEvent(event);
            
            thiz.navigatorViewIndicator._lastScreenX = Dom.getEventScreenX(event);
            thiz.navigatorViewIndicator._lastScreenY = Dom.getEventScreenY(event);
            thiz.navigatorViewIndicator._x = parseInt(thiz.navigatorViewIndicator.style.left.replace("px", ""), 10);
            thiz.navigatorViewIndicator._y = parseInt(thiz.navigatorViewIndicator.style.top.replace("px", ""), 10);
            MapView.heldIndicator = thiz;
            MapView.navigatorViewIndicator = thiz.navigatorViewIndicator;
        }, false);
        
        this.fillSyle = [];
        this.outlineStyle = [];
        
        this.fillSyle["DIAGONAL_STRIPE"] = fillDiagonalStripePattern;
        this.fillSyle["GRID"] = fillGridPattern;
        this.fillSyle["DOTS"] = fillDotsPattern;
        
        this.outlineStyle["DOTTED_LINES_LONG"] = "12, 1";
        this.outlineStyle["DOTTED_LINES_MEDIUM"] = "6, 1"; 
        this.outlineStyle["DOTTED_LINES_SHORT"] = "2, 1";
            
        this.invalidate();
        filterHover.call(this);
        
        $(this.targetContainer).on('shown.bs.popover', function (event) {
            //console.log("popup show on target container..")
            var popup = $(event.target).data("bs.popover").$tip[0];
            var px = Dom.getOffsetLeft(popup);
            var py = Dom.getOffsetTop(popup);
            var pw = Dom.getOffsetWidth(popup);
            var ph = Dom.getOffsetHeight(popup) + 25; //including the object icon below it
            
            var cx = Dom.getOffsetLeft(thiz.container);
            var cy = Dom.getOffsetTop(thiz.container);
            var cw = Dom.getOffsetWidth(thiz.container);
            var ch = Dom.getOffsetHeight(thiz.container);
            
            var PADDING = 30;
            
            var mx = 0;
            if (px < cx + PADDING) {
                mx = cx + PADDING - px;
            } else if (px + pw + PADDING > cx + cw) {
                mx = cx + cw - PADDING - pw - px;
            }
            
            var my = 0;
            if (py < cy + PADDING) {
                my = cy + PADDING - py;
            } else if (py + ph + PADDING > cy + ch) {
                my = cy + ch - PADDING - ph - py;
            }
            
            if (mx != 0 || my != 0) {
                thiz.animateMoveBy(mx, my, function () {});
            }
            thiz.invalidate();
        });
        widget.Util.registerGlobalListener({
            onZoneUpdated: function (zone, showZoneDetail) {
                var isUpdateMyZone = false;
                for (var index = 0; index < thiz.zones.length; index++) {
                    if (zone.id == thiz.zones[index].id) {
                        isUpdateMyZone = true;
                        break;
                    }
                }
                if (isUpdateMyZone) {
                    //reload all zone -- Bad idea....
                    thiz.closeAllPopOvers();
                    for (var index = 0; index < thiz.zones.length; index++) {
                       thiz.removeObject("zone" + thiz.zones[index].id);
                    }
                    
                    thiz.setAreaMap(thiz.map, thiz.areaId, showZoneDetail);
                }
            },
            onAssetUpdated: function(asset) {
                //console..log("Asset updated...");
            }             
        });
    }
        
    function fillGridPattern(color, thiz) {
        var patternId = "pattern" + widget.random();
        var pattern = vectorModel.createElement("pattern");
        if (!pattern) return;
        
        pattern.setAttribute("width", "5");
        pattern.setAttribute("height", "5");
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        
        var path = vectorModel.createElement("path");
        path.setAttribute("d", "M 8 0 L 0 0 0 8");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "1");
        
        pattern.appendChild(path);
        
        var defs = thiz.svgCanvas.querySelector("defs") ||
                thiz.svgCanvas.insertBefore( vectorModel.createElement("defs"), thiz.svgCanvas.firstChild);
        defs.appendChild(pattern);
        
        return patternId;
    }
    
    function fillDiagonalStripePattern(color, thiz) {
        var patternId = "pattern" + widget.random();
        var pattern = vectorModel.createElement("pattern");
        if (!pattern) return;
        
        pattern.setAttribute("width", "10");
        pattern.setAttribute("height", "10");
        pattern.setAttribute("x", "0");
        pattern.setAttribute("y", "0");
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        pattern.setAttribute("patternTransform", "rotate(45)");
        
        var c = vectorModel.createElement("line");
        c.setAttribute("x1", "0");
        c.setAttribute("y1", "0");
        c.setAttribute("x2", "0");
        c.setAttribute("y2", "10");
        c.setAttribute("stroke", color);
        c.setAttribute("stroke-width", 1);
        pattern.appendChild(c);
        
        var defs = thiz.svgCanvas.querySelector("defs") ||
                thiz.svgCanvas.insertBefore( vectorModel.createElement("defs"), thiz.svgCanvas.firstChild);
        defs.appendChild(pattern);
        
        return patternId;
    }
    
    function fillDotsPattern(color, thiz) {
        var patternId = "pattern" + widget.random();
        var pattern = vectorModel.createElement("pattern");
        
        if (!pattern) return;
        
        pattern.setAttribute("width", "8");
        pattern.setAttribute("height", "8");
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        
        var rect = vectorModel.createElement("rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", "2");
        rect.setAttribute("height", "2");
        rect.setAttribute("fill", color);
        rect.setAttribute("strokeWidth", "1");
        
        pattern.appendChild(rect);
        
        var defs = thiz.svgCanvas.querySelector("defs") ||
                thiz.svgCanvas.insertBefore( vectorModel.createElement("defs"), thiz.svgCanvas.firstChild);
        defs.appendChild(pattern);
        
        return patternId;
    }
    
    function filterHover(thiz) {
        var filterId = "filterHover";
        var filter = vectorModel.createElement("filter");
        if (!filter) return;
        
        filter.setAttribute("id", filterId);
        
        var blend = vectorModel.createElement("feBlend");
        blend.setAttribute("in", "SourceGraphic");
//        blend.setAttribute("in2", "blurOut");
        blend.setAttribute("mode", "normal");
        
        
        var g = vectorModel.createElement("feGaussianBlur");
        g.setAttribute("result", "blurOut");
        g.setAttribute("in", "offOut");
        g.setAttribute("stdDeviation", "5");
        
        var offset = vectorModel.createElement("feOffset");
        offset.setAttribute("result", "offOut");
        offset.setAttribute("in", "SourceAlpha");
        
        filter.appendChild(offset);
        filter.appendChild(g);
        filter.appendChild(blend);
        
        var defs = this.svgCanvas.querySelector("defs") ||
                this.svgCanvas.insertBefore( vectorModel.createElement("defs"), this.svgCanvas.firstChild);
        defs.appendChild(filter);
    }
    MapView.addZonesToList = function (zone, list) {
        list.push(zone);
        if (zone.children) {
            for (var i = 0; i < zone.children.length; i ++) {
                MapView.addZonesToList(zone.children[i], list);
            }
        }
    }
    MapView.prototype.setNavigtorVisible = function(visible) {
        this.navigatorViewContainerWrapper.style.display = visible ? "block" : "none";
    }
    MapView.prototype.loadPassiveReaders = function(map) {
       // console.log("Load passive reader on map ", map);
    };
    MapView.prototype.loadMapExciters = function(map) {
        var thiz = this;
        $areaService.findExcitersOnMap(map.id, function (exciters) {
            //console..log("exciters:", exciters);
            
            for (var i = 0; i < exciters.length; i++) {
                var exciter = exciters[i];
                var ox = 0, oy = 0;
                if (map.origin) {
                    ox = map.origin.x;
                    oy = map.origin.y;
                }
                
                var image = CONTEXT_PATH + "/images/general_buttons/toggle_exciter.gif?t=123";
                var content = "<div class=\"MapPopupContent MapPopupContentExciter\">" +
                        "<div class=\"ImageContainer\"><img class=\"Icon\" style=\"visibility: hidden;\" onload=\"centerCrop(this);\" src=\"" + image + "\"/></div>" +
                        "<ul>";
                
                    content += "<li><strong>" + Messages["exciter_battery_state_exciterName"] + ":</strong> <span>" + Dom.htmlEncode(exciter.name) + "</span></li>";
                
                if (exciter.exciterTypeName) {
                    content += "<li><strong>" + Messages["type"] + "</strong> <span>" + Dom.htmlEncode(exciter.exciterTypeName) + "</span></li>";
                }
                
                content += "</ul></div>";
                
                var object = {
                        id: "exciter" + exciter.id,
                        title: exciter.name,
                        content: content,
                        primary: false,
                        exciter: exciter,
                        icon: image,
                        x: (exciter.point.x / map.xScale + ox),
                        y: (0 - exciter.point.y / map.yScale + oy),
                        onContentShown: function (object, p) {
                        }
                    };
                
                thiz.addObject(object);
            }
        });
    };
    MapView.prototype.setAreaMap = function(map, areaId, showZoneDetail) {
        if ("true" === getConfig(CURRENT_APP.toLowerCase(),"amw2_config_locator_show_exciter").smallValue) {
            this.loadMapExciters(map);
        }
        if ("true" === getConfig(CURRENT_APP.toLowerCase(),"amw2_config_locator_show_passive_readers").smallValue) {
            this.loadPassiveReaders(map);
        }
        if ("true" !== getConfig("locator", "show_zones").smallValue) return;
        
        
        var thiz = this;
        var objects = [];
        $areaService.getZonesInArea(_Long(areaId), function(result) {
            thiz.zones = result || [];
            thiz.map = map;
            thiz.areaId = areaId;
            
            if (!result) return;
            var zones = result;
            if (!zones || zones.length <= 0) return;
            
            
            
            for (var i = 0; i < zones.length; i++) {
                zones[i].children = [];
            }
            
            for (var i = 0; i < zones.length; i++) {
                var zone = zones[i];
                if (zone.parent) {
                    var parent = find(zones, function (z) { return z.id == zone.parent.id});
                    if (parent) {
                        parent.children.push(zone);
                    }
                }
            }
            
            var renderList = [];
            for (var i = 0; i < zones.length; i ++) {
                if (zones[i].parent) continue;
                MapView.addZonesToList(zones[i], renderList);
            }
            
            var statusIds = [];
            for (var i = 0; i < renderList.length; i++) {
                var zone = renderList[i];
                var ox = 0, oy = 0;
                if (map.origin) {
                    ox = map.origin.x;
                    oy = map.origin.y;
                }
                
                var image = CONTEXT_PATH + "/amw-im?entityType=zone&entityId=" + zone.id;
                var fallbackIcon = CONTEXT_PATH + zone.icon;
                var content = "<div class=\"MapPopupContent MapPopupContentZone\">" +
                        "<div class=\"ImageContainer\"><img class=\"Icon\" style=\"visibility: hidden;\" fallback-src=\"" + fallbackIcon  + "\" onerror=\"showFallback(this);\" onload=\"centerCrop(this);\" /></div>" +
                        "<ul>";
                if (zone.shortName) {
                    content += "<li><strong>" + Messages["zone_wizard_general_tab_zone_short_name_label"] + ":</strong> <span>" + Dom.htmlEncode(zone.shortName) + "</span></li>";
                }
                
                if (zone.parent) {
                    content += "<li><strong>" + Messages["zone_wizard_general_tab_parent_zone_label"] + ":</strong> <span>" + Dom.htmlEncode(zone.parent.name) + "</span></li>";
                }
                
                if (zone.zoneBusinessStatus) {
                    content += "<li><strong>" + Messages["common_property_label_zone_status"] + ":</strong> <span>" + Dom.htmlEncode(zone.zoneBusinessStatus.name) + "</span></li>";
                }
                if (zone.zoneTypes && zone.zoneTypes.length > 0) {
                    content += "<li><strong>" + Messages["type"] + ":</strong> <span>" + Dom.htmlEncode(zone.zoneTypes[0].name) + "</span></li>";
                }
                content += "<li><strong>" + Messages["last_updated"] + "</strong> <span>" + Dom.htmlEncode(DateUtil.transportToDisplay(zone.updated)) + "</span></li>";
                
                content += "</ul></div>" 
                if (showZoneDetail) {
                    content += "<div class=\"EditContainer\"><button type=\"button\" onclick=\"new GenericZoneEditorDialog().open(" + zone.id + ", false);\"" + " class=\"btn btn-default zone-edit-icon\"" +
                    		"title=\""+ Messages["view_zone_detail_title"]+"\">" + Messages["zone_detail_button"] + "</button></div>";
                }
                var points = zone.points;
                
                var maxX = -Number.MAX_VALUE;
                var maxY = -Number.MAX_VALUE;
                var minX = Number.MAX_VALUE;
                var minY = Number.MAX_VALUE;
                var newPoints = [];
                var sumX = 0;
                var sumY = 0;
                for (var p = 0 ; p < points.length; p++) {
                    var point = points[p];
                    if (point.x > maxX) {
                        maxX = point.x;
                    }
                    if (point.x < minX) {
                        minX = point.x;
                    }
                    if (point.y > maxY) {
                        maxY = point.y;
                    }
                    if (point.y < minY) {
                        minY = point.y;
                    }
                    var newPoint = {
                            x: (point.x / map.xScale + ox),
                            y: (0 - point.y / map.yScale + oy),
                    }
                    newPoints.push(newPoint);
                    sumX += newPoint.x;
                    sumY += newPoint.y;
                }
                var width = maxX - minX;
                var height = maxY - minY;
                var center = {x: sumX/points.length, y: sumY/points.length};
                
                var status = zone.zoneBusinessStatus;
                
                var object = {
                        id: "zone" + zone.id,
                        title: zone.name,
                        content: content,
                        points: newPoints,
                        primary: false,
                        zone: zone,
                        x: center.x,
                        y: center.y,
                        color: zone ? zone.color : "",
                        fallbackIcon: fallbackIcon,
                        onContentShown: function (object, p) {
                            var view = document.getElementById(p[0]._closeId);
                            if (!view) return;
                            var popover = view.parentNode;
                            var img = Dom.findDescendantWithClass(popover, "Icon");
                            var image = CONTEXT_PATH + "/amw-im?entityType=zone&entityId=" + object.zone.id + "&time=" + new Date().getTime();
                            img.setAttribute("src", image);
                        }
                    };
                if (status) {
                    object._statusId = status.id;
                    object.displayStyle = zone.originalZoneBusinessStatus.displayStyle;
                }
                
                thiz.addSVGObject(object);
               
            }
        }); //avoid loader message
    }
    MapView.prototype.onWheel = function(event) {
        Dom.cancelEvent(event);
        
        var f = 1.2;
        if (event.deltaY > 0) f = 1 / f;
        this.tryZoomBy(f);
    };
    
    MapView.prototype.tryZoomBy = function (f, useCenter) {
        var r = this.ratio * f;
        if (r < this.minZoom || r > this.maxZoom) {
            return;
        }
        var cx = useCenter ? Dom.getOffsetWidth(this.container) / 2 : this._lastOffsetX;
        var cy = useCenter ? Dom.getOffsetHeight(this.container) / 2 : this._lastOffsetY;
        var dx = (cx - this.X) * (f - 1);
        var dy = (cy - this.Y) * (f - 1);
        
        if (isNaN(dx) || isNaN(dy)) return;

        this.ratio *= f;
        this.X -= dx;
        this.Y -= dy;
        
        this.invalidate();
    };
    MapView.prototype._invalidateZoomLevel = function() {
        if (this.ratio < this.minZoom) {
            this.ratio = this.minZoom;
            return false;
        }
        if (this.ratio > this.maxZoom) {
            this.ratio = this.maxZoom;
            return false;
        }
        return true;
    }
    MapView.prototype.focus = function (view, focus) {
        
         if (!focus) {
             Dom.removeClass(view, "FocusedObject");
             view.blur();
             this.focusedObjectView = null;
         } else {
             Dom.addClass(view, "FocusedObject");
             view.focus();
             this.focusedObjectView = view;
         }
         
    }
    
    
    MapView.prototype.addSVGObject = function(object) {
        var points = object.points || [];
        if (points.length <= 0) return;
        
        var objectView = vectorModel.createElement("g");
        if (!objectView) return;
        var polygonView = vectorModel.createElement("path");
        if (!polygonView) return;
        //console..log("Add object view...");
        polygonView.setAttribute("pointer-events", "all");
        objectView._isSVG = true;
        objectView._object = object;
        
        objectView.setAttribute("class", "Zone Unselectable");
        
        
        objectView.appendChild(polygonView);
        objectView._polygonView = polygonView;
        
        var text = vectorModel.createElement("text");
        //console..log(text);
        if (text) {
            text.setAttribute("fill", "#000");
            text.setAttribute("x", object.x * this.ratio);
            text.setAttribute("y", object.y * this.ratio);
            text.setAttribute("text", object.title);
            text.setAttribute("pointer-events", "none");
            var textNode = document.createTextNode(object.title);
            text.appendChild(textNode);
            objectView.appendChild(text);
            objectView._textView = text;
        }
        //console..log("Befor done object view...");
        if (this.options.buildObjectView) this.options.buildObjectView(objectView);
        
        //console..log("Build done object view...");
        objectView._id = "pop_" + widget.random();
        this.svgCanvas.appendChild(objectView);
        this.objectViews.push(objectView);
        objectView._dataRelatedId = object.id || "";
        //console..log("Append done object view...");
        
        this.ensurePopOverCreated(objectView);
        //console..log("Ensurwe");
        try {
            this.invalidateObjectView(objectView);
        } catch (e) {
            //console..log("Invalidate object view failed", e);
        }
        //console..log("Add show listener object view...");
        this._addOnShowListener(objectView);
        
        var thiz = this;
        Dom.registerEvent(polygonView, "click", function(e){
            //console.log(e.target);
            if (doNoFireClick) {
                //console..log("Do not fire");
                doNoFireClick = false;
                return;
            }
            thiz.closeAllPopOvers();
            Dom.cancelEvent(e);
            var p = objectView._pop.data("bs.popover");
            objectView._pop.popover("show");
            
        });

        Dom.registerEvent(polygonView, "mouseover", function(){
            objectView.setAttribute("filter", "url(#filterHover)");
            if (polygonView.applyGradient) {
                var fill = polygonView.getAttribute("fill");
                polygonView.child = polygonView.applyGradient(new LinearGradient("filterHover", fill, "#777777", 180));
            }
            //objectView.setAttribute("fill", "url(#)");
        });
        Dom.registerEvent(polygonView, "mouseout", function(){
            objectView.setAttribute("filter", "none");
            if (polygonView.child) {
                var fill = polygonView.getAttribute("fill");
                polygonView.removeGradient(polygonView.child);
                polygonView.child = polygonView.applyGradient(new LinearGradient("filterOver", fill, fill, 90));
            }
        });
        var ds = object.displayStyle;
        if (!ds) return;
        //console.log("Loading", ds.fillStyle);
        var f = this.fillSyle[ds.fillStyle];
        var color = ds.fillColor ? ds.fillColor.toLowerCase() : "";
        if (color.length == 0 && object.color && object.color.length > 0) {
            //console..log(color, object.id);
            color = object.color;
        }
        
        var patternId = f ? f(color, this) : null;
        
        polygonView.setAttribute("stroke", ds.outlineColor);
        polygonView.setAttribute("fill", color);
        polygonView.setAttribute("stroke-dasharray", 
                this.outlineStyle[ds.outlineStyle] ? this.outlineStyle[ds.outlineStyle] : "");
        polygonView.setAttribute("strokeWidth", "2");
        
        if (!patternId) {
            //console.log("Could not created pattern", polygonView);
            return;
        }
        polygonView.style.fill = "url(#" + patternId + ")";
        //console.log("Added svg object");
    }
    MapView.prototype.removeObject = function(objectId, forceRemove, shouldRemove) {
        var view = this.getViewByDataRelatedId(objectId);
        if (!view) return;
        if (shouldRemove && !shouldRemove(view)) return;
        
        var index = this.objectViews.indexOf(view);
        if (index != -1 && forceRemove) {
            this.objectViews.splice(index, 1);
        }
        try {
            if (view._isSVG) {
                //console..log("removing...")
                this.svgCanvas.removeChild(view);
             } else {
                this.targetContainer.removeChild(view);
             }
        } catch (e) { }
    }
    MapView.prototype.removeAllObject = function (forced, shouldRemove) {
        this.closeAllPopOvers();
        var length = this.objectViews.length;
        for (var index = length - 1; index >= 0; index--) {
            var view = this.objectViews[index];
            var object = view._object;
            this.removeObject(object._isSVG ? ("zone" + object.id) : object.id, forced, shouldRemove);
        }
    }
    MapView.prototype.getIconUrl = function(url) {
//        if (url.indexOf("&") != -1) {
//            return url + "&time" + new Date().getTime();
//        }
        return url;
    };
    MapView.prototype.setMovable = function (objectView, movable) {
        objectView._object.movable = movable;
        if (movable) {
            Dom.addClass(objectView, "MovableObject");
            this.closeAllPopOvers();
        } else {
            Dom.removeClass(objectView, "MovableObject");
        }
    };
    MapView.prototype.addObject = function(object) {
        var view = this.getViewByDataRelatedId(object.id);
        if (view) {
            return;
        }
        var objectView = document.createElement("div");
        var counterId = ("title_" + widget.random());
        var businessStatusIcon = "";
        
        if (getConfig(CURRENT_APP.toLowerCase(), "amw2_config_locator_show_business_status_icons").smallValue == "true" && object.businessStatus) {
            businessStatusIcon = "<img src=\"" + CONTEXT_PATH + object.businessStatus.icon + "\" class=\"BusinessStatusIcon\"/>";
        }
        
        var image = object.icon && object.icon.length > 0 
        ? "<img class=\"ObjectIcon Unselectable NoInteraction\" src=\"" + this.getIconUrl(object.icon)
                + "\" fallback-src=\"" + (object.fallbackIcon ? object.fallbackIcon : "")  + "\" onerror=\"showFallback(this);\" />" : "";
        objectView.innerHTML = "<div class=\"ObjectInner\">" 
        + image 
        + "<span class=\"Title\" id=\""+ counterId + "\"></span>"
//        + "<img class=\"BusinessStatusIcon\" src=\"" + CONTEXT_PATH + "" +"\"/>"
        + businessStatusIcon
        + "</div>";
        
        objectView._object = object;
        objectView._counterId = counterId;
        
        Dom.addClass(objectView, "Object");
        if (object.movable) Dom.addClass(objectView, "MovableObject");
        if (object.extraClass) Dom.addClass(objectView, object.extraClass);
        
        this.targetContainer.appendChild(objectView);
        this.objectViews.push(objectView);
        
        if (this.options.buildObjectView) this.options.buildObjectView(objectView);
        
        objectView.style.position = "absolute";
        objectView._id = "pop_" + widget.random();
        objectView._dataRelatedId = object.id || "";
        objectView._type = "asset";
        
        this.invalidateObjectView(objectView);
        this._addOnShowListener(objectView);
        
        var thiz = this;
        if (!object.movable) {
            this.ensurePopOverCreated(objectView);
            this.setPopOverVisible(objectView, object.primary, "closeAll");
            Dom.registerEvent(objectView.firstChild, "click", function(e) {
                if (object.movable) return;
                if (doNoFireClick) {
                    doNoFireClick = false;
                    
                    if (objectView._type != "asset") return;
                }
                
                var target = Dom.getTarget(e);
                if (target.getAttribute("type") != null) {
                    return;
                }
                
                thiz.closeAllPopOvers();
    
                if (objectView.nearBy && objectView.nearBy.length > 0) {
                    //composing the list of grouped items
                    var html = "";
                    html += "<div class=\"GroupedObjectList\"><div class=\"ListTitle\">" + Messages["please_select_an_item_to_view_msg"]+ "</div>";
                    html += "<ul>";
                    var items = objectView.nearBy.slice();
                    items.unshift(objectView);
                    
                    for (var i = 0; i < items.length; i ++) {
                        html += "<li><a href=\"#\" object-id=\"" + items[i]._id + "\">" + Dom.htmlEncode(items[i]._object.title) + "</a></li>";
                    }
                    
                    html += "</ul></div>";
                    
                    var closeId = ("close_" + widget.random());
                    var titleElement = Dom.get(""+ objectView._counterId);
                    var options = {
                            animation: false,
                            content: html || "",
                            placement: getPlacement,
                            html: true,
                            title: Messages["multiple_items_label"],
                            container: objectView,
                            viewport: { selector: "body", padding: 0 },
                            template: '<div class="popover MapViewPopOver" role="tooltip"><button id="' + closeId
                            + '" type="button" class="close" owner-id="' + objectView._counterId + '" onclick="widget.MapView.closePopOver(this)"><span aria-hidden="true">&times;</span><span class="sr-only">' 
                            + Messages["close"]+ '</span></button><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
                            trigger: "manual"
                        };
                    var p = $(titleElement).popover(options).popover("show");
                } else {
                    var p = objectView._pop.data("bs.popover");
                    objectView._pop.popover("show");
                }
            });
        }
        this.invalidate();
    };
    MapView.prototype._addOnShowListener = function(objectView) {
        var thiz = this;
        $(objectView).on('shown.bs.popover', function () {
            thiz.shownObjectId = this._dataRelatedId;
            console.log("popup shown", thiz.shownObjectId)
        });
        $(objectView).on('hidden.bs.popover', function () {
            //console.log("Hidden ", this._dataRelatedId);
            thiz.shownObjectId = null;
        });
    }
   
    MapView.closePopOver = function (button) {
        var id = button.getAttribute("owner-id");
        $(Dom.get(id)).popover("hide");
    };
    MapView.prototype.closeAllPopOvers = function (doNotHideThisView) {
        for (var i = 0; i < this.objectViews.length; i ++) {
            var view = this.objectViews[i];
            if (doNotHideThisView != null && doNotHideThisView == view) continue;
            if (view._object.id == this.shownObjectId) {
                continue;
            }
            
            $(Dom.get(view._titleId)).popover("destroy");
            $(Dom.get(view._counterId)).popover("destroy");
            $(view).popover("hide");
            //console.log("Hide", view._object.id);
        }
    };
    MapView.prototype.getViewById = function(id) {
        for (var i = 0; i < this.objectViews.length; i ++) {
            if (this.objectViews[i]._id == id) {
                return this.objectViews[i];
            }
        }
        return null;
    }
    MapView.prototype.getViewByDataRelatedId = function(id) {
        for (var i = 0; i < this.objectViews.length; i ++) {
            if (this.objectViews[i]._dataRelatedId == id) {
                return this.objectViews[i];
            }
        }
        return null;
    }
    MapView.prototype.isVisible = function(objectView){
        if (objectView._isSVG) {
            return false;
        }
        var boundTop = Dom.getOffsetTop(this.container);
        var boundLeft = Dom.getOffsetLeft(this.container);
        var boundRight = boundLeft + Dom.getOffsetWidth(this.container);
        var boundBottom = boundTop + Dom.getOffsetHeight(this.container)
        var pos = {
            left: Dom.getOffsetLeft(objectView),
            top:  Dom.getOffsetTop(objectView),
            width: objectView.offsetWidth,
            height: objectView.offsetHeight
        };
        
        return boundTop < pos.top && boundLeft < pos.left && boundRight > (pos.left + pos.width) && boundBottom > (pos.top + pos.height);
        
    }
    function getPlacement(pop, element) {
        var pos = "top";
        element._popPlacement = pos;
        return pos;
    }
    MapView.prototype.ensurePopOverCreated = function (objectView) {
        if (objectView == null || objectView._pop) return;
        var object = objectView._object;
        var html = (typeof(object.content) == "function" ? object.content() : object.content);
        
        var closeId = ("close_" + widget.random());
        var titleId =  ("title_" + widget.random());
        var ownerId = widget.getId(objectView);
        objectView._opts = {
                animation: false,
                content: html || "",
                placement: getPlacement,
                html: true,
                title: object.title,
                container: objectView._isSVG ? this.targetContainer : objectView,
                viewport: null,
                template: '<div class="popover MapViewPopOver" role="tooltip"><button id="' + closeId
                + '" type="button" class="close" owner-id="' + ownerId + '" onclick="widget.MapView.closePopOver(this)"><span aria-hidden="true">&times;</span><span class="sr-only">' 
                + Messages["close"]
                +'</span></button><div class="arrow"></div><h3 class="popover-title" id="' + titleId +'"></h3><div class="popover-content"></div></div>',
                trigger: "manual"
            };
        var p = $(objectView).popover(objectView._opts);
        p.on("shown.bs.popover", function (e) {
            if (e.target != objectView) return;
            
            if (object.onContentShown) {
                object.onContentShown(object, p);
            }
        });
        objectView._closeId = closeId;
        objectView._titleId = titleId;
        objectView._pop = p;
    };
    MapView.prototype.setPopOverVisible = function (objectView, visible, closeAll) {
        //this.closeAllPopOvers(visible ? objectView : null);
        if (typeof(closeAll) != "undefined" || closeAll) {
            this.closeAllPopOvers(visible ? objectView : null); 
        }
        objectView._pop.popover(visible ? "show" : "hide");
    };
    
    MapView.prototype.invalidateObjectView = function (objectView) {
        ////console..log("Invalidate call")
        var object = objectView._object;
        if (!object) return;
        
        if (object.points && object.points.length > 0) {
            var points = object.points;
            
            var pointsData = "";
            for (var i=0; i < points.length; i++) {
                var point = points[i];
                if (i == 0) {
                   pointsData += "M " + (point.x * this.ratio) + " " + (point.y * this.ratio);
                } else {
                   pointsData += " L " +(point.x * this.ratio) + " " + (point.y * this.ratio);
                }
            }
            pointsData += " z";
            
            objectView._polygonView.setAttribute("d", pointsData);
            if (objectView._textView) {
                if (objectView._textView.getBBox) {
                    var bbox = null;
                    try {
                        bbox = objectView._textView.getBBox();
                    } catch (e) {
                        var node = objectView._textView;
                        bbox = {
                                 x: node.clientLeft,
                                 y: node.clientTop,
                                 width: node.clientWidth,
                                 height: node.clientHeight
                                };
                    }
                   
                    objectView._textView.setAttribute("x", objectView._object.x * this.ratio - (bbox.width / 2));
                    objectView._textView.setAttribute("y", objectView._object.y * this.ratio + (bbox.height / 2));
                } else {
                    objectView._textView.setAttribute("x", objectView._object.x * this.ratio - objectView._textView.clientWidth/2);
                    objectView._textView.setAttribute("y", objectView._object.y * this.ratio - objectView._textView.clientHeight/2);
                }
            }
        } else {
            objectView.style.left = (object.x * this.ratio) + "px";
            objectView.style.top = (object.y * this.ratio) + "px";
        }
        if (object && object.width) {
            objectView.style.width = (object.width * this.ratio) + "px";
        }
        if (object && object.height) {
            objectView.style.height = (object.height * this.ratio) + "px";
        }
        try {
            var view = document.getElementById(objectView._closeId);
            if (!view) return;
            var popover = view.parentNode;
            if (objectView._isSVG) {
                var x = object.x * this.ratio;
                var y = object.y * this.ratio;
                //console..log(x, y);
                var popoverHeight = Dom.getOffsetHeight(popover);
                var popoverWidth = Dom.getOffsetWidth(popover);
                var left = 0;
                var top = 0; 
                var position = objectView._popPlacement;
                //console..log("Popover", position, popoverWidth, popoverHeight);
                if ("top" == position) {
                    left = x - popoverWidth/2;
                    top = y - popoverHeight;
                } else if ("left" == position) {
                    left = x - popoverWidth;
                    top = y - popoverHeight/2;
                } else if ("right" == position) {
                    left = x;
                    top = y - popoverHeight/2;
                } else if ("bottom" == position) {
                    left = x - popoverWidth/2;
                    top = y;
                }
                popover.style.left = left + "px";
                popover.style.top = top + "px";
            }
                  
        } catch (e) {
            //console..log(e);
        }
    };
    
    MapView.prototype._invalidateObjectViews = function () {
        for (var i = 0; i < this.objectViews.length; i ++) {
            this.invalidateObjectView(this.objectViews[i]);
        }
        
//        if (this.focusedObjectView) {
//            $(this.focusedObjectView).popover("show");
//        }
    };
    MapView.prototype.getImage = function() {
        return this.image;
    }
    MapView.prototype.invalidate = function() {
        this._invalidateZoom();
        this._invalidateLocation();
    };
    
    MapView.prototype.setCenter = function() {
        if (this.container == null) return;
        var canvasBox = Dom.getBoundingClientRect(this.canvas);
        var top = (this.container.offsetHeight - canvasBox.height) / 2;
        var left = (this.container.offsetWidth - canvasBox.width) / 2;
        this.X = left;
        this.Y = top;
        this._invalidateLocation();
    };
    
    MapView.prototype._invalidateZoom = function() {
        var cw = (this.originalImageWidth * this.ratio);
        var ch = (this.originalImageHeight * this.ratio);
        
        var wpx = cw + "px";
        var hpx = ch + "px";
        
        this.image.style.width = wpx;
        this.image.style.height = hpx;
        
        this.canvas.style.width = wpx;
        this.canvas.style.height = hpx;
        
        this.imageContainer.style.width = wpx;
        this.imageContainer.style.height = hpx;
        

        try {
            var w = Math.round(Dom.getOffsetWidth(this.container) * Dom.getOffsetWidth(this.navigatorViewContainer) / cw);
            var h = Math.round(Dom.getOffsetHeight(this.container) * Dom.getOffsetHeight(this.navigatorViewContainer) / ch);
            
            this.navigatorViewIndicator.style.width = w + "px";
            this.navigatorViewIndicator.style.height = h + "px";
        } catch (e) {
            //console..log("Invalidate navigator", e);
        }
        
        //TODO: invalidate object locations (and possibly size)
        this._invalidateObjectViews();
    };
    
    MapView.prototype._invalidateImage = function() {
        //this.fixX_Y();
        try {
            this.imageContainer.style.top = this.Y + "px";
            this.imageContainer.style.left = this.X + "px";
        } catch (e) {
            //console..log("_invalidateImager", e);
        }
    }
    MapView.prototype._invalidateLocation = function() {
        try {
            this.canvas.style.top = this.Y + "px";
            this.canvas.style.left = this.X + "px";
        } catch (e) {
            //console..log("_invalidateLocation", e);
        }
        
        this._invalidateLocationForNavigator();
        this._invalidateImage();
        this._invalidateObjectViews();
        this._groupObjectViews();
    };
    MapView.prototype.reset = function() {
        this.closeAllPopOvers();
        this.removeAllObject();
        this.setNavigtorVisible(false);
        this.image.src = "";
        this.image.style.display = "none";
        Dom.empty(this.svgCanvas);
        this.objectViews = [];
        this.X = 0;
        this.Y = 0;
        this.assets = [];
    }
    
    MapView.prototype._findNearest = function(visibleViews, v) {
        var result = {
            view: null,
            distance: Number.MAX_VALUE
        };
        for (var i = 0; i < visibleViews.length; i ++) {
            var visibleView = visibleViews[i];
            if (visibleView._object.category != v._object.category) continue;
            
            //calculating the center of the group
            var x = visibleView._object.x;
            var y = visibleView._object.y;
            for (var k = 0; k < visibleView.nearBy.length; k ++) {
                x += visibleView.nearBy[k]._object.x;
                y += visibleView.nearBy[k]._object.y;
            }
            
            x /= (visibleView.nearBy.length + 1);
            y /= (visibleView.nearBy.length + 1);
            
            //distance to the center
            var dx = (x - v._object.x) * this.ratio;
            var dy = (y - v._object.y) * this.ratio;
            
            var d = Math.sqrt(dx * dx + dy * dy);
            
            if (d < result.distance) {
                result.view = visibleView;
                result.distance = d;
            }
        }
        
        return result;
    };
    
    MapView.prototype._groupObjectViews = function() {
        var views = [];
        for (var i = 0; i < this.objectViews.length; i++) {
            var view = this.objectViews[i];
            if (view._isSVG) continue;
            
            view.nearBy = [];
            view._process = false;
            views.push(view);
            
            Dom.removeClass(view, "Grouped");
            Dom.removeClass(view, "GroupLeader");
            Dom.removeClass(view, "GroupLeaderAlone");
        }
        
        var visibleViews = [];
        var THRESHOLD = 12;
        for (var i = views.length - 1; i >= 0; i--) {
            var view = views[i];
            var result = this._findNearest(visibleViews, view);
            if (result.view && result.distance < THRESHOLD) { //to close to an existing group, join
                result.view.nearBy.push(view);
                Dom.addClass(view, "Grouped");
                
                var title = Dom.get(""+ result.view._counterId);
                var count = result.view.nearBy.length + 1;
                if (title) {
                    title.innerHTML = "" + (count);
                }
                Dom.removeClass(result.view, "GroupLeaderAlone");
            } else {    //not close to any existing group, form a new group, initially alone.
                Dom.addClass(view, "GroupLeader");
                Dom.addClass(view, "GroupLeaderAlone");
                visibleViews.push(view);
            }
        }
    };

    MapView.prototype._invalidateLocationForNavigator = function () {
        if (MapView.heldIndicator) {
            return;
        }
        
        var cvWidth = Dom.getOffsetWidth(this.canvas);
        var cvHeight = Dom.getOffsetHeight(this.canvas);
        if (cvWidth == 0 || cvHeight == 0) return;
        
        //console..log("canvas ", cvWidth , ",", cvHeight);
        var nvWidth = Dom.getOffsetWidth(this.navigatorViewContainer);
        var nvHeight = Dom.getOffsetHeight(this.navigatorViewContainer);
        if (nvWidth == 0 || nvHeight == 0) return;
        //console..log("nv w ", nvWidth , ",", nvHeight);
        
        var x = Math.round((0 - this.X) / cvWidth * nvWidth);
        var y = Math.round((0 - this.Y) / cvHeight * nvHeight);
        
        //console..log("Set ", x , ",", y);
        try {
            this.navigatorViewIndicator.style.left = x + "px";
            this.navigatorViewIndicator.style.top = y + "px";
            this.navigatorViewIndicator._x = x;
            this.navigatorViewIndicator._y = y;
        } catch (e) {
            // TODO: handle exception
            //console..log(e);
        }
        try {
            var box = Dom.getBoundingClientRect(this.navigatorViewIndicator);
            this.navigatorViewIndicator._lastScreenX = box.left;
            this.navigatorViewIndicator._lastScreenY = box.top; 
        } catch (e) {
            //console..log(e);
        }
       
    };
    
    MapView.prototype.panBy = function (dx, dy) {
        if (isNaN(this.X)) {
            this.X = 0;
        }
        if (isNaN(this.Y)) {
            this.Y = 0;
        }

        var x = this.X + dx;
        var y = this.Y + dy;
        var containerBox = Dom.getBoundingClientRect(this.container);
        var canvasBox = Dom.getBoundingClientRect(this.canvas);
        var insideAlpha = 25;
        var outsideAlpha = 25;
        var limitedWidth = containerBox.width - canvasBox.width - insideAlpha;
        var limitedHeight = containerBox.height - canvasBox.height - insideAlpha;
        if (containerBox.width > canvasBox.width) {
            var minX = insideAlpha;
            var maxX = limitedWidth;
            if (x <= minX) x = minX;
            if (x >= maxX) x = maxX;
        } else {
            var maxX = outsideAlpha;
            var minX = limitedWidth; 
            if (x >= maxX) x = maxX;
            if (x <= minX) x = minX;
        }
        
        if (containerBox.height > canvasBox.height) {
            var minY = insideAlpha;
            var maxY = limitedHeight; 
            if (y <= minY) y = minY;
            if (y >= maxY) y = maxY;
        } else {
            var maxY = outsideAlpha;
            var minY = limitedHeight;
            if (y >= maxY) y = maxY;
            if (y <= minY) y = minY;
        }
        
        this.panTo(x, y);
    };
    MapView.prototype.panTo = function (x, y) {
        if (isNaN(x) || isNaN(y)) {
            //console..log("Can not pan to  ", x, y);
            return;
        }
        this.X = x;
        this.Y = y;
        this._invalidateLocation();
        //console..log("Pan to: " + this.X + "," + this.Y);
    };
    MapView.prototype.animateTo = function (view, callback) {
        if (!this._isAnimateXDone || !this._isAnimateYDone) {
            //console..log("Animate is execute");
            return;
        }
        
        if (this.focusedObjectView) {
            this.focus(this.focusedObjectView, false);
        }
         this.focus(view, true);
        if (this.isVisible(view)) {
            //console..log("View is visible" + view._object.id);
            if (callback) {
                callback(true);
            }
            return;
        }
        
        var object = view._object;
        var x = object.x * this.ratio;
        var y = object.y * this.ratio;
        var W = Dom.getOffsetWidth(this.container);
        var H = Dom.getOffsetHeight(this.container);
        var nx = W/2 - x;
        var ny = H/2 - y;
        var dx = nx - this.X;
        var dy = ny - this.Y;
        //console..log("X,Y    " + this.X + "," + this.Y);
        //console..log("NX,NY    " + nx + "," + ny);
        if (Math.floor(this.X) == Math.floor(nx) && Math.floor(this.Y) == Math.floor(ny)) {
            return
        }
        
        this.animateMoveBy(dx, dy, callback);
    };
    MapView.prototype.animateMoveBy = function (dx, dy, callback) {
        this.animateToPosition(this.X + dx, this.Y + dy, callback);
    };
    
    MapView.prototype.animateToPosition = function (x, y, callback) {
        this._isAnimateXDone = false;
        this._isAnimateYDone = false;
        var thiz = this;
        var animationX = new Animation({
              to: x,
              from: thiz.X,
              ontween: function(value) {
                  thiz.X = value;
                  if (isNaN(thiz.X)) {
                     thiz.X = 0; 
                  }
                  thiz.canvas.style.left = thiz.X + "px";
                  thiz._invalidateObjectViews();
                  thiz._invalidateImage();
              },
              oncomplete: function() {
                  thiz._invalidateLocationForNavigator();
                  thiz._isAnimateXDone = true;
                  if (callback) {
                     callback(thiz._isAnimateXDone && thiz._isAnimateYDone) 
                  }
              }
            });
        animationX.start();
        
        var animationY = new Animation({
          to: y,
          from: thiz.Y,
          ontween: function(value) {
              //console..log("Move to Y: " + value);
              thiz.Y = value;
              if (isNaN(thiz.Y)) {
                  thiz.Y = 0;
              }
              thiz.canvas.style.top = thiz.Y + "px";
              thiz._invalidateObjectViews();
              thiz._invalidateImage();
          },
          oncomplete: function() {
            thiz._isAnimateYDone = true;
            if (callback) {
                callback(thiz._isAnimateXDone && thiz._isAnimateYDone) 
            }
          }
        });
        animationY.start();
    };
    
    MapView.prototype.setCenterCrop = function() {
        var cw = Math.round(Dom.getOffsetWidth(this.container) * Dom.getOffsetWidth(this.navigatorViewContainer)) / this.navigatorViewIndicatorWidth;
        var ratio = cw / this.originalImageWidth;
        this.ratio = ratio;
        this._invalidateZoom();
        var nh = parseInt(this.navigatorViewIndicator.style.height.replace("px", ""), 10);
        var box = Dom.getBoundingClientRect(this.navigatorViewContainer);
        if (nh > box.height) {
            var ch = Math.round(Dom.getOffsetHeight(this.container) * Dom.getOffsetHeight(this.navigatorViewContainer)) / box.height;
            this.ratio = ch / this.originalImageHeight;
            this._invalidateZoom();
        }
    };
    
    MapView.prototype.moveBy = function(x, y) {
        var mapX = x * Dom.getOffsetWidth(this.canvas) / Dom.getOffsetWidth(this.navigatorViewContainer);
        var mapY = y * Dom.getOffsetHeight(this.canvas) / Dom.getOffsetHeight(this.navigatorViewContainer);
        this.panTo(-mapX, -mapY);
    };
    
    MapView.prototype.getLimitedValue = function(dx, dy) {
        var x = this.X + dx;
        var y = this.Y + dy;
        var newX = Math.round((0 - x) / Dom.getOffsetWidth(this.canvas) * Dom.getOffsetWidth(this.navigatorViewContainer));
        var newY = Math.round((0 - y) / Dom.getOffsetHeight(this.canvas) * Dom.getOffsetHeight(this.navigatorViewContainer));
        var containerBox = Dom.getBoundingClientRect(this.navigatorViewContainer);
        var indicatorBox = Dom.getBoundingClientRect(this.navigatorViewIndicator);
        var ry = 0;
        if (newX < -alpha || newY < -alpha || 
                (newX + indicatorBox.width) >= (containerBox.width + alpha) || 
                (newY + indicatorBox.height) >= (containerBox.height + alpha)) {
            return true;
        } else {
            return false;
        }
    };
    
    MapView.prototype.addAsset = function(asset, location, callback, onFocus, disableDetailButton) {
        //console.log("Add aset", asset);
        var assetDTO = asset;
        if (!assetDTO || !location) {
            //console..log("asset dto is null or location is null")
            return;
        }
        
        if (assetDTO.assetDTO) assetDTO = assetDTO.assetDTO; //looks ridiculous?
        
        var historic = false;
        var tagDTO = location.tagDTO;
        if (tagDTO) {
            var config = (tagDTO.tagType = "ACTIVE" ? "locator2_active_tag_outofdate_minutes" 
                    : "locator2_passive_tag_outofdate_minutes");
            var value = getConfig("locator2", config).smallValue;
            var created = DateUtil.transportToDate(location.dateCreated).getTime();
            var delta = (new Date().getTime() - created);
            if (delta > parseFloat(value) * 60000) {
                historic = true;
            }
        }
       
        var image = asset.icon ? asset.icon : (CONTEXT_PATH + "/amw-im?entityType=asset&entityId=" + assetDTO.id);
        var fallbackImage = (assetDTO && assetDTO.primaryCategory) ? (CONTEXT_PATH + assetDTO.primaryCategory.icon) : "";
        if (fallbackImage.length == 0) {
            fallbackImage = CONTEXT_PATH  + "/images/icons/multi_asset_selection_icon.gif";
        }
        
        var content = "<div class=\"MapPopupContent MapPopupContentAsset\">" +
                "<div class=\"ImageContainer\"><img class=\"Icon\" style=\"visibility: hidden;\" fallback-src=\"" + fallbackImage + "\" onload=\"centerCrop(this);\" onerror=\"showFallback(this);\" /></div>" +
                "<ul>";
        if (assetDTO && assetDTO.applicationId) {
            content += "<li><strong>" + Messages["tag_assets_extId_label"] +"</strong> <span>" + Dom.htmlEncode(assetDTO && assetDTO.applicationId) + "</span></li>";
        }
        var bs = location.asset.assetBusinessStatus
        var status =  bs ? bs.name : "";
        
        var dateCreated = location.dateCreated || "";
        if (dateCreated.length > 0) {
            content += "<li><strong>" + Messages["asset_last_seen_label"] + "</strong> <span>" + Dom.htmlEncode(DateUtil.transportToDisplay(dateCreated)) + "</span></li>";
        }
        content += "<li><strong>" + Messages["common_property_label_location"] + ":</strong> <span>" + Dom.htmlEncode(location.shortLocationPath || "") + "</span></li>";
        
        if ("true" === getConfig(CURRENT_APP.toLowerCase(), "amw2_config_locator_show_business_status_icons").smallValue
                && bs) {
            content += "<li><strong>" + Messages["tag_assets_business_status_label"] + "</strong>" + (bs ? ("<span class=\"IconicLabel\"><img src=\"" + CONTEXT_PATH + bs.icon + "\" /><span>") : "") + "<span>" + Dom.htmlEncode(status) + "</span></li>";
        }
        if (assetDTO && assetDTO.primaryCategory) {
            content += "<li><strong>" + Messages["primary_category_label"] + ":</strong> <span>" + Dom.htmlEncode(assetDTO.primaryCategory.name) + "</span></li>";
        }
        
        if (asset.measurementResults) {
            var temp = null;
            var rh = null;
            for (var int = 0; int < asset.measurementResults.length; int++) {
                var rs = asset.measurementResults[int];
                if (rs.type.name == "temperature") {
                    temp = rs;
                } else if (rs.type.name == "humidity") {
                    rh = rs;
                }
            }
            if (temp) {
                var v = GenericAssetEditorDialog.getTelemetryValue(temp);
                if (v && v.length > 0) {
                    content += "<li><strong>" + Messages["temperature"] + ":</strong> <span>" + v + "</span></li>";
                }
            }
            if (rh) {
                var h = GenericAssetEditorDialog.getTelemetryValue(rh);
                if (h && h.length > 0) {
                    content += "<li><strong>" + Messages["common_property_label_humidity"] + ":</strong> <span>" + h + "</span></li>";
                }
            }
        }
        
        var cfg = getConfig(CURRENT_APP.toLowerCase(), "amw2_config_locator_show_cp_on_balloons");
       
        if (cfg && "true" === cfg.smallValue) {
            var groups = new GenericAssetEditorDialog().getCPGroups(assetDTO);
            //console.log("Groups" + groups);
            for (var i = 0; i < groups.length; i++) {
                var cps = groups[i].cps;
                if (cps && cps.length > 0) {
                   for (var index = 0; index < cps.length; index++) {
                       
                       var def = cps[index].property.custPropDef;
                       
                       if (def.invisible === "true") continue;
                       var value = cps[index].property.cpValue || def.defaultValue || "";
                       if (!value || value.length == 0) continue;
                       if (def.customPropertyType == "DATE" || def.customPropertyType == "DATE_TIME") {
                           value = DateUtil.transportToDisplay(value, def.customPropertyType == "DATE");
                       } else if (def.customPropertyType == "BOOLEAN") {
                           value = ("" + value).toLowerCase() == "true" ? Messages["yes"] : Messages["no"];
                       }
                       content += "<li><strong>" + def.name + ":</strong> <span>" + Dom.htmlEncode(value) + "</span></li>";
                   } 
                }
            }
        }
        var updated = assetDTO.modifiedDate || "";
        if (updated.length > 0) {
            content += "<li><strong>" + Messages["last_updated"] + "</strong> <span>" + Dom.htmlEncode(DateUtil.transportToDisplay(updated)) + "</span></li>";
        }
        
        if (asset.assembly) {
            var physical = asset.assemblyConnectionType == "PHYSICAL";
            content += "<li><strong>" + Messages["assembly_tab_title"] + ":</strong> <span><i class=\"fa fa-" + (physical ? "link" : "unlink") + "\"></i> <a onclick=\"showAssetDetail(" + asset.assembly.id + "); return false;\" primary=\"true\" href=\"#"+ asset.assembly.id + "\">" + Dom.htmlEncode(asset.assembly.name) + "</a></span></li>";
        }
        if (asset.container) {
            content += "<li><strong>" + Messages["container_tab_title"] + ":</strong> <a onclick=\"showAssetDetail(" + asset.container.id + "); return false;\" primary=\"true\" href=\"#"+ asset.container.id + "\">" + Dom.htmlEncode(asset.container.name) + "</a></li>";
        }
        
        content += "</ul>";
        
        var extraBoxId = "extra_" + widget.random();
        var loadEvent = assetDTO.noNeedloadEvent ? false : true;
        if (loadEvent) {
            content += "<div id=\"" + extraBoxId + "\" class=\"ExtraContent\"><span class=\"LoadingIndicator\"><i class=\"fa fa-spinner fa-spin\"></i>" + Messages["loading"]+ "</span></div>";
            content += "</div>";
        }
        if (!disableDetailButton) {
            content += "<div class=\"EditContainer\"><button type=\"button\" class=\"btn btn-default popup-edit-icon\" onclick=\"showEditAssetPanel(this)\" title=\"" + Messages["view_asset_details_title"] + "\">" + Messages["asset_detail_button"] + "</button></div>";
        }
        
        var ox = 0, oy = 0;
        if (location.map.origin) {
            ox = location.map.origin.x;
            oy = location.map.origin.y;
        }
        
        var thiz = this;
        this.addObject({
            id: assetDTO.id,
            assetId: assetDTO.id,
            businessStatus: assetDTO.assetBusinessStatus,
            movable: asset.movable ? true : false,
            loadEvent: loadEvent,
            title: location.asset ? location.asset.name || assetDTO.name : assetDTO.name,
            content: content,
            x: (location.point.x / location.map.xScale + ox),
            y: (0 - location.point.y / location.map.yScale + oy),
            primary: false,
            category: assetDTO.primaryCategory ? assetDTO.primaryCategory.id : 0,
            extraClass: historic ? "Historic" : "",
            icon: image,
            fallbackIcon: fallbackImage,
            onContentShown: function (object, p) {
                if (onFocus) onFocus(object);
                var view = document.getElementById(p[0]._closeId);
               
                
                if (view) {
                    var popover = view.parentNode;
                    var img = Dom.findDescendantWithClass(popover, "Icon");
                    var image = thiz.getIconUrl(object.icon);
                    img.setAttribute("src", image);
                }
                
                if (assetDTO.primaryCategory) {
                    var title = document.getElementById(p[0]._titleId);
                    title.style.background = "url(\"" + CONTEXT_PATH + assetDTO.primaryCategory.icon + "\") no-repeat 7px center";
                    title.style.paddingLeft = "30px";
                    title.style.backgroundSize = "16px";
                }
                
                if (object._eventLoaded || !object.loadEvent) return;
                if (object._showingGroupOverview) return;
                $eventService.findEventsAssociatedWithAsset(_long(assetDTO.id), function(event) {
                    var eventHTML = "";
                    if (event) {
                        eventHTML = "<img src=\"" + CONTEXT_PATH + event.eventTypeIcon + "\" /> " + Dom.htmlEncode(event.eventSpec.name);
                        eventHTML += " (" + DateUtil.transportToDisplay(event.dateCreated) + ")";
                    } else {
                        eventHTML = "<span class=\"NoEvent\">" + Messages["no_associated_events_msg"] + "</span>"
                    }
                    var c = p.data("bs.popover").options.content;
                    c = c.replace("class=\"ExtraContent\">", "class=\"ExtraContent ExtraContentLoaded\">" + eventHTML);
                    object.content = c;
                    p.data("bs.popover").options.content = c;
                    object._eventLoaded = true;
                    p.popover("show");
                });
            },
            extraBoxId: extraBoxId
        });
        
        this.assets.push(asset);
        
        if (callback) callback();
    };
    
    return MapView;
}();
