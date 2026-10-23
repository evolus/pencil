function ExportTemplate() {
}
ExportTemplate.domParser = new DOMParser();

ExportTemplate.parse = function (dir) {
    var filePath = path.join(dir, "Template.xml");

    var stat = fs.statSync(filePath.toString());

    if (!stat.isFile()) return null;


    var fileContents = fs.readFileSync(filePath, "utf8");
    var dom = ExportTemplate.domParser.parseFromString(fileContents, "text/xml");

    var template = new ExportTemplate();

    template.editableProperties = [];
    Dom.workOn("/*/p:Property", dom, function (propNode) {
        var name = propNode.getAttribute("name");
        var value = propNode.textContent;
        template[name] = value;

        var property = new Property();
        property.name = name;
        property.displayName = propNode.getAttribute("displayName");

        var type = propNode.getAttribute("type");
        if (!type) return;

        try {
            property.type = window[type];
        } catch (e) {
            return;
        }

        if (!property.type) return;

        property.initialValue = property.type.fromString(value);
        property.value = property.initialValue;

        //parsing meta
        Dom.workOn("./@p:*", propNode, function (metaAttribute) {
            var metaValue = metaAttribute.nodeValue;
            metaValue = metaValue.replace(/\$([a-z][a-z0-9]*)/gi, function (zero, one) {
                property.relatedProperties[one] = true;
                return "properties." + one;
            });
            property.meta[metaAttribute.localName] = metaValue;
        });

        template.editableProperties.push(property);
    });

    if (!template.id) return null;
    if (!template.name) return null;
    if (template.styleSheet) {
        template.styleSheetFile = path.join(dir, template.styleSheet);
    }
    template.dir = dir;

    return template;
};

ExportTemplate.prototype.findEditableProperty = function (name) {
    if (!this.editableProperties) return null;
    for (var prop of this.editableProperties) {
        if (prop.name == name) return prop;
    }

    return null;
};
