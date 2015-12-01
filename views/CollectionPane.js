function CollectionPane() {
    BaseTemplatedWidget.call(this);


    var thiz = this;
    this.selectorPane.addEventListener("click", function(event) {
        var item = Dom.findUpward(Dom.getTarget(event), function (n) {
            return n._collection;
        });

        if (!item) return;
        Dom.doOnAllChildren(thiz.selectorPane, function (n) {
            if (n.setAttribute) n.setAttribute("active", n == item);
        });
        thiz.openCollection(item._collection);
    });

    this.shapeList.addEventListener("dragstart", function (event) {
        var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
        var def = n._def;

        if (def.shape) {
            event.dataTransfer.setData("pencil/shortcut", def.id);
        } else {
            event.dataTransfer.setData("pencil/def", def.id);
        }
        event.dataTransfer.setDragImage(thiz.dndImage, 8, 8);
    });

    CollectionManager.loadStencils();
    this.reload();

    this.dndImage = new Image();
    this.dndImage.src = "css/bullet.png";
}
__extend(BaseTemplatedWidget, CollectionPane);

CollectionPane.prototype.reload = function () {
    Dom.empty(this.selectorPane);

    var last = null;
    for (var i = 0; i < CollectionManager.shapeDefinition.collections.length; i ++) {
        var collection = CollectionManager.shapeDefinition.collections[i];
        var node = Dom.newDOMElement({
            _name: "vbox",
            "class": "Item",
            _children: [
                {
                    _name: "i",
                    "class": "fa fa-cube"
                },
                {
                    _name: "span",
                    _text: collection.displayName
                }
            ]
        });

        node._collection = collection;
        if (!last) last = collection;

        this.selectorPane.appendChild(node);
    }

    this.openCollection(last);
};
CollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);

    for (var i = 0; i < collection.shapeDefs.length; i ++) {
        var def = collection.shapeDefs[i];
        var icon = def.iconPath;
        if (!icon && def.shape) icon = def.shape.iconPath;

        var node = Dom.newDOMElement({
            _name: "li",
            _children: [
                {
                    _name: "div",
                    "class": "Shape",
                    draggable: "true",
                    _children: [
                        {
                            _name: "div",
                            "class": "Icon",
                            _children: [
                                {
                                    _name: "img",
                                    src: def.iconPath
                                }
                            ]
                        },
                        {
                            _name: "span",
                            _text: def.displayName
                        }
                    ]
                }
            ]
        });

        node._def = def;

        this.shapeList.appendChild(node);
    }
};

Object.defineProperty(CollectionPane.prototype, "foo", {
    set: function (value) {
        console.log("set foo to: " + value);
    }
});
