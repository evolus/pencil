// @background, @electron-specific

module.exports = function () {
    const ipcMain = require('electron').ipcMain;
    const electron = require('electron');
    const app = electron.app;

    function init() {
        ipcMain.on("global-shortcut-register", function (event, data) {
            electron.globalShortcut.register(data.shortcut, () => {
                console.log("Shortcut: " + data.shortcut + " triggered");
                app.mainWindow.webContents.send("global-shortcut", {
                    shortcut: data.shortcut,
                    shortcutId: data.shortcutId
                });
            });
            console.log("Shortcut: " + data.shortcut + " registered");
        });
        console.log("Shortcut main service started.");
    }

    function start() {
        init();
    }

    return { start: start };
}();
