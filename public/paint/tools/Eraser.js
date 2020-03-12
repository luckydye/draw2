import { Brush } from "./Brush.js";

export class Eraser extends Brush {

    get icon() {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 124.669 136.009" style="padding: 4px">
                <g id="Eraser" transform="translate(-564.614 172.639) rotate(8)">
                    <rect id="Rechteck_1" data-name="Rechteck 1" width="56.814" height="89.802" rx="3" transform="translate(614.214 -260.658) rotate(30)" fill="#fff"/>
                    <rect id="Rechteck_2" data-name="Rechteck 2" width="56.814" height="28.407" rx="3" transform="translate(563.357 -174.091) rotate(30)" fill="#fff"/>
                </g>
            </svg>
        `;
    }
    
    constructor() {
        super();

        this.title = "Eraser";

        this.opacity = 1;
        this.color = [255, 255, 255];
        
        this.compositeOperation = "destination-out";
    }
}
