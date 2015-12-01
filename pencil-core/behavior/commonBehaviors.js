Pencil.behaviors.Attr = function (name, value, ns) {
    if (value != null) {
        if (ns) this.setAttributeNS(ns, name, value);
        else this.setAttribute(name, value);
    } else {
        if (ns) this.removeAttributeNS(ns, name);
        else this.removeAttribute(name);
    }
};
Pencil.behaviors.Box = function (box) {
    Svg.setWidth(this, box.w);
    Svg.setHeight(this, box.h);
};
Pencil.behaviors.Bound = function (bound) {
    this.setAttribute("x", bound.x);
    this.setAttribute("y", bound.y);
    this.setAttribute("width", bound.w);
    this.setAttribute("height", bound.h);
};
Pencil.behaviors.Radius = function (rx, ry) {
    this.setAttribute("rx", rx);
    this.setAttribute("ry", ry);
};
Pencil.behaviors.StopColor = function (color) {
    Svg.setStyle(this, "stop-color", color.toRGBString());
    Svg.setStyle(this, "stop-opacity", color.a);
};
Pencil.behaviors.Offset = function (offset) {
    this.setAttribute("offset", offset);
};
Pencil.behaviors.Fill = function (color) {
    Svg.setStyle(this, "fill", color.toRGBString());
    Svg.setStyle(this, "fill-opacity", color.a);
};
Pencil.behaviors.Color = function (color) {
	if (this.localName == "text") {
	    Svg.setStyle(this, "fill", color.toRGBString());
	    Svg.setStyle(this, "fill-opacity", color.a);
	} else {
	    Svg.setStyle(this, "color", color ? color.toRGBString() : null);
	    Svg.setStyle(this, "opacity", color ? color.a : null);
	}
};
Pencil.behaviors.StrokeColor = function (color) {
    Svg.setStyle(this, "stroke", color.toRGBString());
    Svg.setStyle(this, "stroke-opacity", color.a);
};
Pencil.behaviors.StrokeStyle = function (strokeStyle) {
    Svg.setStyle(this, "stroke-width", strokeStyle.w);
    if (strokeStyle.array) {
        Svg.setStyle(this, "stroke-dasharray", strokeStyle.array);
    } else {
        Svg.removeStyle(this, "stroke-dasharray");
    }
};
Pencil.behaviors.Visibility = function (bool) {
    var value = bool;
    if (bool && bool.constructor == Bool) value = bool.value;
    Svg.setStyle(this, "visibility", value ? "visible" : "hidden");
    Svg.setStyle(this, "display", value ? null : "none");
};
Pencil.behaviors.ApplyFilter = function (bool) {
    var value = bool;
    if (bool && bool.constructor == Bool) value = bool.value;
    if (value) {
        if (this.hasAttribute("filter")) return;
        if (!this.hasAttributeNS(PencilNamespaces.p, "filter")) return;

        var filter = this.getAttributeNS(PencilNamespaces.p, "filter");
        this.setAttribute("filter", filter);
    } else {
        this.removeAttribute("filter");
    }
};

