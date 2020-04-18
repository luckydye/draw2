import { html } from '/node_modules/lit-html/lit-html.js';
import { AnimateElement } from './AnimateElement.js';
import './Canvas.js';

class CanvasStrokeEvent extends Event {
    constructor() {
        super('canvas.stroke');
    }
}

class CanvasDrawEvent extends Event {
    constructor(x, y) {
        super('canvas.draw');

        this.x = x;
        this.y = y;
    }
}

class CanvasScaleEvent extends Event {
    constructor() {
        super('canvas.scale');
    }
}

class CanvasMoveEvent extends Event {
    constructor() {
        super('canvas.move');
    }
}

export class AnimateCanvas extends AnimateElement {

    get defaultWidth() {
        return 1280;
    }

    get defaultHeight() {
        return 1280;
    }

    static template(self) {
        return html`
            <style>
                :host {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: #fff;

                    --x: 0px;
                    --y: 0px;
                    --scale: 1;
                    --title: none;
                }
                draw-canvas,
                canvas {
                    background: white;
                    box-shadow: 1px 2px 8px rgba(0, 0, 0, 0.1);
                }
                canvas#overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    background: transparent;
                    pointer-events: none;
                    z-index: 100;
                }
                .canvas-wrapper {
                    transform: scale(var(--scale)) translate(var(--x), var(--y));
                }
                .canvas-wrapper:before {
                    content: var(--title);
                    font-size: 14px;
                    opacity: 0.5;
                    position: absolute;
                    bottom: calc(100% + 5px);
                    left: 0;
                }
            </style>
            <div class="canvas-wrapper">
                <draw-canvas width="${self.defaultWidth}" height="${self.defaultHeight}"></draw-canvas>
                <canvas id="overlay"></canvas>
            </div>
        `;
    }

    get initialized() {
        return this.canvas != null;
    }

    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.overlay.width = width;
        this.overlay.height = height;

        this.setAttribute('resolution', width + "x" + height);
        this.style.setProperty('--title', `'${width}x${height}'`);
    }

    onCreate() {
        this.x = 0;
        this.y = 0;
        this.scale = 1;

        this.brush = null;
        this.layer = null;

        this.maxscale = 2.125;
        this.minscale = 0.125;

        /* Poineter
            { x: 0, y: 0, pointerId: <n> }
        */
        this.pointers = new Map();
        this.interacting = false;
        this.currentLine = [];

        let lastdistance = 0;

        const pointerDown = e => {
            this.pointers.set(e.pointerId, e);

            if(!e.shiftKey) {
                this.currentLine = [];
            }

            if(this.pointers.size === 1 && (e.which === 1 || e.which == null)) {
                this.interacting = true;
            }
        }

        const pointerUp = e => {
            const pointerId = e.pointerId;

            this.pointers.delete(pointerId);

            if(this.pointers.size < 2 && this.changes) {
                this.dispatchEvent(new CanvasStrokeEvent());
            }

            this.changes = false;
            this.interacting = false;
            lastdistance = 0;
        }

        const pointerMove = e => {
            this.canvas.setBrush(this.brush);

            const canvasBounds = this.canvas.getBoundingClientRect();
            this.cursor = [
                (e.x - canvasBounds.left) / this.scale, 
                (e.y - canvasBounds.top) / this.scale
            ];

            const pointerCount = this.pointers.size;
            const pointerId = e.pointerId;
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            const x = e.x;
            const y = e.y;

            if(this.pointers.has(pointerId)) {
                this.pointers.set(pointerId, e);
            }

            if(pointerCount === 1 && !this.interacting) {
                this.moveCanvas(deltaX, deltaY);
            }

            if(pointerCount === 1 && this.interacting) {
                // draw move
            }

            if(pointerCount === 2) {
                this.moveCanvas(deltaX, deltaY);

                const points = [...this.pointers].map(([key, e]) => [x, y]);
                const dist = distance(points[0], points[1]);
                const scale = (dist - lastdistance) / 100;

                if(lastdistance) {
                    this.scaleCanvas(scale);
                }

                lastdistance = dist;
            }
        }

        const wheelMove = e => {
            const dir = -Math.sign(e.deltaY);
            this.scaleCanvas(dir / 20);
            this.canvas.setBrush(this.brush);
            e.preventDefault();
        }

        this.addEventListener('pointerdown', pointerDown);
        this.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        window.addEventListener('pointercancel', pointerUp);

        this.addEventListener('wheel', wheelMove);
        
        this.scaleCanvas(0);
        this.moveCanvas(0, 0);

        this.initCanvas();
    }

    initCanvas() {
        this.canvas = this.shadowRoot.querySelector('draw-canvas');

        this.overlay = this.shadowRoot.querySelector('canvas#overlay');
        this.overlayContext = this.overlay.getContext("2d", {
			desynchronized: true,
        });

        this.setSize(this.defaultWidth, this.defaultHeight);
    }

    moveCanvas(x, y) {
        const width = this.canvas ? this.canvas.width : this.defaultWidth;
        const height = this.canvas ? this.canvas.height : this.defaultHeight;

        x /= this.scale;
        y /= this.scale;

        if(this.x + x > width || this.x + x < -width) {
            return;
        }
        this.x += x;
        this.style.setProperty('--x', this.x + 'px');

        if(this.y + y > height || this.y + y < -height) {
            return;
        }
        this.y += y;
        this.style.setProperty('--y', this.y + 'px');
        
        this.dispatchEvent(new CanvasMoveEvent());
    }

    scaleCanvas(dist) {
        if(dist > 0 && this.scale >= this.maxscale) {
            return;
        }
        if(dist < 0 && this.scale <= this.minscale) {
            return;
        }
        this.scale += dist;
        this.style.setProperty('--scale', this.scale);

        this.dispatchEvent(new CanvasScaleEvent());
    }

    drawStroke(stroke, brush) {
        const arr = [];
        for(let point of stroke) {
            this.canvas.paint(
                point[0], 
                point[1], 
                brush.size, 
                brush.color.map(v => v / 255),
                brush.opacity,
                0.33,
                1,
                arr);
        }
        this.canvas.endStroke(true);
    }

    setBrush(brush) {
        this.brush = brush;
        this.canvas.setBrush(brush);
    }

    lock() {
        this.setAttribute('locked', '');
        this.locked = true;
    }

    unlock() {
        this.removeAttribute('locked', '');
        this.locked = false;
    }

}
