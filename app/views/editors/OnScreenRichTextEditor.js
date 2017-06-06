function OnScreenRichTextEditor() {
    BaseTemplatedWidget.call(this);

    this.popup.allowMouseDragging = true;
    this.acMenu = new Menu();
}
__extend(BaseTemplatedWidget, OnScreenRichTextEditor);

Pencil.registerEditor(OnScreenRichTextEditor);

OnScreenRichTextEditor.isEditing = false;
OnScreenRichTextEditor._initialized = false;
OnScreenRichTextEditor._activeEditor = null;

OnScreenRichTextEditor.prototype.initialize = function () {
	this.popup.hide();
};
OnScreenRichTextEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.onScreenEditors.push(this);
    this.textToolOverlay.editor = this.textEditor;
    this.initialize();

    var thiz = this;

    this.canvas.addEventListener("p:ShapeInserted", function (ev) {
        if (thiz.passivated) {
            thiz.canvas.removeEventListener("p:ShapeInserted", arguments.callee, false);
            return;
        }
        thiz.handleShapeDoubleClicked(ev);
    }, false);
    this.canvas.addEventListener("p:ShapeDoubleClicked", function (ev) {
        if (thiz.passivated) {
            thiz.canvas.removeEventListener("p:ShapeDoubleClicked", arguments.callee, false);
            return;
        }
        thiz.handleShapeDoubleClicked(ev);
    }, false);

    this.canvas.addEventListener("p:TextEditingRequested", function (ev) {
        if (thiz.passivated) {
            thiz.canvas.removeEventListener("p:TextEditingRequested", arguments.callee, false);
            return;
        }
        thiz.handleShapeDoubleClicked(ev);
    }, false);

    this.popup.addEventListener("p:PopupHidden", function (event) {
        thiz.commitChange(event);
    }, false);
    var thiz = this;

    this.bind("keydown", this.handleACKeyDown, this.container);
    this.bind("keypress", this.handleKeyPress, this.container);
    this.bind("keyup", this.handleKeyPress, this.container);
    this.bind("input", this.handleInput, this.container);
};
OnScreenRichTextEditor.prototype.addEditorEvent = function (name, handler) {
	this.textEditor.addEventListener(name, handler, false);
};
OnScreenRichTextEditor.prototype.attach = function (targetObject) {
};
OnScreenRichTextEditor.prototype.invalidate = function () {
};
OnScreenRichTextEditor.prototype.nextTool = function () {
};
OnScreenRichTextEditor.prototype.dettach = function () {

};