Pencil.behaviors.CustomStyle = function (name, value) {
    Svg.setStyle(this, name, value);
};
Pencil.behaviors.InnerText = function (text) {
    Dom.empty(this);
    this.appendChild(this.ownerDocument.createTextNode(text));
};
Pencil.behaviors._createUnderline = function(text) {
    var id = text.getAttribute("id") + "_underline";
    var underline = text.ownerDocument.getElementById(id);
    if (!underline) {
        underline = text.ownerDocument.createElementNS(PencilNamespaces.svg, "path");
        underline.setAttribute("id", id);
        underline.setAttribute("style", "fill: none; stroke-width: 1px;");
        Dom.appendAfter(underline, text);
    }

    return underline;
};
Pencil.behaviors.AccelFor = function (textName, font, color, textContent) {
    try {
        var text = Pencil.findObjectByName(F._target, textName);
        var index = textContent.value.indexOf("&");
        if (index < 0 || textContent.value.charAt(index + 1) == '&') {
            Svg.setStyle(this, "visibility", "hidden");
            return;
        }
        Svg.setStyle(this, "visibility", "visible");

        Svg.setStyle(this, "stroke", color.toRGBString());
        Svg.setStyle(this, "stroke-opacity", color.a);

        var start = text.getStartPositionOfChar(index);
        var extend = text.getExtentOfChar(index);
        var bbox = text.getBBox();

        debug("extend.height: " + extend.height);
        var dLiteral = [M(start.x, bbox.y + bbox.height + 1.5), L(start.x + extend.width, bbox.y + bbox.height + 1.5)];
        this.setAttribute("d", dLiteral.join(" "));

    } catch (e) {
        Console.dumpError(e, "stdout");
    }
}
Pencil.behaviors.Font = function (font) {
    Svg.setStyle(this, "font-family", font.family);
    Svg.setStyle(this, "font-size", font.size);
    Svg.setStyle(this, "font-weight", font.weight);
    Svg.setStyle(this, "font-style", font.style);
    Svg.setStyle(this, "text-decoration", font.decor);
};
Pencil.behaviors.BoxFit = function (bound, align) {
    try {
        var isText = (this.localName == "text");
        if (isText) {
            var bbox = this.getBBox();
            var dx = Math.round(((bound.w - bbox.width) * align.h) / 2 + bound.x - bbox.x);
            var dy = Math.round(((bound.h - bbox.height) * align.v) / 2 + bound.y - bbox.y);
            this.setAttribute("transform", "translate(" + dx + "," + dy + ")");
        } else {
            Svg.setWidth(this, bound.w);
            Svg.setHeight(this, 500);
            var h = this.firstChild.scrollHeight;

            Svg.setHeight(this, h);

            Svg.setX(this, bound.x);
            var y = Math.round(((bound.h - h) * align.v) / 2 + bound.y);
            Svg.setY(this, y);

            Svg.setStyle(this, "text-align", ["left", "center", "right"][align.h]);

        }
    } catch (e) {
    }
};
Pencil.behaviors.D = function (dLiteral) {
    var s = typeof(dLiteral) == "string" ? dLiteral : (dLiteral.join ? dLiteral.join(" ") : "");
    this.setAttribute("d", s);
};
Pencil.behaviors.Scale = function (x, y) {
    this.setAttribute("transform", "scale(" + [x, y] + ")");
}
Pencil.behaviors.Transform = function (s) {
    var t = s.join ? s.join(" ") : s;
    this.setAttribute("transform", t);
}
//D objects
Pencil.behaviors.D._lastX = 0;
Pencil.behaviors.D._lastY = 0;
Pencil.behaviors.D._setLastLocation = function (x, y) {
    Pencil.behaviors.D._lastX = x;
    Pencil.behaviors.D._lastY = y;
};

function M(x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "M " + x + " " + y;
}
function L(x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "L " + x + " " + y;
}
function C(x1, y1, x2, y2, x, y) {
    Pencil.behaviors.D._setLastLocation(x2, y2);
    return "C " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + x + " " + y;
}
function c(x1, y1, x2, y2, x, y) {
    Pencil.behaviors.D._setLastLocation(x2, y2);
    return "c " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + x + " " + y;
}
function S(x2, y2, x, y) {
    Pencil.behaviors.D._setLastLocation(x2, y2);
    return "S " + x2 + " " + y2 + " " + x + " " + y;
}
function s(x2, y2, x, y) {
    Pencil.behaviors.D._setLastLocation(x2, y2);
    return "s " + x2 + " " + y2 + " " + x + " " + y;
}
function Q(x1, y1, x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "Q " + x1 + " " + y1 + " " + x + " " + y;
}
function q(x1, y1, x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "q " + x1 + " " + y1 + " " + x + " " + y;
}
function T(x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "T " + x + " " + y;
}
function a(rx, ry, f1, f2, f3, x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "a " + rx + " " + ry + " " + f1 + " " + f2 + " " + f3 + " " + x + " " + y;
}
function A(rx, ry, f1, f2, f3, x, y) {
    Pencil.behaviors.D._setLastLocation(x, y);
    return "A " + rx + " " + ry + " " + f1 + " " + f2 + " " + f3 + " " + x + " " + y;
}

Util.importSandboxFunctions(M, L, C, c, S, s, Q, q, T, a, A);

const DEFAULT_SKETCHY_SEG_SIZE = 20;
const DEFAULT_SKETCHY_OVERSHOOT = 3;
const ROTATED_ANGLE = 10;
const SKETCHY_ANGLE = 4;
const SKETCHY_ANGLE_LEN_REF = 50;

