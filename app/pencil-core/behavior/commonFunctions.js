var F = {};
pencilSandbox.F = F;

Pencil.findObjectByName = function (ref, name) {
    var shape = Dom.findTop(ref, function (node) {
                    return node.getAttributeNS && node.getAttributeNS(PencilNamespaces.p, "type") == "Shape";
                });

    var target = Dom.getSingle(".//*[@p:name='" + name + "']", shape);

    return target;
};
Pencil.findObjectById = function (ref, id) {
    var shape = Dom.findTop(ref, function (node) {
        return node.getAttributeNS && node.getAttributeNS(PencilNamespaces.p, "type") == "Shape";
    });

    var target = Dom.getSingle(".//*[@id='" + id + "']", shape);

    return target;
};
F.richTextSize = function (name) {
    var target = Pencil.findObjectByName(this._target, name);
    if (!target) return new Dimension(0, 0);

    var c = target.firstChild;
    if (!c) return new Dimension(0, 0);

    var tm = Util.textMetrics(c);
    var dim = new Dimension(tm.width, tm.height);

    return dim;
}
F.textSize = function (name) {
    var target = Pencil.findObjectByName(this._target, name);
    if (!target) return new Dimension(0, 0);

    var bbox = target.getBBox();
    var dim = new Dimension(bbox.width, bbox.height);
    return dim;
};

F.findObjectByName = Pencil.findObjectByName;

F.getObjectBoundingBox = function (name) {
    var target = Pencil.findObjectByName(this._target, name);
    if (!target) return new {x:0, y: 0, w: 0, h: 0};

    var bbox = target.getBBox();
    return {x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height};
};


F.elementSize = function (name) {
    var target = Pencil.findObjectByName(this._target, name);
    if (!target || target.namespaceURI != PencilNamespaces.html) return new Dimension(0, 0);

    var dim = new Dimension(target.offsetWidth, target.offsetHeight);
    return dim;
};

F.getRelativeLocation = function (handle, box) {
    if (box.w == 0) return "top";

    var y1 = (box.h * handle.x) / box.w;    //y value at the y = h*x/w line
    var y2 = box.h - (box.h * handle.x / box.w); //y value the y = h - h*x/w line

    if (handle.y < y1) {
        return handle.y < y2 ? "top" : "right";
    } else {
        return handle.y < y2 ? "left" : "bottom";
    }
};
F.rotate = function(a, o, rad) {
    return {
        x: (a.x - o.x) * Math.cos(rad) - (a.y - o.y) * Math.sin(rad) + o.x,
        y: (a.x - o.x) * Math.sin(rad) - (a.y - o.y) * Math.cos(rad) + o.y
    };
};
F.newDOMElement = function (spec) {
    var e = spec._uri ? this._target.ownerDocument.createElementNS(spec._uri, spec._name) : this._target.ownerDocument.createElement(spec._name);

    for (name in spec) {
        if (name.match(/^_/)) continue;
        e.setAttribute(name, spec[name]);
    }

    if (spec._text) {
        e.appendChild(e.ownerDocument.createTextNode(spec._text));
    }
    if (spec._children && spec._children.length > 0) {
        e.appendChild(F.newDOMFragment(spec._children));
    }

    return e;
};
F.newDOMFragment = function (specs) {
    var f = this._target.ownerDocument.createDocumentFragment();

    for (var i in specs) {
        f.appendChild(this.newDOMElement(specs[i]));
    }
    return f;
};

F.thirdPoint = function(a, b, r, m) {
    var ab = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    if (ab == 0) return {x: 0, y: 0};

    var l = (m.match && m.match(/^([0-9\.]+)%$/)) ? (ab * parseFloat(RegExp.$1) * 0.01) : m;
    var d = l / ab;

    var c1 = {
        x: (a.x - b.x) * d,
        y: (a.y - b.y) * d
    };

    var c2 = {
        x: c1.x * Math.cos(r) - c1.y * Math.sin(r) + b.x,
        y: c1.x * Math.sin(r) + c1.y * Math.cos(r) + b.y
    };

    return c2;
};
F.lineLength = function(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
};
F.pieConstraintFunction = function(a, b, box) {

    var r = Math.atan((box.h / 2 - a.y) / (box.w / 2 - a.x));

    var rx = box.w / 2;
    var ry = box.h / 2;

    var alpha = Math.atan2(b.y - ry, b.x - rx);

    var co = Math.cos(alpha);
    var si = Math.sin(alpha);

    var m = Math.sqrt(ry * ry * co * co + rx * rx * si * si);
    var r = rx * ry / m;

    var x = r * co + rx;
    var y = r * si + ry;

    F._lastBox = box;
    F._lastB = b;

    return {
        x: x, y: y
    };
};
// get angle made by vector v1 and v2
F.angle = function(v1, v2) {
    var cosa = (v1.x*v2.x + v1.y*v2.y) / (Math.sqrt(v1.x*v1.x + v1.y*v1.y) * Math.sqrt(v2.x*v2.x + v2.y*v2.y));
    var r = Math.acos(cosa);
    return r;
};
F.reflect = function(x, o) {
    return {
        x: 2*o.x - x.x,
        y: 2*o.y - x.y
    };
};
F.debug = function(o) {
    alert(o);
};
F.stripAccessKey = function (label) {
    return label.replace(/_([^_])/, function (zero, one) { return one; })
                .replace(/__/g, "_");
};
F.getAccessKey = function (label) {
    if (label.match(/_([^_])/)) return RegExp.$1;

    return "";
};
F.parseTextArray = function (text) {
    var lines = text.split(/[\r\n]+/);
    var a = [];
    for (var i = 0; i < lines.length; i++) {
        a.push(lines[i].split(/\|/));
    }

    return a;
};
F.buildTextWrapDomContent = function (textElement, text, width, align) {
    var lines = text.split("\n");
    var tspans = [];
    var lastHeight = 0;
    var lastLineHeight = 0;
    for (var j = 0; j < lines.length; j ++) {
        var line = lines[j];
        if (line.length == 0) {
            lastHeight += lastLineHeight;
            continue;
        }
        var words = line.split(' ');
        var i = 0;
        var s = "";
        var lastBBoxWidth = 0;
        while (i < words.length) {
            if (s.length > 0) s += " ";
            s += words[i];

            Dom.empty(textElement);
            textElement.appendChild(textElement.ownerDocument.createTextNode(s));
            var box = textElement.getBBox();

            i ++;

            if (box.width < width) {
                lastBBoxWidth = box.width;
                continue;
            }

            //now add the tspan

            var index = s.lastIndexOf(" ");
            var line = "";

            if (index > 0) {
                line = s.substring(0, index);
                i --;
            } else {
                line = s;
                lastBBoxWidth = box.width;
            }
            s = "";

            tspans.push({
                _name: "tspan",
                _uri: "http://www.w3.org/2000/svg",
                _text: line,
                x: (align ? align.h : 0) * (width - lastBBoxWidth) / 2,
                y: lastHeight
            });

            lastHeight += box.height;
            lastLineHeight = box.height;

        }
        if (s.length > 0) {
            Dom.empty(textElement);
            textElement.appendChild(textElement.ownerDocument.createTextNode(s));
            var box = textElement.getBBox();

            tspans.push({
                _name: "tspan",
                _uri: "http://www.w3.org/2000/svg",
                _text: s,
                x: (align ? align.h : 0) * (width - box.width) / 2,
                y: lastHeight
            });
            lastHeight += box.height;
        }

    }
    var frag = Dom.newDOMFragment(tspans, textElement.ownerDocument);

    return frag;
};
