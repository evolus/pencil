function Handle(x, y) {
    this.x = x ? x : 0;
    this.y = y ? y : 0;
}
Handle.REG_EX = /^([\-0-9\.]+)\,([\-0-9\.]+)$/;
Handle.fromString = function(literal) {
    var handle = new Handle();
    if (literal.match(Handle.REG_EX)) {
        handle.x = parseFloat(RegExp.$1);
        handle.y = parseFloat(RegExp.$2);
    }

    return handle;
};
Handle.prototype.applyMaxX = function (value) {
    if (this.x > value) this.x = value;
};
Handle.prototype.applyMinX = function (value) {
    if (this.x < value) this.x = value;
};
Handle.prototype.applyMaxY = function (value) {
    if (this.y > value) this.y = value;
};
Handle.prototype.applyMinY = function (value) {
    if (this.y < value) this.y = value;
};
Handle.prototype.applyExpressionX = function (value) {
    this.x = value;
};
Handle.prototype.applyExpressionY = function (value) {
    this.y = value;
};
Handle.prototype.applyUnconnectedValue = function (value) {
	debug("applyUnconnectedValue is called");
	if (!this.meta || !this.meta.connectedShapeId) {
		debug("unconnected! " + [value.x, value.y]);
	    this.x = value.x;
	    this.y = value.y;
	}
};
Handle.prototype.applyConstraintFunction = function (value) {
    try {
        this._fromApplyConstraintFunction = true;
        var c = value(this, this);
        this.x = c.x;
        this.y = c.y;
    } catch (e) {
        Console.dumpError(e);
    }
};
Handle.prototype.toString = function () {
    return this.x + "," + this.y;
};
Handle.prototype.isConnected = function () {
    return this.meta && this.meta.connectedShapeId && this.meta.connectedOutletId;
};

pencilSandbox.Handle = {
    newHandle: function (x, y) {
        return new Handle(x, y);
    }
};
for (var p in Handle) {
    pencilSandbox.Handle[p] = Handle[p];
};
