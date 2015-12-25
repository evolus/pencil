function Menu() {
    Popup.call(this);
    this.items = [];
    var thiz = this;
    this.popupContainer.addEventListener("click", function (event) {
        var itemNode = Dom.findUpwardForNodeWithData(event.target, "_item");
        if (!itemNode) return;
        var item = itemNode._item;
        if (itemNode.getAttribute && itemNode.getAttribute("disabled") == "true") return;
        if (item.type == "Toggle" || item.type == "Selection") {
            var checkbox = itemNode._checkbox;
            if (item.handleAction) item.handleAction(checkbox.checked);
            thiz.hide();
        } else if (item.type == "SubMenu") {
            var menu = new Menu();
            var subItems = item.subItems || item.getSubItems();
            for (var i in subItems) {
                menu.register(subItems[i]);
            }
            menu.showMenu(itemNode, "right", "top-inside");
            menu._parentPopup = thiz;
        } else {
            if (item.handleAction) item.handleAction();
            thiz.hide();
        }
    }, false);
}
__extend(Popup, Menu);

Menu.prototype.register = function (item) {
    this.items.push(item);
};
Menu.prototype.renderItem = function (item) {
    if (item.isAvailable && !item.isAvailable()) return;

    var disabled = (item.isEnabled && !item.isEnabled()) ? true : false;
    var hbox = Dom.newDOMElement({
        _name: "hbox",
        "class": "MenuItem",
        disabled: disabled
    });

    hbox._item = item;

    this.popupContainer.appendChild(hbox);
    var checkboxId = null;
    if (item.type == "Toggle" || item.type == "Selection") {
        checkboxId = Util.newUUID();
        var checkbox = Dom.newDOMElement({
            _name: "input",
            type: item.type == "Toggle" ? "checkbox" : "radio",
            "class": "Checkbox",
            id: checkboxId
        });
        if (item.checked) checkbox.setAttribute("checked", "true");
        if (disabled) checkbox.setAttribute("disabled", "true");
        hbox.appendChild(checkbox);
        hbox._checkbox = checkbox;
    } else {
        var i = Dom.newDOMElement({
            _name: "i",
            _text: item.icon || ""
        });
        hbox.appendChild(i);
    }

    var label = Dom.newDOMElement({
        _name: "label",
        _text: item.label || item.getLabel(),
        flex: "1"
    });
    if (checkboxId) label.setAttribute("for", checkboxId);

    hbox.appendChild(label);

    if (item.shortcut) {
        var shortcutSpan = Dom.newDOMElement({
            _name: "span",
            "class": "Shortcut",
            _text: item.shortcut
        });
        hbox.appendChild(shortcutSpan);
    } else {
        if (item.type == "SubMenu") {
            hbox.appendChild(Dom.newDOMElement({
                _name: "i",
                _text: "keyboard_arrow_right"
            }));
        }
    }
};
Menu.prototype.render = function () {
    Dom.empty(this.popupContainer);
    var actualItems = [];
    for (var i in this.items) {
        var item = this.items[i];
        if (item instanceof Function) {
            actualItems = actualItems.concat(item());
        } else {
            actualItems.push(item);
        }
    }
    for (var i in actualItems) {
        this.renderItem(actualItems[i]);
    }
};
Menu.prototype.showMenu = function (anchor, hAlign, vAlign, hPadding, vPadding) {
    this.render();
    this.show(anchor, hAlign, vAlign, hPadding, vPadding);
};
Menu.prototype.showMenuAt = function (x, y) {
    this.render();
    this.showAt(x, y);
};
Menu.prototype.hideMenu = function () {
    this.hide();
};
