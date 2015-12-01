/* class */ function PrivateCollection() {
    this.id = null;
    this.displayName = null;
    this.description = null;
    this.author = null;
    this.infoUrl = null;

    this.shapeDefs = [];
};
/* public void */ PrivateCollection.prototype.deleteShape = function (shapeDef) {
    for (var i = 0; i < this.shapeDefs.length; i++) {
        if (this.shapeDefs[i].id == shapeDef.id) {
            this.shapeDefs.splice(i, 1);
            return;
        }
    }
};
/* public String */ PrivateCollection.prototype.toXMLDom = function () {
    var xml = '<p:Collection p:Id="' + this.id + '" p:Name="' + this.displayName + '" p:Description="' + (this.description?this.description:"") + '" p:Author="' + (this.author?this.author:"") + '" p:InfoUrl="' + (this.infoUrl?this.infoUrl:"") + '">\n';
        xml += '<p:Groups>\n\t';

    for (var i = 0; i < this.shapeDefs.length; i++) {
        xml += '<p:Group p:Id="' + this.shapeDefs[i].id + '" p:Name="' + this.shapeDefs[i].displayName + '" p:Icon="' + this.shapeDefs[i].iconData + '">\n\t\t' +
                    "<p:Content>\n\t\t\t"
                        + new XMLSerializer().serializeToString(this.shapeDefs[i].content) + "\n\t\t" +
                    "</p:Content>\n\t" +
                "</p:Group>\n";
    }

    xml += "</p:Groups>\n</p:Collection>\n";
    return xml;
};
/* public override String */ PrivateCollection.prototype.toString = function () {
    return "[PrivateCollection: " + this.id + "]";
};