function sk(x1, y1, x2, y2, d, noMove) {
	var result = [];
    if (!noMove) result.push(M(x1, y1));
    
    var p1 = {x: x1, y: y1,};
    var p2 = {x: x2, y: y2,};
    var l = geo_vectorLength (p1, p2) / 3;

    var maxAngle = SKETCHY_ANGLE;
    if (l > SKETCHY_ANGLE_LEN_REF) {
        maxAngle = SKETCHY_ANGLE_LEN_REF * SKETCHY_ANGLE / l;
    }
    
	var angle = Math.random() * maxAngle - (maxAngle / 2);
	angle = Math.PI * angle / 180;
	
	var a = geo_getRotatedPoint(p2, p1, l, angle);
	var b = geo_getRotatedPoint(p1, p2, l, 0 - angle);
	result.push(C(a.x, a.y, b.x, b.y, x2, y2));
	
	Pencil.behaviors.D._setLastLocation(x2, y2);
	
	return result.join(" ");
}

function sk_old(x1, y1, x2, y2, d, noMove) {
	var delta = (Math.random() - 1) * DEFAULT_SKETCHY_OVERSHOOT;
	
	var a = Math.PI * (180 - ROTATED_ANGLE + (Math.random() * ROTATED_ANGLE)) / 180;
	var p1 = geo_getRotatedPoint({x: x2, y: y2}, {x: x1, y: y1}, delta, a);
	
	delta = (Math.random() - 1) * DEFAULT_SKETCHY_OVERSHOOT;
	a = Math.PI * (180 - ROTATED_ANGLE + (Math.random() * ROTATED_ANGLE)) / 180;
	var p2 = geo_getRotatedPoint({x: x1, y: y1}, {x: x2, y: y2}, delta, a);
	x1 = p1.x;
	y1 = p1.y;
	
	x2 = p2.x;
	y2 = p2.y;
	
	var last = {x: x2, y: y2};
	
    var dx = x2 - x1;
    var dy = y2 - y1;
    var l = Math.sqrt(dx * dx + dy * dy);
    var segment = d ? d : DEFAULT_SKETCHY_SEG_SIZE;

    segment = Math.min(segment, l / 2);

    var count = Math.floor(l / segment);
    var segmentRandom = segment / 3;

    var al = 0;
    var x0 = x1;
    var y0 = y1;

    var result = [];

    if (!noMove) result.push(M(x1, y1));

    for (var i = 0; i < count - 1; i ++) {
        al = al + Math.round(segment + Math.random() * segmentRandom - segmentRandom / 2);
        var x = x1 + (dx * al / l) + Math.random() * 2 - 1;
        var y = y1 + (dy * al / l) + Math.random() * 2 - 1;

        result.push(L(x, y));
    }

    result.push(L(x2, y2));

    Pencil.behaviors.D._setLastLocation(last.x, last.y);

    return result.join(" ");
}
function skTo(x, y, d) {
    return sk(Pencil.behaviors.D._lastX, Pencil.behaviors.D._lastY, x, y,
        d ? d : DEFAULT_SKETCHY_SEG_SIZE, "noMove");
}
var z = "z";
pencilSandbox.z = z;

Util.importSandboxFunctions(sk, skTo);

function rotate(a) {
    return "rotate(" + a + ")";
}
function translate(x, y) {
    return "translate(" + [x, y] + ")";
}
function scale(x, y) {
    return "scale(" + [x, y] + ")";
}
function skewX(a) {
    return "skewX(" + a + ")";
}
function skewY(a) {
    return "skewY(" + a + ")";
}

Util.importSandboxFunctions(rotate, translate, scale, skewX, skewY);

