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

    static template(self) {
        return html`
            <style>
                :host {
                    display: block;
                    padding: 2px;
                }
                .presets {
                    display: grid;
                    grid-auto-flow: column;
                    grid-gap: 9px;
                }
                .preset {
                    width: 25px;
                    height: 25px;
                    border: 2px solid var(--interface-background);
                    border-radius: 50%;
                    background: var(--color);
                    transition: .1s ease-out;
                    cursor: pointer;
                }
                .preset:hover {
                    transform: scale(1.05);
                }
                .preset[selected] {
                    transform: translateY(4px);
                }
            </style>
            <div class="presets"></div>
        `;
    }

    setPresets(presets = []) {
        const presetsElement = this.shadowRoot.querySelector('.presets');

        this.presets = presets;

        for(let preset of presets) {

            const presetDiv = document.createElement('div');
            presetDiv.onclick = () => {
                this.setHSL(preset);
            }
            presetDiv.className = "preset";
            presetDiv.setAttribute('color', preset.join(','));
            presetDiv.style.setProperty('--color', `hsl(${preset[0] * 360}, ${preset[1] * 100}%, ${preset[2] * 100}%)`);

            presetsElement.appendChild(presetDiv);
        }
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

        this.updateDisplay();

        this.dispatchEvent(new ColorPickEvent(this.rgb));
    }

    setHSL(hsl) {
        
        this.hsl = hsl;

        this.updateDisplay();

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

        this.presets = [
            [0, 0, 0],
            [0, 0, 1],
            [0.1, 0.6, 0.5],
            [0.4, 0.6, 0.5],
            [0.9, 0.6, 0.5]
        ]

        this.setPresets(this.presets);

        this.updateDisplay();
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
        }

        this.updateDisplay();
    }

    updateDisplay() {
        const presets = this.shadowRoot.querySelectorAll('.preset');

        const hsl = this.hsl.map(v => v.toFixed(1));

        for(let preset of presets) {
            preset.removeAttribute('selected');

            const presetHSL = preset.getAttribute('color').split(',').map(v => parseFloat(v).toFixed(1));

            if(presetHSL.join(',') == hsl.join(',')) {
                preset.setAttribute('selected', '');
            }
        }
    }

}
