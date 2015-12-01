function FlavourSet(flavours) {
    this.flavours = flavours || [];
}

FlavourSet.prototype.appendFlavour = function (f) {
    this.flavours.push(f);
};

var nsDragAndDrop = {
    dragOver: function (event, observer) {
    },
    
    dragEnter: function (event, observer) {
        if (!event.dataTransfer) return false;
        var flavours = observer.getSupportedFlavours().flavours;
        for (var i = 0; i < flavours.length; i ++) {
            var f = flavours[i];
            var data = event.dataTransfer.getData(f);
            if (data) {
                if (observer.onDragEnter) observer.onDragEnter(event);
                event.stopPropagation();
                return true;
            }
        }
        
        return false;
    },
    
    dragExit: function (event, observer) {
        if (observer.onDragExit) observer.onDragExit(event);
    },

    dragOver: function (event, observer) {
        if (observer.onDragOver) observer.onDragOver(event);
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    },
    
    drop: function (event, observer) {
        if (!observer.onDrop) return;
        
        var flavours = observer.getSupportedFlavours().flavours;
        for (var i = 0; i < flavours.length; i ++) {
            var f = flavours[i];
            var data = event.dataTransfer.getData(f);
            if (data) {
                observer.onDrop(event, { data: data });
                event.stopPropagation();
                return;
            }
        }
    }
};
