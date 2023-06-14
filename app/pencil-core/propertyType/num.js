function Num(value) {
    this.value = typeof(value) != undefined ? value : 0;
}
Num.fromString = function(literal) {
    var num = new Num(parseFloat(literal));
    return num;
};

Num.prototype.toString = function () {
    return "" + this.value;
};
Num.prototype.negative = function () {
    return new Num(0 - this.value);
};

pencilSandbox.Num = {
    newNum: function (v) {
        return new Num(v);
    }
};
for (var p in Num) {
    pencilSandbox.Num[p] = Num[p];
};
