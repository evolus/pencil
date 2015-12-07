var nwgui = require("nw.gui");
var fontManager = require("font-manager-nw");

window.addEventListener("load", function () {
    var win = nwgui.Window.get();
    win.maximize();
    window.addEventListener("keyup", function (event) {
        if (event.keyCode == DOM_VK_F5) {
            window.location.reload();
        } else if (event.keyCode == DOM_VK_F10) {
            win.showDevTools();
        }
    }, false);
}, false);
