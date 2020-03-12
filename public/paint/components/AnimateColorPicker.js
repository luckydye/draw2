import { html } from '/node_modules/lit-html/lit-html.js';
import { AnimateElement } from './AnimateElement.js';

function clamp(min, max, value) {
    return Math.min(Math.max(min, value), max);
}

// http://hsl2rgb.nichabi.com/javascript-function.php
function hsl2rgb (h, s, l) {
    var r, g, b, m, c, x

    h *= 360;
    s *= 100;
    l *= 100;

    if (!isFinite(h)) h = 0
    if (!isFinite(s)) s = 0
    if (!isFinite(l)) l = 0

    h /= 60
    if (h < 0) h = 6 - (-h % 6)
    h %= 6

    s = Math.max(0, Math.min(1, s / 100))
    l = Math.max(0, Math.min(1, l / 100))

    c = (1 - Math.abs((2 * l) - 1)) * s
    x = c * (1 - Math.abs((h % 2) - 1))

    if (h < 1) {
        r = c
        g = x
        b = 0
    } else if (h < 2) {
        r = x
        g = c
        b = 0
    } else if (h < 3) {
        r = 0
        g = c
        b = x
    } else if (h < 4) {
        r = 0
        g = x
        b = c
    } else if (h < 5) {
        r = x
        g = 0
        b = c
    } else {
        r = c
        g = 0
        b = x
    }

    m = l - c / 2
    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)

    return [r, g, b];
}

// https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
function rgb2hsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

class ColorPickEvent extends Event {
    constructor(color) {
        super('colorpicker.pick');
        this.color = color;
    }
}

export class AnimateColorPicker extends AnimateElement {

    static template() {
        return html`
            <style>
                :host {
                    width: 200px;
                    height: 120px;
                    display: block;
                }
                canvas {
                    width: 100%;
                    height: 100%;
                    border-radius: 3px;
                    overflow: hidden;
                }
            </style>
            <canvas></canvas>
        `;
    }

    get hsl() {
        return [
            this.hue, 
            this.saturation, 
            this.lightness
        ];
    }

    get rgb() {
        return [
            this.red,
            this.green,
            this.blue
        ];
    }

    set hsl(hsl) {
        this.rgb = hsl2rgb(...hsl);

        this.hue = hsl[0];
        this.saturation = hsl[1];
        this.lightness = hsl[2];
    }

    set rgb(rgb) {
        this.red = rgb[0];
        this.green = rgb[1];
        this.blue = rgb[2];

        const hsl = rgb2hsl(...rgb);

        this.hue = hsl[0];
        this.saturation = hsl[1];
        this.lightness = hsl[2];
    }

    setRGB(rgb) {
        this.rgb = rgb;

        this.x = this.saturation * this.canvas.width;
        this.y = this.lightness * (this.canvas.height - 20);

        this.drawHSL();

        this.dispatchEvent(new ColorPickEvent(this.rgb));
    }

    setHSL(hsl) {
        this.hsl = hsl;

        this.x = this.saturation * this.canvas.width;
        this.y = this.lightness * (this.canvas.height - 20);

        this.drawHSL();

        this.dispatchEvent(new ColorPickEvent(this.rgb));
    }

    setHue(hue) {
        this.hue = hue;
        this.setHSL([this.hue, this.saturation, this.lightness]);
    }

    setSaturation(saturation) {
        this.saturation = saturation;
        this.setHSL([this.hue, this.saturation, this.lightness]);
    }

    setLightness(lightness) {
        this.lightness = lightness;
        this.setHSL([this.hue, this.saturation, this.lightness]);
    }

