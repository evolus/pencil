function SVGHTMLRenderer() {
    this.defaultBlockHandler = SVGHTMLRenderer.HANDLERS.div;
    this.defaultStyle = {
        fontFamily: "Arial, sans-serif",
        fontSize: "12pt",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        textTransform: "none",
        lineHeight: 0,
        color: null,
        backgroundColor: null
    };

    SVGHTMLRenderer.prepare();
}
SVGHTMLRenderer.prototype.isInline = function (node) {
    var display = node.ownerDocument.defaultView.getComputedStyle(node).display;
    return (display == "inline" || display == "inline-block");
};
SVGHTMLRenderer.prototype.layout = function (nodes, view, outmost) {
    var layouts = [];
    var inlines = [];
    for (var i = 0; i < nodes.length; i ++) {
        var node = nodes[i];
        if (node.nodeType == Node.TEXT_NODE) {
            if (inlines.length > 0 && inlines[inlines.length - 1].nodeType == Node.TEXT_NODE) {
                var n = inlines[inlines.length - 1];
                n._combinedValue += node.nodeValue || "";
            } else {
                node._combinedValue = node.nodeValue || "";
                inlines.push(node)
            }
        } else if (this.isInline(node)) {
            inlines.push(node);
        } else {
            var childView = {
                x: view.x,
                y: SVGHTMLRenderer._findBottom(layouts, view.y, 0),
                width: view.width
            }
            //flush current pending inlines
            if (inlines.length > 0) {
                var inlineLayouts = this.createInlineLayout(inlines, childView);
                if (inlineLayouts && inlineLayouts.length > 0) {
                    layouts = layouts.concat(inlineLayouts);
                    childView.y = SVGHTMLRenderer._findBottom(inlineLayouts, childView.y, 0);
                }

                inlines = [];
            }
            var handler = this.getHandler(node.localName) || this.defaultBlockHandler;
            var blockLayouts = handler.call(this, node, childView, layouts);
            if (blockLayouts && blockLayouts.length > 0) {
                layouts = layouts.concat(blockLayouts);
            }
        }
    }
    //if there are still pending inlines to commit
    if (inlines.length > 0) {
        childView = {
            x: view.x,
            y: view.y,
            width: view.width
        }

        if (layouts.length > 0) {
            var previous = layouts[layouts.length - 1];
            childView.y = previous.y + previous.height;
        }

        var inlineLayouts = this.createInlineLayout(inlines, childView);
        if (inlineLayouts && inlineLayouts.length > 0) {
            layouts = layouts.concat(inlineLayouts);
        }

        inlines = [];
    }
    return layouts;
};
SVGHTMLRenderer.prototype.createInlineLayout = function (nodes, view) {
    var layout = new SVGTextLayout(view.width);
    var hAlign = 0;
    if (nodes.length > 0) {
        var parentNode = nodes[0].parentNode;
        if (parentNode) {
            var align = parentNode.ownerDocument.defaultView.getComputedStyle(parentNode).textAlign;
            if (align == "center") {
                hAlign = 1;
            } else if (align == "right") {
                hAlign = 2;
            }
        }
    }
    layout.hAlign = hAlign;
    layout.vAlign = 0;
    layout.x = view.x;
    layout.y = view.y;
    layout.defaultStyle = this.defaultStyle;

    layout.appendNodeList(nodes);
    return [layout];
}
SVGHTMLRenderer.prototype.getHandler = function (nodeName) {
    return SVGHTMLRenderer.HANDLERS[nodeName];
};

