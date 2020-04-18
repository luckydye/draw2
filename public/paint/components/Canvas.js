function bezier3(t, P1, P2, P3) {
    return [
        Math.pow(1 - t, 2) * P1[0] + 2 * (1 - t) * t * P2[0] + Math.pow(t, 2) * P3[0],
        Math.pow(1 - t, 2) * P1[1] + 2 * (1 - t) * t * P2[1] + Math.pow(t, 2) * P3[1],
    ];
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function cap(min, max, value) {
    return Math.max(min, Math.min(value, max));
}

class PenCanvas extends HTMLElement {

    static get defaultStyles() {
        return `
            :host {
                display: block;
            }
            
            canvas {
                display: block;
            }
        `;
    }

    static get observedAttributes() { 
        return ['width', 'height'];
    }

    get width() {
        return +this.getAttribute('width');
    }

    get height() {
        return +this.getAttribute('height');
    }

    set width(val) {
        return this.setAttribute('width', val);
    }

    set height(val) {
        return this.setAttribute('height', val);
    }

    getCanvas() {
        return this.canvas;
    }

    toDataURL() {
        return this.canvas.toDataURL();
    }

    constructor() {
        super();

        this.styles = document.createElement('style');
        this.styles.innerHTML = this.constructor.defaultStyles;

        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext("2d");

        this.currentStroke = [];

        this.brush = {
            size: 20,
            color: [0, 0, 0],
            opacity: 0.5,
        };

        this.brushCanvas = new OffscreenCanvas(50, 50);
        this.brushContext = this.brushCanvas.getContext("2d", { 
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: true
        });
        
        this.mouseControls();
    }

    setBrush(brush) {
        this.brush = brush;
        this.renderCurosr(this.brush.size);
    }

    renderCurosr(size) {
        size *= window.devicePixelRatio;

        const padding = 2;

        function genCursorImage(size) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext("2d");

            canvas.width = (size * 2) + padding;
            canvas.height = (size * 2) + padding;

            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(33, 33, 33, 0.51)";

            ctx.arc(canvas.width / 2, canvas.height / 2, size, 0, Math.PI * 2);

            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.51)";
            ctx.arc(canvas.width / 2, canvas.height / 2, size + 0.5, 0, Math.PI * 2);
            ctx.stroke();

            return canvas.toDataURL();
        }

        const bounds = this.getBoundingClientRect();

        const xScale = bounds.width / this.width;

        size *= xScale;

        const url = genCursorImage(size);
        this.style.cursor = `url(${url}) ${size + padding} ${size + padding}, auto`;
    }
    
    mouseControls() {
        this.draging = false;
        
        this.addEventListener('contextmenu', e => e.preventDefault());

        const draw = (e) => {
            const bounds = this.getBoundingClientRect();

            const xScale = bounds.width / this.width;
            const yScale = bounds.height / this.height;

            this.paint(
                (e.x - bounds.x) / xScale, 
                (e.y - bounds.y) / yScale, 
                this.brush.size, 
                this.brush.color.map(v => v / 255),
                this.brush.opacity);
        }
        
        this.addEventListener('pointerdown', e => {
            if(e.which === 1) {
                this.draging = true;
                draw(e);
            }
        })

        this.addEventListener('pointermove', e => {
            if(this.draging) {
                draw(e);
            }
        })

        this.addEventListener('pointerup', () => {
            this.endStroke();
            this.draging = false;
        })

        this.addEventListener('pointerleave', () => {
            this.endStroke();
        })

        this.addEventListener('pointercancel', () => {
            this.endStroke();
            this.draging = false;
        })

        window.addEventListener('pointerleave', () => {
            this.endStroke();
            this.draging = false;
        })

        window.addEventListener('pointercancel', () => {
            this.endStroke();
            this.draging = false;
        })

        window.addEventListener('pointerout', () => {
            this.endStroke();
            this.draging = false;
        })
        
        this.renderCurosr(this.brush.size);
    }

    attributeChangedCallback() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(this.styles);
        this.shadowRoot.appendChild(this.canvas);
    }

    endStroke(prevent) {
        if(!prevent) {
            this.dispatchEvent(new Event('canvas.stroke'));
        }
        this.currentStroke = [];
    }

    updateBrush() {

    }

    paint(posX, posY, r, color = [0, 0, 0], opacity = 1, hardness = 0.33, flow = 1, strokeArr) {

        let stroke = this.currentStroke;

        if(strokeArr) {
            stroke = strokeArr;
        }

        const drawBrush = () => {

            this.brushContext.clearRect(0, 0, this.brushCanvas.width, this.brushCanvas.height);

            let radius = r;

            for(let x = -radius; x < radius; x++) {
                for(let y = -radius; y < radius; y++) {
                    const distance = dist(0, 0, x, y);

                    if(distance < radius) {
                        this.brushContext.globalAlpha = 1 - Math.pow(distance / radius, radius * hardness);
                        this.brushContext.globalAlpha -= Math.max(Math.random() + 0.85, 1) * (1 - flow);

                        this.brushContext.fillStyle = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${opacity})`;
                        
                        this.brushContext.fillRect(x + radius, y + radius, 1, 1);
                    }
                }
            }
        }

        // interpolate stroke
        const prev = stroke[0];
        let curr = [posX, posY, posX, posY];

        if(prev) {
            const lerp = [
                prev[0] + ((prev[0] - prev[2]) / 2),
                prev[1] + ((prev[1] - prev[3]) / 2),
            ];

            curr = [posX, posY, lerp[0], lerp[1]];
    
            let stepDist = Math.sqrt(Math.pow(prev[2] - curr[0], 2) + Math.pow(prev[3] - curr[1], 2));
            stepDist = stepDist / r;

            drawBrush();
    
            for(let i = 0; i < stepDist; i++) {
                const step = bezier3(i / stepDist, prev, lerp, curr);
                // draw brush pixels
                this.context.drawImage(this.brushCanvas, step[0] - r, step[1] - r);
            }
        }

        stroke.unshift(curr);
    }

}

customElements.define('draw-canvas', PenCanvas);

class Layer {
    
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1280;
        this.canvas.height = 720;
    }

    getCanvas() {
        return this.canvas;
    }

}
