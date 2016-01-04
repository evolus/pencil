const fontManager = require("font-manager");
const clipboard = require("electron").clipboard;
const tmp = require("tmp");
tmp.setGracefulCleanup();
const path = require("path");
const fs = require("fs");