SVGHTMLRenderer.COMMON_HEADING_HANDLER = function (node, view, preceedingLayouts) {
    var margin = SVGTextLayout.measure(node, "xxx", this.defaultStyle).h;

    var contentView = {
        x: view.x,
        y: SVGHTMLRenderer._findBottom(preceedingLayouts, view.y, margin),
        width: view.width
    }
    var layouts = this.layout(node.childNodes, contentView);

    var blank = new BlankLayout(view.x, SVGHTMLRenderer._findBottom(layouts, view.y), 0, 0);
    blank.marginBottom = margin;
    return layouts ? (layouts.concat([blank])) : [blank];
};
SVGHTMLRenderer._findBottom = function (layouts, defaultValue, marginTop) {
    if (!layouts || layouts.length <= 0) return defaultValue;
    var bottom = null;
    for (var layout of layouts) {
        var b = layout.y + layout.height + Math.max(layout.marginBottom || 0, marginTop || 0);
        if (bottom == null || b > bottom) bottom = b;
    }

    return bottom;
};
SVGHTMLRenderer.LIST_HANDLER = function (node, view) {
    var parentComputedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    var marginTop  = parseFloat(parentComputedStyle.marginTop);
    var marginBottom  = parseFloat(parentComputedStyle.marginBottom);
    var layouts = [new BlankLayout(view.x, view.y, marginTop, marginTop)];

    var itemIndex = 0;

    for (var i = 0; i < node.childNodes.length; i ++) {
        var c = node.childNodes[i];
        if (c.nodeType == Node.TEXT_NODE) continue;
        computedStyle = node.ownerDocument.defaultView.getComputedStyle(c);
        size = SVGTextLayout.measure(c, "x", computedStyle);
        var bottom = SVGHTMLRenderer._findBottom(layouts, view.y);
        var listStyleType = computedStyle.listStyleType;

        var padding = size.w * 4;

        var childView = {
            x: view.x + padding,
            y: bottom,
            width: view.width - padding
        }

        if (c.localName != "li") {
            if (c.nodeType == Node.ELEMENT_NODE) {
                layouts = layouts.concat(this.layout([c], childView))
            }
            continue;
        };

        var bulletSize = size.h / 3;
        if (!c.firstElementChild || (c.firstElementChild.localName != "ul" && c.firstElementChild.localName != "ol")) {
            if (listStyleType == "decimal") {
                var bulletWidth = size.w * 3.5;
                var layout = new SVGTextLayout(bulletWidth);
                layout.hAlign = 2;
                layout.vAlign = 0;
                layout.x = view.x;
                layout.y = bottom;
                layout.defaultStyle = this.defaultStyle;

                var span = c.ownerDocument.createElementNS(PencilNamespaces.html, "span");
                span.appendChild(c.ownerDocument.createTextNode("" + (++ itemIndex) + "."));

                for (var name in this.defaultStyle) {
                    var value = parentComputedStyle[name];
                    if (value) span.style[name] = value;
                }

                layout.appendNodeList([span]);
                layouts.push(layout);
            } else {
                var circle = (listStyleType == "circle");
                layouts.push({
                    x: view.x + size.w * 2, y: bottom + (size.h - bulletSize) / 2, height: bulletSize,
                    renderInto: function (container) {
                        var rect = container.ownerDocument.createElementNS(PencilNamespaces.svg, "rect");
                        rect.setAttribute("x", this.x);
                        rect.setAttribute("y", this.y);
                        rect.setAttribute("width", this.height);
                        rect.setAttribute("rx", this.height / 2);
                        rect.setAttribute("ry", this.height / 2);
                        rect.setAttribute("height", this.height);
                        rect.setAttribute("stroke", circle ? computedStyle.color : "none");
                        rect.setAttribute("fill", circle ? "none" : computedStyle.color);
                        if (circle) rect.setAttribute("stroke-width", "1px");
                        container.appendChild(rect);
                    }
                });
            }
        }
        layouts = layouts.concat(this.layout(c.childNodes, childView));
    }

    layouts.push(new BlankLayout(view.x, SVGHTMLRenderer._findBottom(layouts, view.y), marginBottom, marginBottom));

    return layouts;
};

