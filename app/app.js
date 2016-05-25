const clipboard     = require("electron").clipboard;
const tmp           = require("tmp");
const path          = require("path");
const moment        = require("moment");
const fs            = require("fs");
const os            = require("os");
const unzip         = require("unzip2");
const dialog        = require("electron").remote.dialog;
const nativeImage   = require('electron').nativeImage;
const pkgInfo       = require("./package.json");
const fontManager   = require("./lib/loader").fontManager;
const ipcRenderer   = require('electron').ipcRenderer;
const QueueHandler  = require("./pencil-core/common/QueueHandler");
const shell         = require('electron').shell;
const sharedUtil    = require("./pencil-core/common/shared-util");
const _             = require("lodash");

tmp.setGracefulCleanup();

var webFrame = require("electron").webFrame;
webFrame.registerURLSchemeAsPrivileged("file");
webFrame.registerURLSchemeAsSecure("file");
webFrame.registerURLSchemeAsBypassingCSP("file");
