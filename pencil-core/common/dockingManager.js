function DockingManager (target) {
    this.target = target;
    this.svg = target.svg;

    this.metaNode = Dom.getSingle("./p:metadata", this.svg);
    if (!this.metaNode) {
        this.metaNode = this.svg.ownerDocument.createElementNS(PencilNamespaces.p, "p:metadata");
        this.svg.appendChild(this.metaNode);
    }

    this.parentContainerId = this.svg.getAttribute("p:parentRef");
    if (this.parentContainerId && this.parentContainerId.indexOf("#") == 0) {
        this.parentContainerId = this.parentContainerId.substring(1);
    }
    this.childTargetsNode = Dom.getSingle("./p:childTargets", this.metaNode);
    if (!this.childTargetsNode) {
        this.childTargetsNode = this.svg.ownerDocument.createElementNS(PencilNamespaces.p, "p:childTargets");
        this.metaNode.appendChild(this.childTargetsNode);
    }

    this.altKey = false;
    this.lastMove = {
        dx: 0, dy: 0
    };
};

DockingManager.prototype.handleMoveBy = function (dx, dy, targetSet, moving) {
    this.lastMove = {
        dx: 0, dy: 0
    };

    moving = moving ? moving : this.moving;
    if (this.altKey) {
        this.invalidateChildTargets();
        return;
    }

    if (!targetSet) {
        var childTargets = this.getChildTargets();
        for (var i = 0; i < childTargets.length; i++) {
            if (moving) {
                childTargets[i].moveBy(dx, dy, false, true);
            } else {
                var mdx = 0;
                var mdy = 0;

                var anchor = childTargets[i].anchor ? childTargets[i].anchor : "";
                if (anchor.indexOf("left") != -1) {
                    mdx = dx;
                }
                if (anchor.indexOf("top") != -1) {
                    mdy = dy;
                }

                childTargets[i].moveBy(mdx, mdy, false, true);
                this.lastMove = {
                    dx: dx, dy: dy
                };
            }
        }
    }
};
DockingManager.prototype.handleScaleTo = function (nw, nh, ow, oh, group) {
    if (!group && !this.altKey) {
        var childTargets = this.getChildTargets();
        for (var i = 0; i < childTargets.length; i++) {
            var mdx = 0;
            var mdy = 0;

            var anchor = childTargets[i].anchor ? childTargets[i].anchor : "";
            if (anchor.indexOf("right") != -1 && (this.lastMove && this.lastMove.dx == 0)) {
                mdx = nw - ow;
            }
            if (anchor.indexOf("bottom") != -1 && (this.lastMove && this.lastMove.dy == 0)) {
                mdy = nh - oh;
            }
            childTargets[i].moveBy(mdx, mdy, false, true);
        }
    }
    this.invalidateChildTargets();
    this.lastMove = {
        dx: 0, dy: 0
    };
};
DockingManager.prototype.handleRotateBy = function (da) {
    /*if (!this.altKey) {
        var childTargets = this.getChildTargets();
        for (var i = 0; i < childTargets.length; i++) {
            debug("rotating: " + childTargets[i].getName());
            var ctmc = childTargets[i].svg.getTransformToElement(this.svg.parentNode);

            var x1 = 0, y1 = 0;

            var box1 = childTargets[i].getProperty("box");

            if (box1) {
                x1 = box1.w / 2;
                y1 = box1.h / 2;
            } else {
                var bbox1 = childTargets[i].svg.getBBox();
                x1 = bbox1.x + bbox1.width / 2;
                y1 = bbox1.y + bbox1.height / 2;
            }

            center = Svg.pointInCTM(x, y, ctmc);
            var center1 = Svg.pointInCTM(x1, y1, ctmc);
            debug("center: " + center.toSource() + ", " + [center1.x, center1.y]);
            ctmc = ctmc.translate(center.x - center1.x, center.y - center1.y);
            ctmc = ctmc.rotate(da);
            ctmc = ctmc.translate(0 - center.x + center1.x, 0 - center.y + center1.y);

            Svg.ensureCTM(childTargets[i].svg, ctmc);
        }
    }*/
};
DockingManager.prototype.deleteTarget = function () {
    var parent = this.getParentContainer();
    if (parent) {
        parent.dockingManager.removeChild(this.target);
    }
    var children = this.getChildTargets();
    for (var i = 0; i < children.length; i++) {
        children[i].dockingManager.removeParentContainer();
    }
};
DockingManager.prototype.createController = function (id, anchor) {
    if (id.indexOf("#") == 0) {
        id = id.substring(1);
    }
    var g = this.svg.ownerDocument.getElementById(id);
    if (g) {
        var controller = this.target.canvas.createControllerFor(g);
        if (anchor) {
            controller.anchor = anchor;
        }
        return controller;
    }
    return null;
};
DockingManager.prototype.getParentContainer = function () {
    if (this.parentContainerId) {
        return this.createController(this.parentContainerId);
    }
    return null;
};
DockingManager.prototype.removeParentContainer = function () {
    this.parentContainerId = null;
    this.svg.removeAttribute("p:parentRef");
};
DockingManager.prototype.setParentContainer = function (parent) {
    this.parentContainerId = parent.id;
    this.svg.setAttribute("p:parentRef", "#" + this.parentContainerId);
};
DockingManager.prototype.getChildTargets = function () {
    var children = [];
    var thiz = this;
    if (this.childTargetsNode) {
        Dom.workOn(".//p:childTarget", this.childTargetsNode, function (node) {
            var c = thiz.createController(node.getAttribute("childRef"), node.getAttribute("anchor"));
            if (c) {
                children.push(c);
            }
        });
    }
    return children;
};
DockingManager.prototype.addChildTarget = function (target) {
    var n = Dom.getSingle(".//*[@childRef='#" + target.id + "']", this.svg);
    if (n) {
        return;
    }
    n = this.svg.ownerDocument.createElementNS(PencilNamespaces.p, "p:childTarget");
    n.setAttribute("childRef", "#" + target.id);
    n.setAttribute("anchor", target.anchor);
    this.childTargetsNode.appendChild(n);
};
DockingManager.prototype.removeChild = function (target) {
    var n = Dom.getSingle(".//*[@childRef='#" + target.id + "']", this.svg);
    if (n) {
        this.childTargetsNode.removeChild(n);
    }
};
DockingManager.prototype.getRelateTarget = function (pos) {
    var under = [];
    var previous = this.svg.previousSibling;
    while (previous != null) {
        under.push(previous);
        previous = previous.previousSibling;
    }
    var over = [];
    var next = this.svg.nextSibling;
    while (next != null) {
        over.push(next);
        next = next.nextSibling;
    }
    if (pos == "over") {
        return over;
    } else if (pos == "under") {
        return under;
    }
    for (var i = 0; i < under.length; i++) {
        over.push(under[i]);
    }
    return over;
};
DockingManager.prototype.findParentContainers = function () {
    var parents = [];
    var targets = this.getRelateTarget("under");
    for (var i = 0; i < targets.length; i++) {
        var controller = this.target.canvas.createControllerFor(targets[i]);
        if (controller && this.target && this.target.getBounding && controller.getBounding) {
            var bound1 = this.target.getBounding();
            var bound2 = controller.getBounding();
            if (bound1.x > bound2.x && bound1.y > bound2.y &&
                bound1.width + bound1.x < bound2.width + bound2.x &&
                bound1.height + bound1.y < bound2.height + bound2.y) {

                var anchor = "";
                if (bound1.x - bound2.x < (bound2.width + bound2.x) - (bound1.width + bound1.x)) {
                    anchor += "left";
                } else {
                    anchor += "right";
                }
                if (bound1.y - bound2.y < (bound2.height + bound2.y) - (bound1.height + bound1.y)) {
                    anchor += "top";
                } else {
                    anchor += "bottom";
                }
                parents.push({anchor: anchor, target: controller});
            }
        }
    }
    return parents;
};
DockingManager.prototype.invalidateChildTargets = function () {
    var childTargets = this.getChildTargets();
    var targets = [];

    for (var i = 0; i < childTargets.length; i++) {
        var target = childTargets[i];
        if (target.dockingManager) {
            var parent = target.dockingManager.findParentContainers();
            if (parent.length == 0 || (parent.length > 0 && parent[0].target.id != this.target.id)) {
                targets.push(target);
            }
        }
    }

    for (var t = 0; t < targets.length; t++) {
        targets[t].dockingManager.removeParentContainer();
        this.removeChild(targets[t]);
    }

    var p = this.findParentContainers();
    if ((this.parentContainerId && p.length == 0) || (this.parentContainerId && p.length > 0 && p[0].target.id != this.parentContainerId)) {
        var parent = this.getParentContainer();
        if (parent) {
            parent.dockingManager.removeChild(this.target);
        }
        this.removeParentContainer();
    } else if (p.length > 0) {
        this.setParentContainer(p[0].target);
        this.target.anchor = p[0].anchor;
        p[0].target.dockingManager.addChildTarget(this.target);
    }
};
DockingManager.enableDocking = function (controller) {
    if (controller && controller.dockingManager) {
        var parent = controller.dockingManager.getParentContainer();
        if (parent) {
            parent.dockingManager.removeChild(controller);
            controller.dockingManager.removeParentContainer();
        }
        var parents = controller.dockingManager.findParentContainers();
        if (parents.length > 0) {
            var firstParent = parents[0].target;
            if (firstParent.dockingManager.addChildTarget) {
                controller.dockingManager.setParentContainer(firstParent);
                controller.anchor = parents[0].anchor;
                firstParent.dockingManager.addChildTarget(controller);
            }
        }
    }
};
