let layerCount = 0;

export class Layer {

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }

    constructor() {
        layerCount++;

        this.id = layerCount;
        this.hidden = false;

        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");

        this.setSize(200, 200);
    }

    setSize(width, height) {
        const temp = this.createBuffer();
        this.canvas.width = width;
        this.canvas.height = height;
        if(this.canvas.width + this.canvas.height > 0) {
            this.context.drawImage(temp, 0, 0);
        }
    }

    createBuffer() {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        if(canvas.width + canvas.height > 0) {
            context.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
        }
        return canvas;
    }

    restoreBuffer(buffer) {
        this.canvas.width = buffer.width;
        this.canvas.height = buffer.height;
        this.context.drawImage(buffer, 0, 0, buffer.width, buffer.height);
    }
}
