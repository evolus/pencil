function Geometry() {
    this.ctm = null;
    this.dim = null;
}
Geometry.prototype.clone = function (svg) {
    var geo = new Geometry();
    if (this.dim == null) {
        geo.dim = null;
    } else {
        geo.dim = new Dimension(this.dim.w, this.dim.h);
    }
    
    if (this.ctm == null) {
        geo.ctm = null;
    } else {
        geo.ctm = svg.createSVGMatrix().multiply(this.ctm);
    }
    if (this.loc) {
        geo.loc = {x: this.loc.x, y: this.loc.y};
    }
    
    return geo;
};
