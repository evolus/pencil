function TestDialog() {
    Dialog.call(this);
    this.title = function () {
        return "Test Dialog " + Math.random();
    };

}
__extend(Dialog, TestDialog);

TestDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        { type: "extra1", title: "Options...", run: function () {
            new TestDialog().open();
            return false;
        }},
        { type: "accept", title: "Create", run: function () {
            alert("accepted");
            return true;
        }}
    ]
};
