function ComboManager() {
    BaseTemplatedWidget.call(this);
    this.renderer = ComboManager.DEFAULT_RENDERER;
}

ComboManager.DEFAULT_RENDERER = function (item) {
    return "" + item;
};

__extend(BaseTemplatedWidget, ComboManager);
ComboManager.prototype.setItems = function (items) {
    var first = null;
    this.items = items;
    /*
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var node = Dom.newDOMElement({
            _name: "li",
            "class": "mdl-menu__item",
            _text: this.renderer(item)
        });
        if (this.decorator) this.decorator(node, item);
        node._data = item;
        this.list.appendChild(node);
        componentHandler.upgradeElement(node);
        if (!first) first = item;
    }
    componentHandler.upgradeDom('MaterialMenu', 'mdl-menu');
    */
    this.selectItem(first);
};

ComboManager.prototype.selectItem = function (item) {
    this.button.innerHTML = Dom.htmlEncode(item);
    this.selectedItem = item;
    Dom.emitEvent("p:ComboItemChanged", this.node(), {});
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
