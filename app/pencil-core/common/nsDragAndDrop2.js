function FlavourSet(flavours) {
    this.flavours = flavours || [];
}

FlavourSet.prototype.appendFlavour = function (f) {
    this.flavours.push(f);
};

var nsDragAndDrop = {
    setData(key, value) {
        this.dragData[key] = value;
    },

    getData(key) {
        return this.dragData ? this.dragData[key] : null;
    },

    dragStart: function(event) {
        this.dragData = {};
    },

    dragOver: function (event, observer) {
    },

    dragEnter: function (event, observer) {
        if (!event.dataTransfer) return false;

        //gives the observer the ability to actively tell that it accepts the drag, bybass type-based checking below
        if (observer.acceptsDataTransfer && observer.acceptsDataTransfer(event.dataTransfer)) return true;
        if (!observer.getSupportedFlavours) return false;

        var flavours = observer.getSupportedFlavours().flavours;
        for (var i = 0; i < flavours.length; i ++) {
            var f = flavours[i];
            var types = event.dataTransfer.types;
            if (types && types.includes(f)) {
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

        if (observer.getSupportedFlavours) {
            var flavours = observer.getSupportedFlavours().flavours;
            for (var i = 0; i < flavours.length; i ++) {
                var f = flavours[i];
                var data = event.dataTransfer.getData(f);
                var data = nsDragAndDrop.getData(f);
                if (data) {
                    observer.onDrop(event, { data: data });
                    event.stopPropagation();
                    return;
                }
            }
        } else {
            observer.onDrop(event, event.dataTransfer);
        }
    }
};
