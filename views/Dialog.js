function Dialog() {
    BaseTemplatedWidget.call(this);

    this.bind("click", this.handleActionClick, this.dialogFooter);
    this.bind("click", this.handleCloseClick, this.dialogClose);
    this.bind("mousedown", this.handleHeaderMouseDown, this.dialogHeaderPane);

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
    return this.getTemplatePrefix() + "Dialog.xhtml";
};
Dialog.prototype.buildDOMNode = function () {
    var frameTemplate = this.getFrameTemplate();
    var node = widget.Util.loadTemplateAsNodeSync(frameTemplate, this);

    //load also the sub-class template into the dialog body
    //please note that the binding will be done for both templates
    var contentNode = widget.Util.loadTemplateAsNodeSync(this.getTemplatePath(), this);
    this.dialogBody.appendChild(contentNode);

    return node;
};
Dialog.prototype.open = function (options) {
    if (this.setup) this.setup(options);
    this.invalidateElements();

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
        var button = this.createButton(a);
        if (a.order < 0) {
            this.dialogFooterStartPane.appendChild(button);
        } else if (a.order == 0) {
            this.dialogFooterMiddlePane.appendChild(button);
        } else {
            this.dialogFooterEndPane.appendChild(button);
        }
    }, this);


    Dom.empty(this.dialogTitle);
    this.dialogTitle.appendChild(document.createTextNode(this.e(this.title)));

    console.log(this.closeHandler);
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
    this.dialogFrame.parentNode.removeChild(this.dialogFrame);
    if (this.overlay) {
        this.overlay.parentNode.removeChild(this.overlay);
    } else {
        this.overlay = this.node().ownerDocument.createElement("div");
        Dom.addClass(this.overlay, "Sys_DialogOverlay");
    }

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
        var screenW = window.innerWidth;
        var screenH = window.innerHeight - 20;

        var w = thiz.dialogFrame.offsetWidth;
        var h = thiz.dialogFrame.offsetHeight;

        var x = (screenW - w) / 2;
        var y = (screenH - h) / 2;

        console.log("Dialog size 0: ", thiz.dialogFrame.offsetWidth, thiz.dialogFrame.offsetHeight);

        thiz.moveTo(x, y);

        thiz.dialogFrame.style.visibility = "visible";
        thiz.dialogFrame.style.opacity = "1";
    }, 100);

    BaseWidget.registerClosable(this);
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
    this.overlay.parentNode.removeChild(this.overlay);
    this.dialogFrame.style.transition = "opacity 0.1s";
    this.dialogFrame.style.opacity = "0";
    var thiz = this;
    window.setTimeout(function () {
        thiz.dialogFrame.parentNode.removeChild(thiz.dialogFrame);
        thiz.dialogFrame.style.display = "none";
    }, 100);
    this.overlay.style.display = "none";

    if (arguments.length > 0 && this.callback) {
        var args = [];
        for (var i = 0; i < arguments.length; i ++) {
            args.push(arguments[i]);
        }
        this.callback.apply(window, args);
    }

    BaseWidget.unregisterClosable(this);
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
