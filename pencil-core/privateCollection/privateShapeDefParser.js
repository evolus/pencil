
function PrivateShapeDefParser () {
}

PrivateShapeDefParser.prototype.parseNode = function (dom) {
    var collection = new PrivateCollection();

    collection.id = dom.getAttribute("p:Id");
    collection.displayName = dom.getAttribute("p:Name");
    collection.description = dom.getAttribute("p:Description");
    collection.author = dom.getAttribute("p:Author");
    collection.infoUrl = dom.getAttribute("p:InfoUrl");

    debug("    loading collection: id: " + collection.id + ", name: " + collection.displayName);

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

        debug("         loading shape: id: " + shapeDef.id + ", name: " + shapeDef.displayName);

        collection.shapeDefs.push(shapeDef);
    });

    return collection;
};