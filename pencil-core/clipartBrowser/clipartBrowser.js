
function openClipartBrowser() {
    if (!Pencil._clipartShowing) {
        window.openDialog('chrome://pencil/content/clipartBrowser.xul', 'ClipartBrowser' + Util.getInstanceToken(), 'alwaysRaised,chrome,centerscreen,resizable', Pencil);
    }
}
