function OnScreenTextEditor() {
    this.svgElement = null;
    this.canvas = null;
}

OnScreenTextEditor.configDoc = Dom.loadSystemXml("chrome://pencil/content/editor/onScreenTextEditor.config.xml");
OnScreenTextEditor._initialized = false;
OnScreenTextEditor._activeEditor = null;

OnScreenTextEditor.initialize = function (canvas) {
	if (OnScreenTextEditor._initialized) return;
	
	
	OnScreenTextEditor.htmlDiv = canvas.ownerDocument.importNode(Dom.getSingle("/p:Config/html:div", OnScreenTextEditor.configDoc), true);

	OnScreenTextEditor.htmlDiv.style.display = "none";
    //canvas.installControlSVGElement(this.svgElement);
    
    var mainBoxStack = document.getElementById("mainBoxStack");
    mainBoxStack.appendChild(OnScreenTextEditor.htmlDiv);


    //register event
    OnScreenTextEditor.singleTextEditor = Dom.getSingle(".//*[@p:name='TextEditor']", OnScreenTextEditor.htmlDiv);
    OnScreenTextEditor.multiTextEditor = Dom.getSingle(".//*[@p:name='MultiLineTextEditor']", OnScreenTextEditor.htmlDiv);

    OnScreenTextEditor.singleTextEditor._editor = "plainText";
    OnScreenTextEditor.multiTextEditor._editor = "plainText";
    
    OnScreenTextEditor.addEditorEvent("keypress", function (event) {
        event.cancelBubble = true;
        if (OnScreenTextEditor._activeEditor) OnScreenTextEditor._activeEditor.handleKeyPress(event);
    });
    OnScreenTextEditor.addEditorEvent("dblclick", function (event) {
        event.cancelBubble = true;
    });
    OnScreenTextEditor.addEditorEvent("click", function (event) {
        event.cancelBubble = true;
        event.preventDefault();
    });
    OnScreenTextEditor.addEditorEvent("blur", function (event) {
    	if (OnScreenTextEditor._activeEditor) OnScreenTextEditor._activeEditor.handleTextBlur(event);
    });
    OnScreenTextEditor.addEditorEvent("focus", function (event) {
    	if (OnScreenTextEditor._activeEditor) OnScreenTextEditor._activeEditor._focused = true;
    });

};
OnScreenTextEditor.prototype.install = function (canvas) {
    try {
        OnScreenTextEditor._ensureSupportElements();
    } catch (e) {
        Console.alertError(e);
    }

    this.canvas = canvas;
    this.canvas.onScreenEditors.push(this);
    
    OnScreenTextEditor.initialize(canvas);
    
    
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
    
};
OnScreenTextEditor.addEditorEvent = function (name, handler) {
	OnScreenTextEditor.singleTextEditor.addEventListener(name, handler, false);
	OnScreenTextEditor.multiTextEditor.addEventListener(name, handler, false);
};
OnScreenTextEditor.prototype.attach = function (targetObject) {
};
OnScreenTextEditor.prototype.invalidate = function () {
};
OnScreenTextEditor.prototype.nextTool = function () {
    //just ignore this, since this editor implements only one tool set
};

OnScreenTextEditor.prototype.dettach = function () {
};

