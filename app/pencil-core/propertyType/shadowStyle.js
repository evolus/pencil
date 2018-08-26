function ShadowStyle() {
    this.dx = 0;
    this.dy = 0;
    this.size = 3;
    this.opacity = 1;
    this.color = ShadowStyle.DEFAULT_COLOR;
}

ShadowStyle.DEFAULT_COLOR = "#000000";

ShadowStyle.REG_EX = /^([^\|]+)\|([^\|]+)\|([^\|]+)(\|([^\|]+))?(\|([^\|]+))?$/i;
ShadowStyle.fromString = function (literal) {
    var shadowStyle = new ShadowStyle();
    if (literal.match(ShadowStyle.REG_EX)) {
        shadowStyle.dx = parseInt(RegExp.$1, 10);
        shadowStyle.dy = parseInt(RegExp.$2, 10);
        shadowStyle.size = parseFloat(RegExp.$3);
        var o = RegExp.$5;
        shadowStyle.opacity = o ? parseFloat(o) : 1.0;
        var c = RegExp.$7;
        shadowStyle.color = c || ShadowStyle.DEFAULT_COLOR;
    }

    return shadowStyle;
};
ShadowStyle.prototype.toString = function () {
    return [this.dx, this.dy, this.size, this.opacity, this.color || ShadowStyle.DEFAULT_COLOR].join('|');
};
ShadowStyle.prototype.toCSSString = function (color) {
    var css = [this.dx + "px", this.dy + "px", Math.abs(this.size) + "px", color ? color.toRGBAString() : (this.color || ShadowStyle.DEFAULT_COLOR)].join(" ");
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
