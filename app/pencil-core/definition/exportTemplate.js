function ExportTemplate() {
}
ExportTemplate.domParser = new DOMParser();

ExportTemplate.parse = function (dir) {
    var filePath = path.join(dir, "Template.xml");
    console.log(filePath);
    var stat = fs.statSync(filePath.toString());

    if (!stat.isFile()) return null;


    var fileContents = fs.readFileSync(filePath, "utf8");
    var dom = ExportTemplate.domParser.parseFromString(fileContents, "text/xml");

    var template = new ExportTemplate();
    Dom.workOn("/*/p:Property", dom, function (node) {
            var name = node.getAttribute("name");
            var value = node.textContent;

            template[name] = value;
        });

    if (!template.id) return null;
    if (!template.name) return null;
    if (template.styleSheet) {
        template.styleSheetFile = path.join(dir, template.styleSheet);
    }
    template.dir = dir;

    return template;
};