Pencil.behaviors.TextContent = function (text, stripAccel, keepExistingRootElement) {
    var isText = (this.localName == "text");

    if (isText) {
        Dom.empty(this);
        var value = text.value ? text.value : text.html;
        this.appendChild(this.ownerDocument.createTextNode(value ? (stripAccel ? value.replace(/&/, "") : value) : " "));
    } else {
        if (this.localName == "textarea" && this.namespaceURI == PencilNamespaces.html) {
            var content = (text.constructor == RichText) ? text.html : text.value;
            content = content.replace(/[\r\n]+/gi, "").replace(/<br[^>]*>/gi, "\n").replace(/<[^>]+>/gi, "");
            var thiz = this;
            window.setTimeout(function () {
                    Dom.empty(thiz);
                    thiz.appendChild(thiz.ownerDocument.createTextNode(content));
                }, 1);
        } else {
            var html = (text.constructor == RichText) ? text.html : text.value;
            var divHTML = "<div xmlns=\"" + PencilNamespaces.html + "\">" + html + "</div>";
            var div = Dom.parseToNode(divHTML, this.ownerDocument);
            if (!div) return;

            if (!keepExistingRootElement) {
                Dom.empty(this);
                this.appendChild(div);
            } else {
                var root = Dom.getSingle("./html:div", this);
                if (!root) return;

                Dom.empty(root);
                root.appendChild(div);
            }
        }
    }
};
Pencil.behaviors.PlainTextContent = function (text, bound, alignment) {
    var domContent = F.buildTextWrapDomContent(F._target, text.value, bound.w, alignment);
    Dom.empty(this);
    this.appendChild(domContent);

    Pencil.behaviors.BoxFit.apply(this, [bound, alignment]);
};
Pencil.behaviors.DomContent = function (xmlText) {
    Dom.empty(this);

    var domNode = xmlText.nodeType ? xmlText : Dom.parseToNode(xmlText.value, this.ownerDocument);

    if (domNode) this.appendChild(domNode);
};
Pencil.behaviors.AttachmentContent = function (attachment) {

    Dom.empty(this);

    if (!attachment.defId) return;

    var canvas = Dom.findUpward(this, function (node) {
        return node.namespaceURI == PencilNamespaces.xul && node.localName == "pcanvas";
    });

    var targetSVG = this.ownerDocument.getElementById(attachment.targetId);
    if (targetSVG) {
        var g = this.ownerDocument.createElementNS(PencilNamespaces.svg, "g");

        while (targetSVG.firstChild) {
            var node = targetSVG.firstChild;
            targetSVG.removeChild(node);
            if (node.namespaceURI == PencilNamespaces.svg) {
                g.appendChild(node);
            }
        }

        var ctm = targetSVG.getTransformToElement(this);
        Svg.ensureCTM(g, ctm);

        targetSVG.parentNode.removeChild(targetSVG);
        Dom.renewId(g);
        g.setAttribute("id", attachment.targetId);

        this.appendChild(g);
    }
};
Pencil.behaviors.RichTextFit = function (width) {
    Svg.setWidth(this, width);
    Svg.setHeight(this, 900);
    Svg.setHeight(this, Math.ceil(this.firstChild.scrollHeight));
};
Pencil.behaviors.Image = function (imageData) {
    this.setAttributeNS(PencilNamespaces.xlink, "xlink:href", imageData.data);
    Svg.setWidth(this, imageData.w);
    Svg.setHeight(this, imageData.h);
};
Pencil.behaviors.EllipseFit = function (box) {
    this.setAttribute("cx", box.w / 2);
    this.setAttribute("cy", box.h / 2);
    this.setAttribute("rx", box.w / 2);
    this.setAttribute("ry", box.h / 2);
};
Pencil.behaviors.Property = function (name, value) {
    this[name] = value;
};
Pencil.behaviors.Call = function (name, args) {
    var f = this[name];
    f.apply(this, args);
};
Pencil.behaviors.Width = function (width) {
    if (this.namespaceURI == PencilNamespaces.xul) {
        this.setAttribute("width", width);
        this.width = width;

        if (this.localName == "button") return;
    }

    Svg.setStyle(this, "width", "" + width + "px");
};
Pencil.behaviors.Height = function (height) {
    if (this.namespaceURI == PencilNamespaces.xul) {
        this.setAttribute("height", height);
        this.height = height;

        if (this.localName == "button") return;
    }

    Svg.setStyle(this, "height", "" + height + "px");
};
Pencil.behaviors.Value = function (value, parseAccessKey) {
    var label = parseAccessKey ? F.stripAccessKey(value) : value;
    this.setAttribute("value", label);
    this.value = label;

    this.setAttribute("accesskey", parseAccessKey ? F.getAccessKey(value) : "");
};
Pencil.behaviors.Label = function (value, parseAccessKey) {
    var label = parseAccessKey ? F.stripAccessKey(value) : value;
    this.setAttribute("label", label);

    this.setAttribute("accesskey", parseAccessKey ? F.getAccessKey(value) : "");
};
Pencil.behaviors.Disabled = function (disabled) {
    this.setAttribute("disabled", disabled ? true : false);
    this.disabled = disabled ? true : false;
};

