function UICommandManager() {
}

UICommandManager.commands = [];
UICommandManager.map = {};
UICommandManager.keyMap = {};

UICommandManager.mapKey = function (name, keyCode, pcName, macName, macKeyCode) {
    var key = {
        name: name,
        keyCode: IS_MAC ? (macKeyCode || keyCode) : keyCode,
        pcName: pcName,
        macName: macName || pcName,
    };

    UICommandManager.keyMap[name] = key;
};

//key literal to key code map
UICommandManager.mapKey("BACK_SPACE", 8, "Backspace");
UICommandManager.mapKey("TAB", 9, "Tab");
UICommandManager.mapKey("RETURN", 13, "Return");
UICommandManager.mapKey("ENTER", 14, "Enter");
UICommandManager.mapKey("SHIFT", 16, "Shift");
UICommandManager.mapKey("CONTROL", 17, "Ctrl");
UICommandManager.mapKey("ALT", 18, "Alt");
UICommandManager.mapKey("PAUSE", 19, "Pause/Break");
UICommandManager.mapKey("CAPS_LOCK", 20, "Caps Lock");
UICommandManager.mapKey("ESCAPE", 27, "Esc");
UICommandManager.mapKey("SPACE", 32, "Space");
UICommandManager.mapKey("PAGE_UP", 33, "Page Up");
UICommandManager.mapKey("PAGE_DOWN", 34, "Page Down");
UICommandManager.mapKey("END", 35, "End");
UICommandManager.mapKey("HOME", 36, "Home");
UICommandManager.mapKey("LEFT", 37, "Left Arrow");
UICommandManager.mapKey("UP", 38, "Up Arrow");
UICommandManager.mapKey("RIGHT", 39, "Right Arrow");
UICommandManager.mapKey("DOWN", 40, "Down Arrow");
UICommandManager.mapKey("PRINTSCREEN", 44, "Print Screen");
UICommandManager.mapKey("INSERT", 45, "Insert");
UICommandManager.mapKey("DELETE", 46, "Delete", "Delete", 8);
UICommandManager.mapKey("0", 48, "0");
UICommandManager.mapKey("1", 49, "1");
UICommandManager.mapKey("2", 50, "2");
UICommandManager.mapKey("3", 51, "3");
UICommandManager.mapKey("4", 52, "4");
UICommandManager.mapKey("5", 53, "5");
UICommandManager.mapKey("6", 54, "6");
UICommandManager.mapKey("7", 55, "7");
UICommandManager.mapKey("8", 56, "8");
UICommandManager.mapKey("9", 57, "9");
UICommandManager.mapKey("SEMICOLON", 59, ";");
// UICommandManager.mapKey("EQUALS", 61, "=");
UICommandManager.mapKey("A", 65, "A");
UICommandManager.mapKey("B", 66, "B");
UICommandManager.mapKey("C", 67, "C");
UICommandManager.mapKey("D", 68, "D");
UICommandManager.mapKey("E", 69, "E");
UICommandManager.mapKey("F", 70, "F");
UICommandManager.mapKey("G", 71, "G");
UICommandManager.mapKey("H", 72, "H");
UICommandManager.mapKey("I", 73, "I");
UICommandManager.mapKey("J", 74, "J");
UICommandManager.mapKey("K", 75, "K");
UICommandManager.mapKey("L", 76, "L");
UICommandManager.mapKey("M", 77, "M");
UICommandManager.mapKey("N", 78, "N");
UICommandManager.mapKey("O", 79, "O");
UICommandManager.mapKey("P", 80, "P");
UICommandManager.mapKey("Q", 81, "Q");
UICommandManager.mapKey("R", 82, "R");
UICommandManager.mapKey("S", 83, "S");
UICommandManager.mapKey("T", 84, "T");
UICommandManager.mapKey("U", 85, "U");
UICommandManager.mapKey("V", 86, "V");
UICommandManager.mapKey("W", 87, "W");
UICommandManager.mapKey("X", 88, "X");
UICommandManager.mapKey("Y", 89, "Y");
UICommandManager.mapKey("Z", 90, "Z");
UICommandManager.mapKey("NUMPAD0", 96, "Numpad 0");
UICommandManager.mapKey("NUMPAD1", 97, "Numpad 1");
UICommandManager.mapKey("NUMPAD2", 98, "Numpad 2");
UICommandManager.mapKey("NUMPAD3", 99, "Numpad 3");
UICommandManager.mapKey("NUMPAD4", 100, "Numpad 4");
UICommandManager.mapKey("NUMPAD5", 101, "Numpad 5");
UICommandManager.mapKey("NUMPAD6", 102, "Numpad 6");
UICommandManager.mapKey("NUMPAD7", 103, "Numpad 7");
UICommandManager.mapKey("NUMPAD8", 104, "Numpad 8");
UICommandManager.mapKey("NUMPAD9", 105, "Numpad 9");
UICommandManager.mapKey("MULTIPLY", 106, "Numpad *");
UICommandManager.mapKey("ADD", 107, "Numpad +");
UICommandManager.mapKey("NUMPAD_SUBTRACT", 109, "Numpad -");
UICommandManager.mapKey("DECIMAL", 110, "Numpad .");
UICommandManager.mapKey("DIVIDE", 111, "Numpad /");
UICommandManager.mapKey("F1", 112, "F1");
UICommandManager.mapKey("F2", 113, "F2");
UICommandManager.mapKey("F3", 114, "F3");
UICommandManager.mapKey("F4", 115, "F4");
UICommandManager.mapKey("F5", 116, "F5");
UICommandManager.mapKey("F6", 117, "F6");
UICommandManager.mapKey("F7", 118, "F7");
UICommandManager.mapKey("F8", 119, "F8");
UICommandManager.mapKey("F9", 120, "F9");
UICommandManager.mapKey("F10", 121, "F10");
UICommandManager.mapKey("F11", 122, "F11");
UICommandManager.mapKey("F12", 123, "F12");
UICommandManager.mapKey("F13", 124, "F13");
UICommandManager.mapKey("F14", 125, "F14");
UICommandManager.mapKey("F15", 126, "F15");
UICommandManager.mapKey("F16", 127, "F16");
UICommandManager.mapKey("F17", 128, "F17");
UICommandManager.mapKey("F18", 129, "F18");
UICommandManager.mapKey("F19", 130, "F19");
UICommandManager.mapKey("F20", 131, "F20");
UICommandManager.mapKey("F21", 132, "F21");
UICommandManager.mapKey("F22", 133, "F22");
UICommandManager.mapKey("F23", 134, "F23");
UICommandManager.mapKey("F24", 135, "F24");
UICommandManager.mapKey("NUM_LOCK", 144, "Num Lock");
UICommandManager.mapKey("SCROLL_LOCK", 145, "Scroll Lock");
UICommandManager.mapKey("COMMA", 188, ",");
UICommandManager.mapKey("EQUALS", 187, "=");
UICommandManager.mapKey("SUBTRACT", 189, "-");
UICommandManager.mapKey("PERIOD", 190, ".");
UICommandManager.mapKey("SLASH", 191, "/");
UICommandManager.mapKey("BACK_QUOTE", 192, "BACK_QUOTE");
UICommandManager.mapKey("OPEN_BRACKET", 219, "[");
UICommandManager.mapKey("BACK_SLASH", 220, "\\");
UICommandManager.mapKey("CLOSE_BRACKET", 221, "]");
UICommandManager.mapKey("QUOTE", 222, "'");

