function Point(x, y) {
    this.x = x ? x : 0;
    this.y = y ? y : 0;
}
Point.REG_EX = /^([\-0-9\.]+)\,([\-0-9\.]+)$/;
Point.fromString = function(literal) {
    var point = new Point();
    if (literal.match(Point.REG_EX)) {
        point.x = parseFloat(RegExp.$1);
        point.y = parseFloat(RegExp.$2);
    }

    return point;
};

Point.prototype.toString = function () {
    return this.x + "," + this.y;
};
Point.prototype.applyExpressionX = function (value) {
    this.x = value;
};
Point.prototype.applyExpressionY = function (value) {
    this.y = value;
};
Point.prototype.translate = function (dx, dy) {
	return new Point(this.x + dx, this.y + dy);
};

pencilSandbox.Point = {
    newPoint: function (x, y) {
        return new Point(x, y);
    }
};
for (var p in Point) {
    pencilSandbox.Point[p] = Point[p];
};