OnScreenRichTextEditor.prototype.handleShapeDoubleClicked = function (event) {
    this.currentTarget = event.controller;
    if (!this.currentTarget) return;

    this.textEditingInfo = null;

    if (this.currentTarget.getContentEditActions) {
        var actions = this.currentTarget.getContentEditActions(event);
        if (actions.length == 0) return;

        var action = actions[0];
        if (action.type == "text") {
            this.textEditingInfo = action.editInfo;
        } else {
            this.currentTarget.handleOtherContentEditAction(action);
            return;
        }
    } else {
        if (!this.currentTarget.getTextEditingInfo) return;
        this.textEditingInfo = this.currentTarget.getTextEditingInfo(event);
    }

    if (!this.textEditingInfo || this.textEditingInfo.readonly) return;

    if (this.textEditingInfo.type == RichText) {
        //setup
        // console.log("currentTarget", this.currentTarget);
        this._lastTarget = this.currentTarget;
        try {
            this._setupEditor();
        } catch (e) {
            Console.dumpError(e, "stdout");
            alert(e);
        }
    }
};
OnScreenRichTextEditor.prototype._setupEditor = function () {
    var geo = this.canvas.getZoomedGeo(this.currentTarget);
    //Svg.ensureCTM(this.svgElement, geo.ctm);
    this.geo = geo;

    var bound = this.textEditingInfo.bound;
    var bbox = this.textEditingInfo.target.getBBox();
    var font = this.textEditingInfo.font;
    var align = this.textEditingInfo.align;

    var ctm = this.textEditingInfo.target.getScreenCTM();
    var svgCTM = this.canvas.svg.getScreenCTM();

    // mainStack boxObject
    var targetCtm = this.currentTarget.svg.getScreenCTM();

    //var x = ctm.e - boxObject.screenX + dx;
    //var y = ctm.f - boxObject.screenY + dy;
    var x = targetCtm.e;
    var y = targetCtm.f;

    var bbox = this.textEditingInfo.target.getBBox();

    var bw = Math.min(Math.max(bbox.width, 100), this.canvas.width);
    var bh = Math.min(Math.max(bbox.height, 20), this.canvas.height);

    var width = bw * this.canvas.zoom;
    var height = bh * this.canvas.zoom;

    if (this.textEditingInfo.bound) {
        x += this.textEditingInfo.bound.x * this.canvas.zoom - 1;
        y += this.textEditingInfo.bound.y * this.canvas.zoom - 1;
        width = Math.max(this.textEditingInfo.bound.w, bw) * this.canvas.zoom + 4;
        height = Math.max(this.textEditingInfo.bound.h, bh) * this.canvas.zoom + 4;

    }

    if (x < 0) {
        width += x;
        x = 0;
    }
    if (y < 0) {
        height += y;
        y = 0;
    }


    width = Math.max(width, 60);

    this.container.style.width = width + "px";
    this.container.style.height = height + "px";

    //this.foPane.setAttribute("transform", "scale(" + this.canvas.zoom + ")");

    //setup font
    //this.textEditor.style.marginLeft = "" + dx + "px";
    //this.textEditor.style.marginTop = "" + dy + "px";
    this.textEditorWrapper.style.width = "" + width + "px";
    Svg.setStyle(this.textEditorWrapper, "height", this.textEditingInfo.multi ? (height + "px") : null);
    Svg.setStyle(this.textEditor, "height", this.textEditingInfo.multi ? (height + "px") : null);

    this.textEditorWrapper.style.fontFamily = this.textEditingInfo.font.family;
    this.textEditorWrapper.style.fontSize = this.textEditingInfo.font.size.replace(/^([0-9\.]+)/, function (whole, one) {
        return (parseFloat(one) * this.canvas.zoom);
    }.bind(this));;
    this.textEditorWrapper.style.lineHeight = "1.1";
    this.textEditorWrapper.style.fontWeight = this.textEditingInfo.font.weight;
    this.textEditorWrapper.style.fontStyle = this.textEditingInfo.font.style;
    this.textEditorWrapper.style.textAlign = ["left", "center", "right"][align ? align.h : 0];

    this.textEditor.innerHTML = this.textEditingInfo.value.value;   //PlainText.value

    if (height < this.textEditingInfo.font.getPixelHeight() * 3) {
        this.textEditor.style.overflowX = "hidden";
    }

    this.popup.showAt(x, y);

    this.textToolOverlay._richTextEditor = this;
    this.textToolOverlay.node().style.visibility = "hidden";

    OnScreenRichTextEditor._activeEditor = this;

    var thiz = this;
    window.setTimeout(function () {
        thiz.textEditor.focus();
        thiz.textToolOverlay.runEditorCommand("styleWithCSS", true);
        thiz.textToolOverlay.runEditorCommand("selectAll");
        thiz.textToolOverlay.node().style.top = "-" + (thiz.textToolOverlay.node().offsetHeight + 8) + "px";
        thiz.textToolOverlay.node().style.visibility = "visible";
    }, 10);
};
OnScreenRichTextEditor.MIN_AC_LENGTH = 5;
OnScreenRichTextEditor.prototype.handleInput = function (event) {
    var selection = window.getSelection();
    if (!selection || !selection.anchorNode) {
        this.hideAutoComplete();
        return;
    }

    if (!this.container.contains(selection.anchorNode)) {
        this.hideAutoComplete();
        return;
    }
    if (selection.anchorOffset < OnScreenRichTextEditor.MIN_AC_LENGTH) {
        this.hideAutoComplete();
        return;
    }

    var textContent = selection.anchorNode.textContent;
    var text = textContent.substring(selection.anchorOffset - OnScreenRichTextEditor.MIN_AC_LENGTH, selection.anchorOffset);
    var acSet = this.getAutoCompleteSet(text, textContent == text);
    if (acSet && acSet.items && acSet.items.length > 0) {
        this.showAutoComplete(acSet, selection.anchorNode, selection.anchorOffset);
    } else {
        this.hideAutoComplete();
    }
};

