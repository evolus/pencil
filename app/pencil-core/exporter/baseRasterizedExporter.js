function BaseRasterizedExporter() {
    this.name = Util.getMessage("rasterized.graphics.png.files");
    this.id = "BaseRasterizedExporter";
    this.linkingSupported = false;
}
BaseRasterizedExporter.prototype = new BaseExporter();

BaseRasterizedExporter.prototype.requireRasterizedData = function () {
    return true;
};
BaseRasterizedExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    return baseDir;
};

BaseRasterizedExporter.prototype.export = function (doc, options, destFile, xmlFile, callback) {
    callback();
};
BaseRasterizedExporter.prototype.getWarnings = function () {
    return Util.getMessage("no.linkings.are.preserved");
};
BaseRasterizedExporter.prototype.fixAbsoluteRasterizedPaths = function (sourceDOM, destDir) {
    //changing rasterized path to relative
    var pathPrefix = destDir + path.sep;
    Dom.workOn("//p:Page/@rasterized", sourceDOM, function (attr) {
        var path = attr.nodeValue;
        if (path.indexOf(pathPrefix) == 0) {
            path = path.substring(pathPrefix.length);
            attr.nodeValue = path;
        }
    });
};

Pencil.registerDocumentExporter(new BaseRasterizedExporter());
