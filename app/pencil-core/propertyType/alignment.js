function Alignment(h, v) {
    this.h = h ? h : 0;
    this.v = v ? v : 0;
}
Alignment.REG_EX = /^([0-9]+)\,([0-9]+)$/;
Alignment.fromString = function(literal) {
    var align = new Alignment(0, 0);
    if (literal.match(Alignment.REG_EX)) {
        align.h = parseInt(RegExp.$1);
        align.v = parseInt(RegExp.$2);
    }

    return align;
};

Alignment.prototype.toString = function () {
    return this.h + "," + this.v;
};

pencilSandbox.Alignment = {
    newAlignment: function (h, v) {
        return new Alignment(h, v);
    }
};
for (var p in Alignment) {
    pencilSandbox.Alignment[p] = Alignment[p];
};

