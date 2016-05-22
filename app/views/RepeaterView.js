function RepeaterView(definitionNode) {
    BaseWidget.call(this, definitionNode);
}
__extend(BaseWidget, RepeaterView);

RepeaterView.prototype.buildDOMNode = function (definitionNode) {
    var nodeName = "hbox";
    if (definitionNode) {
        nodeName = definitionNode.getAttribute("tag") || nodeName;
    }

    return document.createElement(nodeName);
};
RepeaterView.prototype.setContentFragment = function (fragment) {
    for (var i = 0; i < fragment.childNodes.length; i ++) {
        var node = fragment.childNodes[i];
        if (!node.getAttribute) continue;

        var role = node.getAttribute("role");
        if (role == "header") {
            this.headerTemplate = node;
        } else if (role == "footer") {
            this.footerTemplate = node;
        } else if (role == "empty") {
            this.emptyTemplate = node;
        } else {
            this.itemTemplate = node;
        }
    }
};

RepeaterView.prototype.createBinding = function (container) {
    container._binding = {};
    container._binding._node = container;
    Dom.doOnChildRecursively(container, {
        eval: function(n) {
            return n.getAttribute && n.getAttribute("anon-id");
        }
    }, function(n) {
        container._binding[n.getAttribute("anon-id")] = n.__widget || n;
    });
}


RepeaterView.prototype.generate = function (container, templateNode, data) {
    var node = templateNode.cloneNode(true);
    this.createBinding(node);

    container.appendChild(node);

    if (this.populator && typeof(data) != "undefined") this.populator(data, node._binding, node);

    return node;
};
RepeaterView.prototype.setItems = function (items) {
    this.items = items;
    Dom.empty(this.node());
    if (!items || items.length <= 0) {
        if (this.emptyTemplate) {
            this.node().appendChild(this.generate(this.node(), this.emptyTemplate));
        }

        return;
    }

    if (this.headerTemplate) {
        this.generate(this.node(), this.headerTemplate);
    }

    var container = this.node();
    if (this["content-wrapper-tag"]) {
        container = document.createElement(this["content-wrapper-tag"]);
        Dom.addClass(container, "ContentWrapper");

        this.node().appendChild(container);
    }
    if (this.itemTemplate) {
        for (var i = 0; i < items.length; i ++) {
            this.generate(container, this.itemTemplate, items[i]);
        }
    }

    if (this.footerTemplate) {
        this.generate(this.node(), this.footerTemplate);
    }
};
