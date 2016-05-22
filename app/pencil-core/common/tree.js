function handleEdit(event) {
    return;
    var tree = Dom.findUpward(event.originalTarget, function (node) {
            return node.namespaceURI == PencilNamespaces.xul && node.localName == "tree";
        });

    var treechildren = Dom.findUpward(event.originalTarget, function (node) {
            return node.namespaceURI == PencilNamespaces.xul && node.localName == "treechildren";
        });

    var box = tree.treeBoxObject;
    var row = new Object();
    var col = new Object();
    var child = new Object();
    box.getCellAt(event.clientX, event.clientY, row, col, child);
    var editor = document.getElementById("editor");

    if (row.value < 0 || !col.value) {
        return;
    }

    var x = new Object();
    var y = new Object();
    var w = new Object();
    var h = new Object();

    box.getCoordsForCellItem(row.value, col.value, "cell", x, y, w, h);

    var dx = treechildren.boxObject.screenX - editor.parentNode.boxObject.screenX;
    var dy = treechildren.boxObject.screenY - editor.parentNode.boxObject.screenY;

    var d = 2;
    editor.setAttribute("top", y.value + dy - d);
    editor.setAttribute("left", x.value + dx);
    editor.setAttribute("width", w.value );
    editor.setAttribute("height", h.value + 2 * d);

    //alert([x.value, y.value, w.value, h.value]);
}
