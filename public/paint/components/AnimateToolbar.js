import { AnimateElement } from './AnimateElement.js';
import { html } from '/node_modules/lit-html/lit-html.js';

class ToolSelectEvent extends Event {
    constructor(tool) {
        super('tool.select');
        this.tool = tool;
    }
}

export class AnimateToolbar extends AnimateElement {

    static template() {
        return html`
            <style>
                :host {
                    padding: 0 1px;
                    display: block;
                }

                tools {
                    display: flex;
                    flex-direction: column;
                }

                tool {
                    color: white;
                    fill: white;
                    display: inline-flex;
                }
                
                tool .tool-icon {
                    display: inline-flex;
                    padding: 4px;
                    justify-content: center;
                    align-items: center;
                    width: 1.25em;
                    height: 1.25em;
                    cursor: pointer;
                    font-size: 1.25em;
                }

                tool .tool-icon:hover {
                    background: rgba(0, 0, 0, 0.125);
                }

                tool[active] .tool-icon {
                    background: rgba(0, 0, 0, 0.125);
                }

                tool .tool-icon:active {
                    background: rgba(0, 0, 0, 0.1);
                }
            </style>
            <tools>
            </tools>
        `;
    }

    onCreate() {
        this.slectedTool = null;
    }

    addTool(tool) {
        const toolList = this.shadowRoot.querySelector('tools');
        const toolElement = document.createElement('tool');

        tool.id = toolList.children.length + 1;
        toolElement.setAttribute('tool-id', tool.id);
        toolElement.title = tool.title;

        toolElement.addEventListener('click', e => {
            this.onSelectTool(tool);
        });

        toolElement.innerHTML = `
            <span class="tool-icon">${tool.icon}</span>
        `;

        toolList.appendChild(toolElement);
    }

    onSelectTool(tool) {
        if(tool.action) {
            tool.action();
            return;
        }

        let current = this.slectedTool != tool;

        this.slectedTool = tool;

        if(current)
            this.dispatchEvent(new ToolSelectEvent(tool));

        const toolList = this.shadowRoot.querySelector('tools');
        const toolElement = toolList.querySelector(`tool[tool-id="${tool.id}"]`);
        for(let child of toolList.children) {
            child.removeAttribute('active');
        }
        toolElement.setAttribute('active', '');
    }

}
