/**
 * Utility functions for implementing the connector module
 */
 
var Connector = {};

Connector.isWorking = false;
Connector.invalidateInboundConnections = function (canvas, shape) {
    if (Connector.isWorking) return;
    try {
        Connector.isWorking = true;
        Connector.invalidateInboundConnectionsImpl(canvas, shape);
    } finally {
        Connector.isWorking = false;
    }
};
Connector.invalidateInboundConnectionsForShapeTarget = function (target) {
	if (!target.getConnectorOutlets) return;
	
	var canvas = target.canvas;
	var shape = target.svg;
    
    var outlets = target.getConnectorOutlets();
    if (outlets == null) return;
    var outletMap = {};
    for (var i = 0; i < outlets.length; i ++) {
        outletMap[outlets[i].id] = outlets[i];
    }

    Dom.workOn(".//svg:g[@p:type='Shape']", canvas.drawingLayer, function (node) {
        if (canvas.isShapeLocked(node)) return;
        
        var defId = canvas.getType(node);
        
        var def = CollectionManager.shapeDefinition.locateDefinition(defId);
        if (!def) return;
        
        var handleProps = [];
        for (var i = 0; i < def.propertyGroups.length; i ++) {
            for (var j = 0; j < def.propertyGroups[i].properties.length; j ++) {
                var prop = def.propertyGroups[i].properties[j];
                if (prop.type == Handle) {
                    handleProps.push(prop);
                }
            }
        }
        if (handleProps.length == 0) return;
        var source = target.canvas.createControllerFor(node);

        for (var i = 0; i < handleProps.length; i ++) {
            var prop = handleProps[i];
            var handle = source.getProperty(prop.name);
            if (!handle.meta ||
                !handle.meta.connectedShapeId ||
                !handle.meta.connectedOutletId) continue;

            if (handle.meta.connectedShapeId != shape.id) continue;
            if (!outletMap[handle.meta.connectedOutletId]) continue;

            var outlet = outletMap[handle.meta.connectedOutletId];

            var m = shape.getTransformToElement(node);
            
            var via = Connector.calculateViaPoint(target, outlet, m);

            var p = Svg.pointInCTM(outlet.x, outlet.y, m);
            handle.x = p.x;
            handle.y = p.y;

            if (!handle.meta) handle.meta = {};
            if (via) {
                handle.meta.viax = via.x;
                handle.meta.viay = via.y;
            } else {
                delete handle.meta.viax;
                delete handle.meta.viay;
            }

            source.setProperty(prop.name, handle);
        }
    });
};
Connector.invalidateInboundConnectionsImpl = function (canvas, shape) {
    var target = canvas.createControllerFor(shape);
    
    if (target.invalidateInboundConnections) {
    	target.invalidateInboundConnections();
    }
};

Connector.calculateViaPoint = function (target, outlet, matrix) {
    var cx = 0;
    var cy = 0;
    if (target) {
        try {
            var box = target.getProperty("box");
            cx = box.w / 2;
            cy = box.h / 2;
        } catch (e) {
            var bounding = target.getBounding();
            cx = bounding.width / 2;
            cy = bounding.height / 2;
        }
        
    } else {
        cx = outlet._cx;
        cy = outlet._cy;
    }

    var via = null;
    
    if (outlet.noVia) return null;

    if (outlet.via) {
    	via = Svg.pointInCTM(outlet.via.x, outlet.via.y, matrix);
    } else {
        if (outlet.direction) {
            var x = (outlet.direction == "left" ? outlet.x - 10 : (outlet.direction == "right" ? outlet.x + 10 : outlet.x));
            var y = (outlet.direction == "top" ? outlet.y - 10 : (outlet.direction == "bottom" ? outlet.y + 10 : outlet.y));

            via = Svg.pointInCTM(x, y, matrix);
        } else {
            var dx = outlet.x - cx;
            var dy = outlet.y - cy;

            debug("[cx, cy, outlet.x, outlet.y, dx, dy]: " + [cx, cy, outlet.x, outlet.y, dx, dy]);
            var l = Math.sqrt(dx * dx + dy * dy);
            if (l > 0) {
                var r = (l + 10) / l;
                via = Svg.pointInCTM(cx + dx * r, cy + dy * r, matrix);
                debug("via: " + [via.x, via.y]);
            }
        }
    }
    
    return via;
};

