function ExportTemplate() {
}

ExportTemplate.parse = function (dir) {
    var metaFile = dir.clone();
    metaFile.append("Template.xml");

    if (!metaFile.exists()) return null;

    var fileContents = FileIO.read(metaFile, ShapeDefCollectionParser.CHARSET);
    var domParser = new DOMParser();

    var dom = domParser.parseFromString(fileContents, "text/xml");

    var template = new ExportTemplate();
    Dom.workOn("/*/p:Property", dom, function (node) {
            var name = node.getAttribute("name");
            var value = node.textContent;

            template[name] = value;
        });

    if (!template.id) return null;
    if (!template.name) return null;
    if (template.styleSheet) {
        template.styleSheetFile = dir.clone();
        template.styleSheetFile.append(template.styleSheet);
    }
    template.dir = dir.clone();

    return template;
};
