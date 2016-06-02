function CanvasMemento(node, metadata, action) {
    this.action = action;
    this.node = node;
    this.metadata = {};
    for (var name in metadata)  this.metadata[name] = metadata[name];
}
CanvasMemento.prototype.serializeAsNode = function (doc) {
    var node = doc.createElementNS(PencilNamespaces.p, "Memento");
    if (this.action) node.setAttribute("action", this.action);
    if (this.node) node.appendChild(doc.importNode(this.node, true));

    for (var name in this.metadata) {
        node.setAttribute(name, this.metadata[name]);
    }

    return node;
};

CanvasMemento.deserializeFromNode = function (node) {
    var attributes = node.attributes;
    var metadata = {};
    for (var i = 0; i < attributes.length; i++) {
        metadata[attributes[i].name] = attributes[i].value;
    }

    var content = node.firstChild;
    if (content) content.parentNode.removeChild(content);
    var memento = new CanvasMemento(content, metadata, node.getAttribute("action"));

    return memento;
};
