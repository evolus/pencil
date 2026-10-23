// onscreen richtext editing support functions (private)
OnScreenTextEditor.richTextEditor = null;
OnScreenTextEditor.richTextEditorPane = null;
OnScreenTextEditor.miniToolbarPane = null;
OnScreenTextEditor.richtextEditorSizeGrip = null;

OnScreenTextEditor._runEditorCommand = function(command, arg) {
    try {
        if (typeof(arg) != "undefined") {
            OnScreenTextEditor.richTextEditor.contentDocument.execCommand(command, false, arg);
        } else {
            OnScreenTextEditor.richTextEditor.contentDocument.execCommand(command, false, null);
        }
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
};

OnScreenTextEditor._runEditorCommandByList = function (command, list) {
    var v = list.value;
    if (!v) return;
    try {
        OnScreenTextEditor._runEditorCommand(command, v);
    } catch (e) { }
    //list.selectedIndex = 0;
};

OnScreenTextEditor._enableTextToolbar = function (enable) {
    var toolbar = document.getElementById("textFormatToolbar");
    Dom.workOn(".//*[local-name() = 'toolbarbutton' or local-name() = 'menulist']", toolbar, function (node) {
        node.disabled = !enable;
    });
};

OnScreenTextEditor._enableGlobalClipboardKeys = function (enable) {
    try {
        OnScreenTextEditor._enableGlobalKey("copyKey", enable);
        OnScreenTextEditor._enableGlobalKey("cutKey", enable);
        OnScreenTextEditor._enableGlobalKey("pasteKey", enable);
        OnScreenTextEditor._enableGlobalKey("undoKey", enable);
        OnScreenTextEditor._enableGlobalKey("redoKey", enable);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
};
OnScreenTextEditor._enableGlobalKey = function (id, enable) {
    var key = document.getElementById(id);
    if (enable) {
        key.removeAttribute("disabled");
    }  else {
        key.setAttribute("disabled", "true");
    }
}

OnScreenTextEditor._ensureSupportElements = function () {
    try {
        OnScreenTextEditor._ensureSupportElementsImpl();
    } catch (e) {
        Console.alertError(e, "stdout");
    }
};

OnScreenTextEditor.focusCausedByCanvasClick = false;
OnScreenTextEditor._ensureSupportElementsImpl = function() {
    if (!OnScreenTextEditor.richTextEditor) {

        window.addEventListener("focus", function (event) {
                if (event.originalTarget != OnScreenTextEditor.richTextEditor) {
                    if (OnScreenTextEditor.isEditing) {
                        OnScreenTextEditor.richTextEditor.focus();
                        OnScreenTextEditor.shoudClose = false;
                    }
                }
            }, false);
        document.addEventListener("p:CanvasMouseDown", function (event) {
                OnScreenTextEditor.currentInstance.applyChanges();
                OnScreenTextEditor._hide();
            }, false);

        //setup toolbar
        var fontPopup = document.getElementById("fontlist-popup");
        var mfontPopup = document.getElementById("mfontPopup");
        var localFonts = Local.getInstalledFonts();
        for (var i in localFonts) {
            var item = document.createElement("menuitem");
            item.setAttribute("label", localFonts[i]);
            item.setAttribute("cropt", "center");
            item.setAttribute("value", localFonts[i]);
            fontPopup.appendChild(item);

            var item1 = document.createElement("menuitem");
            item1.setAttribute("label", localFonts[i]);
            item1.setAttribute("cropt", "center");
            item1.setAttribute("value", localFonts[i]);
            mfontPopup.appendChild(item1);
        }
        OnScreenTextEditor._enableTextToolbar(false);

        OnScreenTextEditor.miniToolbarPane = document.getElementById("miniToolbar");
        OnScreenTextEditor.richTextEditor = document.getElementById("richTextEditor");
        OnScreenTextEditor.richTextEditorPane = document.getElementById("richTextEditorPane");
        OnScreenTextEditor.richtextEditorSizeGrip = document.getElementById("richtextEditorSizeGrip");

        OnScreenTextEditor.richTextEditor.contentDocument.designMode = "on";
        OnScreenTextEditor._runEditorCommand("styleWithCSS", true);

        OnScreenTextEditor.richTextEditorPane.style.visibility = "hidden";
        OnScreenTextEditor.miniToolbarPane.style.visibility = "hidden";
        OnScreenTextEditor.richtextEditorSizeGrip.style.display = "none";

        OnScreenTextEditor.miniToolbarPane.addEventListener("mousedown", function (event) {
            if (event.button != 0 || !event.originalTarget || (event.originalTarget.nodeName != "toolbar" && event.originalTarget.nodeName != "toolbox" && event.originalTarget.nodeName != "vbox")) return;
            OnScreenTextEditor.miniToolbarPane._oX = event.clientX;
            OnScreenTextEditor.miniToolbarPane._oY = event.clientY;
            OnScreenTextEditor.miniToolbarPane._left = parseInt(OnScreenTextEditor.miniToolbarPane.getAttribute("left"));
            OnScreenTextEditor.miniToolbarPane._top = parseInt(OnScreenTextEditor.miniToolbarPane.getAttribute("top"));
            OnScreenTextEditor.miniToolbarPane._hold = true;
        }, true);
        window.addEventListener("mousemove", function (event) {
            if (OnScreenTextEditor.miniToolbarPane._hold) {
                var dx = event.clientX - OnScreenTextEditor.miniToolbarPane._oX;
                var dy = event.clientY - OnScreenTextEditor.miniToolbarPane._oY;
                OnScreenTextEditor.miniToolbarPane.setAttribute("left", OnScreenTextEditor.miniToolbarPane._left + dx);
                OnScreenTextEditor.miniToolbarPane.setAttribute("top", OnScreenTextEditor.miniToolbarPane._top + dy);
            }
            if (OnScreenTextEditor.richtextEditorSizeGrip._hold && OnScreenTextEditor.currentInstance) {
                var dx = event.screenX - OnScreenTextEditor.richtextEditorSizeGrip._oX;
                var dy = event.screenY - OnScreenTextEditor.richtextEditorSizeGrip._oY;

                var newWidth = OnScreenTextEditor.richtextEditorSizeGrip._width + dx;
                var newHeight = OnScreenTextEditor.richtextEditorSizeGrip._height + dy;

                var boxObject = OnScreenTextEditor.richTextEditorPane.parentNode.boxObject;
                if (newWidth > OnScreenTextEditor.richtextEditorSizeGrip._minwidth && OnScreenTextEditor.richtextEditorSizeGrip._left + dx < boxObject.width - 30) {
                    OnScreenTextEditor.richtextEditorSizeGrip.setAttribute("left", OnScreenTextEditor.richtextEditorSizeGrip._left + dx);
                    OnScreenTextEditor.richTextEditorPane.setAttribute("width", newWidth);
                }
                if (newHeight > OnScreenTextEditor.richtextEditorSizeGrip._minheight && OnScreenTextEditor.richtextEditorSizeGrip._top + dy < boxObject.height - 30) {
                    OnScreenTextEditor.richtextEditorSizeGrip.setAttribute("top", OnScreenTextEditor.richtextEditorSizeGrip._top + dy);
                    OnScreenTextEditor.richTextEditorPane.setAttribute("height", newHeight);
                }
            }
        }, true);
        window.addEventListener("mouseup", function (event) {
            OnScreenTextEditor.miniToolbarPane._hold = false;
            OnScreenTextEditor.richtextEditorSizeGrip._hold = false;
        }, true);

        OnScreenTextEditor.richtextEditorSizeGrip.addEventListener("mousedown", function (event) {
            if (event.button != 0 || !event.originalTarget) return;
            OnScreenTextEditor.richtextEditorSizeGrip._oX = event.screenX;
            OnScreenTextEditor.richtextEditorSizeGrip._oY = event.screenY;
            OnScreenTextEditor.richtextEditorSizeGrip._left = parseInt(OnScreenTextEditor.richtextEditorSizeGrip.getAttribute("left"));
            OnScreenTextEditor.richtextEditorSizeGrip._top = parseInt(OnScreenTextEditor.richtextEditorSizeGrip.getAttribute("top"));
            OnScreenTextEditor.richtextEditorSizeGrip._width = parseInt(OnScreenTextEditor.richTextEditorPane.getAttribute("width"));
            OnScreenTextEditor.richtextEditorSizeGrip._height = parseInt(OnScreenTextEditor.richTextEditorPane.getAttribute("height"));
            OnScreenTextEditor.richtextEditorSizeGrip._hold = true;
        }, true);

        document.getElementById("navigator-toolbox").addEventListener("focus", function (event) {
            OnScreenTextEditor.shoudClose = false;
        }, true);
        document.getElementById("mtextColorButton").addEventListener("focus", function (event) {
            OnScreenTextEditor.shoudClose = false;
        }, true);
        document.getElementById("mhilightColorButton").addEventListener("focus", function (event) {
            OnScreenTextEditor.shoudClose = false;
        }, true);

        OnScreenTextEditor.richTextEditor.contentWindow.addEventListener("blur", function (event) {
            OnScreenTextEditor.shoudClose = true;

            window.setTimeout(function() {
                if (!OnScreenTextEditor.shoudClose) {
                    return;
                }
                if (!OnScreenTextEditor.currentInstance) {
                    OnScreenTextEditor._hide();
                    return;
                }
                OnScreenTextEditor.currentInstance.applyChanges();
                OnScreenTextEditor._hide();
            }, 20)

        }, false);
        OnScreenTextEditor.richTextEditor.contentDocument.addEventListener("keypress", function (event) {
            if (event.keyCode == event.DOM_VK_ESCAPE) {
                OnScreenTextEditor._hide();
            } else if (event.keyCode == event.DOM_VK_RETURN && !event.shiftKey && !event.ctrlKey) {
                if (OnScreenTextEditor.currentInstance) {
                    OnScreenTextEditor.currentInstance.applyChanges();
                }
                OnScreenTextEditor._hide();
                Dom.cancelEvent(event);
            } else if (event.keyCode == event.DOM_VK_UP ||
                        event.keyCode == event.DOM_VK_DOWN ||
                        event.keyCode == event.DOM_VK_LEFT ||
                        event.keyCode == event.DOM_VK_RIGHT) {

                var code = event.keyCode;
                var char = event.charCode;
                if (event.eventPhase == 3) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            }
        }, true);
        var selectListener = function (event) {
            var temp = OnScreenTextEditor.isEditing;
            OnScreenTextEditor.isEditing = false;

            OnScreenTextEditor._updateListByCommandValue("fontname", "mfontList");
            OnScreenTextEditor._updateListByCommandValue("fontsize", "mfontSize");

            OnScreenTextEditor._updateButtonByCommandState("bold", "medBoldButton");
            OnScreenTextEditor._updateButtonByCommandState("italic", "medItalicButton");
            OnScreenTextEditor._updateButtonByCommandState("underline", "medUnderlineButton");
            OnScreenTextEditor._updateButtonByCommandState("strikethrough", "medStrikeButton");

            OnScreenTextEditor._updateButtonByCommandState("justifyleft", "malignLeftCommand");
            OnScreenTextEditor._updateButtonByCommandState("justifycenter", "malignCenterCommand");
            OnScreenTextEditor._updateButtonByCommandState("justifyright", "malignRightCommand");

            OnScreenTextEditor._updateColorButtonByCommandValue("forecolor", "mtextColorButton");
            OnScreenTextEditor._updateColorButtonByCommandValue("hilitecolor", "mhilightColorButton");

            OnScreenTextEditor.isEditing = temp;
        };

        OnScreenTextEditor.richTextEditor.contentDocument.body.addEventListener("mouseup", selectListener, false);
        //OnScreenTextEditor.richTextEditor.contentDocument.body.addEventListener("keypress", selectListener, false);

        OnScreenTextEditor._installListCommandHandler("mfontList", "fontname");
        OnScreenTextEditor._installListCommandHandler("mfontSize", "fontsize");

        OnScreenTextEditor._installColorCommandHandler("mtextColorButton", "forecolor");
        OnScreenTextEditor._installColorCommandHandler("mhilightColorButton", "hilitecolor");

        OnScreenTextEditor._installSimpleCommandHandler("medBoldButton", "bold");
        OnScreenTextEditor._installSimpleCommandHandler("medItalicButton", "italic");
        OnScreenTextEditor._installSimpleCommandHandler("medUnderlineButton", "underline");
        OnScreenTextEditor._installSimpleCommandHandler("medStrikeButton", "strikethrough");
        OnScreenTextEditor._installSimpleCommandHandler("malignLeftCommand", "justifyleft");
        OnScreenTextEditor._installSimpleCommandHandler("malignCenterCommand", "justifycenter");
        OnScreenTextEditor._installSimpleCommandHandler("malignRightCommand", "justifyright");
        OnScreenTextEditor._installSimpleCommandHandler("medBulletedListButton", "insertunorderedlist");
        OnScreenTextEditor._installSimpleCommandHandler("medNumberedListButton", "insertorderedlist");
        OnScreenTextEditor._installSimpleCommandHandler("medIndentButton", "indent");
        OnScreenTextEditor._installSimpleCommandHandler("medOutdentButton", "outdent");
        OnScreenTextEditor._installSimpleCommandHandler("medIncreaseFontButton", "increasefontsize");
        OnScreenTextEditor._installSimpleCommandHandler("medDecreaseFontButton", "decreasefontsize");
        OnScreenTextEditor._installSimpleCommandHandler("mclearButton", "removeformat");

        document.getElementById("medCleanUpButton").addEventListener("command", function (event) {
            var html = Dom.serializeNode(OnScreenTextEditor.richTextEditor.contentDocument.body);
            html = html.replace(/(class|style)="[^"]*"/gi, "");
            html = html.replace(/<(\/)?(span|p)[^>]*>/gi, "");
            html = html.replace(/<table[^>]*>/gi, "<table cellspacing=\"0\" cellpadding=\"3\" border=\"1\" style=\"border-collapse: collapse; font-family: Arial, 'Liberation Sans', sans-serif; font-size: 0.9em; width: 45em;\">");
            OnScreenTextEditor.richTextEditor.contentDocument.body.innerHTML = html;
        }, false);
    }
};
OnScreenTextEditor._installListCommandHandler = function (id, commandName) {
    var doc = OnScreenTextEditor.richTextEditor.ownerDocument;
    doc.getElementById(id).addEventListener("command", function (event) {
        if (!OnScreenTextEditor.isEditing) return;
        OnScreenTextEditor._runEditorCommandByList(commandName, event.originalTarget);
    }, false);
};
OnScreenTextEditor._installSimpleCommandHandler = function (id, commandName, value) {
    var doc = OnScreenTextEditor.richTextEditor.ownerDocument;
    doc.getElementById(id).addEventListener("command", function (event) {
        if (!OnScreenTextEditor.isEditing) return;
        if (value) {
            OnScreenTextEditor._runEditorCommand(commandName, event.originalTarget);
        } else {
            OnScreenTextEditor._runEditorCommand(commandName);
        }
        if (id == "mclearButton") {
            var v = OnScreenTextEditor.getRichtextValue();
            try {
                v = Dom.getText(Dom.parseToNode(v));
                OnScreenTextEditor.richTextEditor.contentDocument.body.innerHTML = v;
            } catch (e) { }
        }
    }, false);
};
OnScreenTextEditor._installColorCommandHandler = function (id, commandName) {
    var doc = OnScreenTextEditor.richTextEditor.ownerDocument;
    var picker = doc.getElementById(id);
    picker.addEventListener("change", function (event) {
        if (!OnScreenTextEditor.isEditing) return;
        OnScreenTextEditor._runEditorCommand(commandName, picker.color.toRGBAString());
    }, false);
};

OnScreenTextEditor._updateListByCommandValue = function (commandName, controlId) {
    var value = null;
    try {
        value = OnScreenTextEditor.richTextEditor.contentDocument.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    var control = document.getElementById(controlId);
    if (control.localName == "menulist") {
        if (value == null) return;
        control.value = value;
    }
}
OnScreenTextEditor._updateColorButtonByCommandValue = function (commandName, controlId) {
    var value = null;
    try {
        value = OnScreenTextEditor.richTextEditor.contentDocument.queryCommandValue(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    var control = document.getElementById(controlId);
    if (control.localName == "pcolorbutton") {
        if (value == null) return;
        control.color = Color.fromString(value);
    }
}
OnScreenTextEditor._updateButtonByCommandState = function (commandName, controlId) {
    var value = null;
    try {
        value = OnScreenTextEditor.richTextEditor.contentDocument.queryCommandState(commandName);
    } catch (e) {
        Console.dumpError(e, "stdout");
    }

    var control = document.getElementById(controlId);
    if (control.localName == "toolbarbutton") {
        control.checked = value ? true : false;
    }
}
OnScreenTextEditor._hide = function () {
    Dom.removeClass(document.documentElement, "RichTextEditActivated");

    if (!OnScreenTextEditor.isEditing) return;
    OnScreenTextEditor.isEditing = false;
    OnScreenTextEditor._enableGlobalClipboardKeys(true);
    OnScreenTextEditor._enableTextToolbar(false);
    OnScreenTextEditor.richTextEditorPane.style.visibility = "hidden";
    OnScreenTextEditor.miniToolbarPane.style.visibility = "hidden";
    OnScreenTextEditor.richtextEditorSizeGrip.style.display = "none";

    try {
        if (OnScreenTextEditor.currentInstance) {
            OnScreenTextEditor.currentInstance.canvas.focusableBox.focus();
        }
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
    OnScreenTextEditor.currentInstance = null;

    if (OnScreenTextEditor.backedupTarget) {
        for (var i in Pencil.sharedEditors) {
            try {
                var editor = Pencil.sharedEditors[i];
                editor.attach(OnScreenTextEditor.backedupTarget);
            } catch (e) {
                Console.dumpError(e, "stdout");
            }
        }
        OnScreenTextEditor.backedupTarget = null;
    }
};
OnScreenTextEditor.getRichtextValue = function () {
    var html = Dom.serializeNode(OnScreenTextEditor.richTextEditor.contentDocument.body);
    html = html.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
        return zero.toLowerCase();
    });
    if (html.match(/^<body[^>]*>([^\0]*)<\/body>$/)) {
        html = RegExp.$1;
    }
    return html;
};

OnScreenTextEditor.prototype.applyChanges = function () {
    if (this.currentTarget && this.textEditingInfo) {
        Dom.workOn(".//html:script", OnScreenTextEditor.richTextEditor.contentDocument.body, function (node) {
            node.parentNode.removeChild(node);
        });
        var html = Dom.serializeNode(OnScreenTextEditor.richTextEditor.contentDocument.body);
        html = html.replace(/<[\/A-Z0-9]+[ \t\r\n>]/g, function (zero) {
            return zero.toLowerCase();
        });
        if (html.match(/^<body[^>]*>([^\0]*)<\/body>$/)) {
            html = RegExp.$1;
        }
        this.currentTarget.setProperty(this.textEditingInfo.prop.name, RichText.fromString(html));
    }
};

OnScreenTextEditor.prototype._setupRichTextEditor = function (event) {
    for (var i in Pencil.sharedEditors) {
        try {
            Pencil.sharedEditors[i].detach();
        } catch (e) {
            Console.dumpError(e, "stdout");
        }
    }

    Dom.addClass(document.documentElement, "RichTextEditActivated");

    OnScreenTextEditor.richTextEditor.contentDocument.body.innerHTML = "";
    OnScreenTextEditor.richTextEditor.contentDocument.body.innerHTML = this.textEditingInfo.value;

    var inlineEditor = !this.textEditingInfo.inlineEditor || (this.textEditingInfo.inlineEditor && !(this.textEditingInfo.inlineEditor.toLowerCase() == "false"));

    if (this.textEditingInfo.font) {
        var font = this.textEditingInfo.font;
        var body = OnScreenTextEditor.richTextEditor.contentDocument.body;
        body.style.fontFamily = font.family;
        body.style.fontSize = font.size;
        body.style.fontWeight = font.weight;
        body.style.fontStyle = font.style;
    }
    var ctm = this.textEditingInfo.target.getScreenCTM();
    var svgCTM = this.canvas.svg.getScreenCTM();

    //tricky dx, dy: screenCTM of SVG and screen location of its parent is not the same.
    var dx = this.canvas.svg.parentNode.boxObject.screenX - svgCTM.e;
    var dy = this.canvas.svg.parentNode.boxObject.screenY - svgCTM.f;

    // mainStack boxObject
    var boxObject = OnScreenTextEditor.richTextEditorPane.parentNode.boxObject;
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

    // sizegrip
    x -= 8;
    y -= 8;
    width += 14;
    height += 14;

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

    OnScreenTextEditor.richTextEditorPane.setAttribute("left", x);
    OnScreenTextEditor.richTextEditorPane.setAttribute("top", y);
    OnScreenTextEditor.richTextEditorPane.setAttribute("width", width);
    OnScreenTextEditor.richTextEditorPane.setAttribute("height", height);

    OnScreenTextEditor.richtextEditorSizeGrip._minwidth = width;
    OnScreenTextEditor.richtextEditorSizeGrip._minheight = height;

    OnScreenTextEditor.richtextEditorSizeGrip.setAttribute("top", y + height - 9);
    OnScreenTextEditor.richtextEditorSizeGrip.setAttribute("left", x + width - 9);

    OnScreenTextEditor.miniToolbarPane._oX = event.clientX;
    OnScreenTextEditor.miniToolbarPane._oY = event.clientY;

    var mx = x;
    var my = y - OnScreenTextEditor.miniToolbarPane.getBoundingClientRect().height - 5;
    var buttonBox = document.getElementById("mclearButton").getBoundingClientRect();
    var mw = buttonBox.left + buttonBox.width + 1 - OnScreenTextEditor.miniToolbarPane.getBoundingClientRect().left;

    //mx = mx - ((mw - width) / 2);
    if (mx < 0) {
        mx = 0;
    }
    if (my < 0) {
        my = y - 70;
    }

    if (mw + mx > boxObject.width) {
        mx -= mw + mx - boxObject.width + 30;
    }

    //my -= 10;

    OnScreenTextEditor.miniToolbarPane.setAttribute("left", mx);
    OnScreenTextEditor.miniToolbarPane.setAttribute("top", my);
    OnScreenTextEditor.miniToolbarPane.setAttribute("width", mw);

    OnScreenTextEditor._enableGlobalClipboardKeys(false);
    OnScreenTextEditor._enableTextToolbar(false);
    OnScreenTextEditor.richTextEditorPane.style.visibility = "visible";

    if (inlineEditor) {
        OnScreenTextEditor.miniToolbarPane.style.visibility = "visible";
    }

    OnScreenTextEditor.richtextEditorSizeGrip.style.display = "";

    OnScreenTextEditor.richTextEditor.contentWindow.focus();
    //OnScreenTextEditor.richTextEditor.contentWindow.scrollTo(0, 0);

    window.setTimeout(function () {
        OnScreenTextEditor.richTextEditor.contentWindow.focus();
        OnScreenTextEditor._runEditorCommand("selectall");
        OnScreenTextEditor.isEditing = true;
    }, 10);

    OnScreenTextEditor._updateListByCommandValue("fontname", "mfontList");
    OnScreenTextEditor._updateListByCommandValue("fontsize", "mfontSize");

    OnScreenTextEditor._updateButtonByCommandState("bold", "medBoldButton");
    OnScreenTextEditor._updateButtonByCommandState("italic", "medItalicButton");
    OnScreenTextEditor._updateButtonByCommandState("underline", "medUnderlineButton");
    OnScreenTextEditor._updateButtonByCommandState("strikethrough", "medStrikeButton");

    OnScreenTextEditor._updateButtonByCommandState("justifyleft", "malignLeftCommand");
    OnScreenTextEditor._updateButtonByCommandState("justifycenter", "malignCenterCommand");
    OnScreenTextEditor._updateButtonByCommandState("justifyright", "malignRightCommand");

    var canvas = Pencil.activeCanvas;
    var target = canvas.currentController;
    OnScreenTextEditor.backedupTarget = target;
    OnScreenTextEditor.isEditing = true;
};
