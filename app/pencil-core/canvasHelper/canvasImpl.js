var CanvasImpl = {};

CanvasImpl.setupGrid = function () {
    CanvasImpl.drawMargin.call(this);

    if (this.gridContainer) {
        Dom.empty(this.gridContainer);
    } else {
        this.gridContainer = document.createElementNS(PencilNamespaces.svg, "svg:g");
        this.gridContainer.setAttributeNS(PencilNamespaces.p, "p:name", "grids");
        this.gridContainer.setAttribute("transform", "translate(-0.5, -0.5)");
        this.bgLayer.appendChild(this.gridContainer);
    }

    if (Config.get("grid.enabled") == null) {
        Config.set("grid.enabled", false);
    }
    if (Config.get("grid.enabled")) {
        var grid = Pencil.getGridSize();
        var gridStyle = Pencil.getGridStyle();
        if (grid.w > 0 && grid.h > 0) {
            var z = this.zoom ? this.zoom : 1;
            for (var i = 1; i < this.width * z; i += grid.w * z) {
                var line = document.createElementNS(PencilNamespaces.svg, "svg:line");
                line.setAttribute("x1", i);
                line.setAttribute("y1", 0);
                line.setAttribute("x2", i);
                line.setAttribute("y2", this.height * z);
                if (gridStyle === "Dotted") {
                   line.setAttribute("style", "stroke-dasharray: 1," + (grid.h - 1) * z + ";");
                }
                this.gridContainer.appendChild(line);
            }
            if (gridStyle === "Solid") {
               for (var i = 1; i < this.height * z; i += grid.h * z) {
                  var line = document.createElementNS(PencilNamespaces.svg, "svg:line");
                  line.setAttribute("x1", 0);
                  line.setAttribute("y1", i);
                  line.setAttribute("x2", this.width * z);
                  line.setAttribute("y2", i);
                  this.gridContainer.appendChild(line);
               }
            }
        }
    }
};
CanvasImpl.drawMargin = function () {
    var unzommedMargin = (Pencil.controller && !this.options.ignorePageMarging) ? Pencil.controller.getDocumentPageMargin() : 0;
    if (!unzommedMargin) {
        if (this.marginPath) this.marginPath.parentNode.removeChild(this.marginPath);
        this.marginPath = null;
        return;
    }

    var margin = unzommedMargin * this.zoom;
    var color = Config.get(Config.DEV_PAGE_MARGIN_COLOR);

    if (!this.marginPatternDef) {
        // this.marginPatternDef = Dom.newDOMElement({
        //
        // });
        // this.bgLayer.appendChild(this.marginPatternDef);
    }

    if (!this.marginPath) {
        this.marginPath = document.createElementNS(PencilNamespaces.svg, "svg:path");
        this.marginPath.setAttributeNS(PencilNamespaces.p, "p:name", "margins");
        this.marginPath.setAttribute("stroke", "none");
        this.marginPath.setAttribute("fill", color);
        this.bgLayer.appendChild(this.marginPath);
    }

    var x = 5;
    var width = this.width * this.zoom;
    var height = this.height * this.zoom;
    this.marginPath.setAttribute("d", [
        M(0 - x, 0 - x), L(0 - x, height + x), L(width + x, height + x), L(width + x, 0 - x), z,
        M(margin, margin), L(width - margin, margin), L(width - margin, height - margin), L(margin, height - margin), z
    ].join(" "));
};