window.addEventListener("load", function () {
    document.addEventListener("keydown", UICommandManager.handleKeyEvent, false);
}, false);
window.document.addEventListener("focus", function (event) {
    UICommandManager.currentFocusedElement = event.target;
}, true);


UICommandManager.register = function (command, control) {
    command._run = command.run;
    command.run = UICommandManager.checkAndRunFunction;

    command._isValid = command.isValid;
    command.isValid = UICommandManager.isValidFunction;

    UICommandManager.parseShortcut(command);
    UICommandManager.commands.push(command);
    UICommandManager.map[command.key] = command;

    if (command.watchEvents) {
        var f = function () {
            UICommandManager.invalidateCommand(command);
        };

        var eventNames = command.watchEvents.split(/[\, ]+/);
        for (var i = 0; i < eventNames.length; i ++) {
            document.body.addEventListener(eventNames[i], f, false);
        }
    }

    if (control) {
        UICommandManager.installControl(command.key, control);
    }

    return command;
};
UICommandManager.getCommand = function (commandKey) {
    if (!commandKey) return;
    return UICommandManager.map[commandKey];
};
UICommandManager.installControl = function (commandKey, control) {
    var command = UICommandManager.map[commandKey];
    if (!command) return;
    if (!command.controls) {
        command.controls = [];
    }

    command.controls.push(control);
    control.addEventListener("click", function (event) {
        var valid = command._isValid ? command._isValid() : !command.disabled;
        if (!valid) return;
        command._run();
    }, false);
};
UICommandManager.invalidateCommand = function (command) {
    if (!command.controls) return;
    var valid = command.isValid ? command.isValid() : (command.isAvailable ? command.isAvailable() : !command.disabled);
    for (var i = 0; i < command.controls.length; i ++) {
        command.controls[i].disabled = !valid;
        if (command.controls[i].setEnabled) command.controls[i].setEnabled(valid);
    }

};
UICommandManager.invalidateCommands = function () {
    for (var i = 0; i < UICommandManager.commands.length; i ++) {
        var command = UICommandManager.commands[i];
        UICommandManager.invalidateCommand(command);
    }
};
UICommandManager.parseShortcut = function (command) {
    const RE = /^(Ctrl\+)?(Alt\+)?(Shift\+)?(Cmd\+)?([a-z0-9_]+)$/i;
    command.parsedShortcut = null;

    if (!command.shortcut || !command.shortcut.match(RE)) return;

    var shortcut = {
        ctrl: RegExp.$1 ? true : false,
        alt: RegExp.$2 ? true : false,
        shift: RegExp.$3 ? true : false,
        command: RegExp.$4 ? true : false
    };
    var keyName = RegExp.$5.toUpperCase();
    var key = UICommandManager.keyMap[keyName];
    if (!key) return;

    shortcut.key = key;

    shortcut.displayName = "";
    if (shortcut.ctrl) shortcut.displayName += (IS_MAC ? (shortcut.command ? "^" : "⌘") : "Ctrl+");
    if (shortcut.alt) shortcut.displayName += (IS_MAC ? "⌥" : "Alt+");
    if (shortcut.shift) shortcut.displayName += (IS_MAC ? "⇪" : "Shift+");
    if (shortcut.command) shortcut.displayName += "⌘";

    shortcut.displayName += IS_MAC ? key.macName : key.pcName;

    command.parsedShortcut = shortcut;
};
UICommandManager.checkAndRunFunction = function (event) {
    if (UICommandManager.isApplicable(this, UICommandManager.currentFocusedElement)) {
        this._run(event);
    }
};
UICommandManager.isValidFunction = function (event) {
    return UICommandManager.isApplicable(this, UICommandManager.currentFocusedElement) && (!this._isValid || this._isValid());
};
UICommandManager.shouldBeHandled = function (event) {
    // Don't handle the key press when
    return !(
        // There is an open dialog
        Dialog.hasOpenDialog()
        // There is an open popup
        || Popup.hasShowPopup()
        // We are typing in a text input
        || (UICommandManager.currentFocusedElement instanceof HTMLInputElement && UICommandManager.currentFocusedElement.type == 'text')
        || UICommandManager.currentFocusedElement instanceof HTMLTextAreaElement
    );
};
UICommandManager.handleKeyEvent = function (event) {
    if ((IS_MAC ? event.metaKey : event.ctrlKey) && event.altKey && event.shiftKey && event.keyCode == 80) {
        Pencil.app.mainWindow.openDevTools();
    }

    if (!UICommandManager.shouldBeHandled(event)) return;

    for (var i = 0; i < UICommandManager.commands.length; i ++) {
        var command = UICommandManager.commands[i];
        if (!command.parsedShortcut) continue;
        if (command.disabled) continue;
        if (command.isValid && !command.isValid(event)) {
            continue;
        }

        if (command.isAvailable && !command.isAvailable()) continue;

        var eventCmdKey = command.parsedShortcut.command ? event.metaKey : false;
        var eventCtrlKey = !command.parsedShortcut.command && IS_MAC ? event.metaKey : event.ctrlKey;
        if (eventCmdKey == command.parsedShortcut.command
            && eventCtrlKey == command.parsedShortcut.ctrl
            && event.altKey == command.parsedShortcut.alt
            && event.shiftKey == command.parsedShortcut.shift
            && event.keyCode == command.parsedShortcut.key.keyCode) {

                command.run(event);
                event.preventDefault();
                return;
            }
    }
};
UICommandManager.isApplicable = function (command, node) {
    if (command.applyWhenType) {
        var widget = Dom.findUpwardForData(node, "__widget");
        if (!widget) return false;
        return widget.constructor.name == command.applyWhenType;
    }
    if (command.applyWhenAttributeName) {
        var n = Dom.findUpward(node, function (x) {
            return x.getAttribute(command.applyWhenAttributeName) == command.applyWhenAttributeValue;
        });
        return n ? true : false;
    }
    if (command.applyWhenClass) {
        var n = Dom.findParentWithClass(node, command.applyWhenClass);
        return n ? true : false;
    }

    return true;
};
