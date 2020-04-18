import { AnimateElement } from './components/AnimateElement.js';
import { AnimateCanvas } from './components/AnimateCanvas.js';
import { AnimateToolbar } from './components/AnimateToolbar.js';
import { AnimateColorPicker } from './components/AnimateColorPicker.js';
import { AnimateBrushSettings } from './components/AnimateBrushSettings.js';
import { Brush } from './tools/Brush.js';
import { Eraser } from './tools/Eraser.js';
import { html } from '/node_modules/lit-html/lit-html.js';
import Socket from './Socket.js';

customElements.define('an-canvas', AnimateCanvas);
customElements.define('an-toolbar', AnimateToolbar);
customElements.define('an-colorpicker', AnimateColorPicker);
customElements.define('an-brushsettings', AnimateBrushSettings);

export class Animate extends AnimateElement {

    static template() {
        return html`
            <style>
                .interface {
                    display: grid;
                    grid-template-columns: auto auto 1fr auto;
                    align-content: flex-start;
                    align-items: flex-start;
                    justify-content: flex-start;
                    grid-gap: 20px;
                    z-index: 100;
                    padding: 20px;
                    box-sizing: border-box;
                    pointer-events: none;
                    width: 100%;
                }

                an-brushsettings,
                an-toolbar,
                an-colorpicker {
                    z-index: 100;
                    user-select: none;
                    pointer-events: all;
                }

                an-brushsettings,
                an-toolbar {
                    border-radius: 4px;
                    background: var(--interface-background);
                    backdrop-filter: blur(5px);
                    box-shadow: 0px 1px 5px rgba(50, 50, 50, 0.033);
                }

                an-canvas {
                    z-index: 0;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: var(--canvas-background);
                    box-sizing: border-box;
                }
            </style>
            <div class="interface">
                <an-toolbar></an-toolbar>
                <an-brushsettings></an-brushsettings>
                <div class="canvas-title"></div>
                <an-colorpicker></an-colorpicker>
            </div>
            <an-canvas id="viewport"></an-canvas>
        `;
    }

    constructor() {
        super();

        this.historyCursor = 0;
        this.history = [];

        this.tools = [
            new Brush(),
            new Eraser(),
        ];

        this.layers = [];

        this.activeLayer = null;
        this.activeTool = null;

        this.canvas = this.shadowRoot.querySelector('an-canvas');
        this.toolbar = this.shadowRoot.querySelector('an-toolbar');
        this.colorpicker = this.shadowRoot.querySelector('an-colorpicker');
        this.brushsettings = this.shadowRoot.querySelector('an-brushsettings');

        this.setup();
    }

    setup() {
        this.addTools(this.tools);

        this.canvas.addEventListener('canvas.draw', e => {
            e.preventDefault();
        });

        this.brushsettings.addEventListener('tool.change', e => {
            for(let key in e.change) {
                this.activeTool[key] = e.change[key];
            }
        });

        this.colorpicker.addEventListener('colorpicker.pick', ({ color }) => {
            if(this.activeTool instanceof Brush) this.activeTool.color = color;
        });

        this.toolbar.addEventListener('tool.select', e => this.selectTool(e.tool));

        this.selectTool(this.tools[0]);

        this.setupSocket();
    }

    setupSocket() {
        this.socket = new Socket();
        
        this.canvas.canvas.addEventListener('canvas.stroke', e => {
            this.socket.emit('stroke', this.canvas.canvas.currentStroke);
        });

        this.socket.client.on('stroke', ({ stroke, tool }) => {
            this.canvas.drawStroke(stroke, tool);
        })

        this.socket.onInitalJoin = msg => {
            const canvas = msg.canvas;
            if(canvas) {
                for(let action of canvas) {
                    this.canvas.drawStroke(action.stroke, action.tool);
                }
            }
        }
        
        this.socket.connect().then(() => {
            this.socket.join(location.pathname);

            setInterval(() => {
                this.drawUserCursors(this.socket.roomState.users);

                this.socket.sendUpdate({
                    cursor: this.canvas.cursor,
                    tool: this.activeTool,
                });

            }, 1000 / 30);
        });
    }

    drawUserCursors(users) {
        const overlay = this.canvas.overlayContext;

        overlay.clearRect(0, 0, overlay.canvas.width, overlay.canvas.height);
        overlay.lineWidth = 3;

        for(let usr of (users || [])) {
            if(usr.uid !== this.socket.id) {
                if(usr.cursor) {
                    overlay.strokeStyle = `rgb(${usr.tool.color[0]}, ${usr.tool.color[1]}, ${usr.tool.color[2]})`;
                    overlay.beginPath();
                    overlay.arc(usr.cursor[0], usr.cursor[1], usr.tool.size, 0, 2 * Math.PI);
                    overlay.stroke();
                }
            }
        }
    }

    selectTool(tool) {
        this.activeTool = tool;

        this.toolbar.onSelectTool(this.activeTool);
        this.brushsettings.onSelectTool(this.activeTool);

        if(tool instanceof Brush) {
            this.canvas.setBrush(this.activeTool);
            this.colorpicker.setRGB(this.activeTool.color);
        } else {
            this.canvas.setBrush(null);
        }
    }

    addTools(tools) {
        for(let tool of tools) {
            this.toolbar.addTool(tool);
        }
    }

    setResolution(width, height) {
        this.canvas.setSize(width, height);
    }

    saveToFile() {
        const link = document.createElement('a');
        link.href = this.canvas.canvas.toDataURL('image/png');
        link.download = "image.png";
        link.click();
    }

}
