// @background, @electron-specific
//      dispite the name, this is a background module and is not intended to be used in renderer processes

module.exports = function () {

    const ipcMain = require('electron').ipcMain;
    const tmp = require("tmp");
    const fs = require("fs");

    const electron = require('electron');
    const app = electron.app;  // Module to control application life.
    const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

    var rendererWindow = null;
    var currentRenderHandler = null;


    function QueueHandler() {
        this.tasks = [];
    }
    QueueHandler.prototype.submit = function (task) {
        this.tasks.push(task);

        if (this.tasks.length == 1) this.start();
    }

    QueueHandler.prototype.start = function (task) {

        var next = function() {
            if (this.tasks.length <= 0) return;
            var task = this.tasks.pop();
            task(next);
        }.bind(this);

        next();
    }

    var queueHandler = new QueueHandler();

    function createRenderTask(event, data) {
        return function(__callback) {
            //Save the svg
            tmp.file(function (err, path, fd, cleanupCallback) {
                if (err) throw err;

                var svg = data.svg;

                //path
                svg = '<html>'
 + '<head>'
 + '<script type="text/javascript">'
 + '    document.addEventListener("DOMContentLoaded", function () {'
 + '        var images = document.querySelectorAll("svg image");'
 + '        for (var i = 0; i < images.length; i ++) {'
 + '            var image = images[i];'
 + '            image.addEventListener("load", function () {'
 + '                console.log("image loaded");'
 + '            });'
 + '        }'
 + '    }, false);'
 + '    document.addEventListener("load", function () {'
 + '        document.body.style.visibility = "hiden";'
 + '        window.setTimeout(function() {'
 + '            document.body.style.visibility = "visible";'
 + '        }, 1);'
 + '    }, false);'
 + '</script>'
 + '</head>'
 + '<body style="padding: 0px; margin: 0px;">'
 + svg
 + '</body>'
 + '</html>';
                fs.writeFileSync(path, svg, "utf8");
                console.log("SAVED to: ", path);

                rendererWindow.setContentSize(data.width, data.height, false);
                rendererWindow.loadURL("file://" + path);

                var capturePendingTaskId = null;

                currentRenderHandler = function () {
                    capturePendingTaskId = null;
                    rendererWindow.capturePage(function (nativeImage) {
                        var dataURL = nativeImage.toDataURL();
                        console.log("CAPTURED", dataURL.length);
                        event.sender.send("render-response", dataURL);
                        cleanupCallback();
                        currentRenderHandler = null;
                        __callback();
                    });
                };

            });
        };
    }

    function start() {

        rendererWindow = new BrowserWindow({show: false, frame: false, autoHideMenuBar: true, webPreferences: {webSecurity: false, defaultEncoding: "UTF-8"}});
        rendererWindow.webContents.openDevTools();
        rendererWindow.webContents.on("did-finish-load", function () {
            // if (currentRenderHandler) currentRenderHandler();
        });

        rendererWindow.webContents.beginFrameSubscription(function (frameBuffer) {
            console.log("Got frameBuffer at: " + new Date().getTime() + ", frameBuffer: " + frameBuffer.length);
            if (capturePendingTaskId) clearTimeout(capturePendingTaskId);
            capturePendingTaskId = setTimeout(currentRenderHandler, 500);
        });

        console.log("RENDERER started.");
        ipcMain.on("render-request", function (event, data) {
            queueHandler.submit(createRenderTask(event, data));
        });
    }


    return { start: start };
}();