SVGHTMLRenderer.HANDLERS = {
    div: function (node, view) {
        return this.layout(node.childNodes, view);
    },
    p: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h1: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h2: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h3: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h4: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h5: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    h6: SVGHTMLRenderer.COMMON_HEADING_HANDLER,
    blockquote: function (node, view, preceedingLayouts) {
        var size = SVGTextLayout.measure(node, "x", this.defaultStyle);

        var contentView = {
            x: view.x + size.w * 4,
            y: SVGHTMLRenderer._findBottom(preceedingLayouts, view.y, size.h),
            width: view.width - size.w * 4
        }
        var layouts = this.layout(node.childNodes, contentView);

        if (layouts && layouts.length > 0) {
            var layout = layouts[layouts.length - 1];
            layout.marginBottom = Math.max(layout.marginBottom || 0, size.h);
        }

        return layouts;
    },
    ul: SVGHTMLRenderer.LIST_HANDLER,
    ol: SVGHTMLRenderer.LIST_HANDLER,
    hr: function (node, view, preceedingLayouts) {
        var size = SVGTextLayout.measure(node, "x", this.defaultStyle);
        var computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
        return [
            {
                x: view.x, y: SVGHTMLRenderer._findBottom(preceedingLayouts, view.y, size.h / 2), height: 1, marginBottom: size.h / 2,
                renderInto: function (container) {
                    var rect = container.ownerDocument.createElementNS(PencilNamespaces.svg, "rect");
                    rect.setAttribute("x", this.x);
                    rect.setAttribute("y", this.y);
                    rect.setAttribute("width", view.width);
                    rect.setAttribute("height", 1);
                    rect.setAttribute("stroke", "none");
                    rect.setAttribute("fill", computedStyle.color);
                    container.appendChild(rect);
                }
            }
        ];
    }
};

SVGHTMLRenderer.STYLE_NAME_MAP = {
    fill: "color"
}
SVGHTMLRenderer.prototype.importDefaultStyleFromNode = function (node) {
    for (var name in this.defaultStyle) {
        var value = node.style[name];
        if (value) this.defaultStyle[SVGHTMLRenderer.STYLE_NAME_MAP[name] || name] = value;
    }
};
SVGHTMLRenderer.prototype.renderHTML = function (html, container, view) {
    var doc = container.ownerDocument;
    if (!doc.body) doc = document;
    var div = doc.createElementNS(PencilNamespaces.html, "div");
    div.style.position = "absolute";
    div.style.display = "none";
    div.style.textAlign = ["left", "center", "right"][this.hAlign || 0];
    doc.body.appendChild(div);

    for (var styleName in this.defaultStyle) {
        var value = this.defaultStyle[styleName];
        if (value != null) {
            div.style[styleName] = value;
        }
    }

    div.innerHTML = html;
    this.render(div.childNodes, container, view);

    div.parentNode.removeChild(div);
};
SVGHTMLRenderer.prototype.render = function (nodes, container, view) {
    Dom.empty(container);
    var layouts = this.layout(nodes, view);
    if (!layouts || layouts.length == 0) return;

    var vAlign = (typeof(this.height) == "number") ? this.vAlign || 0 : 0;
    var dy = 0;
    var target = container;
    if (vAlign > 0) {
        var last = layouts[layouts.length - 1];
        var height = last.y + last.height - (view.y || 0);
        dy = Math.round((this.height - height) * vAlign / 2);
        var target = container.ownerDocument.createElementNS(PencilNamespaces.svg, "g");
        target.setAttribute("transform", "translate(0," + dy + ")");
        container.appendChild(target);
    }
    for (var layout of layouts) {
        layout.renderInto(target);
    }
};

