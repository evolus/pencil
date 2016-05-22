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

pencilSandbox.Font = {
    newFont: function () {
        return new Font();
    }
};
for (var p in Font) {
    pencilSandbox.Font[p] = Font[p];
};
