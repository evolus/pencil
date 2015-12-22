function ComboManager() {
    BaseTemplatedWidget.call(this);
    this.renderer = ComboManager.DEFAULT_RENDERER;
    this.bind("click", function () {
        this.popup.show(this.button, "left-inside", "bottom", 0, 5);
    }, this.button);
    this.bind("click", this.onItemClick, this.list);

    this.bind("p:PopupShown", function () {
        this.button.setAttribute("active", true);
    }, this.popup);
    this.bind("p:PopupHidden", function () {
        this.button.removeAttribute("active");
    }, this.popup);

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
ComboManager.prototype.setItems = function (items) {
    var first = null;
    this.items = items;
    this.list.innerHTML = "";
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
