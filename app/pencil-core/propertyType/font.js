function Font() {
    this.family = "sans-serif";
    this.style = "normal";
    this.weight = "normal";
    this.size = "12px";
    this.decor = "none";
    this.lineHeight = 0;
}
Font.REG_EX = /^([^\|]+)\|([^\|]+)\|([^\|]+)\|([0-9]+[a-z]+)$/i;
Font.REG_EX_2 = /^([^\|]+)\|([^\|]+)\|([^\|]+)\|([0-9]+[a-z]+)\|([^\|]+)$/i;
Font.REG_EX_3 = /^([^\|]+)\|([^\|]+)\|([^\|]+)\|([0-9]+[a-z]+)\|([^\|]+)\|([0-9\.]+)$/i;
Font.fromString = function (literal) {
    var font = new Font();
    font.decor = "none";
    font.lineHeight = 0;
    if (literal.match(Font.REG_EX)) {
        font.family = RegExp.$1;
        font.weight = RegExp.$2;
        font.style = RegExp.$3;
        font.size = RegExp.$4;
    } else if (literal.match(Font.REG_EX_2)) {
        font.family = RegExp.$1;
        font.weight = RegExp.$2;
        font.style = RegExp.$3;
        font.size = RegExp.$4;
        font.decor = RegExp.$5;
    } else if (literal.match(Font.REG_EX_3)) {
        font.family = RegExp.$1;
        font.weight = RegExp.$2;
        font.style = RegExp.$3;
        font.size = RegExp.$4;
        font.decor = RegExp.$5;
        font.lineHeight = parseFloat(RegExp.$6);
    }
    return font;
};
Font.prototype.getPixelHeight = function() {
    return Font.parsePixelHeight(this.size);
};
Font.parsePixelHeight = function (size) {
    if (size.match(/^([0-9]+)px$/)) {
        return parseInt(RegExp.$1, 10);
    } else return parseInt(size, 10);
};
Font.prototype.isUnderlined = function () {
    return this.decor == "underline";
};
Font.prototype.toString = function () {
    return [this.family, this.weight, this.style, this.size, this.decor, this.lineHeight].join('|');
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
Font.prototype.bolder = function (amount) {
    var font = Font.fromString(this.toString());
    var weight = Math.min(Math.max(100, this.getWeightAsNumber() + amount), 900);
    weight -= weight % 100;
    var w = "" + weight;
    if (weight == 400) w = "normal";
    if (weight == 700) w = "bold";

    font.weight = w;

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
Font.prototype.getWeightAsNumber = function () {
    if (this.weight == "bold") return 700;
    if (this.weight == "normal") return 400;
    return parseInt(this.weight, 10);
}
Font.prototype.generateTransformTo = function (other) {
    if (this.family != other.family) return null;

    var transform = "";
    if (this.weight != other.weight) {
        if (this.weight == "bold" && other.weight == "normal") {
            transform += ".bold(false)";
        } else if (this.weight == "normal" && other.weight == "bold") {
            transform += ".bold(true)";
        } else {
            transform += ".bolder(" + (other.getWeightAsNumber() - this.getWeightAsNumber()) + ")";
        }
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
