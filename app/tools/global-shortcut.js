var GlobalShortcutHelper = {
    handlerMap: {}
};

var electron = require("electron");

GlobalShortcutHelper.register = function (id, shortcut, callback) {
    GlobalShortcutHelper.handlerMap[id] = callback;
    electron.ipcRenderer.send("global-shortcut-register", {shortcut: shortcut, shortcutId: id});
};

electron.ipcRenderer.on("global-shortcut", function (event, data) {
    var callback = GlobalShortcutHelper.handlerMap[data.shortcutId];
    if (!callback) return;
    window.setTimeout(function () {
        callback(data.shortcut, data.shortcutId);
    }, 100);
});
