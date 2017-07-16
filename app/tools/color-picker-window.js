var capturedImage = null;

var electron = require("electron");
const ipc = electron.ipcRenderer;

ipc.on("request", (event, message) => {
    console.log("Get request", message);
    init(event.sender, message);
})

function init(requester, message) {
    var capturer = require("electron-screencapture");

    capturedImage = document.getElementById("capturedImage");

    //take the screenshot
    var displays = electron.screen.getAllDisplays();
    if (!displays || displays.length <= 0) {
        console.error("No dispaly found");
        return;
    }

    var display = displays[0];

    var win = electron.remote.getCurrentWindow();
    console.log(display);

    capturer.takeScreenshot({x: display.bounds.x, y: display.bounds.y, width: display.bounds.width, height: display.bounds.height, sourceId: display.id})
        .then(function (capturedImageURL) {
            capturedImage.src = capturedImageURL;
            win.show();
            window.setTimeout(function () {
                console.log("Sending back..." + message.messageId);
                const BrowserWindow = electron.remote.BrowserWindow;
                var requesterWindow = BrowserWindow.fromId(message.senderId);
                requesterWindow.webContents.send(message.messageId, capturedImageURL);
            }, 100);
        })
        .catch(function (error) {
            callback(null, error);
        });
};
