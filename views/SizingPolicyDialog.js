function SizingPolicyDialog() {
    Dialog.call(this);
    this.title = "Sizing policy...";
}
__extend(Dialog, SizingPolicyDialog);

SizingPolicyDialog.prototype.setup = function (options) {

};

SizingPolicyDialog.prototype.getDialogActions = function () {
    return [
        Dialog.ACTION_CANCEL,
        { type: "accept", title: "Apply", run: function () {
            alert("accepted");
            return true;
        }}
    ]
};