OnScreenRichTextEditor.prototype.showAutoComplete = function (set, node, offset) {
    this.acMenu.items = [];
    function createItem(acItem) {
        var label = (typeof(acItem) == "string" ? acItem : (acItem.label || acItem.toString()));
        if (label.length > 40) label = label.substring(0, 40) + "... (" + label.length + " characters)";
        return {
            label: label,
            run: function () {
                var text = typeof(acItem) == "string" ? acItem : (acItem.content || acItem.toString());

                var textContent = node.textContent;
                var start = Math.max(0, offset - set.replacementSize);
                var newText = textContent.substring(0, start) + text + textContent.substring(offset);
                node.textContent = newText;
                var selection = window.getSelection();
                selection.collapseToStart();
                selection.extend(node, start + text.length);
                selection.collapseToEnd();
            }
        };
    }
    for (var acItem of set.items) {
        this.acMenu.register(createItem(acItem));
    }

    var anchorNode = node;
    if (!anchorNode.localName) anchorNode = anchorNode.parentNode;
    this.acSelectedItemIndex = -1;
    this.acMenu.showMenu(anchorNode, "left-inside", "bottom", 0, 5, true);
};
OnScreenRichTextEditor.prototype.hideAutoComplete = function () {
    this.acMenu.hideMenu();
};

//TODO: Refactor this into AC set registration from stencil
OnScreenRichTextEditor.prototype.getAutoCompleteSet = function (term, isFull) {
    if (term && term.toLowerCase() == "lorem") {
        var items = [
            getLoremWord(),
            loremIpsum(3),
            loremIpsum(5),
            loremIpsum(10),
            loremIpsum(20),
            loremIpsumParagraph(40)
        ];
        if (term.substring(0, 1) == "L") {
            if (term.toUpperCase() == term) {
                for (var i = 0; i < items.length; i ++) items[i] = items[i].toUpperCase();
            } else {
                for (var i = 0; i < items.length; i ++) items[i] = capitalize(items[i]);
            }
        }
        return {
            items: items,
            replacementSize: term.length
        }
    }

    return null;
};
OnScreenRichTextEditor.prototype.handleACKeyDown = function (event) {
    if (!this.acMenu.isVisible()) return;
    if (event.keyCode == DOM_VK_UP || event.keyCode == DOM_VK_DOWN) {
        var items = this.acMenu.getMenuItemNodes();
        if (event.keyCode == DOM_VK_DOWN) {
            this.acSelectedItemIndex ++;
            if (this.acSelectedItemIndex >= items.length) this.acSelectedItemIndex = 0;
        } else {
            this.acSelectedItemIndex --;
            if (this.acSelectedItemIndex < 0) this.acSelectedItemIndex = items.length - 1;
        }

        for (var i = 0; i < items.length; i ++) {
            if (i == this.acSelectedItemIndex) {
                items[i].setAttribute("selected", "true");
            } else {
                items[i].removeAttribute("selected");
            }
        }

        event.stopPropagation();
        event.preventDefault();
    } else if (event.keyCode == DOM_VK_RETURN || event.keyCode == DOM_VK_ENTER) {
        var items = this.acMenu.getMenuItemNodes();
        if (this.acSelectedItemIndex >= items.length || this.acSelectedItemIndex < 0) return;
        var item = items[this.acSelectedItemIndex]._item;
        if (item && item.run) item.run();
        this.hideAutoComplete();

        event.stopPropagation();
        event.preventDefault();

        this.cancelNextCommit = true;
    }
};
OnScreenRichTextEditor.prototype.handleKeyPress = function (event) {
    if (this.textToolOverlay.settingFont) {
        return;
    }

    if (event.keyCode == DOM_VK_RETURN && !event.shiftKey && !event.accelKey) {
        if (this.cancelNextCommit) {
            this.cancelNextCommit = false;
            return;
        }
        var insideList = null;
        try {
            var node = window.getSelection().anchorNode;
            insideList = Dom.findUpward(node, function (n) {
                return n.localName == "li";
            });
        } catch (e) {}

        if (!insideList || event.ctrlKey) {
            this.commitChange(event);
        }

    } else if (event.keyCode == DOM_VK_ESCAPE && this.popup == BaseWidget.getTopClosable()) {
        this.cancelChange();
        event.stopPropagation();
        event.preventDefault();
    }
};

