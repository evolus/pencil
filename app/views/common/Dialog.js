function Dialog() {
    BaseTemplatedWidget.call(this);

    this.bind("click", this.handleActionClick, this.dialogFooter);
    this.bind("click", this.handleCloseClick, this.dialogClose);
    this.bind("mousedown", this.handleHeaderMouseDown, this.dialogHeaderPane);
    this.bind("keypress", this.handleBodyKeyPress, this.dialogBody);

    Dialog.ensureGlobalHandlers();
}
__extend(BaseTemplatedWidget, Dialog);

Dialog.ACTION_CANCEL = { type: "cancel", title: "Cancel", run: function () { return true; } };
Dialog.ACTION_CLOSE = { type: "cancel", title: "Close", run: function () { return true; } };

Dialog.ensureGlobalHandlers = function () {
    if (Dialog.globalHandlersRegistered) return;

    document.addEventListener("mousemove", Dialog.globalMouseMoveHandler, false);
    document.addEventListener("mouseup", function (event) {
        Dialog.heldInstance = null;
    }, false);

    Dialog.globalHandlersRegistered = true;
};

Dialog.prototype.canCloseNow = function () {
    if (this.closeHandler) return this.closeHandler.apply(this);
    return false;
}
Dialog.prototype.getFrameTemplate = function () {
    return this.getTemplatePrefix() + "common/Dialog.xhtml";
};
Dialog.prototype.buildDOMNode = function () {
    var frameTemplate = this.getFrameTemplate();
    var node = widget.Util.loadTemplateAsNodeSync(frameTemplate, this);

    //load also the sub-class template into the dialog body
    //please note that the binding will be done for both templates
    var contentNode = this.buildContentNode();
    this.dialogBody.appendChild(contentNode);
    this.dialogContentNode = contentNode;

    return node;
};
Dialog.prototype.buildContentNode = function () {
    return widget.Util.loadTemplateAsNodeSync(this.getTemplatePath(), this);
};
Dialog.prototype.open = function (options) {
    if (this.setup) this.setup(options);
    this.invalidateElements();
    BaseWidget.handleGlobalMouseDown();
    this.show();
};
const DIALOG_BUTTON_ORDER = {
    "accept": 10,
    "cancel": 1,
    "extra1": -10,
    "extra2": -9,
    "extra3": -8
};
Dialog.prototype.invalidateElements = function () {
    var actions = this.getDialogActions();

    var startActions = [];
    var endOptions = [];

    this.closeHandler = null;
    this.positiveHandler = null;
    this.primaryButton = null;

    actions.forEach(function (a) {
        if (a.isValid && !a.isValid()) return;
        a.order = a.order || DIALOG_BUTTON_ORDER[a.type];
        if (typeof(a.order) == "undefined") a.order = -99;

        if (a.type == "cancel") {
            this.closeHandler = a.run;
        } else if (a.type == "accept") {
            this.positiveHandler = a.run;
        }
    }, this);

    actions.sort(function (a1, a2) {
        return a1.order - a2.order;
    });

    Dom.empty(this.dialogFooterStartPane);
    Dom.empty(this.dialogFooterMiddlePane);
    Dom.empty(this.dialogFooterEndPane);

    actions.forEach(function (a) {
        if (a.isApplicable && !a.isApplicable()) return;

        var button = this.createButton(a);
        if (a.order < 0) {
            this.dialogFooterStartPane.appendChild(button);
        } else if (a.order == 0) {
            this.dialogFooterMiddlePane.appendChild(button);
        } else {
            this.dialogFooterEndPane.appendChild(button);
        }

        if (a.type == "accept") this.primaryButton = button;
    }, this);


    Dom.empty(this.dialogTitle);
    this.dialogTitle.appendChild(document.createTextNode(this.e(this.title)));

    Dom.empty(this.dialogSubTitle);
    this.dialogSubTitle.appendChild(document.createTextNode(this.e(this.subTitle || "")));

    this.dialogClose.style.display = this.closeHandler ? "inline-block" : "none";
};

