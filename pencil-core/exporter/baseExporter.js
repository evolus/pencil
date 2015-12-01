function BaseExporter() {
    this.id = "BaseExporter";
}
BaseExporter.OUTPUT_TYPE_DIRECTORY = "dir";
BaseExporter.OUTPUT_TYPE_FILE = "file";
BaseExporter.OUTPUT_TYPE_NETWORK = "net";
BaseExporter.OUTPUT_TYPE_NONE = "none";

BaseExporter.prototype.requireRasterizedData = function () {
    return false;
};
BaseExporter.prototype.getWarnings = function () {
    return null;
};
BaseExporter.prototype.supportTemplating = function () {
    return false;
};
BaseExporter.prototype.getOutputType = function () {
    return BaseExporter.OUTPUT_TYPE_DIRECTORY;
};
BaseExporter.prototype.getOutputFileExtensions = function () {
    return [];
};
