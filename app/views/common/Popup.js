function Popup() {
    BaseTemplatedWidget.call(this);

    this.forceInside = true;
    this.useZIndex = true;
    this.visible = false;
    this.shouldDetach = true;
    Dom.addClass(this.popupContainer, "UIWidget");

    Popup.registerGlobalListeners();
}
__extend(BaseTemplatedWidget, Popup);
Popup.Z_INDEX = 9001;

Popup.registerGlobalListeners = function () {
    if (Popup._globalListenersRegistered) return;
    Popup._globalListenersRegistered = true;

    document.addEventListener("mousedown", function () {
        Popup.mouseHeld = true;
    }, false);
    document.addEventListener("mouseup", function () {
        Popup.mouseHeld = false;
    }, false);
    document.addEventListener("mousemove", function (event) {
        if (!Popup.mouseHeld) return;
        if (BaseWidget.closables.length == 0) return;
        var closable = BaseWidget.closables[BaseWidget.closables.length - 1];
        if (!__isAssignableFrom(closable.constructor, Popup)) return;
        if (closable.allowMouseDragging) return;
        var input = Dom.findUpward(event.target, function (n) {
            return n.localName == "input" || n.localName == "select" || n.localName == "textarea";
        });
        if (input) return;

        Dom.cancelEvent(event);
    }, false);
};

