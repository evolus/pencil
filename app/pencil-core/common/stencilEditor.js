function AbstractEditor() {
    this.node = null;
    this.settings = {};
}
AbstractEditor.prototype.attach = function (node) {
    this.node = node;
    this.onNodeAttached();
};


function GUIPushButtonEditor() {
    this.settings.font = new Font("sans-serif", Font.WEIGHT_NORMAL, Font.STYLE_NORMAL, 12);
    this.settings.foreground = new Color("#000000", 1);
    this.settings.background = new Color("#cccccc", 1);
}
GUIPushButtonEditor.prototype = AbstractEditor;

GUIPushButtonEditor.prototype.onNodeAttached = function () {
    
};

