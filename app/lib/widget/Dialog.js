widget.Dialog = function() {
    var visibleInstanceCount = 0;
    var BASE_ZINDEX = 10000;
    var SIZE_SPECS = {
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

    var dialogs = [];
    function actionClickHandler(event) {
        var dialog = Dialog.findInstance(event);
        if (!dialog) return;

        var target = Dom.getTarget(event);
        var button = Dom.findUpward(target, {
            eval: function (n) {
                return n.getAttribute && n.getAttribute("action-index");
            }
        });
        if (!button) {
            return;
        }

        var actionIndex = parseInt(button.getAttribute("action-index"), 10);
        var action = dialog.actions[actionIndex];



        var quit = action.run.apply(dialog.builder);
        if (quit) {
            dialog.quit();
        }
    }
    function closeClickHandler(event) {
        var dialog = Dialog.findInstance(event);
        if (!dialog || !dialog.closeHandlerAction) return;

        var quit = dialog.closeHandlerAction.run.apply(dialog.builder);
        if (quit) {
            dialog.quit();
        }
    }
    function globalKeyHandler(event) {
        if (event.keyCode == 27) {
            if (dialogs.length <= 0) return;
            var dialog = dialogs[dialogs.length - 1];
            if (!dialog.closeHandlerAction) return;

            var quit = dialog.closeHandlerAction.run.apply(dialog.builder);
            if (quit) {
                dialog.quit();
            }
        }
    }
    function globalMouseMoveHandler(event) {
        if (!Dialog.heldInstance) return;

        Dom.cancelEvent(event);

        var dx = event.screenX - Dialog._lastScreenX;
        var dy = event.screenY - Dialog._lastScreenY;

        Dialog._lastScreenX = event.screenX;
        Dialog._lastScreenY = event.screenY;

        Dialog.heldInstance.moveBy(dx, dy);
    }

    Dom.registerEvent(window, "load", function () {
        Dom.registerEvent(document, "keyup", globalKeyHandler, false);
        Dom.registerEvent(document, "mousemove", globalMouseMoveHandler, false);
        Dom.registerEvent(document, "mouseup", function (event) {
            if (Dialog.heldInstance) {
                Dialog.heldInstance.bodyOverlay.style.display = "none";
            }
            Dialog.heldInstance = null;
        }, false);

    }, false)

    function Dialog(builder, host) {
        this.builder = builder;
        this.host = host || null;
        this.builder._dialog = this;
        if (typeof(this.builder.bodyScroll) == "undefined") {
            this.builder.bodyScroll = true;
        }
        this.builder.icon = this.builder.icon || "fa-file-text";

        if (!host) {
            this.overlay = document.createElement("div");
            document.body.appendChild(this.overlay);
            Dom.addClass(this.overlay, "Overlay");
            Dom.addClass(this.overlay, "DialogOverlay");
        }

        //sort actions to make sure primaries are to the right
        this.actions = [];
        this.closeHandlerAction = null;
        if (builder.actions) {
            for (var i = 0; i < builder.actions.length; i ++) {
                var action = builder.actions[i];
                if (action.primary || action.isCloseHandler) continue;
                this.actions.push(action);
            }
        }
        if (builder.actions) {
            for (var i = 0; i < builder.actions.length; i ++) {
                var action = builder.actions[i];
                if (action.primary) {
                    this.actions.push(action);
                    if (action.isCloseHandler) {
                        this.closeHandlerAction = action;
                    }
                } else if (action.isCloseHandler) {
                    this.actions.unshift(action);
                    this.closeHandlerAction = action;
                }
            }
        }
        var r = widget.random();
        var bodyId = "body_" + r;
        var footerId = "footer_" + r;
        var closeId = "close_" + r;
        var headerId = "header_" + r;
        var footerSpaceId = "footerSpace_" + r;
        var extraViewId = "extraView_" + r;
        var primaryButtonId = null;

        var html = "";

        if (host) {
            html =
                "    <div class=\"modal-content-embedded\">\n";
        } else {
            html =
                "    <div class=\"modal-content\">\n" +
                "      <div class=\"modal-header\" id=\"" + headerId + "\">\n" +
                (
                        this.closeHandlerAction ?
                                "<button type=\"button\" class=\"close\" data-dismiss=\"modal\" id=\"" + closeId + "\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button>\n" : ""

                ) +
                "        <h4 class=\"modal-title\">" + (!builder.image ? ("<span class=\"fa " + builder.icon + "\"></span>")
                        : ("<img class=\"fa Icon\" width=\"16\" src=\"" + builder.image + "\"/>")) + Dom.htmlEncode(builder.title) + "</h4>\n" +
                "      </div>\n";
        }

        html +=
            "      <div class=\"modal-body\" id=\"" + bodyId + "\">" +
            "      </div>\n" +
            "      <div class=\"modal-footer\" id=\"" + footerId + "\"><div class=\"modal-footer-space\" id=\"" + footerSpaceId + "\"></div>\n";
        if (this.builder.buildExtraContent) {
            html += "<div class=\"modal-footer-extra\" id=\"" + extraViewId + "\"></div>\n";
        }

        for (var i = 0; i < this.actions.length; i ++) {
            var action = this.actions[i];
            var id = "button_" + r + "_" + i;
            html += "<button type=\"button\"" +
                        " id=\"" + id + "\"" +
                        " action-index=\"" + i + "\"" +
                        " class=\"btn " +
                        (widget.evaluate(action.excluded, this.builder) ? " btn-excluded " : "") +
                        (widget.evaluate(action.primary, this.builder) ? "btn-primary " : widget.evaluate(action.isImportant, this.builder) ? "" : "btn-default ") +
                        (widget.evaluate(action.extra, this.builder) ? " btn-extra " : "") +
                        (widget.evaluate(action.isImportant, this.builder) ? " btn-danger" : "") +
                        "\">" +
                            Dom.htmlEncode(widget.evaluate(action.title, this.builder)) +
                    "</button>\n";

            if (widget.evaluate(action.primary, this.builder)) {
                primaryButtonId = id;
            }

            action._buttonId = id;
        }

        html += "      </div>\n" +
            "    </div>\n";

        this.dialogDiv = document.createElement("div");
        var dialogDivContainer = host ? host.container : document.body;

        dialogDivContainer.appendChild(this.dialogDiv);
        Dom.addClass(this.dialogDiv, "DialogContainer modal-dialog");

        if (host) {
            Dom.addClass(this.dialogDiv, "EmbeddedDialogContainer");
        }

        if (this.builder.extraClass) {
            Dom.addClass(this.dialogDiv, this.builder.extraClass);
        }

        this.dialogDiv.innerHTML = html;
        this.dialogDiv._dialog = this;
        this.body = document.getElementById(bodyId);
        this.footer = document.getElementById(footerId);
        this.footerSpace = document.getElementById(footerSpaceId);
        this.header = document.getElementById(headerId);
        this.primaryButton = primaryButtonId ? document.getElementById(primaryButtonId) : null;
        this.extraView = document.getElementById(extraViewId);

        if (this.builder.hiddenFooter) {
        	this.footer.style.display = "none";
        }

        if (!host) {
            Dom.registerEvent(this.header, "mousedown", function (event) {
                Dom.cancelEvent(event);
                Dialog.heldInstance = Dialog.findInstance(event);
                Dialog._lastScreenX = event.screenX;
                Dialog._lastScreenY = event.screenY;
                if (!Dialog.heldInstance.bodyOverlay) {
                    Dialog.heldInstance.bodyOverlay = document.createElement("div");
                    Dialog.heldInstance.bodyOverlay.style.top = "0px";
                    Dialog.heldInstance.bodyOverlay.style.left = "0px";
                    Dialog.heldInstance.bodyOverlay.style.right = "0px";
                    Dialog.heldInstance.bodyOverlay.style.bottom = "0px";
                    Dialog.heldInstance.bodyOverlay.style.position = "absolute";
                    Dialog.heldInstance.bodyOverlay.style.background = "rgba(0, 0, 0, 0)";
                    Dialog.heldInstance.bodyOverlay.style.background = "transparent;filter:progid:DXImageTransform.Microsoft.gradient(startColorstr=#00000000,endColorstr=#00000000)";
                    Dialog.heldInstance.bodyOverlay.style.zIndex = BASE_ZINDEX + visibleInstanceCount + 1;
                    Dialog.heldInstance.body.appendChild(Dialog.heldInstance.bodyOverlay);
                } else {
                    Dialog.heldInstance.bodyOverlay.style.display = "block";
                }

            }, false);

            if (this.closeHandlerAction) {
                var closeButton = document.getElementById(closeId);
                Dom.registerEvent(closeButton, "click", closeClickHandler, false);
            }
        }

        builder.buildContent(this.body);

        this.invalidateActions();

        if (builder.buildExtraContent) {
           builder.buildExtraContent(this.extraView);
        }
        Dom.registerEvent(this.footer, "click", actionClickHandler, false);

        if (this.overlay) this.overlay.style.visibility = "hidden";
        this.dialogDiv.style.visibility = "hidden";

        //calculating size to make the dialog center
        var W = Dom.getWindowWidth();
        var H = Dom.getWindowHeight();

        if (host) {
            host.container.style.overflow = "hidden";
            W = Dom.getOffsetWidth(host.container);
            H = Dom.getOffsetHeight(host.container);
        }

        var requestWidth = builder.size ? (isNaN(builder.size) ? SIZE_SPECS[builder.size] : parseInt(builder.size, 10)) : 600;

        if (builder.bodySize) {
            requestWidth = builder.bodySize.w;
            this.body.style.height = builder.bodySize.h + "px";
        }

        if (requestWidth > W - 10) requestWidth = W - 10;

        if (host) {
            requestWidth = W;
        }

        this.dialogDiv.style.width = requestWidth + "px";
        var hMargin = Math.floor((W - requestWidth) / 2);
        if (hMargin < 0) hMargin = 0;
        this.dialogDiv.style.marginLeft = hMargin + "px";
        this.dialogDiv.style.marginRight = hMargin + "px";

        var h = this.dialogDiv.scrollHeight;

        var MARGIN = this.builder.viewPortMargin || 10;
        if (host) MARGIN = 0;
        var vMargin = MARGIN;
        if (h + MARGIN * 2 > H || builder.grabHeight) {
            var currentBodyHeight = this.body.scrollHeight;
            var delta = h - currentBodyHeight;
            var newHeight = H - 2 * MARGIN - delta;
            this.body.style.overflow = (this.builder.bodyScroll == true) ? "auto" : "none";
            this.body.style.height = newHeight + "px";

            if (builder.grabHeight) {
//                this.body.firstChild.style.height = "100%";
            }
        } else {
            vMargin = Math.floor((H - h) / 3);
            this.body.style.overflow = (this.builder.bodyScroll == true) ? "auto" : "none";
        }

        if (!host) {
            vMargin += (visibleInstanceCount * 5);
        } else {
            vMargin = 0;
        }
        this.dialogDiv.style.marginTop = vMargin + "px";

        this.x = hMargin;
        this.y = vMargin;
    }

    Dialog.prototype.moveBy = function (dx, dy) {
        this.moved = true;
        this.x += dx;
        this.y += dy;

        if (this.y < 0) this.y = 0;

        this.dialogDiv.style.marginLeft = this.x + "px";
        this.dialogDiv.style.marginTop = this.y + "px";
    }

    Dialog.prototype.invalidateActions = function () {
        for (var i = 0; i < this.actions.length; i ++) {
            var action = this.actions[i];
            var id = action._buttonId;
            var button = document.getElementById(id);
            if (action.isApplicable) {
                Dom.toggleClass(button, "AlwaysVisible", action.alwaysVisible);
                if (widget.evaluate(action.isApplicable, this.builder)) {
                    Dom.removeClass(button, "disabled");
                    button.removeAttribute("disabled");
                } else {
                    Dom.addClass(button, "disabled");
                    button.setAttribute("disabled", "true");
                }
            }

            Dom.setInnerText(button, widget.evaluate(action.title, this.builder));
        }
    };

    Dialog.getTopZIndex = function () {
        return BASE_ZINDEX + visibleInstanceCount - 1;
    };
    Dialog.prototype.show = function () {
        if (this.builder.onOpen) {
            var args = [];
            for (var i = 0; i < arguments.length; i ++) {
                args.push(arguments[i]);
            }

            this.builder.onOpen.apply(this.builder, args);
        }

        if (this.overlay) {
            this.overlay.style.visibility = (typeof(this.builder.modal) == "undefined" || this.builder.modal) ? "visible" : "hidden";
        }
        this.dialogDiv.style.visibility = "visible";

        if (!this.host) {
            this.overlay.style.zIndex = BASE_ZINDEX + visibleInstanceCount;
            this.dialogDiv.style.zIndex = BASE_ZINDEX + visibleInstanceCount;

            Dom.addClass(this.overlay, "DialogOverlayLevel" + visibleInstanceCount);

            dialogs.push(this);

            visibleInstanceCount ++;
            if (visibleInstanceCount == 1) {
                Dom.addClass(document.body, "WithModalDialog");
                if (document.body.scrollHeight > document.body.parentNode.clientHeight) {
                    Dom.addClass(document.body, "WithModalDialogOverflowFix");
                }
            }
        }

//        if (this.primaryButton) {
//            var b = this.primaryButton;
//            window.setTimeout(function () {
//                try {
//                    b.focus();
//                } catch (e) { }
//            }, 100);
//        }

        if (this.builder.onAfterOpen) {
            var args = [];
            for (var i = 0; i < arguments.length; i ++) {
                args.push(arguments[i]);
            }

            this.builder.onAfterOpen.apply(this.builder, args);
        }

        var newHeight = Dom.getOffsetHeight(this.body);
        this.body.style.height = newHeight + "px";

        var focusable = Dom.findDescendantWithClass(this.dialogDiv, "Focusable");
        if (focusable) {
            focusable.focus();
            if (focusable.select) focusable.select();
        }
    };

    Dialog.prototype.quit = function () {
        if (this.quitted) {
            //console.log(this, "quited, skipp")
            return;
        }
        try {
            Dom.emitEvent("dialog.quit", this.dialogDiv, {});
        } catch (e) {
            //console.log(e);
        }
        this.dialogDiv.parentNode.removeChild(this.dialogDiv);

        if (this.overlay) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        if (!this.host) {
            visibleInstanceCount --;
            if (visibleInstanceCount == 0) {
                Dom.removeClass(document.body, "WithModalDialog");
                Dom.removeClass(document.body, "WithModalDialogOverflowFix");
            }

            //find me
            var index = -1;
            for (i = 0; i < dialogs.length; i ++) {
                if (dialogs[i] == this) {
                    index = i;
                    break;
                }
            }
            if (index >= 0) {
                dialogs.splice(index, 1);
            }
        }

        this.quitted = true;

        try {
            if (this.builder.onQuit) {
                this.builder.onQuit();
            }
        } catch (e) {
            //console.log("Error on onQuit", e);
        }
        Dom.doOnChildRecursively(document, {
            eval: function (node) {
                return Dom.hasClass(node, "bootstrap-datetimepicker-widget");
            }
        },
            function (control) {
            control.style.display = "none";
        });
    };
    Dialog.prototype.setModal = function (modal) {
        this.modal = modal;
        if (this.overlay) {
            this.overlay.style.visibility = modal ? "visible" : hidden;
        }
    };
    Dialog.prototype.setHeight = function (height) {
        this.body.style.height = height + "px";
    };

    Dialog.findInstance = function (event) {
        var target = Dom.getTarget(event);
        var node = Dom.findUpward(target, {
            eval: function(n) {
                return n._dialog;
            }
        });

        if (!node) return null;

        return node._dialog;
    };
    Dialog.findDialog = function (node) {
        var div = Dom.findUpward(node, {
            eval: function(n) {
                return n._dialog;
            }
        });
        if (div && div._dialog && div._dialog instanceof Dialog) {
            return div._dialog;
        }

        return null;
    }

    Dialog.alert = function (message, onClose) {
        var builder = {
            title: Messages["information"],
            size: message.size || "small",
            buildContent: function (container) {
                var i = document.createElement("p");
                Dom.addClass(i, "fa fa-info-circle");
                i.setAttribute("style", "float: left; font-size: 2em; color: #428BCA;");
                container.appendChild(i);

                var p = document.createElement("p");
                container.appendChild(p);
                if (message.html) {
                    p.innerHTML = message.html;
                } else {
                    p.appendChild(document.createTextNode(message));
                }
                p.setAttribute("style", "margin-left: 3em;");
            },
            actions: [{
                title: Messages["close"],
                primary: true,
                isCloseHandler: true,
                run: function () {
                    this._dialog.quit();
                    if (onClose) onClose();
                    return true;
                }
            }]
        };
        new Dialog(builder).show();
    }
    Dialog.error = function (message, onClose) {
        var builder = {
            title: Messages["error"],
            size: "small",
            buildContent: function (container) {
                var i = document.createElement("p");
                Dom.addClass(i, "fa fa-times-circle");
                i.setAttribute("style", "float: left; font-size: 2em; color: #700;");
                container.appendChild(i);

                var p = document.createElement("p");
                container.appendChild(p);
                p.appendChild(document.createTextNode(message));
                p.setAttribute("style", "margin-left: 3em;");
            },
            actions: [{
                title: Messages["close"],
                primary: true,
                isCloseHandler: true,
                run: function () {
                    this._dialog.quit();
                    if (onClose) onClose();
                    return true;
                }
            }]
        };
        new Dialog(builder).show();
    }
    Dialog.prompt = function (message, initialValue, acceptMessage, onInput, cancelMessage, onCancel) {
        var builder = {
            title: Messages["prompt"],
            size: "small",
            buildContent: function (container) {
                var i = document.createElement("p");
                Dom.addClass(i, "fa fa-question-circle");
                i.setAttribute("style", "float: left; font-size: 2em; color: #428BCA;");
                container.appendChild(i);

                var div = document.createElement("div");
                container.appendChild(div);
                var p = document.createElement("p");
                p.appendChild(document.createTextNode(message));
                div.appendChild(p);

                this.input = Dom.newDOMElement({
                    _name: "input",
                    style: "width: 20em;",
                    "class": "Focusable"
                });

                div.appendChild(this.input);
                this.input.value = initialValue || "";

                div.setAttribute("style", "margin-left: 3em;");
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
        new Dialog(builder).show();
    }
    Dialog.confirm = function (question, positiveActionTitle, onPositiveAnswer, negativeActionTitle, onNegativeAnswer) {
        var builder = {
            title: Messages["confirm"],
            size: "normal",
            buildContent: function (container) {
                var i = document.createElement("p");
                Dom.addClass(i, "fa fa-question-circle");
                i.setAttribute("style", "float: left; font-size: 2em; color: #428BCA;");
                container.appendChild(i);

                var p = document.createElement("p");
                container.appendChild(p);
                p.appendChild(document.createTextNode(question));
                p.setAttribute("style", "margin-left: 3em;");
            },
            actions: [
                {
                    title: positiveActionTitle ? positiveActionTitle : Messages["yes"],
                    primary: true,
                    run: function () {
                        this._dialog.quit();
                        if (onPositiveAnswer) onPositiveAnswer();
                        return true;
                    }
                },
                {
                    title: negativeActionTitle ? negativeActionTitle : Messages["no"],
                    isCloseHandler: true,
                    run: function () {
                        this._dialog.quit();
                        if (onNegativeAnswer) onNegativeAnswer();
                        return true;
                    }
                }
            ]
        };
        new Dialog(builder).show();
    };
    Dialog.select = function (items, callback, selectedItems, options) {
        if (!options) options = {};
        if (!selectedItems) selectedItems = [];
        var same = options.same || sameRelax;
        var formatter = options.formatter || function (x) {return "" + x};
        var columns = options.columns || 1;
        var builder = {
            title: options.title || Messages["select"],
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
                div.style.textAlign = "center";
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
                    title: options.selectActionTitle || Messages["select"],
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
                    title: Messages["cancel"],
                    isCloseHandler: true,
                    run: function () {
                        return true;
                    }
                }
            ]
        };
        new Dialog(builder).show();
    };

    //static initialization

    return Dialog;
}();

function BaseDialogBuilder() {

}
BaseDialogBuilder.prototype.open = function () {
    var thiz = this;
    var args = [];
    for (var i = 0; i < arguments.length; i ++) {
        args.push(arguments[i]);
    }

    if (this.prepareAsync) {
        var argsWithCallback = args.slice(0);
        argsWithCallback.push(function () {
            widget.Util.loadTemplate(thiz.templatePath, function() {
                thiz.dialog = new widget.Dialog(thiz, thiz.host);
                thiz.dialog.show.apply(thiz.dialog, args);
            });
        });
        this.prepareAsync.apply(this, argsWithCallback);
    } else {
        if (this.prepare) {
            this.prepare.apply(this, args);
        }

        if (this.withoutTemplate) {
            thiz.dialog = new widget.Dialog(thiz);
            thiz.dialog.show.apply(thiz.dialog, args);
        } else {
            widget.Util.loadTemplate(this.templatePath, function() {
                thiz.dialog = new widget.Dialog(thiz);
                thiz.dialog.show.apply(thiz.dialog, args);
            });
        }
    }
};
BaseDialogBuilder.prototype.buildContent = function (container) {
    widget.Util.loadTemplateAsNode(this.templatePath, function(node) {
        container.appendChild(node);
    }, this);
};
