function Font() {
    this.family = "sans-serif";
    this.style = "normal";
    this.weight = "normal";
    this.size = "12px";
    this.decor = "none";
}
Font.REG_EX = /^([^\|]+)\|([^\|]+)\|([^\|]+)\|([0-9]+[a-z]+)$/i;
Font.REG_EX_2 = /^([^\|]+)\|([^\|]+)\|([^\|]+)\|([0-9]+[a-z]+)\|([^\|]+)$/i;
Font.fromString = function (literal) {
    var font = new Font();
    if (literal.match(Font.REG_EX)) {
        font.family = RegExp.$1;
        font.weight = RegExp.$2;
        font.style = RegExp.$3;
        font.size = RegExp.$4;
        font.decor = "none";
    } else if (literal.match(Font.REG_EX_2)) {
        font.family = RegExp.$1;
        font.weight = RegExp.$2;
        font.style = RegExp.$3;
        font.size = RegExp.$4;
        font.decor = RegExp.$5;
    }
    return font;
};
Font.prototype.getPixelHeight = function() {
    if (this.size.match(/^([0-9]+)px$/)) {
        return parseInt(RegExp.$1, 10);
    } else return parseInt(this.size, 10);
};
Font.prototype.isUnderlined = function () {
    return this.decor == "underline";
};
Font.prototype.toString = function () {
    return [this.family, this.weight, this.style, this.size, this.decor].join('|');
};
Font.prototype.toCSSFontString = function () {
    return [this.weight, this.style, this.size, this.family].join(" ");
};
Font.prototype.getFamilies = function () {
    var families = this.family.split(/[\,]+/);
    for (var i = 0; i < families.length; i ++) {
        var f = families[i];
        if (f.match(/^'([^']+)'$/)) f = RegExp.$1;

        families[i] = f.trim();
    }
    return families;
}
Font.prototype.bold = function (yes) {
    var font = Font.fromString(this.toString());
    font.weight = (typeof(yes) == "undefined" || yes) ? "bold" : "normal";

    return font;
};
Font.prototype.italic = function (yes) {
    var font = Font.fromString(this.toString());
    font.style = (typeof(yes) == "undefined" || yes) ? "italic" : "normal";

    return font;
};
Font.prototype.resized = function (delta) {
    var font = Font.fromString(this.toString());
    if (typeof(delta) == "string" && delta.match(/^(.+)%$/)) {
        font.size = Math.round(this.getPixelHeight() * (1 + parseFloat(RegExp.$1) / 100)) + "px";
    } else if (typeof(delta) == "number") {
        font.size = Math.round(this.getPixelHeight() * (1 + delta)) + "px";
    }

    return font;
};
Font.prototype.generateTransformTo = function (other) {
    if (this.family != other.family) return null;

    var transform = "";
    if (this.weight != other.weight) {
        transform += ".bold(" + (this.weight != "bold") + ")";
    }
    if (this.style != other.style) {
        transform += ".italic(" + (this.style != "italic") + ")";
    }
    if (this.size != other.size && this.getPixelHeight() > 0) {
        transform += ".resized(" + ((other.getPixelHeight() / this.getPixelHeight()) - 1) + ")";
    }

    return transform;
};

pencilSandbox.Font = {
    newFont: function () {
        return new Font();
    }
};
for (var p in Font) {
    pencilSandbox.Font[p] = Font[p];
};
