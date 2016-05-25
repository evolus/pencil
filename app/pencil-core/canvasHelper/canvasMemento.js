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

    return node;
};

CanvasMemento.deserializeFromNode = function (node) {
    var content = node.firstChild;
    if (content) content.parentNode.removeChild(content);
    var memento = new CanvasMemento(content, {}, node.getAttribute("action"));

    return memento;
};