Connector.invalidateOutboundConnections = function (canvas, node) {
    if (Connector.isWorking) return;
    try {
        Connector.isWorking = true;
        Connector.invalidateOutboundConnectionsImpl(canvas, node);
    } finally {
        Connector.isWorking = false;
    }
};
Connector.invalidateOutboundConnectionsForShapeTarget = function (target) {
	var canvas = target.canvas;
	var node = target.svg;
	
    var def = target.def;
    if (!def) return;
    
    var handleProps = [];
    for (var i = 0; i < def.propertyGroups.length; i ++) {
        for (var j = 0; j < def.propertyGroups[i].properties.length; j ++) {
            var prop = def.propertyGroups[i].properties[j];
            if (prop.type == Handle) {
                handleProps.push(prop);
            }
        }
    }
    if (handleProps.length == 0) return;
    var source = canvas.createControllerFor(node);

    for (var i = 0; i < handleProps.length; i ++) {
        var prop = handleProps[i];
        var handle = source.getProperty(prop.name);
        if (!handle.meta ||
            !handle.meta.connectedShapeId ||
            !handle.meta.connectedOutletId) continue;

        var shape = Dom.getSingle(".//svg:g[@p:type='Shape'][@id='" + handle.meta.connectedShapeId + "']", canvas.drawingLayer);
        if (!shape) continue;
        
        var target = canvas.createControllerFor(shape);
        var outlets = target.getConnectorOutlets();
        if (outlets == null) continue;

        var outlet = null;
        for (var j = 0; j < outlets.length; j ++) {
            if (outlets[j].id == handle.meta.connectedOutletId) {
                outlet = outlets[j];
                break;
            }
        }

        if (!outlet) continue;
        
        var m = shape.getTransformToElement(node);
        var via = Connector.calculateViaPoint(target, outlet, m);
            
        var p = Svg.pointInCTM(outlet.x, outlet.y, m);
        handle.x = p.x;
        handle.y = p.y;
        if (!handle.meta) handle.meta = {};
        if (via) {
            handle.meta.viax = via.x;
            handle.meta.viay = via.y;
        } else {
            delete handle.meta.viax;
            delete handle.meta.viay;
        }

        source.setProperty(prop.name, handle);
    }	
};
Connector.invalidateOutboundConnectionsImpl = function (canvas, node) {
    var target = canvas.createControllerFor(node);
    
    if (target.invalidateOutboundConnections) {
    	target.invalidateOutboundConnections();
    }
};

Connector.areClassesMatched = function (classes1, classes2) {
	return true;
    for (var i = 0; i < classes1.length; i ++) {
        if (classes1[i] == "*" || classes2.indexOf(classes1[i]) >= 0) return true;
    }

    return false;
};
Connector.getMatchingOutlets = function (canvas, shape, classes) {
    var matchingOutlets = [];
    var classes1 = classes.split(/[ ]*\,[ ]*/);
    Dom.workOn(".//svg:g[@p:type='Shape']", canvas.drawingLayer, function (node) {
        if (node.id == shape.id) return;
        
        var source = canvas.createControllerFor(node);
        var outlets = source.getConnectorOutlets();
        if (!outlets) return;
        
        var m = node.getTransformToElement(shape);
        
        for (var i = 0; i < outlets.length; i ++) {
            var outlet = outlets[i];
            var classes2 = outlet.classes.split(/[ ]*\,[ ]*/);
            if (!Connector.areClassesMatched(classes1, classes2)) continue;

            var via = Connector.calculateViaPoint(source, outlet, m);
            var p = Svg.pointInCTM(outlet.x, outlet.y, m);
            outlet.x = p.x;
            outlet.y = p.y;

            outlet.shapeId = node.id;
            outlet._via = via;

            matchingOutlets.push(outlet);
        }
    });

    return matchingOutlets;
};

var ConnectorUtil = {};
ConnectorUtil.generateStandarOutlets = function (shape, classes) {
    var box = shape.getProperty("box");
    if (box) {
        return [
                new Outlet("top-left", classes ? classes : "Bounding", 0, 0),
                new Outlet("top-center", classes ? classes : "Bounding", box.w / 2, 0),
                new Outlet("top-right", classes ? classes : "Bounding", box.w, 0),
                new Outlet("middle-left", classes ? classes : "Bounding", 0, box.h / 2),
                new Outlet("middle-center", classes ? classes : "Bounding", box.w / 2, box.h / 2),
                new Outlet("middle-right", classes ? classes : "Bounding", box.w, box.h / 2),
                new Outlet("bottom-left", classes ? classes : "Bounding", 0, box.h),
                new Outlet("bottom-center", classes ? classes : "Bounding", box.w / 2, box.h),
                new Outlet("bottom-right", classes ? classes : "Bounding", box.w, box.h)
            ];
    } else {
    	if (shape.svg) {
        	var box = shape.svg.getBBox();
        	return [
                new Outlet("top-left", classes ? classes : "Bounding", box.x, box.y + box.y),
                new Outlet("top-center", classes ? classes : "Bounding", box.width / 2 + box.x, 0 + box.y),
                new Outlet("top-right", classes ? classes : "Bounding", box.width + box.x, 0 + box.y),
                new Outlet("middle-left", classes ? classes : "Bounding", 0 + box.x, box.height / 2 + box.y),
                new Outlet("middle-center", classes ? classes : "Bounding", box.width / 2 + box.x, box.height / 2 + box.y),
                new Outlet("middle-right", classes ? classes : "Bounding", box.width + box.x, box.height / 2 + box.y),
                new Outlet("bottom-left", classes ? classes : "Bounding", 0 + box.x, box.height + box.y),
                new Outlet("bottom-center", classes ? classes : "Bounding", box.width / 2 + box.x, box.height + box.y),
                new Outlet("bottom-right", classes ? classes : "Bounding", box.width + box.x, box.height + box.y)
        	];
    	} else {
    		return [];
    	}
    }

};

