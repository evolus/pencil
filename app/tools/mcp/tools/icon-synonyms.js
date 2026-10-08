/**
 * Universal Icon Synonym Dictionary & Query Expander
 * Distills ~110 core UI icon clusters derived from Lucide, Font Awesome (v5 & v6),
 * Tabler, and Material Icons metadata to bridge naming divergences across collections
 * (e.g. search <-> magnifying-glass, trash <-> trash-can <-> bin, close <-> xmark).
 */

/*
 * Equivalence clusters covering core UI concepts.
 * Any term within a cluster bidirectionally expands to all sibling terms in that cluster.
 */
var SYNONYM_CLUSTERS = [
    /* Actions & State Changes */
    ["trash", "trash-can", "trash-2", "bin", "delete", "remove", "garbage", "rubbish", "discard", "waste", "cleanup"],
    ["settings", "gear", "gears", "cog", "preferences", "config", "options", "sliders", "setup", "adjust", "wrench"],
    ["search", "magnifier", "magnifying-glass", "find", "inspect", "locate", "glass", "lookup", "explore", "scan"],
    ["edit", "modify", "write", "draft", "pencil", "pen", "pen-to-square", "compose", "rename", "file-edit"],
    ["add", "plus", "create", "new", "insert"],
    ["close", "cross", "cancel", "dismiss", "exit", "x", "xmark", "clear"],
    ["check", "tick", "success", "done", "confirm", "ok", "complete", "verified", "circle-check"],
    ["refresh", "reload", "sync", "rotate", "cycle", "arrows-rotate", "rotate-right", "update", "refresh-cw"],
    ["save", "floppy", "floppy-disk", "disk", "store", "keep"],
    ["undo", "revert", "rollback", "backtrack", "rotate-ccw"],
    ["redo", "repeat", "rotate-cw"],
    ["cut", "scissors", "clip"],
    ["copy", "clone", "duplicate", "replicate", "files"],
    ["paste", "clipboard", "assignment", "board"],
    ["share", "forward", "send", "distribute", "export"],
    ["download", "save-alt", "fetch", "receive", "inbound", "arrow-down-to-line"],
    ["upload", "publish", "outbound", "cloud-upload", "arrow-up-from-line"],

    /* User, Identity & Organization */
    ["user", "person", "account", "profile", "avatar", "member", "human", "circle-user"],
    ["users", "people", "group", "team", "community", "crowd", "user-group"],
    ["admin", "supervisor", "crown", "shield-user", "badge"],
    ["building", "office", "company", "enterprise", "organization", "workplace"],
    ["briefcase", "portfolio", "work", "job", "business", "bag"],

    /* Communication & Social */
    ["mail", "envelope", "email", "letter", "inbox", "message"],
    ["chat", "message", "comment", "bubble", "talk", "discussion", "sms", "conversation", "messages-square"],
    ["phone", "call", "telephone", "mobile", "cell", "contact"],
    ["bell", "notification", "alert-bell", "alarm", "chime", "notice"],
    ["send", "paper-plane", "airplane", "fly", "submit", "dispatch"],
    ["heart", "like", "love", "favorite", "favourite"],
    ["star", "bookmark", "rating", "favorite-star", "highlight"],
    ["thumb-up", "thumbs-up", "like", "approve", "agree", "upvote"],
    ["thumb-down", "thumbs-down", "dislike", "reject", "downvote"],

    /* System Status & Feedback */
    ["alert", "warning", "caution", "triangle-alert", "triangle-exclamation", "notice", "danger", "exclamation"],
    ["error", "bug", "circle-xmark", "circle-x", "failure", "danger", "defect"],
    ["info", "information", "help", "question", "circle-info", "circle-question", "faq", "support", "about"],
    ["lock", "padlock", "secure", "security", "private", "protected"],
    ["unlock", "insecure", "unprotected", "open-lock", "unlock-keyhole"],
    ["shield", "protect", "defense", "security", "guard", "safe"],
    ["key", "secret", "password", "auth", "token", "access", "credential"],
    ["eye", "view", "watch", "preview", "visibility", "visible", "show"],
    ["eye-off", "eye-slash", "hidden", "hide", "invisible", "conceal"],

    /* Navigation & Menus */
    ["home", "house", "main", "start", "dashboard"],
    ["menu", "bars", "hamburger", "navigation", "drawer", "bars-staggered"],
    ["arrow-right", "chevron-right", "angle-right", "forward", "next", "right", "move-right"],
    ["arrow-left", "chevron-left", "angle-left", "back", "previous", "left", "move-left"],
    ["arrow-up", "chevron-up", "angle-up", "top", "asc", "up"],
    ["arrow-down", "chevron-down", "angle-down", "bottom", "desc", "down"],
    ["external-link", "open-in-new", "launch", "arrow-up-right", "popout"],
    ["filter", "funnel", "refine", "filter-list"],
    ["sort", "order", "arrange", "sort-ascending", "sort-descending"],
    ["compass", "direction", "orientation", "navigate", "explore"],
    ["map", "location-map", "guide", "route", "travel"],
    ["pin", "map-pin", "location", "marker", "place", "geo"],

    /* E-Commerce & Finance */
    ["cart", "shopping", "shopping-cart", "cart-shopping", "basket", "bag", "checkout", "store", "ecommerce", "buy"],
    ["bag", "shopping-bag", "bag-shopping", "tote"],
    ["credit-card", "card", "payment", "bank", "purchase", "pay"],
    ["money", "cash", "dollar", "currency", "coin", "wallet", "finance", "bill"],
    ["tag", "badge", "label", "price", "category", "ticket", "discount"],
    ["store", "shop", "market", "retail", "storefront"],
    ["truck", "delivery", "shipping", "transport", "freight", "logistics"],
    ["package", "box", "parcel", "shipment", "inventory"],

    /* Files & Media */
    ["file", "document", "page", "note", "paper", "doc", "text"],
    ["folder", "directory", "archive", "cabinet", "folder-open"],
    ["image", "photo", "picture", "gallery", "media", "graphic"],
    ["video", "movie", "film", "camera", "record", "clip"],
    ["audio", "sound", "volume", "music", "speaker", "audio-description", "volume-2"],
    ["mic", "microphone", "audio-input", "record-voice"],

    /* Devices & Tech */
    ["desktop", "monitor", "screen", "computer", "pc", "display"],
    ["laptop", "notebook", "macbook", "portable"],
    ["mobile", "phone-device", "smartphone", "cellphone", "device"],
    ["tablet", "ipad", "slate"],
    ["printer", "print", "hardcopy"],
    ["camera", "snapshot", "lens"],
    ["battery", "charge", "power-level", "energy"],
    ["wifi", "wireless", "network", "signal", "connection", "internet"],
    ["bluetooth", "wireless-sync", "paired"],
    ["database", "db", "sql", "storage", "server", "data", "cylinder"],
    ["server", "host", "rack", "hardware", "cloud-server"],
    ["code", "brackets", "source", "dev", "developer", "html", "tag"],
    ["terminal", "console", "cli", "shell", "bash", "prompt"],
    ["cpu", "chip", "processor", "microchip", "hardware"],

    /* Controls & Presentation */
    ["toggle", "switch", "toggle-right", "toggle-left"],
    ["sliders", "controls", "tune", "adjust", "filter-sliders"],
    ["maximize", "expand", "fullscreen", "enlarge"],
    ["minimize", "compress", "shrink", "collapse"],
    ["table", "grid", "rows", "spreadsheet", "cells"],
    ["layers", "stack", "levels", "overlay", "sheets"],
    ["sun", "day", "light", "bright", "mode-light"],
    ["moon", "night", "dark", "mode-dark"],
    ["calendar", "date", "schedule", "event", "appointment"],
    ["clock", "time", "watch", "hour", "minute", "timer", "stopwatch"],
    ["power", "off", "shut-down", "switch-off", "logout", "log-out", "sign-out"],
    ["login", "log-in", "sign-in", "enter", "access"],
    ["link", "hyperlink", "url", "chain", "connect"],
    ["unlink", "disconnect", "break", "detach"],
    ["globe", "world", "earth", "internet", "web", "international", "lang", "language"],
    ["sparkles", "stars", "ai", "magic", "generate", "clean", "shine"],
    ["bot", "robot", "ai-agent", "automation", "android"],
    ["tools", "wrench", "screwdriver", "hammer", "maintenance", "repair", "fix", "construction"]
];

