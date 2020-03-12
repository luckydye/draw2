import { Animate } from "./paint/Animate.js";
import Socket from './Socket.js';

customElements.define('paint-canvas', Animate);

// application settings

const disabledEvents = [
    'contextmenu', 
    'gesturestart',
];

disabledEvents.forEach(event => 
    window.addEventListener(event, e => e.preventDefault()));

window.addEventListener('paste', pasteImage);

function pasteImage(e) {
    const files = e.clipboardData.files;
    if(files.length > 0) {
        const file = files[0];

        const reader = new FileReader();
        reader.onload = () => {
            const dataURL = reader.result;
            createImageLayer(dataURL);
        };
        reader.readAsDataURL(file);
    }
}

function createImageLayer(dataURL) {
    const layer = animate.createLayer();
    const img = new Image();
    img.onload = () => {
        layer.setSize(img.width, img.height);
        layer.context.drawImage(img, 0, 0);
        animate.setResolution(img.width, img.height);
    }
    img.src = dataURL;
}
