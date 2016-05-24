function CanvasCareTaker(canvas) {
    this.canvas = canvas;
    this.reset();
}
if (!Config.get("view.undoLevel")){
    Config.set("view.undoLevel", 10);
}
CanvasCareTaker.LIMIT = Config.get("view.undoLevel");
CanvasCareTaker.prototype.reset = function() {
    this.mementos = [this.canvas.getMemento()];
    this.index = 0;
}
CanvasCareTaker.prototype.save = function(action) {
    var memento = this.canvas.getMemento(action);

    this.index ++;
    this.mementos[this.index] = memento;
    this.mementos.length = this.index + 1;

    if (this.mementos.length > CanvasCareTaker.LIMIT) {
        var n = this.mementos.length - CanvasCareTaker.LIMIT;
        for (var i = 0; i < n; i++) this.mementos.shift();
        this.index -= n;
    }
};
CanvasCareTaker.prototype.canUndo = function () {
    return this.index > 0;
};
CanvasCareTaker.prototype.canRedo = function () {
    return this.index < this.mementos.length - 1;
};

CanvasCareTaker.prototype.undo = function () {
    if (!this.canUndo()) throw Util.getMessage("empty.undo.buffer");

    this.index --;
    var memento = this.mementos[this.index];
    this.canvas.setMemento(memento);
    this.canvas.snappingHelper.rebuildSnappingGuide();
};
CanvasCareTaker.prototype.redo = function () {
    if (!this.canRedo()) throw Util.getMessage("empty.redo.buffer");

    this.index ++;
    var memento = this.mementos[this.index];
    this.canvas.setMemento(memento);
    this.canvas.snappingHelper.rebuildSnappingGuide();
};
CanvasCareTaker.prototype.getCurrentAction = function() {
    if (this.canUndo()) {
        return this.mementos[this.index].action;
    }
    return "";
};
CanvasCareTaker.prototype.getPrevAction = function() {
    if (this.canRedo()) {
        return this.mementos[this.index + 1].action;
    }
    return "";
};
CanvasCareTaker.prototype.saveState = function (filePath) {
    var dom = Dom.parser.parseFromString("<p:CareTakerContent xmlns:p=\"" + PencilNamespaces.p + "\"></p:CareTakerContent>", "text/xml");
    dom.documentElement.setAttribute("index", this.index);
    for (var memento of this.mementos) {
        dom.documentElement.appendChild(memento.serializeAsNode(dom));
    }

    Dom.serializeNodeToFile(dom, filePath);
};
CanvasCareTaker.prototype.loadState = function (filePath) {
    var dom = Controller.parser.parseFromString(fs.readFileSync(filePath, "utf8"), "text/xml");
    this.index = parseInt(dom.documentElement.getAttribute("index"), 10);
    this.mementos = [];
    Dom.workOn("/p:CareTakerContent/*", dom, function (node) {
        if (!node || !node.getAttribute) return;
        var memento = CanvasMemento.deserializeFromNode(node);
        this.mementos.push(memento);
    }.bind(this));
};