    onCreate() {

        this.hue = 0;
        this.saturation = 0;
        this.lightness = 0;
        this.red = 0;
        this.green = 0;
        this.blue = 0;

        this.x = 0;
        this.y = 0;

        this.canvas = this.shadowRoot.querySelector('canvas');
        this.context = this.canvas.getContext("2d");

        const pointerUp = e => {
            this.dragging = false;
        }

        let box;

        const pointerDown = e => {
            this.dragging = true;

            box = this.getBoundingClientRect();
            this.pickColor(
                e.clientX - box.x, 
                e.clientY - box.y
            );
        }

        const pointerMove = e => {
            if(!this.dragging) return;

            this.pickColor(
                clamp(0, box.width - 1, e.clientX - box.x),
                clamp(0, box.height - 1, e.clientY - box.y),
            );
        }

        window.addEventListener('click', pointerUp);

        if(!window.PointerEvent) {
            this.canvas.addEventListener('touchstart', e => {
                pointerDown(e.touches[0]);
            })
            window.addEventListener('touchend', e => {
                pointerUp(e.touches[0]);
            });
            window.addEventListener('touchmove', e => {
                pointerMove(e.touches[0]);
            });
        } else {
            this.canvas.addEventListener('pointerdown', pointerDown)
            window.addEventListener('pointerup', pointerUp);
            window.addEventListener('pointercancel', pointerUp);
            window.addEventListener('pointermove', pointerMove);
        }

        this.drawHSL();
    }

    pickColor(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        
        const width = this.canvas.width;
        const height = this.canvas.height;

        if(y > height - 20) {
            this.setHue((x / width));
        } else {
            const index = (x + (y * width)) * 4;
            const color = [
                this.colorImageData[index],
                this.colorImageData[index + 1],
                this.colorImageData[index + 2],
            ];
            
            this.setRGB(color);

            this.x = x;
            this.y = y;
        }

        this.drawHSL();
    }

    drawHSL() {
        if(this.clientWidth && this.clientHeight) {
            this.canvas.width = this.clientWidth;
            this.canvas.height = this.clientHeight;
        }

        const width = this.canvas.width;
        const height = this.canvas.height - 20;

        // sl
        const colorImageData = this.context.getImageData(0, 0, width, height);
        const colorData = colorImageData.data;
        this.colorImageData = colorData;

        for(let i = 0; i < colorData.length; i += 4) {
            const [x, y] = [
                Math.floor((i / 4) % width),
                Math.floor((i / 4) / width)
            ];

            const cx = (x / width);
            const cy = (y / height);

            const rgb = hsl2rgb(this.hue, cx, cy);

            colorData[i] = rgb[0];
            colorData[i+1] = rgb[1];
            colorData[i+2] = rgb[2];
            colorData[i+3] = 255;
        }

        this.context.putImageData(colorImageData, 0, 0);

        // hue
        const hueImageData = this.context.getImageData(0, height, width, 20);
        const hueData = hueImageData.data;

        for(let i = 0; i < hueData.length; i += 4) {
            const [x, y] = [
                Math.floor((i / 4) % width),
                Math.floor((i / 4) / width)
            ];

            const rgb = hsl2rgb((x / width), 0.8, 0.5);

            hueData[i] = rgb[0];
            hueData[i+1] = rgb[1];
            hueData[i+2] = rgb[2];
            hueData[i+3] = 255;
        }

        this.context.putImageData(hueImageData, 0, height);

        // cursor
        this.context.beginPath();
        this.context.lineWidth = 2;
        this.context.strokeStyle = "white";
        this.context.fillStyle = `rgba(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]}, 255)`;
        this.context.arc(
            this.x, 
            this.y,
            10, 0, Math.PI * 2
        );
        this.context.fill();
        this.context.stroke();

        this.context.beginPath();
        this.context.lineWidth = 2;
        this.context.strokeStyle = "white";
        this.context.fillStyle = `hsl(${this.hue * 360}, 100%, 50%)`;
        this.context.arc(
            this.hue * width,
            height + 10, 
            8, 0, Math.PI * 2
        );
        this.context.fill();
        this.context.stroke();
    }

}
