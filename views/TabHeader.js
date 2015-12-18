function TabHeader() {
    BaseTemplatedWidget.call(this);

    var thiz = this;
    this.container.addEventListener("click", function (event) {
        var tab = Dom.findUpward(event.target, function (n) {
            return Dom.hasClass(n, "Tab");
        });

        if (!tab) return;
        thiz.setSelectedTab(tab);
    });

    this.tabs = [];
}
__extend(BaseTemplatedWidget, TabHeader);

TabHeader.invalidateParentViewSize = function(node) {
    var w = node.parentNode.offsetWidth;
    var h = node.parentNode.offsetHeight;

    w = Math.max(w, node.offsetWidth);
    h = Math.max(h, node.offsetHeight);

    node.parentNode.style.width = w + "px";
    node.parentNode.style.height = h + "px";

};

TabHeader.prototype.addTab = function (name, node) {
    var view = document.createElement("div");
    view.appendChild(document.createTextNode(name));
    Dom.addClass(view, "Tab");
    this.container.appendChild(view);
    view._node = node;

    this.tabs.push(view);

    this.setSelectedTab(view);
    window.setTimeout(function () {
        TabHeader.invalidateParentViewSize(node);
    }, 10);

    var thiz = this;
    node.addEventListener("DOMNodeInsertedIntoDocument", function () {
        window.setTimeout(function () {
            TabHeader.invalidateParentViewSize(node);
        }, 10);
    }, false);
};


TabHeader.prototype.setSelectedTab = function (tab) {
    Dom.doOnChild(this.container, {eval: function (n) {
        if (Dom.hasClass(n, "Tab")) {
            if (n == tab) {
                n.setAttribute("selected", "true");
                n._node.style.visibility = "inherit";
            } else {
                n.removeAttribute("selected");
                n._node.style.visibility = "hidden";
            }
        }
    }});

    Dom.emitEvent("p:TabChanged", this.node(), {});
};
TabHeader.prototype.getSelectedTab = function () {
    var result = {
        tab: null
    };
    Dom.doOnChild(this.container, {eval: function (n) {
        if (Dom.hasClass(n, "Tab") && n.getAttribute && n.getAttribute("selected") == "true") {
            result.tab = n;
        }
    }});

    return result.tab;
};
