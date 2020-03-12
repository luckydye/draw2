import { Tool } from "./Tool.js";

export class Create extends Tool {

    get icon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/><path d="M0 0h24v24H0z" fill="none"/></svg>`;
    }

    action() {
        this.app.createLayer();
    }

    constructor(app) {
        super();
        this.title = "New Layer";
        this.app = app;
    }
    
}
