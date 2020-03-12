import { AnimateElement } from './AnimateElement.js';
import { html } from '/node_modules/lit-html/lit-html.js';

class ToolChangeEvent extends Event {
    constructor(props) {
        super('tool.change');
        this.change = props;
    }
}

export class AnimateBrushSettings extends AnimateElement {

    static template() {
        return html`
            <style>
                :host {
                    width: 200px;

                    --size: 10px;
                    --opacity: 1;
                    --color: black;
                }

                .preview {
                    margin: 20px 0 15px 0;
                    padding-top: 5px;
                    height: 20px;
                    position: relative;
                }

                .brush-preview {
                    display: block;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    opacity: var(--opacity);
                    width: var(--size);
                    height: var(--size);
                    background: var(--color);
                }

                [type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                    background: rgba(200, 200, 200, 0.5);
                    outline: 0;
                    width: 150px;
                    border-radius: 3px;
                }
                [type="range"]::-moz-range-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 10px;
                    height: 15px;
                    background: rgba(255,255,255,0.75);
                    cursor: pointer;
                    border-radius: 2px;
                }
                [type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 10px;
                    height: 15px;
                    background: rgba(255,255,255,0.75);
                    cursor: pointer;
                    border-radius: 2px;
                }
                [type="range"]:hover::-webkit-slider-thumb {
                    background: white;
                }

                tool {
                    display: block;
                    padding: 5px 0;
                    color: white;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.125);
                }
                .property {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 8px;
                    box-sizing: border-box;
                    margin-bottom: 2px;
                    fill: white;
                }
            </style>
            <div class="preview">
                <span class="brush-preview"></span>
            </div>
            <tool>
                <div class="property">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M16.21 4.16l4 4v-4zm4 12l-4 4h4zm-12 4l-4-4v4zm-4-12l4-4h-4zm12.95-.95c-2.73-2.73-7.17-2.73-9.9 0s-2.73 7.17 0 9.9 7.17 2.73 9.9 0 2.73-7.16 0-9.9zm-1.1 8.8c-2.13 2.13-5.57 2.13-7.7 0s-2.13-5.57 0-7.7 5.57-2.13 7.7 0 2.13 5.57 0 7.7z"/><path fill="none" d="M.21.16h24v24h-24z"/></svg>
                    <input id="size" type="range" min="1" max="20" step="0.125" />
                </div>
                <div class="property">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" d="M24 0H0v24h24V0zm0 0H0v24h24V0zM0 24h24V0H0v24z"/><path d="M17.66 8L12 2.35 6.34 8C4.78 9.56 4 11.64 4 13.64s.78 4.11 2.34 5.67 3.61 2.35 5.66 2.35 4.1-.79 5.66-2.35S20 15.64 20 13.64 19.22 9.56 17.66 8zM6 14c.01-2 .62-3.27 1.76-4.4L12 5.27l4.24 4.38C17.38 10.77 17.99 12 18 14H6z"/></svg>
                    <input id="opacity" type="range" min="0.01" max="0.5" step="0.0125" />
                </div>
            </tool>
        `;
    }

    onCreate() {
        this.shadowRoot.querySelector('#size').addEventListener('input', () => this.onChange());
        this.shadowRoot.querySelector('#opacity').addEventListener('input', () => this.onChange());
    }

    onChange() {
        const sizeInput = this.shadowRoot.querySelector('#size');
        const opacityInput = this.shadowRoot.querySelector('#opacity');

        const change = {
            size: sizeInput.valueAsNumber,
            opacity: opacityInput.valueAsNumber / (sizeInput.valueAsNumber/10)
        };

        this.dispatchEvent(new ToolChangeEvent(change));

        this.style.setProperty('--size', change.size * 2.5 + 'px');
        this.style.setProperty('--opacity', change.opacity);
    }

    onSelectTool(tool) {
        const sizeInput = this.shadowRoot.querySelector('#size');
        sizeInput.value = tool.size;
        const opacityInput = this.shadowRoot.querySelector('#opacity');
        opacityInput.value = tool.opacity;

        this.onChange();
    }

}
