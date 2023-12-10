window.addEventListener("DOMContentLoaded", boot, false);
var ox = 0;
var oy = 0;

var x = 0;
var y = 0;
var w = 0;
var h = 0;
var held = false;
var selectedAreaPane = null;

var parentId = null;
var index = null;
var url = null;

function boot() {
    selectedAreaPane = document.getElementById("selectedAreaPane");

    if (window.location.href.match(/^[^\?]+\?i=([^&]+)&index=([^&]+)&id=([^&]+)$/)) {
        url = decodeURIComponent(RegExp.$1);
        document.body.style.backgroundImage = "url(" + url + ")";

        index = parseInt(RegExp.$2, 10);
        parentId = parseInt(RegExp.$3, 10);
    }

    document.addEventListener("mousedown", function (event) {
        ox = event.clientX;
        oy = event.clientY;
        held = true;
    }, false);
    document.addEventListener("mousemove", function (event) {
        if (!held) return;
        x = Math.min(ox, event.clientX);
        y = Math.min(oy, event.clientY);

        w = Math.abs(ox - event.clientX);
        h = Math.abs(oy - event.clientY);

        redraw();
    }, false);

    document.addEventListener("mouseup", function (event) {
        held = false;
        redraw();
        const { app, BrowserWindow } = require('@electron/remote');
        var parentWindow = BrowserWindow.fromId(parentId);
        parentWindow.webContents.send("region-selected", {x: x, y: y, width: w, height: h, index: index});
    });

    window.addEventListener("keyup", function (event) {
        if (event.keyCode == 27) {
            const { app, BrowserWindow } = require('@electron/remote');
            var parentWindow = BrowserWindow.fromId(parentId);
            parentWindow.webContents.send("region-canceled", {});
        }
    }, false);

    redraw();
}

function redraw() {
    selectedAreaPane.style.borderLeftWidth = x + "px";
    selectedAreaPane.style.borderTopWidth = y + "px";
    selectedAreaPane.style.borderRightWidth = (selectedAreaPane.offsetWidth - x - w) + "px";
    selectedAreaPane.style.borderBottomWidth = (selectedAreaPane.offsetHeight - y - h) + "px";
}
