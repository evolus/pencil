// @background, @electron-specific
//      dispite the name, this is a background module and is not intended to be used in renderer processes

module.exports = function () {

    const ipcMain = require('electron').ipcMain;
    const tmp = require("tmp");
    const fs = require("fs");

    const electron = require('electron');
    const app = electron.app;
    const BrowserWindow = electron.BrowserWindow;
    var QueueHandler = require("./QueueHandler");
    var sharedUtil = require("./shared-util");

    var rendererWindow = null;
    var currentRenderHandler = null;
    var fontFaceCSS = "";


    var queueHandler = new QueueHandler(100);

    function createRenderTask(event, data) {
        return function(__callback) {
            //Save the svg
            tmp.file({prefix: 'render-', postfix: '.html' }, function (err, path, fd, cleanupCallback) {
                if (err) throw err;

                var svg = data.svg;

                //path
                svg = '<html><head>\n'
 + '<style type="text/css">\n'
 + 'svg { line-height: 1.428; }\n'
 + fontFaceCSS + "\n"
 + '</style>\n'
 + '<script type="text/javascript">\n'
 + '    var ipcRenderer = require("electron").ipcRenderer;\n'
 + '    window.addEventListener("load", function () {\n'
 + '        window.requestAnimationFrame(function () {\n'
 + '            window.requestAnimationFrame(function () {\n'
 + '                ipcRenderer.send("render-rendered", {});\n'
 + '                console.log("Rendered signaled");\n'
 + '            });\n'
 + '        })\n'
 + '    }, false);\n'
 + '</script>\n'
 + '</head>\n'
 + '<body style="padding: 0px; margin: 0px;">\n'
 + svg
 + '</body>\n'
 + '</html>\n';
                fs.writeFileSync(path, svg, "utf8");

                rendererWindow.setSize(Math.round(data.width), Math.round(data.height), false);

                var url = "file://" + path;
                rendererWindow.loadURL(url);

                var capturePendingTaskId = null;

                currentRenderHandler = function (renderedEvent) {
                    capturePendingTaskId = null;
                    rendererWindow.capturePage(function (nativeImage) {
                        var dataURL = nativeImage.toDataURL();

                        cleanupCallback();
                        currentRenderHandler = null;

                        event.sender.send(data.id, {url: dataURL});
                        __callback();
                    });
                };

            });
        };
    }

    function init() {

        rendererWindow = new BrowserWindow({x: 0, y: 0, useContentSize: true, enableLargerThanScreen: true, show: false, frame: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        rendererWindow.webContents.openDevTools();

        ipcMain.on("render-request", function (event, data) {
            queueHandler.submit(createRenderTask(event, data));
        });

        ipcMain.on("render-rendered", function (event, data) {
            setTimeout(function () {
                if (currentRenderHandler) currentRenderHandler(event);
            }, 100);
        });

        ipcMain.on("font-loading-request", function (event, data) {
            fontFaceCSS = sharedUtil.buildFontFaceCSS(data.faces);
            event.sender.send(data.id, {});
        });


        console.log("RENDERER started.");
    }
    function initOutProcessCanvasBasedRenderer() {
        var canvasWindow = new BrowserWindow({x: 0, y: 0, enableLargerThanScreen: true, show: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        var url = "file://" + app.getAppPath() + "/renderer.xhtml";
        canvasWindow.loadURL(url);

        var devEnable = false;
        if (process.argv.indexOf("--enable-dev") >= 0) {
            devEnable = true;
        } else if (process.env.PENCIL_ENV === "development") {
            devEnable = true;
        }

        if (devEnable) {
            canvasWindow.webContents.openDevTools();
        }
        // canvasWindow.show();

        ipcMain.on("canvas-render-request", function (event, data) {
            console.log("RASTER: Forwarding render request for " + data.id);
            canvasWindow.webContents.send("canvas-render-request", data);
        });
        ipcMain.on("canvas-render-response", function (event, data) {
            console.log("RASTER: Forwarding render result for " + data.id);
            global.mainWindow.webContents.send(data.id, {url: data.url, objectsWithLinking: data.objectsWithLinking});
        });

        ipcMain.on("font-loading-request", function (event, data) {
            canvasWindow.webContents.send("font-loading-request", data);
        });
        ipcMain.on("font-loading-response", function (event, data) {
            global.mainWindow.webContents.send(data.id, data);
        });

        console.log("OUT-PROCESS CANVAS RENDERER started.");
    }

    function start() {
        ipcMain.once("render-init", function (event, data) {
            init();
        });
        ipcMain.once("canvas-render-init", function (event, data) {
            initOutProcessCanvasBasedRenderer();
        });
    }


    return { start: start };
}();