Pencil.behaviors.MaintainGlobalDef = function (id, contentFragement) {
    debug("MaintainGlobalDef");
    var pcanvas = Dom.findUpward(this, function (node) {
        return (node.localName == "pcanvas") && node.drawingLayer;
    });

    if (!pcanvas) {
        error("Failed to maintain def, pcanvas is not found.");
        return;
    }

    debug(pcanvas);

    var drawingLayer = pcanvas.drawingLayer;
    var defs = Dom.getSingle("./svg:defs[@id='" + id + "']", drawingLayer);

    if (defs) return;   //TODO: re-validate?

    debug("defs not found, create now");

    defs = this.ownerDocument.createElementNS(PencilNamespaces.svg, "defs");
    var contentFragement = this.ownerDocument == contentFragement.ownerDocument ? contentFragement : this.ownerDocument.importNode(contentFragement, true);
    defs.appendChild(contentFragement);
    defs.setAttribute("id", id);

    var firstChild = drawingLayer.firstChild;
    if (firstChild) {
        drawingLayer.insertBefore(defs, firstChild);
    } else {
        drawingLayer.appendChild(defs);
    }
};

/* n-Patch supports */

function imageNodeForPatch(patch, x, y, w, h) {
    return {
        _name: "image",
        _uri: PencilNamespaces.svg,
        x: x,
        y: y,
        width: w,
        height: h,
        preserveAspectRatio: "none",
        //transform: "translate(" + x + ", " + y + ") scale(" + (w / patch.w) + ", " + (h / patch.h) + ")",
        "xlink:href": patch.url
    };
}

/**
 * Build the DOM fragment that can be used to render the n-Patch within the provided dimension
 * @param np
 * @param dim
 * @returns the dom fragement
 */
function buildNPatchDomFragment(np, dim) {
    var n = np.patches.length;
    if (n == 0) return null;
    var m = np.patches[0].length;
    
    var specs = [];
    var totalFlexW = 0;
    var totalFlexH = 0;
    for (var j = 0; j < m; j ++) {
        var p = np.patches[0][j];
        if (p.scaleX) totalFlexW += p.w;
    }
    for (var i = 0; i < n; i ++) {
        var p = np.patches[i][0];
        if (p.scaleY) totalFlexH += p.h;
    }
    
    var targetScaleX = dim.w - (np.w - totalFlexW);
    var targetScaleY = dim.h - (np.h - totalFlexH);
    var rX = targetScaleX / totalFlexW;
    var rY = targetScaleY / totalFlexH;
    
    var x = 0;
    var y = 0;
    var accumulatedScaleW = 0;
    var accumulatedScaleH = 0;
    for (var i = 0; i < n; i ++) {
        x = 0;
        accumulatedScaleW = 0;
        var lastH = 0;
        var scaledY = false;
        for (var j = 0; j < m; j ++) {
            var p = np.patches[i][j];
            
            var w = p.w;
            var h = p.h;
            
            if (p.scaleX) {
                w = (j == np.lastScaleX) ? targetScaleX - accumulatedScaleW : Math.floor(p.w * rX);
                accumulatedScaleW += w;
            }
            if (p.scaleY) {
                h = (i == np.lastScaleY) ? targetScaleY - accumulatedScaleH : Math.floor(p.h * rY);
                scaledY = true;
            }
            
            specs.push(imageNodeForPatch(p, x, y, w, h));
            
            x += w;
            lastH = h;
        }
        y += lastH;
        if (scaledY) accumulatedScaleH += lastH;
    }
    
    return Dom.newDOMFragment(specs);
}

function getNPatchBound(np, dim) {
    return new Bound(np.p1.x, np.p1.y, dim.w - np.p1.x - (np.w - np.p2.x), dim.h - np.p1.y - (np.h - np.p2.y));
}

Util.importSandboxFunctions(buildNPatchDomFragment, imageNodeForPatch, getNPatchBound);

Pencil.behaviors.NPatchDomContent = function (nPatch, dim) {
    Dom.empty(this);
    this.appendChild(buildNPatchDomFragment(nPatch, dim));
};








