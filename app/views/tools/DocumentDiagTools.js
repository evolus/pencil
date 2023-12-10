function DocumentDiagTools() {
    
}

DocumentDiagTools.checkMissingResources = function () {
    Pencil.controller.doc.pages.forEach(function (page) {
        ApplicationPane._instance.activatePage(page);
        var svg = page.canvas.svg;
        console.log("Page: " + page.name);
        Dom.workOn(".//svg:g[@p:type='Shape']", svg, function (shapeNode) {
            
            var symbolName = Svg.getSymbolName(shapeNode);
            var eNameNode = Dom.getSingle("./p:metadata/p:property[name='elementName']", shapeNode);
            var eName = eNameNode ? eNameNode.textContent : null;
            
            Dom.workOn("./p:metadata/p:property", shapeNode, function (propNode) {
                var name = propNode.getAttribute("name");
                var n = name.toLowerCase();
                if (n.indexOf("imagedata") < 0) return;
                if (n == "imagedatamode" || n == "imagedataname" || n.endsWith("resourcenames")) return;
                var text = propNode.textContent;
                var imageData = ImageData.fromString(text);
                if (!imageData.data) {
                    console.error("  > " + eName + "@" + symbolName + ": " + name + " -> invalid image data: " + text);
                    return;
                }
                var id = ImageData.refStringToId(imageData.data);
                if (!id) return;
                var filePath = Pencil.controller.refIdToFilePath(id);
                if (!fs.existsSync(filePath)) {
                    console.error("  > " + eName + "@" + symbolName + ": " + name + " -> missing: " + filePath);
                }
            });
        });
    });    
};