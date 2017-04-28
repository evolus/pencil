function StrokeStyle(w, array) {
    this.w = (typeof(w) == "number") ? w : 1;
    this.array = array ? array : null;
}
StrokeStyle.REG_EX = /^([0-9]+)\|([0-9 \,]*)$/;
StrokeStyle.fromString = function(literal) {
    var style = new StrokeStyle();
    if (literal.match(StrokeStyle.REG_EX)) {
        style.w = parseInt(RegExp.$1);
        style.array = RegExp.$2;
    }

    return style;
};

StrokeStyle.prototype.toString = function () {
    return this.w + "|" + this.array;
};
StrokeStyle.prototype.condensed = function (ratio) {
    return new StrokeStyle(Math.round(this.w * (1 + ratio)), this.array);
};
StrokeStyle.prototype.generateTransformTo = function (other) {
    if (this.array != other.array) return null;

    var transform = "";
    if (this.w != other.w && this.w > 0) {
        transform += ".condensed(" + ((other.w / this.w) - 1) + ")";
    }

    return transform;
};


pencilSandbox.StrokeStyle = {
    newStrokeStyle: function (w, array) {
        return new StrokeStyle(w, array);
    }
};
for (var p in StrokeStyle) {
    pencilSandbox.StrokeStyle[p] = StrokeStyle[p];
};
