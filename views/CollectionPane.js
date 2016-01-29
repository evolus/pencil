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

    this.searchInput.addEventListener("keyup", function (event) {
        thiz.filterCollections();
    }, false);

}
__extend(BaseTemplatedWidget, CollectionPane);

CollectionPane.prototype.reload = function () {
    Dom.empty(this.selectorPane);

    this.last = null;
    var collections = CollectionManager.shapeDefinition.collections;
    for (var i = 0; i < collections.length; i ++) {
        var collection = collections[i];
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
        if (!this.last) this.last = collection;

        this.selectorPane.appendChild(node);
    }

    this.openCollection(this.last);
};

CollectionPane.prototype.filterCollections = function () {
    var filter = this.searchInput.value;
    var collectionNodes = Dom.getList(".//*[@class='Item']", this.selectorPane);
    var hasLast = false;
    for (var i in collectionNodes) {
        var collectionNode = collectionNodes[i];
        var collection = collectionNodes[i]._collection;
        collection._shapeCount = 0;
        collection._filteredShapes = [];
        for (var j in collection.shapeDefs) {
            var def = collection.shapeDefs[j];
            if (!def) continue;
            if (def.displayName.toLowerCase().indexOf(filter.toLowerCase()) == -1) continue;
            collection._shapeCount++;
            collection._filteredShapes.push(def);
        }
        if (collection._shapeCount <= 0) {
            collectionNode.setAttribute("_hidden", true);
            collectionNode.style.display = "none";
            collectionNode.style.visibility = "hidden";
        } else {
            if (!hasLast) hasLast = collection == this.last;
            collectionNode.removeAttribute("_hidden");
            collectionNode.style.display = "";
            collectionNode.style.visibility = "visible";
        }
    }

    if (hasLast) {
        this.openCollection(this.last);
    } else {
        Dom.empty(this.shapeList);
    }
};
CollectionPane.prototype.openCollection = function (collection) {
    Dom.empty(this.shapeList);
    this.last = collection;
    var shapeDefs = typeof(collection._filteredShapes) == "undefined" ? collection.shapeDefs : collection._filteredShapes;
    for (var i = 0; i < shapeDefs.length; i ++) {
        var def = shapeDefs[i];
        var icon = def.iconPath;
        if (!icon && def.shape) icon = def.shape.iconPath;

        var node = Dom.newDOMElement({
            _name: "li",
            "type": "ShapeDef",
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