SVGHTMLRenderer.prepare = function () {
    if (SVGHTMLRenderer.svg) return;
    SVGHTMLRenderer.svg = document.createElementNS(PencilNamespaces.svg, "svg");
    SVGHTMLRenderer.svg.setAttribute("version", "1.0");
    SVGHTMLRenderer.svg.setAttribute("width", "1");
    SVGHTMLRenderer.svg.setAttribute("height", "1");
    SVGHTMLRenderer.svg.style.visibility = "hidden";
    SVGHTMLRenderer.svg.style.position = "absolute";
    SVGHTMLRenderer.svg.style.top = "0px";
    SVGHTMLRenderer.svg.style.left = "0px";

    document.body.appendChild(SVGHTMLRenderer.svg);
    SVGTextLayout.prepare(SVGHTMLRenderer.svg);
}
SVGHTMLRenderer.cleanup = function () {
    SVGTextLayout.cleanup();
}

function BlankLayout(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};
BlankLayout.prototype.renderInto = function () {};

function SVGTextLayout(width) {
    this.rows = [];
    this.extraDirectStyles = ["backgroundColor"];
    this.styleNameMap = {
        color: "fill"
    };

    this.currentRow = null;
    this.width = width || Number.MAX_VALUE;
}
SVGTextLayout.prepare = function (svg) {
    SVGTextLayout.textNode = svg.ownerDocument.createElementNS(PencilNamespaces.svg, "text");
    svg.appendChild(SVGTextLayout.textNode);

    SVGTextLayout.tspan = svg.ownerDocument.createElementNS(PencilNamespaces.svg, "tspan");
    SVGTextLayout.textNode.appendChild(SVGTextLayout.tspan);
};
SVGTextLayout.cleanup = function () {
    if (!SVGTextLayout.textNode) return;
    SVGTextLayout.textNode.parentNode.removeChild(SVGTextLayout.textNode);
}