Dialog.prototype.createButton = function (action) {
    var button = document.createElement("button");
    button._action = action;
    var icon = this.e(action.icon);
    if (icon) {
        var i = document.createElement("i");
        i.appendChild(document.createTextNode(icon));
        button.appendChild(i);
    }

    var text = this.e(action.title);
    button.appendChild(document.createTextNode(text));
    button.setAttribute("mode", action.type);

    var disabled = action.isEnabled && !action.isEnabled();
    if (disabled) button.setAttribute("disabled", "true");

    return button;
};
Dialog.prototype.show = function () {
    this._originalFocusedTarget = Dialog.lastFocusedTarget;
    this.dialogFrame.parentNode.removeChild(this.dialogFrame);
    if (this.overlay) {
        if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    }

    this.overlay = this.node().ownerDocument.createElement("div");
    Dom.addClass(this.overlay, "Sys_DialogOverlay");

    this.node().ownerDocument.body.appendChild(this.overlay);


    this.node().ownerDocument.body.appendChild(this.dialogFrame);

    this.dialogFrame.style.left = "0px";
    this.dialogFrame.style.top = "0px";
    this.dialogFrame.style.position = "absolute";
    this.dialogFrame.style.visibility = "hidden";
    this.dialogFrame.style.display = "flex";
    this.dialogFrame.style.height = "auto";
    this.dialogFrame.style.overflow = "visible";
    this.dialogFrame.style.opacity = "0";
    this.dialogFrame.style.transition = "opacity 0.3s";


    var thiz = this;
    setTimeout(function () {
        thiz.invalidatePosition();
        thiz.dialogFrame.style.visibility = "visible";
        thiz.dialogFrame.style.opacity = "1";

        thiz.dialogFrame.focus();

        if (thiz.onShown) thiz.onShown();
    }, 100);

    BaseWidget.registerClosable(this);
};
Dialog.prototype.invalidatePosition = function () {
    var screenW = window.innerWidth;
    var screenH = window.innerHeight - 20;

    var w = this.dialogFrame.offsetWidth;
    var h = this.dialogFrame.offsetHeight;
    if (h > screenH) {
        h = screenH;
        this.dialogFrame.style.height = h + "px";
        this.dialogContentNode.setAttribute("flex", "1");
    } else {
        this.dialogContentNode.removeAttribute("flex");
    }

    var x = (screenW - w) / 2;
    var y = (window.innerHeight - h) / 2;

    this.moveTo(x, y);
};
Dialog.prototype.moveTo = function (x, y) {
    this.dialogFrame.style.left = x + "px";
    this.dialogFrame.style.top = Math.max(y, 0) + "px";
    this.dialogX = x;
    this.dialogY = y;
};
Dialog.prototype.moveBy = function (dx, dy) {
    this.moveTo(this.dialogX + dx, this.dialogY + dy);
};
Dialog.prototype.close = function () {
    if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.dialogFrame.style.transition = "opacity 0.1s";
    this.dialogFrame.style.opacity = "0";

    var args = [];
    if (arguments.length > 0 && this.callback) {
        for (var i = 0; i < arguments.length; i ++) {
            args.push(arguments[i]);
        }
    }

    if (this.onClosed) this.onClosed();

    window.setTimeout(function () {
        if (this.dialogFrame.parentNode) this.dialogFrame.parentNode.removeChild(this.dialogFrame);
        this.dialogFrame.style.display = "none";
        if (this.overlay) this.overlay.style.display = "none";

        BaseWidget.unregisterClosable(this);

        if (args.length > 0 && this.callback) {
            this.callback.apply(window, args);
        }

        if (this._originalFocusedTarget) {
            try {
                this._originalFocusedTarget.focus();
            } catch (e) {
            }
        }
    }.bind(this), 100);
};
Dialog.prototype.callback = function (callback) {
    this.callback = callback;
    return this;
};

Dialog.prototype.handleActionClick = function (event) {
    var action = Dom.findUpwardForData(event.target, "_action");
    if (!action) return;

    var returnValue = action.run.apply(this);
    if (returnValue) this.close();
};
Dialog.globalMouseMoveHandler = function (event) {
    if (!Dialog.heldInstance) return;

    Dom.cancelEvent(event);

    var dx = event.screenX - Dialog._lastScreenX;
    var dy = event.screenY - Dialog._lastScreenY;

    Dialog._lastScreenX = event.screenX;
    Dialog._lastScreenY = event.screenY;

    Dialog.heldInstance.moveBy(dx, dy);
};
Dialog.globalFocusHandler = function (event) {
    Dialog.lastFocusedTarget = event.target;
    if (!BaseWidget.closables || BaseWidget.closables.length <= 0) return;
    var closable = BaseWidget.closables[BaseWidget.closables.length - 1];
    if (!__isSubClassOf(closable.constructor, Dialog)) return;

    var frame = Dom.findUpward(event.target, function (node) {
        return node == closable.dialogFrame;
    });

    if (frame) return;
    closable.dialogFrame.focus();
};
window.addEventListener("load", function () {
    window.document.addEventListener("focus", Dialog.globalFocusHandler, true);
}, false);

