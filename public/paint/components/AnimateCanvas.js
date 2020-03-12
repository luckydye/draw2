import { html } from '/node_modules/lit-html/lit-html.js';
import { AnimateElement } from './AnimateElement.js';
import { Layer } from '../Layer.js';

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function clamp(min, max, value) {
    return Math.min(Math.max(min, value), max);
}

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

    static template() {
        return html`
            <style>
                :host {
                    display: flex;
                    justify-content: center;
                    align-items: center;

                    --x: 0px;
                    --y: 0px;
                    --scale: 1;
                    --title: none;
                }
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
                    color: #333;
                    font-size: 14px;
                    opacity: 0.5;
                    position: absolute;
                    bottom: calc(100% + 5px);
                    left: 0;
                }
            </style>
            <div class="canvas-wrapper">
                <canvas id="canvas"></canvas>
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

        const drawPointer = (px, py) => {
            if(this.initialized && !this.locked) {
                const box = this.canvas.getBoundingClientRect();
                const x = (px - box.x) / this.scale;
                const y = (py - box.y) / this.scale;
                this.draw(x, y);
                this.lastchange = Date.now();
                this.changes = true;
                
                this.dispatchEvent(new CanvasDrawEvent(x, y));
            }
        }

        const pointerDown = e => {
            this.pointers.set(e.pointerId, e);

            if(!e.shiftKey) {
                this.currentLine = [];
            }

            if(this.pointers.size === 1 && (e.which === 1 || e.which == null)) {
                this.interacting = true;
                drawPointer(e.x, e.y);
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
                drawPointer(x, y);
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
        }

        if(!window.PointerEvent) {
            // polyfill PointerEvents

            const touchUp = e => {
                if(e.touches.length == 0) {
                    for(let pointer of this.pointers) {
                        pointerUp(pointer[1]);
                    }
                }
                for(let touch of e.touches) {
                    pointerUp({ x: touch.clientX, y: touch.clientY, pointerId: touch.identifier });
                }
            }

            window.addEventListener('touchend', touchUp);
            window.addEventListener('touchcancel', touchUp);
            this.addEventListener('touchstart', e => {
                for(let touch of e.touches) {
                    pointerDown({ x: touch.clientX, y: touch.clientY, pointerId: touch.identifier });
                }
            });
            this.addEventListener('touchmove', e => {
                for(let touch of e.touches) {
                    pointerMove({ x: touch.clientX, y: touch.clientY, pointerId: touch.identifier });
                }
            });
            
        } else {
            this.addEventListener('pointerdown', pointerDown);
            this.addEventListener('pointermove', pointerMove);
            window.addEventListener('pointerup', pointerUp);
            window.addEventListener('pointercancel', pointerUp);
        }

        this.addEventListener('wheel', wheelMove);
        
        this.scaleCanvas(0);
        this.moveCanvas(0, 0);

        this.initCanvas();
    }

    initCanvas() {
        this.canvas = this.shadowRoot.querySelector('canvas#canvas');
        this.context = this.canvas.getContext("2d", { 
			desynchronized: true,
		});
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

    draw(x, y, pressure = 1) {
        if(!this.layer || this.layer.hidden || this.locked) return;

        const context = this.layer.context;
        const brush = this.brush;

        if(!brush) return;

        context.save();

        this.currentLine.unshift([x, y]);

        const p1 = this.currentLine[0];
        const p2 = this.currentLine[1];

        this.layer.setSize(
            clamp(this.layer.width, this.canvas.width, p1[0] + brush.size + 10),
            clamp(this.layer.height, this.canvas.height, p1[1] + brush.size + 10),
        );

        const color = `rgba(
            ${brush.color[0]}, 
            ${brush.color[1]}, 
            ${brush.color[2]}, 
            ${brush.opacity}
        )`;

        if(this.currentLine.length > 1) {

            const dist = distance(p1, p2);

            const maxPoints = dist / brush.spacing;
            let points = maxPoints;

            while (points > 0) {

                let sx = lerp(p2[0], p1[0], points / maxPoints);
                let sy = lerp(p2[1], p1[1], points / maxPoints);

                context.beginPath();
                context.fillStyle = color;
                context.globalCompositeOperation = brush.compositeOperation;
                context.arc(sx, sy, brush.size * pressure, 0, Math.PI * 2);
                context.fill();

                points--;
            }

        } else {
            context.beginPath();
            context.fillStyle = color;
            context.globalCompositeOperation = brush.compositeOperation;
            context.arc(x, y, brush.size * pressure, 0, Math.PI * 2);
            context.fill();
        }

        context.restore();

        this.clear();
        this.drawLayer(this.layer);
    }

    drawLayer(layer) {
        if(layer instanceof Layer && !layer.hidden) {
            if(layer.canvas.width + layer.canvas.height > 0) {
                this.context.drawImage(layer.canvas, 0, 0);
            }
        }
    }

    clear() {
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setActiveLayer(layer) {
        this.layer = layer;
        this.lastchange = Date.now();
    }

    setBrush(brush) {
        this.brush = brush;
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