SVGTextLayout.prototype.newLine = function (shift) {
    var top = 0;
    if (this.currentRow) top = this.currentRow.y + this.currentRow.height + (shift || 0);
    this._createNewRow(top);
};
SVGTextLayout.prototype._createNewRow = function (top) {
    this.currentRow = {
        y: top,
        x: 0,
        width: 0,
        height: 0,
        wordCount: 0,
        baselineShift: 0,
        segments: []
    };
    this.rows.push(this.currentRow);
};
SVGTextLayout.measure = function (node, text, defaultStyle) {
    var computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    for (var styleName in defaultStyle) {
        var value = computedStyle[styleName] || defaultStyle[styleName];
        if (value != null) {
            SVGTextLayout.tspan.style[styleName] = value;
        } else {
            delete SVGTextLayout.tspan.style[styleName];
        }
    }

    Dom.empty(SVGTextLayout.tspan);
    SVGTextLayout.tspan.appendChild(SVGTextLayout.tspan.ownerDocument.createTextNode(text));
    var box = SVGTextLayout.textNode.getBBox();

    return {
        w: box.width,
        h: box.height
    }
};
SVGTextLayout.prototype.add = function (text, styles, respectNewlinesAndSpaces) {
    if (!respectNewlinesAndSpaces) {
        text = text.replace(/[ \r\n]{2,}$/, " ");
        if (text.match(/^[ ]+$/)) return;
        text = text.replace(/^ /, "\u00A0").replace(/ $/, "\u00A0");
        text = text.replace(/[\r\n]/g, "\n").replace(/[\r]/g, "\n").replace(/\n/g, " ");
    } else {
        text = text.replace(/\t/g, "    ").replace(/ /, "\u00A0");
    }

    if (!this.currentRow) this.newLine();

    var lineHeightFactor = 0;
    var fontSize = 10;

    var lineHeightValue = this.defaultStyle.lineHeight;
    if (lineHeightValue) {
        lineHeightFactor = parseFloat(lineHeightValue);
    }

    for (var styleName in this.defaultStyle) {
        var value = styles[styleName] || this.defaultStyle[styleName];
        if (value != null) {
            SVGTextLayout.tspan.style[styleName] = value;
            if (styleName == "fontSize") {
                fontSize = Font.parsePixelHeight(value);
            }
        } else {
            delete SVGTextLayout.tspan.style[styleName];
        }
    }

    var lineHeight = fontSize * lineHeightFactor;

    // this.tspan.style.fontFamily = "";
    // this.tspan.style.fontFamily = styles.fontFamily || this.defaultStyle.fontFamily;

    text = text.replace(/[\r\n]/g, "\n").replace(/[\r]/g, "\n");
    var lines = text.split(/[\n]/);
    for (var j = 0; j < lines.length; j ++) {
        var line = lines[j];
        if (respectNewlinesAndSpaces && j > 0) this.newLine();

        if (line.length == 0) {
            continue;
        }

        var words = line.split(" ");
        var i = 0;
        var s = "";
        var box = null;
        while (i < words.length) {
            var originalS = s;
            var previousBBox = box;
            if (s.length > 0) s += " ";

            var word = words[i]; //.replace(/\u00A0/g, " ");

            s += word;

            Dom.empty(SVGTextLayout.tspan);
            SVGTextLayout.tspan.appendChild(SVGTextLayout.tspan.ownerDocument.createTextNode(s));
            box = SVGTextLayout.textNode.getBBox();
            // console.log("testing '" + s + "' w: " + box.width + " new line width = " + (box.width + this.currentRow.width), box);

            if ((box.width + this.currentRow.width) < this.width || this.currentRow.wordCount == 0) {
                //console.log(" > added");
                i ++;
                this.currentRow.wordCount ++;
                continue;
            }

            //console.log(" > oveflow, commit current line");

            //commit the segment
            if (originalS.length > 0) {
                this._appendSegment(originalS, styles, previousBBox || box, lineHeight);
            }

            s = "";
            this.newLine();
        }

        if (s.length > 0) {
            this._appendSegment(s, styles, box, lineHeight);
        }
    }
};
Object.defineProperty(SVGTextLayout.prototype, "height", {
    get: function () {
        if (!this.rows || this.rows.length == 0) return 0;
        var last = this.rows[this.rows.length - 1];
        return last.y + last.height;
    }
});
SVGTextLayout.prototype._appendSegment = function (text, styles, bbox, adjustedLineHeight) {
    var h = bbox.height;
    var dy = bbox.y;
    if (adjustedLineHeight > 0) {
        dy -= (adjustedLineHeight - h) / 2;
        h = adjustedLineHeight;
    }
    var segment = {
        text: text,
        styles: styles,
        x: this.currentRow.width,
        dy: dy,
        width: bbox.width,
        height: h
    };

    this.currentRow.segments.push(segment);
    this.currentRow.width += segment.width;
    this.currentRow.height = Math.max(this.currentRow.height, segment.height);
    this.currentRow.baselineShift = Math.max(this.currentRow.baselineShift, 0 - segment.dy);
};

SVGTextLayout.prototype.renderInto = function (container) {
    var x = this.x;
    var y = this.y;
    var hAlign = this.hAlign || 0;
    var vAlign = (typeof(this.height) == "number") ? this.vAlign || 0 : 0;
    var dy = 0;
    if (vAlign > 0) {
        var height = 0;
        for (var row of this.rows) {
            height += row.height;
        }
        dy = Math.round((this.height - height) * vAlign / 2);
    }

    var text = container.ownerDocument.createElementNS(PencilNamespaces.svg, "text");

    for (var row of this.rows) {
        var ry = y + row.y + dy + row.baselineShift;
        var dx = Math.round((this.width - row.width) * hAlign / 2);
        for (var segment of row.segments) {
            var tspan = document.createElementNS(PencilNamespaces.svg, "tspan");
            tspan.appendChild(document.createTextNode(segment.text));
            tspan.setAttribute("x", Math.round(segment.x + dx + x));
            tspan.setAttribute("y", Math.round(ry));

            for (var styleName in this.defaultStyle) {
                var value = segment.styles[styleName] || this.defaultStyle[styleName];
                if (styleName == "backgroundColor" && value != "rgba(0, 0, 0, 0)") {
                    var rect = document.createElementNS(PencilNamespaces.svg, "rect");
                    rect.setAttribute("stroke", "none");
                    rect.setAttribute("fill", value);
                    rect.setAttribute("x", segment.x + dx + x);
                    rect.setAttribute("y", ry - row.baselineShift);
                    rect.setAttribute("width", segment.width);
                    rect.setAttribute("height", segment.height);
                    container.appendChild(rect);
                }
                if (value != null) {
                    tspan.style[this.styleNameMap[styleName] || styleName] = value;
                }
            }
            tspan.setAttribute("style", tspan.style.cssText);
            text.appendChild(tspan);
        }
    }
    container.appendChild(text);
};
SVGTextLayout.prototype.addHTML = function (html) {
    var div = document.createElement("div");
    for (var name in this.defaultStyle) {
        var value = this.defaultStyle[name];
        if (value) div.style[name] = value;
    }

    div.style.position = "absolute";
    div.style.display = "none";
    document.body.appendChild(div);
    div.innerHTML = html;

    this._addDomContent(div);
    div.parentNode.removeChild(div);
};

