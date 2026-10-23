const {Menu, app} = require('electron');
const pkg = require("../../package.json");

exports.MacOSToolbar = {

    createMacOSToolbar() {
        var template = [{
            label: pkg.name,
            submenu: [
                { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
            ]}, {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "CmdOrCtrl+Y", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]}
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
}
