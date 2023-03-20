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
    if (spec._html) {
        e.innerHTML = spec._html;
    } else if (spec._text) {
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
/**
 * 
 * @param {object} textElement - an SVG element.
 * @param {string} text - the text to write, newlines '\n' will split into lines. 
 * @param {number} width - the width of the container used for automatic wrapping and alignment. 
 * @param {number} align - the text alignment, 0: left, 1: center, 2: right.
 * @param {boolean} [isWidthDynamic] - whether the width is dynamically sized (ignore width).
 */
F.buildTextWrapDomContent = function (textElement, text, width, align, isWidthDynamic) {
    const widths = []
    const strings = []
    const yOffsets = []

    var currentYOffset = 0
    var lastLineHeight = 0;
    var maxWidth = 0

    function measureText(str) {
        Dom.empty(textElement);
        textElement.appendChild(textElement.ownerDocument.createTextNode(str));
        var box = textElement.getBBox();
        return box
    }

    function measureAndSplitText() {

        const lines = text.split('\n')

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            if (line.length === 0) {
                currentYOffset += lastLineHeight
                continue
            }
            
            let boundingBox = measureText(line)

            // Happy-path, fits in 1 go
            const fits = boundingBox.width <= width
            if (fits) {
                if (boundingBox.width > maxWidth) {
                    maxWidth = boundingBox.width
                }
                widths.push(boundingBox.width)
                strings.push(line)
                yOffsets.push(currentYOffset)
                currentYOffset += boundingBox.height
                continue;
            }

            const words = line.split(' ')
            let wordIndex = 0
            let stringBuilder = ''
            let lastLine = ''
            let lastLineWidth = 0
            while (wordIndex < words.length) {
                if (stringBuilder.length > 0) {
                    stringBuilder += ' '
                }

                stringBuilder += words[wordIndex]
                wordIndex++;

                boundingBox = measureText(stringBuilder)
                if (boundingBox.width <= width) {
                    // The generated string is still within the max width, then just store
                    // it and try adding the next word.
                    lastLineWidth = boundingBox.width
                    lastLineHeight = boundingBox.height
                    lastLine = stringBuilder
                    continue;
                }

                // We exceeded the width in a single-word, append it anyway and continue
                if (lastLine === '') {
                    widths.push(boundingBox.width)
                    strings.push(stringBuilder)
                    yOffsets.push(currentYOffset)
                    currentYOffset += boundingBox.height
                    lastLineWidth = 0
                    lastLineHeight = 0
                    stringBuilder = ''
                    continue
                }

                // Adding the next word exceeded the allowable width, use the previous string.
                widths.push(lastLineWidth)
                strings.push(lastLine)
                yOffsets.push(currentYOffset)
                currentYOffset += lastLineHeight

                if (lastLineWidth > maxWidth) {
                    maxWidth = lastLineWidth
                }

                // Set the next word as the word we just tried which caused the width to be exceeded.
                wordIndex -= 1
                stringBuilder = ''
                lastLine = ''
                lastLineWidth = 0
                lastLineHeight = 0
            }

            if (stringBuilder.length > 0) {
                widths.push(lastLineWidth)
                strings.push(stringBuilder)
                yOffsets.push(currentYOffset)
                
                if (lastLineWidth > maxWidth) {
                    maxWidth = lastLineWidth
                }
                currentYOffset += lastLineHeight
                lastLineWidth = 0
            }
        }
    }

    measureAndSplitText()
    console.log('text is, dynamic is, max width is', text, isWidthDynamic, maxWidth)

    const tspans = [];
    for (let finalLineIndex = 0; finalLineIndex < strings.length; finalLineIndex++) {
        const str = strings[finalLineIndex];
        const w = widths[finalLineIndex];
        const y = yOffsets[finalLineIndex];
        
        var xMultiplier = (align ? align.h : 0)

        var widthToUse = isWidthDynamic ? maxWidth : width

        var x = xMultiplier * (widthToUse - w) / 2;
        tspans.push({
            _name: "tspan",
            _uri: "http://www.w3.org/2000/svg",
            _text: str,
            x:  x,
            y: y
        });
    }
    
    var frag = Dom.newDOMFragment(tspans, textElement.ownerDocument);

    return frag;
};
