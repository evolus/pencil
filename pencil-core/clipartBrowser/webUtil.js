var WebUtil = {
    get : function(url, onComplete, rq) {
        try {
            var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Components.interfaces.nsIXMLHttpRequest);

            req.onreadystatechange = function(aEvt) {
                if (req.readyState == 4) {
                    //debug("url: " + url);
                    //debug(req.status);
                    if (req.status == 200) {
                        onComplete(req.responseText);
                    } else {
                        error("Error loading page");
                    }
                }
            };

            req.open("GET", url, true);
            req.send(null);
            rq.push(req);
        } catch (e) {
            error(e);
        }
    },

    getMetadata : function(url, onComplete, rq) {
        try {
            var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                    .createInstance(Components.interfaces.nsIXMLHttpRequest);

            req.onreadystatechange = function(aEvt) {
                if (req.readyState == 4) {
                    var size = req.getResponseHeader('Content-Length');
                    onComplete(size);
                }
            };

            req.open("HEAD", url, true);
            req.send(null);
            rq.push(req);
        } catch (e) {
            error("getMetaData: " + e);
        }
    }
};
