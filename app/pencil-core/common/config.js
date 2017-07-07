var Config = {
};

Config.data = {};
Config.DATA_DIR_NAME = ".pencil";
Config.STENCILS_DIR_NAME = "stencils";
Config.PRIVATE_STENCILS_DIR_NAME = "privateCollection";
Config.CONFIG_FILE_NAME = "config.json";

Config.getDataPath = function () {
    return path.join(os.homedir(), Config.DATA_DIR_NAME);
};

Config.getDataFilePath = function (name) {
    return path.join(Config.getDataPath(), name);
};
Config._save = function () {
    fs.writeFileSync(Config.getDataFilePath(Config.CONFIG_FILE_NAME), JSON.stringify(Config.data, null, 4), "utf8");
};
Config._load = function () {
    try {
        var json = fs.readFileSync(Config.getDataFilePath(Config.CONFIG_FILE_NAME), "utf8");
        Config.data = JSON.parse(json);
    } catch (e) {
        console.error(e);
    }
};

Config.set = function (name, value) {
    Config.data[name] = value;
    Config._save();

    window.globalEventBus && window.globalEventBus.broadcast("config-change", { name: name, value: value });
};

Config.get = function (name, defaultValue) {
    if (typeof(Config.data[name]) != "undefined") return Config.data[name];
    return defaultValue;
};
Config.getLocale = function () {
};

Config.registerEvent = function () {

}

try {
    fs.mkdirSync(Config.getDataPath());
} catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
}

Config._load();



//Specific configuration schema management
Config.define = function (name, defaultValue) {
    if (Config.get(name, null) === null) {
        Config.set(name, defaultValue);
    }

    return name;
};

Config.DEV_PAGE_MARGIN_SIZE = Config.define("dev.pageMargin.size", Config.DEV_DEFAULT_PAGE_MARGIN);
Config.DEV_PAGE_MARGIN_COLOR = Config.define("dev.pageMargin.color", "rgba(0, 0, 0, 0.2)");

Config.DEV_ENABLE_DISABLED_IN_PROP_PAGE = Config.define("dev.enable_disabled_in_property_page", false);
Config.VIEW_USE_COMPACT_LAYOUT = Config.define("view.useCompactLayout", false);

Config.DEVICE_ADB_PATH = Config.define("device.adb_path", "adb");
Config.EXPORT_CROP_FOR_CLIPBOARD = Config.define("export.crop_for_clipboard", false);
