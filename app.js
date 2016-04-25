const fontManager = require("font-manager");
const clipboard   = require("electron").clipboard;
const tmp         = require("tmp");
const path        = require("path");
const fs          = require("fs");
const os          = require("os");
const unzip       = require("unzip2");
const dialog      = require("electron").remote.dialog;

tmp.setGracefulCleanup();

var webFrame = require("electron").webFrame;
webFrame.registerURLSchemeAsPrivileged("file");
webFrame.registerURLSchemeAsSecure("file");
webFrame.registerURLSchemeAsBypassingCSP("file");
