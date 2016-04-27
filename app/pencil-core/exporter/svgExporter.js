function SVGExporter() {
    this.name = "Multi-page SVG file";
    this.id = "SVGExporter";
    this.xsltProcessor = new XSLTProcessor();
    this.xsltDOM = null;
}
SVGExporter.prototype = new BaseExporter();

SVGExporter.prototype.requireRasterizedData = function () {
    return false;
};
SVGExporter.prototype.getRasterizedPageDestination = function (baseDir) {
    return null;
};

SVGExporter.prototype.export = function (doc, options, destFile, xmlFile, callback) {
    if (!this.xsltDOM) {
        this.xsltDOM = document.implementation.createDocument("", "", null);
        this.xsltDOM.async = false;
        this.xsltDOM.load("exporter/Pencil2SVG.xslt");
    }
    
    this.xsltProcessor.reset();
    this.xsltProcessor.importStylesheet(this.xsltDOM);

    var sourceDOM = Dom.parseFile(xmlFile);
    var result = this.xsltProcessor.transformToDocument(sourceDOM);

    Dom.serializeNodeToFile(result, destFile);

    callback();
};
SVGExporter.prototype.getWarnings = function () {
    return "Document will be exported as a multi-page SVG file that can used in Inkscape.";
};
SVGExporter.prototype.getOutputType = function () {
    return BaseExporter.OUTPUT_TYPE_FILE;
};
SVGExporter.prototype.getOutputFileExtensions = function () {
    return [
        {
            title: "Scalable Vector Graphic (*.svg)",
            ext: "*.svg"
        }
    ];
};
Pencil.registerDocumentExporter(new SVGExporter());
