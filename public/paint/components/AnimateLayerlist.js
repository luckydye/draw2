import { html } from '/node_modules/lit-html/lit-html.js';
import { AnimateElement } from './AnimateElement.js';

class LayerSelectEvent extends Event {
    constructor(layer) {
        super('layer.select');
        this.layer = layer;
    }
}

class LayerChangeEvent extends Event {
    constructor(layer) {
        super('layer.change');
        this.layer = layer;
    }
}

class LayerMoveEvent extends Event {
    constructor(index, newIndex) {
        super('layer.move');
        this.moved = {
            from: index,
            to: newIndex,
        };
    }
}

class LayerAddEvent extends Event {
    constructor() {
        super('layer.add');
    }
}

class LayerDeleteEvent extends Event {
    constructor(layer) {
        super('layer.delete');
        this.layer = layer;
    }
}

export class AnimateLayerlist extends AnimateElement {

    static template() {
        return html`
            <style>
                :host {
                    overflow: auto;
                    position: relative;
                }
            
                canvas {
                    max-height: 32px;
                    border: 1px solid #ffffff;
                    background: #eee;
                    max-width: 80px;
                    object-fit: contain;
                    object-position: top left;
                }
                
                .list-wrapper {
                    overflow: auto;
                    max-height: inherit;
                    position: relative;
                }
                
                layers {
                    display: block;
                    width: 200px;
                }
                
                layer {
                    height: 50px;
                    width: 200px;
                    padding: 8px;
                    box-sizing: border-box;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    -webkit-user-drag: element;
                    user-select: initial;
                    transition: top .2s ease-out;
                }
                
                layer:hover {
                    background: rgba(150, 150, 150, 0.125);
                }
                
                layer[active] {
                    background: rgba(0, 0, 0, 0.125);
                }
                
                .buttons {
                    display: flex;
                    align-items: center;
                    margin-right: 5px;
                }
                
                button {
                    border: none;
                    outline: none;
                    background: none;
                }
                
                button:hover {
                    background: rgba(150, 150, 150, 0.2);
                }
                
                button:active {
                    background: rgba(150, 150, 150, 0.33);
                }
                
                .icon-button {
                    fill: white;
                    padding: 4px;
                    cursor: pointer;
                    display: flex;
                    margin-left: 8px;
                    border-radius: 3px;
                }
            </style>
            <div class="list-wrapper">
                <layers></layers>
            </div>
        `;
    }

    connectedCallback() {
        this.onResize();
    }

    onResize() {
        const box = this.getBoundingClientRect();
        this.style.maxHeight = (window.innerHeight - 20 - box.top) + 'px';

        this.updateLayout();
    }

    onCreate() {
        this.selectedLayer = null;

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('load', () => this.onResize());
    }

    updateLayout() {
        const layerList = this.shadowRoot.querySelector("layers");
        const layers = [...layerList.children];

        for(let layer of layers) {
            const index = layers.indexOf(layer);
            const height = layer.clientHeight;

            layer.style.position = "absolute";
            layer.style.top = (height * index) + "px";

            layer.ondragend = e => {
                const box = this.getBoundingClientRect();
                const newIndex = Math.floor((e.y - box.y) / height);

                this.dispatchEvent(new LayerMoveEvent(index, newIndex));
            }
        }

        if(layers.length > 0) {
            layerList.style.height = (layers[0].clientHeight * layers.length) + "px";
        }
    }

    setLayers(layers) {
        this.selectedLayer = null;

        const layerList = this.shadowRoot.querySelector("layers");
        layerList.innerHTML = "";
        
        for(let layer of layers) {
            const layerElement = document.createElement("layer");
            layerElement.setAttribute('layer-id', layer.id);
            layerElement.addEventListener('click', () => {
                this.onLayerSelect(layer);
            })

            const buttons = document.createElement('div');
            buttons.className = "buttons";
            buttons.innerHTML = `
                <button class="icon-button visibility-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
                </button>
                <button class="icon-button delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
                </button>
            `;

            const visibilityBtn = buttons.querySelector('.visibility-btn');
            const deleteBtn = buttons.querySelector('.delete-btn');

            const setHidden = hidden => {
                layer.hidden = hidden;

                if(layer.hidden) {
                    visibilityBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0zm0 0h24v24H0z" fill="none"/><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                    `;
                } else {
                    visibilityBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    `;
                }
            }

            setHidden(layer.hidden);
            visibilityBtn.addEventListener('click', e => {
                setHidden(!layer.hidden);
                this.onLayerChange(layer);
            })
            deleteBtn.addEventListener('click', e => {
                this.onLayerDelete(layer);
            })

            layerElement.appendChild(layer.canvas);
            layerElement.appendChild(buttons);
            layerList.appendChild(layerElement);
        }

        this.updateLayout();
    }

    onLayerChange(layer) {
        this.dispatchEvent(new LayerChangeEvent(layer));
    }

    onLayerDelete(layer) {
        this.dispatchEvent(new LayerDeleteEvent(layer));
    }

    onLayerSelect(layer) {
        if(layer.id === this.selectedLayer) return;

        this.selectedLayer = layer.id;

        const layerList = this.shadowRoot.querySelector("layers");
        const layerEle = layerList.querySelector(`layer[layer-id="${this.selectedLayer}"]`);

        if(!layerEle) return;

        for(let child of layerList.children) {
            child.removeAttribute('active');
        }
        layerEle.setAttribute('active', '');

        this.dispatchEvent(new LayerSelectEvent(layer));
    }

}