function getSegmentsToHandle(startPoints, handle, VIA_LENGTH) {
    var points = [];
    var start = null;
    for (var i = 0; i < startPoints.length; i ++) {
        start= startPoints[i];
        points.push(start);
    }

    var end = {x: handle.x, y: handle.y};
    var via = null;
    if (handle.meta && handle.meta.viax && handle.meta.viay) {
        via = {x: parseFloat(handle.meta.viax), y: parseFloat(handle.meta.viay)};
    } else {
    	if (startPoints.length > 0) {
    		via = startPoints[startPoints.length - 1];
    	}
    }
    debug("VIA_LENGTH: " + VIA_LENGTH);
    if (via != null) {
        var dx = via.x - end.x;
        var dy = via.y - end.y;
        var l = Math.sqrt(dx * dx + dy * dy);
        var r = VIA_LENGTH / l;
        via = {x: end.x + dx * r, y: end.y + dy * r};
        
        end = via;
    }

    points.push(end);

    if (via) {
        points.push({x: handle.x, y: handle.y});
    }

    return points;
};
function arrowTo(startPoints, handle, w, VIA_LENGTH, supportUnconnected,
					withStartArrow, withEndArrow, straight, detachedDelta) {
    if (!supportUnconnected && !handle.isConnected()) return [];
    
    if (typeof(withStartArrow) == "undefined") withStartArrow = true;
    if (typeof(withEndArrow) == "undefined") withEndArrow = true;
    
    const ANGLE = Math.PI / 4;
    const ARROW_WING_LENGTH = Math.max(w * 4, 6);
    
    if (startPoints[0].x == handle.x &&
        startPoints[0].y == handle.y) return [];

    var points = getSegmentsToHandle(startPoints, handle, VIA_LENGTH);
    var len = points.length;
    
    if (typeof(detachedDelta) == "number" && detachedDelta != 0) {
    	//shift the two ends away
    	var maxDelta = 2 * VIA_LENGTH / 3;
    	if (detachedDelta > maxDelta) {
    		detachedDelta = maxDelta;
    	}
    	
    	var l = geo_vectorLength(points[0], points[1]);
    	var f = (l - detachedDelta) / l;
    	var p1 = {
    		x: points[1].x + f * (points[0].x - points[1].x),
    		y: points[1].y + f * (points[0].y - points[1].y)
    	};
    	
    	l = geo_vectorLength(points[len - 2], points[len - 1]);
    	f = (l - detachedDelta) / l;
    	var p2 = {
    		x: points[len - 2].x + f * (points[len - 1].x - points[len - 2].x),
    		y: points[len - 2].y + f * (points[len - 1].y - points[len - 2].y)
    	};
    	
    	points[0] = p1;
    	points[len - 1] = p2;
    }
    
    var spec = null;
    if (straight) {
        var spec = [M(points[0].x, points[0].y)];
        var len = points.length;
        for (var i = 1; i < len; i ++) {
            var p = points[i];
            spec.push(L(p.x, p.y));
        }
    } else {
    	spec = geo_buildQuickSmoothCurve(points, VIA_LENGTH);
    }
    
    if (withStartArrow) {
        var a1 = geo_getRotatedPoint(
        		points[1],
        		points[0], ARROW_WING_LENGTH, ANGLE);
                
        var a2 = geo_getRotatedPoint(
        	points[1],
        	points[0], ARROW_WING_LENGTH, 0 - ANGLE);

        spec.unshift(M(a1.x, a1.y), L(points[0].x, points[0].y), L(a2.x, a2.y));
    }

    if (withEndArrow && (!handle.meta || handle.meta.connectedOutletId.indexOf("SegmentInput") < 0)) {
        var a1 = geo_getRotatedPoint(
        		points[len - 2],
        		points[len - 1], ARROW_WING_LENGTH, ANGLE);
                
        var a2 = geo_getRotatedPoint(
        		points[len - 2],
        		points[len - 1], ARROW_WING_LENGTH, 0 - ANGLE);

        spec.push(M(a1.x, a1.y), L(points[len - 1].x, points[len - 1].y), L(a2.x, a2.y));
    }

    return spec;
};

Util.importSandboxFunctions(getSegmentsToHandle, arrowTo);

function Outlet(id, classes, x, y, direction) {
    this.id = id;
    this.classes = classes;
    this.x = x;
    this.y = y;
    this.direction = direction;
}

Outlet.prototype.toString = function () {
    return this.id + "[" + this.classes + "]@" + [this.x, this.y];
};

pencilSandbox.Outlet = {
    newOutlet: function (id, classes, x, y, direction) {
        return new Outlet(id, classes, x, y, direction);
    }
};
for (var p in Outlet) {
    pencilSandbox.Outlet[p] = Outlet[p];
}