OnScreenTextEditor.prototype.handleShapeDoubleClicked = function (event) {
    this.currentTarget = event.controller;
    if (Util.isXul6OrLater()) {
        this.currentTarget = event.detail.controller;
    }

    if (!this.currentTarget || !this.currentTarget.getTextEditingInfo) return;
    this.textEditingInfo = this.currentTarget.getTextEditingInfo(event);
    if (this.textEditingInfo && !this.textEditingInfo.readonly) {
        if (this.textEditingInfo.type == PlainText) {
            //setup
            this._lastTarget = this.currentTarget;
            try {
                this._setupEditor();
			} catch (e) {
                Console.dumpError(e, "stdout");
                alert(e);
			}
        } else if (this.textEditingInfo.type == RichText) {
            OnScreenTextEditor.currentInstance = this;
            try {
                this._setupRichTextEditor(event);
            } catch (e) {
                Console.dumpError(e, "stdout");
            }
        }
    } else {
    }
};
OnScreenTextEditor.prototype._setupEditor = function () {
    var geo = this.canvas.getZoomedGeo(this.currentTarget);
    //Svg.ensureCTM(this.svgElement, geo.ctm);
    this.geo = geo;

    this.textEditor = this.textEditingInfo.multi ? OnScreenTextEditor.multiTextEditor : OnScreenTextEditor.singleTextEditor;
    OnScreenTextEditor.htmlDiv.setAttributeNS(PencilNamespaces.p, "p:mode", this.textEditingInfo.multi ? "Multi" : "Single");

    var bound = this.textEditingInfo.bound;
    var bbox = this.textEditingInfo.target.getBBox();
    var font = this.textEditingInfo.font;
    var align = this.textEditingInfo.align;

    var ctm = this.textEditingInfo.target.getScreenCTM();
    var svgCTM = this.canvas.svg.getScreenCTM();

    //tricky dx, dy: screenCTM of SVG and screen location of its parent is not the same.
    var dx = this.canvas.svg.parentNode.boxObject.screenX - svgCTM.e;
    var dy = this.canvas.svg.parentNode.boxObject.screenY - svgCTM.f;

    // mainStack boxObject
    var boxObject = OnScreenTextEditor.htmlDiv.parentNode.boxObject;
    var targetCtm = this.currentTarget.svg.getScreenCTM();

    //var x = ctm.e - boxObject.screenX + dx;
    //var y = ctm.f - boxObject.screenY + dy;
    var x = targetCtm.e - boxObject.x;
    var y = targetCtm.f - boxObject.y;

    var bbox = this.textEditingInfo.target.getBBox();

    var width = Math.max(bbox.width, 100);
    var height = Math.min(Math.max(bbox.height + 2, 50), 500);

    if (this.textEditingInfo.bound) {
        x += this.textEditingInfo.bound.x - 1;
        y += this.textEditingInfo.bound.y - 1;
        width = this.textEditingInfo.bound.w + 4;
        height = this.textEditingInfo.bound.h + 4;
    }

    if (x < 0) {
        width += x;
        x = 0;
    }
    if (y < 0) {
        height += y;
        y = 0;
    }

    if (width + x > boxObject.width) {
        width = boxObject.width - x;
    }
    if (height + y > boxObject.height) {
        height = boxObject.height - y;
    }
    
    width = Math.max(width, 60);

    OnScreenTextEditor.htmlDiv.setAttribute("left", x);
    OnScreenTextEditor.htmlDiv.setAttribute("top", y + 5);
    OnScreenTextEditor.htmlDiv.setAttribute("width", width);
    OnScreenTextEditor.htmlDiv.setAttribute("height", height);

    //this.foPane.setAttribute("transform", "scale(" + this.canvas.zoom + ")");

    //setup font
    //this.textEditor.style.marginLeft = "" + dx + "px";
    //this.textEditor.style.marginTop = "" + dy + "px";
    this.textEditor.style.width = "" + width + "px";
    Svg.setStyle(this.textEditor, "height", this.textEditingInfo.multi ? (height + "px") : null);
    
    this.textEditor.style.fontFamily = this.textEditingInfo.font.family;
    this.textEditor.style.fontSize = this.textEditingInfo.font.size;
    this.textEditor.style.lineHeight = this.textEditingInfo.font.size;
    this.textEditor.style.fontWeight = this.textEditingInfo.font.weight;
    this.textEditor.style.fontStyle = this.textEditingInfo.font.style;
    this.textEditor.style.textAlign = ["left", "center", "right"][align.h];

    this.textEditor.value = this.textEditingInfo.value.value;   //PlainText.value

    this._cachedVisibility = this.textEditingInfo.target.style.visibility;
    this.textEditingInfo.target.style.visibility = "hidden";
    OnScreenTextEditor.htmlDiv.style.display = "";
    
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
    if (event.keyCode == event.DOM_VK_RETURN && !event.shiftKey && !event.accelKey && !event.ctrlKey) {
        this.commitChange(event);
    } else if (event.keyCode == event.DOM_VK_ESCAPE) {
        this.cancelChange();
        event.stopPropagation();
        event.preventDefault();
    }
};
OnScreenTextEditor.prototype.commitChange = function (event) {
    if (!this._lastTarget || !this.textEditingInfo) return;
    this.textEditingInfo.target.style.visibility = this._cachedVisibility;
    try {
        var plainText = new PlainText(this.textEditor.value);
        this._lastTarget.setProperty(this.textEditingInfo.prop.name, plainText);
        this.canvas.invalidateEditors(this);
    } finally {
    	OnScreenTextEditor.htmlDiv.style.display = "none";
        this.textEditingInfo = null;
        this.canvas.focus();
    }
};
OnScreenTextEditor.prototype.cancelChange = function () {
    if (!this.textEditingInfo) return;
    OnScreenTextEditor.htmlDiv.style.display = "none";
    this.textEditingInfo.target.style.visibility = this._cachedVisibility;
    this.textEditingInfo = null;
    this.canvas.focus();
};
Pencil.registerEditor(OnScreenTextEditor);
