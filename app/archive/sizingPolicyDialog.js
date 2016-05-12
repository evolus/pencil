var xPolicy;
var yPolicy;
var wPolicy;
var hPolicy;
var widthStartEndItem;
var heightStartEndItem
var valueHolder;

function handleOnload() {
    try {
        handleOnloadImpl();
    } catch (e) {
        Console.dumpError(e, "stdout");
    }
}
function validateXPolicySelection() {
	if (getPolicyValue("w") == "start-end") {
		setPolicyValue("x", "start");
		disableGroup("x", true);
	} else {
		disableGroup("x", false);
	}
}
function validateYPolicySelection() {
	if (getPolicyValue("h") == "start-end") {
		setPolicyValue("y", "start");
		disableGroup("y", true);
	} else {
		disableGroup("y", false);
	}
}
function getPolicyValue(name) {
	var buttons = document.getElementById("group-" + name).getElementsByTagName("button");
	for (var i = 0; i < buttons.length; i ++) {
		if (buttons[i].checked) {
			var id = buttons[i].id;
			id.match(/^[^\-]+\-(.+)$/);
			return RegExp.$1;
		}
	}
}
function setPolicyValue(name, value) {
	var buttons = document.getElementById("group-" + name).getElementsByTagName("button");
	debug("setting " + [name, value]);
	for (var i = 0; i < buttons.length; i ++) {
		var id = buttons[i].id;
		id.match(/^[^\-]+\-(.+)$/);
		var buttonValue = RegExp.$1;
		buttons[i].checked = (buttonValue == value);
	}
}
function disableGroup(name, disabled) {
	var buttons = document.getElementById("group-" + name).getElementsByTagName("button");
	for (var i = 0; i < buttons.length; i ++) {
		buttons[i].disabled = disabled;
	}
}

function handleOnloadImpl() {
    valueHolder = window.arguments[0];
    
    setPolicyValue("w", valueHolder.input.wPolicy);
    setPolicyValue("h", valueHolder.input.hPolicy);
    setPolicyValue("x", valueHolder.input.xPolicy);
    setPolicyValue("y", valueHolder.input.yPolicy);
    
    validateXPolicySelection();
    validateYPolicySelection();
}
function handleDialogAccept() {
	valueHolder.output = {
		xPolicy: getPolicyValue("x"),
		yPolicy: getPolicyValue("y"),
		wPolicy: getPolicyValue("w"),
		hPolicy: getPolicyValue("h")
	};
	
    return true;
}
window.addEventListener("load", handleOnload, false);

