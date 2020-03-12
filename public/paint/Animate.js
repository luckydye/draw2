import { AnimateElement } from './components/AnimateElement.js';
import { AnimateCanvas } from './components/AnimateCanvas.js';
import { AnimateToolbar } from './components/AnimateToolbar.js';
import { AnimateLayerlist } from './components/AnimateLayerlist.js';
import { AnimateColorPicker } from './components/AnimateColorPicker.js';
import { AnimateBrushSettings } from './components/AnimateBrushSettings.js';
import { Layer } from './Layer.js';
import { Back } from './tools/Back.js';
import { Save } from './tools/Save.js';
import { Brush } from './tools/Brush.js';
import { Eraser } from './tools/Eraser.js';
import { Create } from './tools/Create.js';
import { Forward } from './tools/Forward.js';
import { html } from '/node_modules/lit-html/lit-html.js';
import Socket from './Socket.js';

customElements.define('an-canvas', AnimateCanvas);
customElements.define('an-toolbar', AnimateToolbar);
customElements.define('an-layerlist', AnimateLayerlist);
customElements.define('an-colorpicker', AnimateColorPicker);
customElements.define('an-brushsettings', AnimateBrushSettings);

function genCursorImage(size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");

    canvas.width = (size * 2) + 4;
    canvas.height = (size * 2) + 4;

    ctx.lineWidth = 0.5;

    ctx.strokeStyle = "rgba(51, 51, 51, 0.51)";
    ctx.arc(canvas.width / 2, canvas.height / 2, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#eee";
    ctx.arc(canvas.width / 2, canvas.height / 2, size + 0.5, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL();
}

class State {
    constructor(data) {
        this.data = data;
    }
    restore() {
        if(this.data.buffer) {
            this.data.layer.restoreBuffer(this.data.buffer);
        }
    }
}

export class Animate extends AnimateElement {

    static template() {
        return html`
            <style>
                .interface {
                    display: grid;
                    grid-auto-flow: row;
                    grid-template-rows: auto;
                    align-content: flex-start;
                    align-items: flex-start;
                    justify-content: flex-start;
                    grid-gap: 15px;
                    position: fixed;
                    top: 0;
                    right: 0;
                    z-index: 100;
                    padding: 20px;
                    box-sizing: border-box;
                    pointer-events: none;
                }

                an-brushsettings,
                an-toolbar,
                an-layerlist,
                an-colorpicker {
                    z-index: 100;
                    overflow: hidden;
                    border-radius: 4px;
                    background: var(--interface-background);
                    backdrop-filter: blur(5px);
                    user-select: none;
                    box-shadow: 0px 1px 5px rgba(50, 50, 50, 0.033);
                    pointer-events: all;
                }

                an-canvas {
                    z-index: 0;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: var(--canvas-background);
                    padding: 0 100px 0 0;
                    box-sizing: border-box;
                }

                an-toolbar {
                    position: fixed;
                    left: 20px;
                    top: 20px;
                }
            </style>
            <div class="interface">
                <an-toolbar></an-toolbar>
                <an-colorpicker></an-colorpicker>
                <an-brushsettings></an-brushsettings>
                <an-layerlist></an-layerlist>
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
            new Create(this),
            new Back(this),
            new Forward(this),
            new Save(this),
        ];

        this.layers = [];

        this.activeLayer = null;
        this.activeTool = null;

        this.canvas = this.shadowRoot.querySelector('an-canvas');
        this.toolbar = this.shadowRoot.querySelector('an-toolbar');
        this.layerlist = this.shadowRoot.querySelector('an-layerlist');
        this.colorpicker = this.shadowRoot.querySelector('an-colorpicker');
        this.brushsettings = this.shadowRoot.querySelector('an-brushsettings');

        this.setup();
    }

    setup() {

        this.createLayer();

        this.addTools(this.tools);

        this.canvas.addEventListener('canvas.draw', e => {
            e.preventDefault();
            this.drawAllLayers();
        });

        this.brushsettings.addEventListener('tool.change', e => {
            for(let key in e.change) {
                this.activeTool[key] = e.change[key];
            }
        });

        this.colorpicker.addEventListener('colorpicker.pick', ({ color }) => {
            if(this.activeTool instanceof Brush) this.activeTool.color = color;
        });

        this.layerlist.addEventListener('layer.select', e => this.selectLayer(e.layer));
        this.layerlist.addEventListener('layer.change', e => this.selectLayer(e.layer));
        this.layerlist.addEventListener('layer.add', e => this.createLayer());
        this.layerlist.addEventListener('layer.move', e => this.moveLayer(e.moved.from, e.moved.to));
        this.layerlist.addEventListener('layer.delete', e => this.deleteLayer(e.layer));

        this.canvas.addEventListener('canvas.stroke', e => this.pushState());
        this.toolbar.addEventListener('tool.select', e => this.selectTool(e.tool));

        window.addEventListener('keydown', e => {
            if(e.key.match("z") && e.ctrlKey) {
                this.back();
            }
            if(e.key.match("y") && e.ctrlKey) {
                this.forward();
            }
            if(e.key.match("s") && e.ctrlKey) {
                this.saveToFile();
                e.preventDefault();
            }
        });

        this.selectTool(this.tools[0]);
        this.selectLayer(this.layers[0]);

        this.clearHistory();

        const makeCursor = () => {
            const anCanvas = this.shadowRoot.querySelector('an-canvas');
            const brush = anCanvas.brush;
            const size = Math.max(brush.size * anCanvas.scale, 1.5);
            const url = genCursorImage(size);
        
            anCanvas.style.cursor = `url(${url}) ${size + 2} ${size + 2}, auto`;
        }

        this.canvas.addEventListener('canvas.scale', () => makeCursor());
        this.brushsettings.addEventListener('tool.change', () => makeCursor());
        this.toolbar.addEventListener('tool.select', () => makeCursor());
        
        makeCursor();
        
        this.canvas.addEventListener('canvas.draw', e => {
            this.stroke.push([e.x, e.y]);
        });

        this.socket = new Socket();

        this.stroke = [];

        this.socket.onInitalJoin = msg => {
            const layer = this.createLayer();
            const img = new Image();
            img.onload = () => {
                layer.setSize(img.width, img.height);
                layer.context.drawImage(img, 0, 0);
                this.drawAllLayers();
            }
            img.src = msg.canvas;
        }
        
        this.socket.connect().then(() => {
            this.socket.join(location.pathname);

            setInterval(() => {
                this.drawUserCursors(this.socket.roomState.users);

                this.socket.sendUpdate({
                    cursor: this.canvas.cursor,
                    tool: this.activeTool,
                    stroke: this.stroke,
                    drawing: this.canvas.interacting
                });

                if(this.socket.isHost()) {
                    const canv = this.canvas.canvas.toDataURL();
                    this.socket.sendCanvas(canv);
                }

                this.stroke = [];
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
                    overlay.arc(usr.cursor[0], usr.cursor[1], 8, 0, 2 * Math.PI);
                    overlay.stroke();
                }
    
                if(usr.stroke.length > 0) {
                    this.canvas.currentLine = []
                    this.canvas.brush = usr.tool;
                    for(let pos of usr.stroke) {
                        this.canvas.draw(pos[0], pos[1]);
                    }
                    this.canvas.brush = this.activeTool;
                }
            }
        }
    }

    pushState() {
        if(this.historyCursor > 0) {
            this.history.splice(0, this.historyCursor);
            this.historyCursor = 0;
        }

        const state = new State({
            layer: this.activeLayer,
            buffer: this.activeLayer.createBuffer()
        });

        this.history.unshift(state);

        if(this.history.length > 20) {
            this.history.pop();
        }
    }

    clearHistory() {
        this.history = [];
        this.pushState();
    }

    selectTool(tool) {
        this.activeTool = tool;

        this.toolbar.onSelectTool(this.activeTool);
        this.brushsettings.onSelectTool(this.activeTool);

        if(tool instanceof Brush) {
            this.canvas.brush = this.activeTool;
            this.colorpicker.setRGB(this.activeTool.color);
        } else {
            this.canvas.brush = null;
        }
    }

    selectLayer(layer) {
        this.activeLayer = layer;

        this.canvas.setActiveLayer(this.activeLayer);
        this.layerlist.onLayerSelect(this.activeLayer);

        this.drawAllLayers();
    }

    addTools(tools) {
        for(let tool of tools) {
            this.toolbar.addTool(tool);
        }
    }

    moveLayer(from, to) {
        const temp = this.layers.splice(from, 1);
        const part = this.layers.splice(to);

        this.layers.push(...temp, ...part);

        this.layerlist.setLayers(this.layers);
        
        this.selectLayer(this.layers[to]);
    }

    deleteLayer(layer) {
        if(this.layers.length < 2) return;

        const index = this.layers.indexOf(layer);
        this.layers.splice(index, 1);
        this.layerlist.setLayers(this.layers);

        if(this.activeLayer === layer) {
            this.selectLayer(this.layers[index == 0 ? 0 : index-1]);
        } else {
            this.selectLayer(this.activeLayer);
        }
    }

    createLayer() {
        const layer = new Layer();
        this.layers.unshift(layer);
        this.layerlist.setLayers(this.layers);
        this.selectLayer(layer);
        return layer;
    }

    drawAllLayers() {
        this.canvas.clear();

        const layers = this.layers.reverse();
        
        for(let layer of layers) {
            this.canvas.drawLayer(layer);
        }

        this.layers.reverse();
    }

    drawIsolatedLayer(layer) {
        this.canvas.clear();
        this.canvas.drawLayer(layer);
    }

    setResolution(width, height) {
        this.canvas.setSize(width, height);
        this.drawAllLayers();
    }

    saveToFile() {
        const link = document.createElement('a');
        link.href = this.canvas.canvas.toDataURL('image/png');
        link.download = "image.png";
        link.click();
    }

    back() {
        const state = this.history[this.historyCursor+1];

        if(state) {
            state.restore();
            this.drawAllLayers();

            this.historyCursor++;
        }
    }

    forward() {
        this.historyCursor--;
        const state = this.history[this.historyCursor];

        if(state) {
            state.restore();
            this.drawAllLayers();
        } else {
            this.historyCursor = 0;
        }
    }

}
