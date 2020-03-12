import { render } from '/node_modules/lit-html/lit-html.js';

export class AnimateElement extends HTMLElement {

    static template(props) {
        
    }

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        this.render();

        this.onCreate();
    }

    onCreate() {
        
    }

    render() {
        const template = this.constructor.template(this);
        render(template, this.shadowRoot);
    }

}
