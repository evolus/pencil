function PrivateShapeDef() {
    this.id = null;
    this.displayName = null;
    this.iconData = null;
    this.content = null;
}
PrivateShapeDef.prototype.toString = function () {
    return "[PrivateShapeDef: " + this.id + "]";
};
