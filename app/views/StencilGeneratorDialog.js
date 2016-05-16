function StencilGeneratorDialog() {
    WizardDialog.call(this);
    this.title="Stencil Generator";
    this.collectionDefinition = this.wizardPanes[0];
    this.stencilDefinition = this.wizardPanes[1];

    this.bind("drop", function (event) {
        event.stopPropagation();
        event.preventDefault();
        console.log("event.dataTransfer:", event.dataTransfer);
        console.log("event.dataTransfer:", event.dataTransfer.files);
    }, this.collectionImage);
}

__extend(WizardDialog, StencilGeneratorDialog);

StencilGeneratorDialog.prototype.onSelectionChanged = function () {
    if(this.activePane == this.collectionDefinition) {
        this.stepTitle.innerHTML = "Wellcome to the Stencil Generator";
        this.stepInfo.innerHTML = "Enter collection information and click Next to continue";
    } else {
        this.stepTitle.innerHTML = "Completing the Stencil Generator";
        this.stepInfo.innerHTML = "Stencil information";
    }
};

StencilGeneratorDialog.prototype.invalidateSelection = function () {
    if(this.activePane == this.collectionDefinition) {
        // if(this.collectionName.value == ""){
        //     return false;
        // }
    }
    return true;
};
