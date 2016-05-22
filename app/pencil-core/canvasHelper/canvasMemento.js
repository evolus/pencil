function CanvasMemento(node, metadata, action) {
    this.action = action;
    this.node = node;
    this.metadata = {};
    for (var name in metadata)  this.metadata[name] = metadata[name];
}
