
function PrivateShapeDefParser () {
}

PrivateShapeDefParser.prototype.parseNode = function (dom) {
    var collection = new PrivateCollection();

    collection.id = dom.getAttribute("p:Id");
    collection.displayName = dom.getAttribute("p:Name");
    collection.description = dom.getAttribute("p:Description");
    collection.author = dom.getAttribute("p:Author");
    collection.infoUrl = dom.getAttribute("p:InfoUrl");
    collection.map = {};

    Dom.workOn("./p:Groups/p:Group", dom, function (node) {
        var id = node.getAttribute("p:Id");
        var name = node.getAttribute("p:Name");
        var icon = node.getAttribute("p:Icon");
        var contentNode = Dom.getSingle("./p:Content/svg:g", node);

        var shapeDef = new PrivateShapeDef();

        shapeDef.id = id;
        shapeDef.displayName = name;
        shapeDef.iconData = icon;
        shapeDef.content = contentNode;

        collection.shapeDefs.push(shapeDef);
        collection.map[id] = shapeDef;
    });

    return collection;
};
