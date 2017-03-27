function OnScreenTextEditor() {
    BaseTemplatedWidget.call(this);
}
__extend(BaseTemplatedWidget, OnScreenTextEditor);

Pencil.registerEditor(OnScreenTextEditor);

OnScreenTextEditor.isEditing = false;
OnScreenTextEditor._initialized = false;
OnScreenTextEditor._activeEditor = null;

OnScreenTextEditor.prototype.initialize = function () {
	this.popup.hide();
};
OnScreenTextEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.onScreenEditors.push(this);

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

    this.bind("keypress", this.handleKeyPress, this.container);
    this.bind("keyup", this.handleKeyPress, this.container);

};
OnScreenTextEditor.prototype.addEditorEvent = function (name, handler) {
	this.singleTextEditor.addEventListener(name, handler, false);
	this.multiLineTextEditor.addEventListener(name, handler, false);
};
OnScreenTextEditor.prototype.attach = function (targetObject) {
};
OnScreenTextEditor.prototype.invalidate = function () {
};
OnScreenTextEditor.prototype.nextTool = function () {
};
OnScreenTextEditor.prototype.dettach = function () {
};

OnScreenTextEditor.prototype.handleShapeDoubleClicked = function (event) {
    this.currentTarget = event.controller;
    if (!this.currentTarget || !this.currentTarget.getTextEditingInfo) return;

    this.textEditingInfo = this.currentTarget.getTextEditingInfo(event);

    if (!this.textEditingInfo || this.textEditingInfo.readonly) return;

    if (this.textEditingInfo.type == PlainText) {
        //setup
        this._lastTarget = this.currentTarget;
        try {
            this._setupEditor();
        } catch (e) {
            Console.dumpError(e, "stdout");
            alert(e);
        }
    // } else if (this.textEditingInfo.type == RichText) {
    //     OnScreenTextEditor.currentInstance = this;
    //     try {
    //         this._setupRichTextEditor(event);
    //     } catch (e) {
    //         Console.dumpError(e, "stdout");
    //     }
    }
};
OnScreenTextEditor.prototype._setupEditor = function () {
    var geo = this.canvas.getZoomedGeo(this.currentTarget);
    //Svg.ensureCTM(this.svgElement, geo.ctm);
    this.geo = geo;

    this.textEditor = this.textEditingInfo.multi ? this.multiLineTextEditor : this.singleTextEditor;
    this.node().setAttributeNS(PencilNamespaces.p, "p:mode", this.textEditingInfo.multi ? "Multi" : "Single");
    this.multiLineTextEditor.style.display = this.textEditingInfo.multi ? "block" : "none";
    this.singleTextEditor.style.display = this.textEditingInfo.multi ? "none" : "block";

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

    var width = Math.max(bbox.width, 100);
    var height = Math.min(Math.max(bbox.height + 2, 50), 500);

    if (bound) {
        x += this.textEditingInfo.bound.x * this.canvas.zoom - 1;
        y += this.textEditingInfo.bound.y * this.canvas.zoom - 1;
        width = this.textEditingInfo.bound.w * this.canvas.zoom + 4;
        height = this.textEditingInfo.bound.h * this.canvas.zoom + 4;
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
    this.textEditor.style.width = "" + width + "px";
    Svg.setStyle(this.textEditor, "height", this.textEditingInfo.multi ? (height + "px") : null);

    if (this.textEditingInfo.font) {
        this.textEditor.style.fontFamily = this.textEditingInfo.font.family;
        this.textEditor.style.fontSize = this.textEditingInfo.font.size.replace(/^([0-9\.]+)/, function (whole, one) {
            return (parseFloat(one) * this.canvas.zoom);
        }.bind(this));
        this.textEditor.style.fontWeight = this.textEditingInfo.font.weight;
        this.textEditor.style.fontStyle = this.textEditingInfo.font.style;
    }
    this.textEditor.style.textAlign = ["left", "center", "right"][align.h];

    this.textEditor.value = this.textEditingInfo.value.value;   //PlainText.value

    this.popup.showAt(x , y);

    OnScreenTextEditor._activeEditor = this;

    var thiz = this;
    window.setTimeout(function () {
        thiz.textEditor.select();
        thiz.textEditor.focus();
    }, 10);
};
OnScreenTextEditor.prototype.handleTextBlur = function (event) {
    this._focused = false;
    var that = this;
    setTimeout(function() {
        if (!that._focused) {
            that.commitChange(event);
        }
    }, 100);
};
OnScreenTextEditor.prototype.handleKeyPress = function (event) {
    if (event.keyCode == DOM_VK_RETURN && !event.shiftKey && !event.accelKey && !event.ctrlKey) {
        this.commitChange(event);
    } else if (event.keyCode == DOM_VK_ESCAPE) {
        this.cancelChange();
        event.stopPropagation();
        event.preventDefault();
    }
};
OnScreenTextEditor.prototype.commitChange = function (event) {
    if (!this._lastTarget || !this.textEditingInfo) return;
    try {
        var plainText = new PlainText(this.textEditor.value);
        this._lastTarget.setProperty(this.textEditingInfo.prop.name, plainText);
        this.canvas.invalidateEditors(this);
    } finally {
        this.popup.hide("silent");
        this.textEditingInfo = null;
        //this.canvas.focus();
    }
};
OnScreenTextEditor.prototype.cancelChange = function () {
    if (!this.textEditingInfo) return;
    this.popup.hide("silent");
    this.textEditingInfo = null;
    this.canvas.focus();
};