OnScreenRichTextEditor.prototype.fixEditorContentStructure = function () {
    for (var i = 0; i < this.textEditor.childNodes.length; i ++) this.fixStructure(this.textEditor.childNodes[i]);
}
OnScreenRichTextEditor.prototype.fixStructure = function (e) {
    if (e.nodeType != Node.ELEMENT_NODE || e.localName.toLowerCase() != "span") return;
    if (this.isInline(e) && this.containsNonInline(e)) {
        var div = e.ownerDocument.createElementNS(PencilNamespaces.html, "div");
        if (e.hasAttribute("style")) div.setAttribute("style", e.getAttribute("style"));

        while (e.firstChild) {
            var c = e.firstChild;
            e.removeChild(c);
            div.appendChild(c);
        }

        e.parentNode.replaceChild(div, e);
    }

    for (var i = 0; i < e.childNodes.length; i ++) this.fixStructure(e.childNodes[i]);
};
OnScreenRichTextEditor.prototype.containsNonInline = function (e) {
    if (!e || !e.childNodes || e.childNodes.length <= 0) return false;
    for (var i = 0; i < e.childNodes.length; i ++) {
        var child = e.childNodes[i];
        if (child.nodeType != Node.ELEMENT_NODE) continue;
        if (!this.isInline(child)) return true;
        if (this.containsNonInline(child)) return true;
    }

    return false;
};
OnScreenRichTextEditor.prototype.isInline = function (node) {
    var display = node.ownerDocument.defaultView.getComputedStyle(node).display;
    return (display == "inline" || display == "inline-block");
};
OnScreenRichTextEditor.prototype.commitChange = function (event) {
    if (!this._lastTarget || !this.textEditingInfo) return;
    try {
        this.fixEditorContentStructure();
        var richText = new RichText(this.textEditor.innerHTML);
        this._lastTarget.setProperty(this.textEditingInfo.prop.name, richText);
        this.canvas.invalidateEditors(this);
    } finally {
        this.popup.hide("silent");
        this.textEditingInfo = null;
        window.setTimeout(function () {
            Pencil.activeCanvas.focus();
        }, 10);
    }
};
OnScreenRichTextEditor.prototype.cancelChange = function () {
    if (!this.textEditingInfo) return;
    this.popup.hide("silent");
    this.textEditingInfo = null;
    window.setTimeout(function () {
        Pencil.activeCanvas.focus();
    }, 10);
};
OnScreenRichTextEditor.prototype.getRichtextValue = function () {
    return this.textEditor.innerHTML;
    var html = Dom.serializeNode(this.textEditor.innerHTML);
    html = html.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
        return zero.toLowerCase();
    });
    if (html.match(/^<body[^>]*>([^\0]*)<\/body>$/)) {
        html = RegExp.$1;
    }
    return html;
};
OnScreenRichTextEditor.prototype.setRichtextValue = function (html) {
    this.textEditor.innerHTML = html;
};
