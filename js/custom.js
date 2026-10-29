const customLayers = []; // Array to hold custom text layers
let selectedCustomId = null; // ID of the currently selected custom text layer
let nextCustomId = 1; // Counter for generating unique IDs for custom text layers

function selectedCustomLayer() { // Returns the currently selected custom text layer object
    return customLayers.find(layer => layer.id === selectedCustomId); // Finds the layer in customLayers with the matching ID
}

function selectCustomLayer(id) { // Function to select a custom text layer by its ID
    selectedCustomId = id;
    const layer = selectedCustomLayer(); // Get the currently selected custom text layer
    document.getElementById('customText').value = layer ? layer.text : ''; // Update the textarea with the text of the selected layer, or clear it if no layer is selected
    document.getElementById('customSize').value = layer ? layer.size * 100 : 8;
    document.getElementById('customColor').value = layer ? layer.color : '#ffffff';
    document.getElementById('customOutline').value = layer ? layer.outline * 100 : 3;
    if (currentMemeMode === 'custom') {
        drawMeme();
    }
}

function addCustomText() { // Function to add a new custom text layer
    const layer = {
        id: nextCustomId++,
        text: 'your text',
        x: 0.5,
        y: 0.5,
        font: 'impact',
        size: 0.08,
        color: '#ffffff',
        outline: 0.03
    };

    customLayers.push(layer);
    selectCustomLayer(layer.id);
}

document.getElementById('customAddText').addEventListener('click', addCustomText); // Event listener for the "add text" button in custom mode

document.getElementById('customText').addEventListener('input', function (event) { // Event listener for the custom text input field
    const layer = selectedCustomLayer(); // Get the currently selected custom text layer
    if (!layer) return; // If no layer is selected, exit the function

    layer.text = event.target.value; // Update the text of the selected layer with the input value
    drawMeme();
});

document.getElementById('customSize').addEventListener('input', function (event) {
    const layer = selectedCustomLayer();
    if (!layer || event.target.value === '') return;

    const size = Number(event.target.value);
    if (!Number.isFinite(size) || size < 1 || size > 100) return;

    layer.size = size / 100;
    drawMeme();
});

document.getElementById('customColor').addEventListener('input', function (event) {
    const layer = selectedCustomLayer();
    if (!layer) return;

    layer.color = event.target.value;
    drawMeme();
});
document.getElementById('customOutline').addEventListener('input', function (event) {
    const layer = selectedCustomLayer();
    if (!layer || event.target.value === '') return;

    const outline = Number(event.target.value);
    if (!Number.isFinite(outline) || outline < 0 || outline > 20) return;

    layer.outline = outline / 100;
    drawMeme();
});

function drawCustomMeme(exportMode = false, targetWidth = null) { // you know the dril
    const source = isGIF ? gifCanvas : image;
    if (!source || !source.width || !source.height) return;

    drawBaseImage(exportMode, targetWidth);

    const scale = canvas.width / source.width;

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const layer of customLayers) {
        const fontSize = source.width * layer.size;

        ctx.font = `${fontSize}px Impact, sans-serif`;
        ctx.fillStyle = layer.color;
        if (layer.outline > 0) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = fontSize * layer.outline;
            ctx.lineJoin = 'round';
            ctx.strokeText(
                layer.text,
                layer.x * source.width,
                layer.y * source.height
            );
        }
        ctx.fillText(
            layer.text,
            layer.x * source.width,
            layer.y * source.height
        );
    }

    ctx.restore();
}

let customDrag = null; // Object to hold the state of the currently dragged custom text layer

function getCustomMousePosition(event) { // Function to get the mouse position relative to the canvas and the source image
    const rect = canvas.getBoundingClientRect(); // Get the bounding rectangle of the canvas
    const source = isGIF ? gifCanvas : image; // Determine the source image (GIF or static image)

    return {
        x: ((event.clientX - rect.left) / rect.width) * source.width, // Calculate the x-coordinate relative to the source image
        y: ((event.clientY - rect.top) / rect.height) * source.height // ditto for y-coordinate
    };
}

function customLayerContainsPoint(layer, point, source) { // this function checks if a given point is within the bounds of a custom text layer
    const fontSize = source.width * layer.size; // font size calculator

    ctx.save(); // duh
    ctx.font = `${fontSize}px Impact, sans-serif`;
    const textWidth = ctx.measureText(layer.text).width;
    ctx.restore();

    const centerX = layer.x * source.width;
    const centerY = layer.y * source.height;

    return ( // Check if the point is within the bounding box of the text layer
        point.x >= centerX - textWidth / 2 &&
        point.x <= centerX + textWidth / 2 &&
        point.y >= centerY - fontSize / 2 &&
        point.y <= centerY + fontSize / 2
    );
}
canvas.addEventListener('mousedown', function (event) { // when you click on the canvas this function checks if you clicked on text
    if (currentMemeMode !== 'custom' || !hasImageBeenLoaded) return; // this only works in custom mode for now. maybe later we can add it to other modes too
    if (event.button !== 0) return; // Only the left mouse button.

    const source = isGIF ? gifCanvas : image;
    if (!source.width || !source.height) return;

    const point = getCustomMousePosition(event);

    // Check the most recently added layer first, because it is drawn on top.
    for (let i = customLayers.length - 1; i >= 0; i--) {
        const layer = customLayers[i];

        if (customLayerContainsPoint(layer, point, source)) {
            selectCustomLayer(layer.id);

            customDrag = {
                id: layer.id,
                offsetX: point.x - layer.x * source.width,
                offsetY: point.y - layer.y * source.height
            };

            event.preventDefault();
            return;
        }
    }
});

window.addEventListener('mousemove', function (event) { // event listener for mouse movement to drag custom text layers
    if (!customDrag || currentMemeMode !== 'custom') return;

    const layer = customLayers.find(layer => layer.id === customDrag.id); // Find the layer being dragged
    if (!layer) return; // If the layer is not found, exit the function and return

    const source = isGIF ? gifCanvas : image;
    const point = getCustomMousePosition(event); // get the current mouse position relative to the source image

    // Keep the center of the text within the image.
    layer.x = Math.max(0, Math.min(1, (point.x - customDrag.offsetX) / source.width));
    layer.y = Math.max(0, Math.min(1, (point.y - customDrag.offsetY) / source.height));

    drawMeme();
});

window.addEventListener('mouseup', function () { // event listener for mouse release to stop dragging custom text layers
    customDrag = null;
});