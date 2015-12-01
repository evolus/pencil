function ShadowStyle() {
    this.dx = 0;
    this.dy = 0;
    this.size = 3;
}
ShadowStyle.REG_EX = /^([^\|]+)\|([^\|]+)\|([^\|]+)$/i;
ShadowStyle.fromString = function (literal) {
    var shadowStyle = new ShadowStyle();
    if (literal.match(ShadowStyle.REG_EX)) {
        shadowStyle.dx = parseInt(RegExp.$1, 10);
        shadowStyle.dy = parseInt(RegExp.$2, 10);
        shadowStyle.size = parseInt(RegExp.$3, 10);
    }
    return shadowStyle;
};
ShadowStyle.prototype.toString = function () {
    return [this.dx, this.dy, this.size].join('|');
};
ShadowStyle.prototype.toCSSString = function (color) {
    var css = [this.dx + "px", this.dy + "px", Math.abs(this.size) + "px", color.toRGBAString()].join(" ");
    if (this.size < 0) css = "inset " + css;
    return css;
};

pencilSandbox.ShadowStyle = {
    newShadowStyle: function () {
        return new ShadowStyle();
    }
};
for (var p in ShadowStyle) {
    pencilSandbox.ShadowStyle[p] = ShadowStyle[p];
};
