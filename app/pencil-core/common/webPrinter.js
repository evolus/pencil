// @background, @electron-specific
//      this is the printing support running in the main thread. The implementation opens hidden browser windows to print and to export content to pdf

module.exports = function () {
    const ipcMain = require('electron').ipcMain;
    const tmp = require("tmp");
    const fs = require("fs");

    const electron = require('electron');
    const app = electron.app;
    const BrowserWindow = electron.BrowserWindow;
    var QueueHandler = require("./QueueHandler");

    var queueHandler = new QueueHandler();

    var browserWindow = null;
    var currentPrintingCallback = null;

    function createPrintingTask(event, data) {
        return function (__callback) {
            browserWindow.loadURL(data.fileURL);

            currentPrintingCallback = function () {
                var options = {
                    printBackground: true
                };

                if (data.pdf) {
                    const OPTION_NAMES = ["marginsType", "pageSize", "printBackground", "printSelectionOnly", "landscape"];

                    // OPTION_NAMES.forEach(function (name) {
                    //     var value = data["print." + name];
                    //     if (typeof(value) != "undefined") {
                    //         if (value == "true" || value == "false") {
                    //             options[name] = (value == "true");
                    //         } else {
                    //             options[name] = value;
                    //         }
                    //     }
                    // });
                    browserWindow.webContents.printToPDF(options, function(error, pdfBuffer) {
                        if (error) {
                            try {
                                global.mainWindow.webContents.send(data.id, {success: false, message: error.message});
                            } finally {
                                __callback();
                            }

                            return;
                        }

                        fs.writeFile(data.targetFilePath, pdfBuffer, function(error) {
                            try {
                                if (error) {
                                    global.mainWindow.webContents.send(data.id, {success: false, message: error.message});
                                    return;
                                }

                                global.mainWindow.webContents.send(data.id, {success: true});
                            } finally {
                                __callback();
                            }
                        })
                    });
                } else {
                    global.mainWindow.webContents.send(data.id, {success: true});
                    browserWindow.webContents.print(options);
                }

            }
        };
    }

    function init() {
        browserWindow = new BrowserWindow({width: 800, height: 600, enableLargerThanScreen: true, show: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        browserWindow.webContents.on("did-finish-load", function() {

            if (!currentPrintingCallback) return;
            currentPrintingCallback();
            currentPrintingCallback = null;
        });

        // browserWindow.show();

        ipcMain.on("printer-request", function (event, data) {
            queueHandler.submit(createPrintingTask(event, data));
        });
        console.log("Background web-printer started.");
    }

    function start() {
        init();
    }

    return { start: start };
}();