Dialog.prototype.handleCloseClick = function () {
    if (!this.closeHandler) return;
    var returnValue = this.closeHandler.apply(this);
    if (returnValue) this.close();
};
Dialog.prototype.handleHeaderMouseDown = function (event) {
    Dom.cancelEvent(event);
    Dialog.heldInstance = this;
    Dialog._lastScreenX = event.screenX;
    Dialog._lastScreenY = event.screenY;
};
Dialog.prototype.handleBodyKeyPress = function (event) {
    if (event.keyCode != DOM_VK_RETURN) return;
    if (!this.primaryButton) return;

    let node = Dom.findUpward(event.target, function (node) {
        return node.localName == "input" || node.localName == "select";
    })

    if (!node) return;
    this.primaryButton.click();
};


function BuilderBasedDialog(builder) {
    this.builder = builder;
    this.builder._dialog = this;
    Dialog.call(this);

    this.title = typeof(builder.title) == "function" ? builder.title.bind(this.builder) : builder.title;
};

__extend(Dialog, BuilderBasedDialog);

const DIALOG_SIZE_SPECS = {
        tiny: 120,
        mini: 200,
        smaller: 280,
        small: 350,
        normal: 450,
        large: 600,
        "slightly-larger": 700,
        larger: 800,
        huge: 1010
};

BuilderBasedDialog.prototype.buildContentNode = function () {
    var div = document.createElement("div");
    if (this.builder.size) {
        var size = (DIALOG_SIZE_SPECS[this.builder.size] / 12) * Util.em();
        div.style.width = size + "px";
    }
    this.builder.buildContent.call(this.builder, div);

    return div;
}
BuilderBasedDialog.prototype._newLegacyAction = function (action) {
    return {
        title: typeof(action.title) == "function" ? action.title.bind(this.builder) : action.title,
        type: action.isCloseHandler ? "cancel" : (action.primary ? "accept" : "extra1"),
        isApplicable: action.isApplicable ? action.isApplicable.bind(this.builder) : null,
        run: action.run.bind(this.builder)
    };
};
BuilderBasedDialog.prototype.getDialogActions = function () {
    var thiz = this;
    return this.builder.actions.map(function (action) { return thiz._newLegacyAction(action); });
}
BuilderBasedDialog.prototype.quit = function () {
    this.close();
};

