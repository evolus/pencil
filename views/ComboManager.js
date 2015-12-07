function ComboManager() {
    BaseTemplatedWidget.call(this);
}
__extend(BaseTemplatedWidget, ComboManager);

ComboManager.prototype.setItems = function (items, decorator) {
    this.selector.innerHTML = "";
    var first = null;
    this.items = items;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var node = Dom.newDOMElement({
            _name: "option",
            "class": "Item",
            _text: item.displayName,
            "value": item.value
        });
        if (decorator) decorator(node, item);
        node._data = item;
        this.selector.appendChild(node);
        if (!first) first = node;
    }

    first.setAttribute("selected", "true");
};

ComboManager.prototype.selectItem = function (value) {
    for (var i = 0; i < this.selector.options.length; i++) {
        if (this.selector.options[i].value == value) {
            this.selector.selectedIndex = i;
        }
    }
    Dom.emitEvent("p:ComboItemChanged", this.node(), {});
};

ComboManager.prototype.getSelectedItem = function () {
    var selectedIndex = this.selector.selectedIndex;
    var selectedItem = this.selector.options[selectedIndex];
    return selectedItem.value;
};
ComboManager.prototype.setDisabled = function (disabled) {
    if (disabled == true) {
        this.selector.setAttribute("disabled", "true");
    } else {
        this.selector.removeAttribute("disabled");
    }
}