/*
 * Builds the inverted lookup index mapping every known term (and its hyphen/space variants)
 * to its sibling terms within the cluster.
 */
var _lookupIndex = null;

function getLookupIndex() {
    if (_lookupIndex) return _lookupIndex;

    var index = Object.create(null);

    for (var c = 0; c < SYNONYM_CLUSTERS.length; c++) {
        var cluster = SYNONYM_CLUSTERS[c];

        for (var i = 0; i < cluster.length; i++) {
            var rawTerm = String(cluster[i]).toLowerCase().trim();
            var normalizedTerm = rawTerm.replace(/[-_.]+/g, " ");

            var siblings = [];
            for (var j = 0; j < cluster.length; j++) {
                if (i !== j) {
                    siblings.push(cluster[j]);
                }
            }

            index[rawTerm] = siblings;
            if (normalizedTerm !== rawTerm && !index[normalizedTerm]) {
                index[normalizedTerm] = siblings;
            }
        }
    }

    _lookupIndex = index;
    return _lookupIndex;
}

/*
 * Expands a search keyword into candidate synonym alternatives based on cluster mappings.
 * Handles both single-word terms and multi-token queries by expanding constituent words.
 *
 * @param {string} keyword - Raw search query (e.g. "bin", "magnifier", "gear")
 * @returns {string[]} Array of synonym strings to evaluate
 */
function expandKeyword(keyword) {
    if (!keyword) return [];

    var index = getLookupIndex();
    var raw = String(keyword).toLowerCase().trim();
    var normalized = raw.replace(/[-_.]+/g, " ");

    var directMatches = index[raw] || index[normalized];
    if (directMatches && directMatches.length > 0) {
        return directMatches;
    }

    var tokens = normalized.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
        var candidateSet = Object.create(null);

        for (var t = 0; t < tokens.length; t++) {
            var tok = tokens[t];
            var tokSynonyms = index[tok];
            if (tokSynonyms) {
                for (var s = 0; s < tokSynonyms.length; s++) {
                    candidateSet[tokSynonyms[s]] = true;
                }
            }
        }

        return Object.keys(candidateSet);
    }

    return [];
}

module.exports = {
    SYNONYM_CLUSTERS: SYNONYM_CLUSTERS,
    expandKeyword: expandKeyword
};
