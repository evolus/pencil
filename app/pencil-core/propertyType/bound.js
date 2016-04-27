function Bound(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

Bound.fromBox = function (box, paddingX, paddingY) {
    var pX = paddingX ? paddingX : 0;
    var pY = paddingY ? paddingY : pX;

    return new Bound(pX, pY, box.w - 2 * pX, box.h - 2 * pY)
};

Bound.REG_EX = /^([0-9]+)\,([0-9]+)\,([0-9]+)\,([0-9]+)$/;
Bound.fromString = function(literal) {
    var bound = new Bound(0, 0, 0, 0);
    if (literal.match(Bound.REG_EX)) {
        bound.x = parseInt(RegExp.$1);
        bound.y = parseInt(RegExp.$2);
        bound.w = parseInt(RegExp.$3);
        bound.h = parseInt(RegExp.$4);
    }

    return bound;
};

Bound.prototype.toString = function () {
    return this.x + "," + this.y + "," + this.w + "," + this.h;
};

Bound.prototype.narrowed = function (x, y) {
    var dx = x;
    dy = y ? y : dx;

    return new Bound(this.x + dx, this.y + dy, this.w - 2 * dx, this.h - 2 * dy);
};
Bound.prototype.shifted = function (dx, dy) {
    return new Bound(this.x - dx, this.y - dy, this.w, this.h);
	
};

pencilSandbox.Bound = {
    newBound: function (x, y, w, h) {
        return new Bound(x, y, w, h);
    }
};
for (var p in Bound) {
    pencilSandbox.Bound[p] = Bound[p];
};