Dialog.hasOpenDialog = function () {
    for (var closable of BaseWidget.closables) {
        if (__isSubClassOf(closable.constructor, Dialog)) return true;
    }

    return false;
};
Dialog.alert = function (message, extra, onClose) {
    var builder = {
        title: "Information",
        size: message.size || "small",
        buildContent: function (container) {
            container.appendChild(Dom.newDOMElement({
                _name: "hbox", "class": "MessageDialog",
                _children: [
                    { _name: "i", "class": "DialogIcon Alert", _text: "info" },
                    {
                        _name: "vbox", flex: 1, "class": "Messages",
                        _children: [
                            { _name: "strong", _text: message },
                            { _name: "p", _text: extra || ""}
                        ]
                    }
                ]
            }));
        },
        actions: [{
            title: "Close",
            primary: true,
            isCloseHandler: true,
            run: function () {
                this._dialog.quit();
                if (onClose) onClose();
                return true;
            }
        }]
    };
    new BuilderBasedDialog(builder).open();
}
Dialog.error = function (message, extra, onClose) {
    var builder = {
        title: "Error",
        size: "small",
        buildContent: function (container) {
            container.appendChild(Dom.newDOMElement({
                _name: "hbox", "class": "MessageDialog",
                _children: [
                    { _name: "i", "class": "DialogIcon Error", _text: "error" },
                    {
                        _name: "vbox", flex: 1, "class": "Messages",
                        _children: [
                            { _name: "strong", _text: message },
                            { _name: "p", _text: extra || ""}
                        ]
                    }
                ]
            }));
        },
        actions: [{
            title: "Close",
            primary: true,
            isCloseHandler: true,
            run: function () {
                this._dialog.quit();
                if (onClose) onClose();
                return true;
            }
        }]
    };
    new BuilderBasedDialog(builder).open();
}
Dialog.prompt = function (message, initialValue, acceptMessage, onInput, cancelMessage, onCancel) {
    var builder = {
        title: "Prompt",
        size: "small",
        buildContent: function (container) {
            var i = document.createElement("i");
            i.appendChild(document.createTextNode("info"));
            i.setAttribute("class", "Icon DialogIcon");
            container.appendChild(i);

            var div = document.createElement("div");
            container.appendChild(div);
            var p = document.createElement("p");
            p.appendChild(document.createTextNode(message));
            div.appendChild(p);

            this.input = Dom.newDOMElement({
                _name: "input",
                type: "text",
                style: "width: calc(100% - 10px); padding: 5px;",
                "class": "Focusable"
            });

            div.appendChild(this.input);
            this.input.value = initialValue || "";

            div.setAttribute("style", "margin-left: 4em;");
        },
        actions: [
                  {
                      title: acceptMessage ? acceptMessage : "OK",
                      primary: true,
                      run: function () {
                          this._dialog.quit();
                          if (onInput) onInput(this.input.value);
                          return true;
                      }
                  },
                  {
                      title: cancelMessage ? cancelMessage : "Cancel",
                      isCloseHandler: true,
                      run: function () {
                          this._dialog.quit();
                          if (onCancel) onCancel();
                          return true;
                      }
                  }
              ]
    };
    new BuilderBasedDialog(builder).open();
}
Dialog.confirm = function (question, extra, positiveActionTitle, onPositiveAnswer, negativeActionTitle, onNegativeAnswer, extraActionTitle, onExtraActionAnswer) {
    var builder = {
        title: "Confirm",
        size: "normal",
        buildContent: function (container) {
            container.appendChild(Dom.newDOMElement({
                _name: "hbox", "class": "MessageDialog",
                _children: [
                    { _name: "i", "class": "DialogIcon", _text: "help" },
                    {
                        _name: "vbox", flex: 1, "class": "Messages",
                        _children: [
                            { _name: "strong", _text: question },
                            { _name: "p", _text: extra || ""}
                        ]
                    }
                ]
            }));
        },
        actions: [
            {
                title: positiveActionTitle ? positiveActionTitle : "Yes",
                primary: true,
                run: function () {
                    this._dialog.quit();
                    if (onPositiveAnswer) onPositiveAnswer();
                    return true;
                }
            },
            {
                title: negativeActionTitle ? negativeActionTitle : "No",
                isCloseHandler: true,
                run: function () {
                    this._dialog.quit();
                    if (onNegativeAnswer) onNegativeAnswer();
                    return true;
                }
            },
            {
                title: extraActionTitle ? extraActionTitle : "Extra",
                isApplicable: function () {
                    return extraActionTitle;
                },
                run: function () {
                    this._dialog.quit();
                    if (onExtraActionAnswer) onExtraActionAnswer();
                    return true;
                }
            }
        ]
    };
    new BuilderBasedDialog(builder).open();
};
Dialog.select = function (items, callback, selectedItems, options) {
    if (!options) options = {};
    if (!selectedItems) selectedItems = [];
    var same = options.same || sameRelax;
    var formatter = options.formatter || function (x) {return "" + x};
    var columns = options.columns || 1;
    var builder = {
        title: options.title || "Select",
        size: options.size || "normal",
        buildContent: function (container) {
            if (options.message) {
                var i = document.createElement("p");
                Dom.addClass(i, "fa fa-question-circle");
                i.setAttribute("style", "float: left; font-size: 2em; color: #428BCA;");
                container.appendChild(i);

                var p = document.createElement("p");
                container.appendChild(p);
                p.appendChild(document.createTextNode(options.message));
                p.setAttribute("style", "margin-left: 3em; min-height: 2em;");
            }

            var div = document.createElement("div");
            this.inputs = [];
            for (var i = 0; i < items.length; i ++) {
                var id = "cb_" + widget.random();
                var holder = {};
                var span = Dom.newDOMElement({
                    _name: "span",
                    style: "display: inline-block",
                    _children: [
                                {_name: "input", type: "checkbox", _id: "checkbox", id: id, style: "vertical-align: middle;"},
                                {_name: "label", "for": id, _html: Dom.htmlEncode(formatter(items[i])), style: "padding-left: 1ex; vertical-align: middle;"},
                                ]
                }, document, holder);

                this.inputs.push(holder.checkbox);
                holder.checkbox._item = items[i];
                holder.checkbox.checked = contains(selectedItems, items[i], same);
                div.appendChild(span);
                if (options.columnWidth) span.style.width = options.columnWidth;

                if ((i + 1) % columns == 0) {
                    div.appendChild(document.createElement("br"));
                }
                if (i % columns > 0) {
                    span.style.marginLeft = "2em";
                }
            }
            container.appendChild(div);
        },
        actions: [
            {
                title: options.selectActionTitle || "Select",
                primary: true,
                run: function () {
                    var selected = [];
                    for (var i = 0; i < this.inputs.length; i ++) {
                        if (this.inputs[i].checked) selected.push(this.inputs[i]._item);
                    }

                    callback(selected);
                    return true;
                }
            },
            {
                title: "Cancel",
                isCloseHandler: true,
                run: function () {
                    return true;
                }
            }
        ]
    };
    new BuilderBasedDialog(builder).open();
};
Dialog.selectDir = function (title, defaultPath, callback) {
    dialog.showOpenDialog(remote.getCurrentWindow(), {
        title: title,
        defaultPath: defaultPath || (path.join(this.documentPath && path.dirname(this.documentPath) || os.homedir(), "")),
        properties: ["openDirectory"]
    }, function (dirPath) {
        if (!dirPath) return;
        callback(dirPath)
    });
};
