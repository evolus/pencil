function ComboManager() {
    BaseTemplatedWidget.call(this);
    this.renderer = ComboManager.DEFAULT_RENDERER;
    this.bind("click", function () {
        if (this.popup.isVisible()) {
            this.popup.close();
            return;
        }
        this.button.setAttribute("active", true);
        this.popup.show(this.button, "left-inside", "bottom", 0, 5);
    }, this.button);
    this.bind("click", this.onItemClick, this.list);
    this.bind("p:PopupShown", function () {
        thiz.ensureSelectedItemVisible();
    }, this.popup);
    this.bind("p:PopupHidden", function () {
        this.button.removeAttribute("active");
        this.popup.popupContainer.scrollTop = 0;
        this.popup.removePopup();
        // this.popup.popupContainer.scrollTop = 0;
    }, this.popup);
    var thiz = this;
    this.popup.shouldCloseOnBlur = function (event) {
        var found = Dom.findUpward(event.target, function (node) {
            return node == thiz.button;
        });
        return !found;
    };
}

ComboManager.DEFAULT_RENDERER = function (item) {
    return "" + item;
};

__extend(BaseTemplatedWidget, ComboManager);

ComboManager.prototype.onItemClick = function (event) {
    var item = Dom.findUpwardForData(event.target, "_data");
    if (!item) return;

    this.selectItem(item, true);
};
ComboManager.prototype.ensureSelectedItemVisible = function() {
    for (var i = 0; i < this.list.childNodes.length; i ++) {
        var node = this.list.childNodes[i];
        if (!node._data) continue;
        if (this.selectedItem == node._data) {
            var oT = Dom.getOffsetTop(node);
            var oH = node.offsetHeight;
            var pT = Dom.getOffsetTop(this.list.parentNode) + 10;
            var pH = this.list.parentNode.offsetHeight - 20;

            if (oT < pT) {
                this.popup.popupContainer.scrollTop = Math.max(0, this.popup.popupContainer.scrollTop - (pT - oT));
            } else if (oT + oH > pT + pH) {
                this.popup.popupContainer.scrollTop = Math.max(0, this.popup.popupContainer.scrollTop + (oT + oH - pT - pH));
            }
            break;
        }
    }
}
ComboManager.prototype.setItems = function (items) {
    var first = null;
    this.items = items;
    this.list.innerHTML = "";
    if (!this.items) return;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var element = this.renderer(item);
        var node = null;
        if (element.getAttribute) {
            node = Dom.newDOMElement({
                _name: "div",
                "class": "Item",
            });
            node.appendChild(element);
        } else {
            node = Dom.newDOMElement({
                _name: "div",
                "class": "Item",
                _text: element
            });
        }
        if (this.decorator) this.decorator(node, item);

        node._data = item;
        this.list.appendChild(node);

        if (!first) first = item;
    }
    this.selectItem(first);
};

ComboManager.prototype.selectItem = function (item, fromUserAction) {
    var element = this.renderer(item);
    if (!element) return;

    if (element.getAttribute) {
        Dom.empty(this.buttonDisplay);
        this.buttonDisplay.appendChild(element);
    } else {
        this.buttonDisplay.innerHTML = Dom.htmlEncode(element);
        this.button.setAttribute("title", element);
    }
    if (this.decorator != null) {
        this.decorator(this.buttonDisplay, item);
    }
    this.selectedItem = item;
    if (fromUserAction) {
        Dom.emitEvent("p:ItemSelected", this.node(), {});
        this.popup.hide();
    }
    for (var i = 0; i < this.list.childNodes.length; i ++) {
        var node = this.list.childNodes[i];
        if (!node._data) continue;
        if (node.setAttribute) {
            node.setAttribute("selected", node._data == item);
        }
    }
};


ComboManager.prototype.getSelectedItem = function () {
    return this.selectedItem;
};
ComboManager.prototype.setDisabled = function (disabled) {
    if (disabled == true) {
        this.button.setAttribute("disabled", "true");
    } else {
        this.button.removeAttribute("disabled");
    }
};