Popup.prototype.onAttached = function () {
    if (this.popupContainer) {
        // this.reparent();
	    this.popupContainer.style.position = "absolute";
	    this.popupContainer.style.left = "0px";
	    this.popupContainer.style.top = "0px";
        this.hidePopupContainer();
	    // this.hide();
	}
};
Popup.prototype.setPopupClass = function (clazz) {
    Dom.addClass(this.popupContainer, clazz);
};
Popup.prototype.closeUpward = function (event) {
    var thiz = this;
    var node = !event ? null : Dom.findUpward(event.target, function (n) {
        return n == thiz.popupContainer;
    });

    if (node) return;
    if (this.dontCloseUpward && this.dontCloseUpward(event)) return;
    this.hide();
    if (event) Dom.cancelEvent(event);

    if (this._parent) this._parent.closeUpward(event);
};
Popup.prototype.shouldCloseOnBlur = function (event) {
    return true;
};
Popup.prototype.checkToCloseParent = function (element) {
    var thiz = this;
    var handler = function (popup) {
        if (!popup._parent) return;

        var node = Dom.findUpward(element, function (n) {
            return n == popup._parent.popupContainer;
        });

        if (node) {
            popup._parent._keepShowing = true;
        } else {
            popup._parent._keepShowing = false;
        }

        handler(popup._parent);
    };

    handler(this);
};
Popup.prototype.setContentFragment = function (fragment) {
    this.popupContainer.appendChild(fragment);
};
Popup.prototype.reparent = function () {
    if (this.popupContainer.parentNode != this.node().ownerDocument.body) {
        if (this.popupContainer.parentNode) this.popupContainer.parentNode.removeChild(this.popupContainer);
        this.node().ownerDocument.body.appendChild(this.popupContainer);
    }
};
Popup.prototype.toggle = function (anchor, hAlign, vAlign, hPadding, vPadding, autoFlip) {
    if (this.isVisible()) {
        this.hide();
    } else {
        this.show(anchor, hAlign, vAlign, hPadding, vPadding, autoFlip);
    }
};
Popup.prototype._showContainer = function () {
    var name = this.popupContainer.localName;
    this.popupContainer.style.display = (name == "hbox" || name == "vbox" || name == "box") ? "flex" : "block";
};
Popup.prototype.show = function (anchor, hAlign, vAlign, hPadding, vPadding, autoFlip) {
    this.reparent();

    if (this.mode) {
        this.popupContainer.setAttribute("mode", this.mode);
    }

    this.popupContainer.style.position = "absolute";
    this.popupContainer.style.left = "0px";
    this.popupContainer.style.top = "0px";

    this.popupContainer.style.visibility = "hidden";
    this._showContainer();
    this.popupContainer.style.height = "auto";
    this.popupContainer.style.overflow = "visible";

    var thiz = this;
    window.setTimeout(function () {
        thiz._showImpl(anchor, hAlign, vAlign, hPadding, vPadding, autoFlip || true);
    }, 10);
};
Popup.prototype.isVisible = function () {
    return this.visible;
};
Popup.prototype.showAt = function (x, y, skipEvent, autoFlip) {
    this.reparent();

    console.log("Showing at: ", [x, y]);

    if (this.mode) {
        this.popupContainer.setAttribute("mode", this.mode);
    }

    this.popupContainer.style.position = "absolute";
    this.popupContainer.style.visibility = "hidden";
    this._showContainer();

    var w = this.popupContainer.offsetWidth;
    var h = this.popupContainer.offsetHeight;


    var screenW = document.body.offsetWidth - 10;
    var screenH = window.innerHeight - 10;

    if (y + h > screenH) {
        y = y - h;
        if (y < 0) {
            y += h/2;
        }
    }

    if (x + w > screenW) {
        x = autoFlip ? x - w : screenW - w;
    }

    this.popupContainer.style.position = "absolute";
    this.popupContainer.style.left = x + "px";
    this.popupContainer.style.top = y + "px";
    if (this.useZIndex) this.popupContainer.style.zIndex = Popup.Z_INDEX;
    this.popupContainer.style.visibility = "inherit";
    this.popupContainer.style.opacity = this.popupOpacity || 1;

    this.visible = true;
    if (!skipEvent) Dom.emitEvent("p:PopupShown", this.node());
    if (!this.skipStack) {
        BaseWidget.registerClosable(this);
    }
};
Popup.prototype._calculatePosition = function (anchor, hAlign, vAlign, hPadding, vPadding) {
    var w = this.popupContainer.offsetWidth;
    var h = this.popupContainer.offsetHeight;

    var rect = anchor.getBoundingClientRect();
    var viewportRect = this.popupContainer.parentNode.getBoundingClientRect();

    var aw = rect.width;
    var ah = rect.height;
    var ax = rect.left - viewportRect.left;
    var ay = rect.top - viewportRect.top;

    var p = hPadding || 0;

    var x = 0;
    if (hAlign == "left") x = ax - w - p;
    if (hAlign == "left-inside") x = ax + p;
    if (hAlign == "middle" || hAlign == "center") x = ax + aw / 2 - w / 2;
    if (hAlign == "right") x = ax + aw + p;
    if (hAlign == "right-inside") x = ax + aw - w - p;

    p = vPadding || p;

    var y = 0;
    if (vAlign == "top") y = ay - h - p;
    if (vAlign == "top-inside") y = ay + p;
    if (vAlign == "middle" || vAlign == "center") y = ay + ah / 2 - h / 2;
    if (vAlign == "bottom") y = ay + ah + p;
    if (vAlign == "bottom-inside") y = ay + ah - h - p;

    return {x: x, y: y, viewportWidth: viewportRect.width, viewportHeight: viewportRect.height};
};
Popup.prototype.invalidatePosition = function () {
    if (!this.lastShowOptions) return;
    this._showImpl(this.lastShowOptions.anchor,
        this.lastShowOptions.hAlign,
        this.lastShowOptions.vAlign,
        this.lastShowOptions.hPadding,
        this.lastShowOptions.vPadding,
        this.lastShowOptions.autoFlip,
        "skipEvent");
};
Popup.prototype._showImpl = function (anchor, hAlign, vAlign, hPadding, vPadding, autoFlip, skipEvent) {
    this.lastShowOptions = {
        anchor: anchor,
        hAlign: hAlign,
        vAlign: vAlign,
        hPadding: hPadding,
        vPadding: vPadding,
        autoFlip: autoFlip,
        skipEvent: skipEvent
    };
    var w = this.popupContainer.offsetWidth;
    var h = this.popupContainer.offsetHeight;

    var p = this._calculatePosition(anchor, hAlign, vAlign, hPadding, vPadding);
    var x = p.x;
    var y = p.y;
    var rect = anchor.getBoundingClientRect();
    //invalidate into view
    var screenW = p.viewportWidth - 10;
    if (x + w > screenW || x < 0) {
        if (autoFlip && (hAlign == "right" || hAlign == "left-inside")) {
            p = this._calculatePosition(anchor, hAlign == "right" ? "left" : "right-inside", vAlign, hPadding, vPadding);
            x = p.x;
            if (x + w > screenW) {
                x = x - ((x+w) - screenW);
            }
            if (x < 0) {
                x += w/2;
                x = Math.max(rect.left + rect.width, x);
                if (x == 0 && w > screenW) {
                    x = rect.left + rect.width;
                    this.popupContainer.style.width = ((screenW -x) * 0.9) + "px";
                    this.popupContainer.style.overflow = "auto";
                }
            }
        } else {
            if (this.forceInside) x = screenW - w;
        }
    }
    var screenH = p.viewportHeight - 10;
    if (y + h > screenH) {
        if (autoFlip && (vAlign == "bottom" || vAlign == "top-inside")) {
            p = this._calculatePosition(anchor, hAlign, vAlign == "bottom" ? "top" : "bottom-inside", hPadding, vPadding);
            y = p.y;
            if (y + h > screenH) {
                y = y - ((y+h) - screenH);
            }
            if (y < 0) {
                y += h/2;
                y = Math.min(rect.top + rect.height, y);
                y = Math.max(0, y);
                if (y == 0 && h > screenH) {
                    y = rect.top + rect.height;
                    this.popupContainer.style.height = ((screenH - y) * 0.9)  + "px";
                    this.popupContainer.style.overflow = "auto";
                }
            }
        } else {
            if (this.forceInside)  {
                this.popupContainer.style.height = (screenH - y) + "px";
                this.popupContainer.style.overflow = "auto";
            }
        }
    }

    this.popupContainer.style.position = "absolute";
    this._setPosition(x, y);
    if (this.useZIndex) this.popupContainer.style.zIndex = Popup.Z_INDEX;
    this.popupContainer.style.visibility = "inherit";
    this._showContainer();
    this.popupContainer.style.opacity = this.popupOpacity || 1;

    this.visible = true;
    if (!skipEvent) Dom.emitEvent("p:PopupShown", this.node());

    if (!this.skipStack) {
        BaseWidget.registerClosable(this);
    }
};
Popup.prototype._setPosition = function (x, y) {
    this.popupContainer.style.left = x + "px";
    this.popupContainer.style.top = y + "px";
};
Popup.prototype.close = function () {
    this.hide();
};
Popup.prototype.getClosableContainer = function () {
    return this.popupContainer;
};
Popup.prototype.hidePopupContainer = function () {
    this.popupContainer.style.opacity = 0;
    this.popupContainer.style.visibility = "hidden";
    this.visible = false;
}
Popup.prototype.hide = function (silent) {
    this.hidePopupContainer();
    if (!silent) Dom.emitEvent("p:PopupHidden", this.node());
    if (this.onHide) this.onHide();

    BaseWidget.unregisterClosable(this);
    if (this.e(this.shouldDetach)) this.detach();
};
Popup.prototype.detach = function () {
    if (this.popupContainer.parentNode) {
        this.popupContainer.parentNode.removeChild(this.popupContainer);
    }
};
Popup.hasShowPopup = function () {
    return BaseWidget.closables.length;
};
