function RichTextArray(rows) {
    this.rows = [];
}
RichTextArray.fromString = function (xml) {
    if (!xml) return new RichTextArray([]);
    var root = Dom.parseToNode(xml);

    var rows = [];
    Dom.workOn("/*/r", root, function (r) {
        var r = [];
        rows.push(r);
        Dom.workOn("./c", r, function (c) {
            r.push({
                html: (c.firstChild && c.firstChild.nodeType == Node.CDATA_SECTION_NODE) ?
                            c.firstChild.nodeValue : ""
            });
        })
    });
    return new RichTextArray(rows);
};
RichTextArray.prototype.toString = function () {
    var root = document.createElement("root");
    for (var i in this.rows) {
        var r = root.ownerDocument.createElement("r");
        root.appendChild(r);

        for (var j in this.rows[i]) {
            var c = root.ownerDocument.createElement("c");
            r.appendChild(c);

            c.appendChild(c.ownerDocument.createCDATASection(this.rows[i][j].html));
        }
    }

    return Dom.serializeNode(root);
};
RichTextArray.prototype.getRows = function () {
    return this.rows;
};
RichTextArray.prototype.getMaxColumnCount = function () {
    var r = this.getRows();
    var c = 0;

    for (var i in r) {
        c = Math.max(c, r[i].length);
    }

    return c;
};

pencilSandbox.RichTextArray = {
    newRichTextArray: function (rows) {
        return new RichTextArray(rows);
    }
};
for (var p in RichTextArray) {
    pencilSandbox.RichTextArray[p] = RichTextArray[p];
};
