// Copyright (c) Evolus Solutions. All rights reserved.
// License: GPL/MPL
// $Id$

var PencilNamespaces = { };

PencilNamespaces["p"] = "http://www.evolus.vn/Namespace/Pencil";
PencilNamespaces["svg"] = "http://www.w3.org/2000/svg";
PencilNamespaces["xlink"] = "http://www.w3.org/1999/xlink";
PencilNamespaces["xul"] = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
PencilNamespaces["html"] = "http://www.w3.org/1999/xhtml";
PencilNamespaces["xbl"] = "http://www.mozilla.org/xbl";

PencilNamespaces["inkscape"] = "http://www.inkscape.org/namespaces/inkscape";
PencilNamespaces["dc"] = "http://purl.org/dc/elements/1.1/";
PencilNamespaces["cc"] = "http://creativecommons.org/ns#";
PencilNamespaces["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
PencilNamespaces["sodipodi"] = "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd";

PencilNamespaces["content"] = "http://purl.org/rss/1.0/modules/content/";
PencilNamespaces["itunes"] = "http://www.itunes.com/dtds/podcast-1.0.dtd";
PencilNamespaces["media"] = "http://search.yahoo.com/mrss/";
PencilNamespaces["atom"] = "http://www.w3.org/2005/Atom";


PencilNamespaces.resolve = function (prefix) {
    var uri = PencilNamespaces[prefix];
    if (uri) return uri;

    return null;
};
