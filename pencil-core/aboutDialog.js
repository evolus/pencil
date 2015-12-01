function handleOnload() {
    try {
        loadLicenseIn("chrome://pencil/content/license.txt");
        req.send(null);
        document.getElementById("licenseText").value = req.responseText;
    } catch (e) {
        Console.dumpError(e);
        loadLicenseIn("file:///usr/share/doc/pencil-@VERSION@/COPYING");
    }
};
function loadLicenseIn(url) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIXMLHttpRequest);

	req.open("GET", url, false);
	req.send(null);
	
	document.getElementById("licenseText").value = req.responseText;
}

window.addEventListener("load", handleOnload, false);