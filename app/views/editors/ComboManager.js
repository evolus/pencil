function ComboManager() {
    BaseTemplatedWidget.call(this);
    this.button = this.node();
    this.renderer = ComboManager.DEFAULT_RENDERER;
    this.bind("click", function () {
        if (this.popup.isVisible()) {
            if (thiz.selectingIndex) {
                thiz.selectItem(thiz.items[thiz.selectingIndex], true);
                return;
            }
            this.popup.close();
            return;
        }
        this.button.setAttribute("active", true);
        this.popup.show(this.button, "left-inside", "bottom", 0, 5);
    }, this.button);
    var thiz = this;
    this.bind("keydown", function (event) {
        if (event.keyCode == DOM_VK_UP || event.keyCode == DOM_VK_DOWN) {
            if (thiz.selectedNode) {
                thiz.selectedNode.removeAttribute("selected");
            }
            if (thiz.selectingIndex) {
                thiz.list.childNodes[thiz.selectingIndex].removeAttribute("selected");
            }
            if (event.keyCode == DOM_VK_UP) {
                thiz.selectingIndex--;
                if (thiz.selectingIndex < 0) {
                    thiz.selectingIndex = thiz.items.length -1;
                }
            } else if (event.keyCode == DOM_VK_DOWN){
                thiz.selectingIndex++;
                if (thiz.selectingIndex > thiz.items.length -1) {
                    thiz.selectingIndex = 0;
                }
            }
            thiz.list.childNodes[thiz.selectingIndex].setAttribute("selected", "true");
            thiz.scrollTo(thiz.selectingIndex);
        }

    }, this.button);
    this.bind("click", this.onItemClick, this.list);
    this.bind("p:PopupShown", function () {
        thiz.ensureSelectedItemVisible();
    }, this.popup);
    this.bind("p:PopupHidden", function () {
        this.button.removeAttribute("active");
        this.popup.popupContainer.scrollTop = 0;
        // this.popup.removePopup();
        // this.popup.popupContainer.scrollTop = 0;
    }, this.popup);
    this.popup.shouldCloseOnBlur = function (event) {
        var found = Dom.findUpward(event.target, function (node) {
            return node == thiz.button;
        });
        return !found;
    };
    this.popup.setPopupClass("ComboManagerPopup");
}

ComboManager.DEFAULT_RENDERER = function (item) {
    return "" + item;
};

__extend(BaseTemplatedWidget, ComboManager);

ComboManager.prototype.onItemClick = function (event) {
    var item = Dom.findUpwardForData(event.target, "_data");
    if (typeof(item) == "undefined") return;

    this.selectItem(item, true);
};
ComboManager.prototype.ensureSelectedItemVisible = function() {
    var comparer = this.comparer || function (a, b) { return a == b};
    for (var i = 0; i < this.list.childNodes.length; i ++) {
        var node = this.list.childNodes[i];
        var data = Dom.findUpwardForData(node, "_data");
        if (comparer(this.selectedItem, data)) {
            node.setAttribute("selected", "true");
            this.scrollTo(i);
            this.selectingIndex = i;
        } else {
            node.removeAttribute("selected");
        }
    }
}
ComboManager.prototype.scrollTo = function(index) {
    var node = this.list.childNodes[index];
    var oT = Dom.getOffsetTop(node);
    var oH = node.offsetHeight;
    var pT = Dom.getOffsetTop(this.list.parentNode) + 10;
    var pH = this.list.parentNode.offsetHeight - 20;

    if (oT < pT) {
        this.popup.popupContainer.scrollTop = Math.max(0, this.popup.popupContainer.scrollTop - (pT - oT));
    } else if (oT + oH > pT + pH) {
        this.popup.popupContainer.scrollTop = Math.max(0, this.popup.popupContainer.scrollTop + (oT + oH - pT - pH));
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
            var spec = {
                _name: "div",
                "class": "Item",
            };
            spec[this.useHtml ? "_html" : "_text"] = element;

            node = Dom.newDOMElement(spec);
        }
        if (this.decorator) this.decorator(node, item);

        node._data = item;
        this.list.appendChild(node);

        if (!first) first = item;
    }
    if (items.length > 0) this.selectItem(first);
};

ComboManager.prototype.selectItem = function (item, fromUserAction, whenMatched) {
    var comparer = this.comparer || function (a, b) { return a == b};

    var matched = false;
    if (this.items) {
        for (var i = 0; i < this.items.length; i ++) {
            if (comparer(this.items[i], item)) {
                item = this.items[i];
                matched = true;
                break;
            }
        }
    }
    if (!matched && whenMatched) return;

    var element = this.renderer(item);
    if (!element) return;

    if (element.getAttribute) {
        Dom.empty(this.buttonDisplay);
        this.buttonDisplay.appendChild(element);
    } else {
        this.buttonDisplay.innerHTML = this.useHtml ? element : Dom.htmlEncode(element);
        this.button.setAttribute("title", this.useHtml ? Dom.htmlStrip(element) : element);
    }
    if (this.decorator != null) {
        this.decorator(this.buttonDisplay, item);
    }
    this.selectedItem = item;
    if (fromUserAction) {
        Dom.emitEvent("p:ItemSelected", this.node(), {});
        if (this.popup.isVisible()) {
            this.popup.hide();
        }
    }

    for (var i = 0; i < this.list.childNodes.length; i ++) {
        var c = this.list.childNodes[i];
        if (c.setAttribute) {
            var item = Dom.findUpwardForData(c, "_data");
            var selected =  comparer(item, this.selectedItem);
            c.setAttribute("selected", selected);
            if (selected) {
                this.selectingIndex = i;
                this.selectedNode = c;
            }
        }
    }
    return matched;
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
