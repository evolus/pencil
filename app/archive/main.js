function boot() {
    Pencil.boot();
    Pencil.activeCanvas = new Canvas(document.getElementById("canvas"));

    var container = document.getElementById("collection");
    for (var i = 0; i < CollectionManager.shapeDefinition.collections.length; i ++) {
        var collection = CollectionManager.shapeDefinition.collections[i];
        for (var k = 0; k < collection.shapeDefs.length; k ++) {
            var def = collection.shapeDefs[k];
            var node = Dom.newDOMElement({
                _name: "div",
                style: "width: 4em; height: 4em; display: inline-block; padding: 1em;",
                draggable: "true",
                _children: [
                    {
                        _name: "div",
                        "class": "Shape",
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

            container.appendChild(node);
            Dom.registerEvent(node, "dragstart", function (event) {
                var n = Dom.findUpwardForNodeWithData(Dom.getTarget(event), "_def");
                var def = n._def;

                event.dataTransfer.setData("pencil/def", def.id);
                nsDragAndDrop.setData("pencil/def", def.id);
                event.dataTransfer.setDragImage(n.firstChild.firstChild.firstChild, 25, 25);

            });

        }
    }

//    Dom.registerEvent(container, "click", function (event) {
//        var def = Dom.findUpwardForData(Dom.getTarget(event), "_def");
//        Pencil.activeCanvas.insertShape(def, new Bound(200, 100, null, null));
//    });
//    Dom.registerEvent(container, "dragstart", function (event) {
//        console.log("dragstart");
//        var def = Dom.findUpwardForData(Dom.getTarget(event), "_def");
//        event.dataTransfer.setData("pencil/def", def.id);
//    });
}
window.addEventListener("load", boot, false);

