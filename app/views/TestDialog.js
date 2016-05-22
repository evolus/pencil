function TestDialog() {
    Dialog.call(this);
    this.title = function () {
        return "Evolus Pencil";
    };

}
__extend(Dialog, TestDialog);

TestDialog.prototype.getDialogActions = function () {
    return [
        //Dialog.ACTION_CANCEL,
        // { type: "extra1", title: "Options...", run: function () {
        //     new TestDialog().open();
        //     return false;
        // }},
        
        { type: "accept", title: "Ok", run: function () {
            alert("close");
            return true;
        }}
    ]
};
