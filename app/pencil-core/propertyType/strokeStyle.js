function StrokeStyle(w, array) {
    this.w = w ? w : 1;
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
    return new StrokeStyle(this.w * (1 + ratio), this.array);
};

pencilSandbox.StrokeStyle = {
    newStrokeStyle: function (w, array) {
        return new StrokeStyle(w, array);
    }
};
for (var p in StrokeStyle) {
    pencilSandbox.StrokeStyle[p] = StrokeStyle[p];
};