SVGTextLayout.prototype.appendNodeList = function (nodes) {
    var computedStyle = null;
    var isBlock = false;

    for (var i = 0; i < nodes.length; i ++) {
        var node = nodes[i];
        if (node.nodeType == Node.TEXT_NODE) {
            if (!computedStyle) {
                computedStyle = node.ownerDocument.defaultView.getComputedStyle(node.parentNode);
                isBlock = computedStyle.display == "block";
            }

            var styles = {};
            for (var name in this.defaultStyle) {
                styles[name] = computedStyle[name];
            }
            for (var name of this.extraDirectStyles) {
                var value = node.parentNode.style[name];
                if (value) styles[name] = value;
            }
            var text = node._combinedValue || node.nodeValue;
            if (node == node.parentNode.firstChild && isBlock) text = text.replace(/^[ \t\r\n]+/, "");
            var respectNewlines = computedStyle.whiteSpace && computedStyle.whiteSpace.indexOf("pre") == 0;
            this.add(text, styles, respectNewlines);
        } else if (node.nodeType == Node.ELEMENT_NODE) {
            if (node.localName.toLowerCase() == "br") {
                var height = SVGTextLayout.measure(node, "x", this.defaultStyle).h;

                if (this.currentRow && this.currentRow.height == 0) {
                    this.currentRow.height = height;
                }

                this.newLine();

                if (i == 0) {
                    this.currentRow.height = height;
                }
            } else {
                this.appendNodeList(node.childNodes);
            }
        }
    }
};
SVGTextLayout.prototype._addDomContentxxxx = function (contentNode) {
    var computedStyle = contentNode.ownerDocument.defaultView.getComputedStyle(contentNode);
    var isBlock = computedStyle.display == "block";
    if (isBlock && this.currentRow && this.currentRow.segments.length > 0) {
        this.newLine(parseFloat(computedStyle.marginTop) || 0);
    }

    for (var i = 0; i < contentNode.childNodes.length; i ++) {
        var node = contentNode.childNodes[i];
        if (node.nodeType == Node.TEXT_NODE) {
            var styles = {};
            for (var name in this.defaultStyle) {
                styles[name] = computedStyle[name];
            }
            for (var name of this.extraDirectStyles) {
                var value = contentNode.style[name];
                if (value) styles[name] = value;
            }
            var text = node.nodeValue;
            if (node == node.parentNode.firstChild && isBlock) text = text.replace(/^[ \t\r\n]+/, "");
            var respectNewlines = computedStyle.whiteSpace && computedStyle.whiteSpace.indexOf("pre") == 0;
            this.add(text, styles, respectNewlines);
        } else if (node.nodeType == Node.ELEMENT_NODE) {
            this._addDomContent(node);
        }
    }
    if (isBlock && this.currentRow && this.currentRow.segments.length > 0) this.newLine(parseFloat(computedStyle.marginBottom) || 0);
};
