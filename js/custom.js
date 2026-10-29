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
    document.getElementById('customFont').value = layer ? layer.font : 'impact';
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

function customFontFamily(layer) {
    switch (layer.font) {
        case 'anton':
            return 'Anton, sans-serif';
        case 'futura':
            return '"Futura PT Condensed Bold", sans-serif';
        case 'times':
            return '"Times New Roman", serif';
        case 'liberation':
            return '"Liberation Sans", sans-serif';
        case 'libreFranklin':
            return '"Libre Franklin", sans-serif';
        default:
            return 'Impact, Anton, sans-serif';
    }
}

function customFontStyle(layer, fontSize) {
    const weight = layer.font === 'futura' ? 'bold ' : '';
    return `${weight}${fontSize}px ${customFontFamily(layer)}`;
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
document.getElementById('customFont').addEventListener('change', async function (event) {
    const layer = selectedCustomLayer();
    if (!layer) return;

    layer.font = event.target.value;

    try {
        // ask the browser to load the font before drawing it.
        await document.fonts.load(customFontStyle(layer, 16));
    } catch (error) {
        console.error('Could not load custom font:', error);
    }

    if (currentMemeMode === 'custom') {
        drawMeme();
    }
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

function getCustomTextLayout(layer, source) {
    const fontSize = source.width * layer.size;
    const lines = layer.text.split('\n');
    const lineHeight = fontSize * 1.2;

    ctx.save();
    ctx.font = customFontStyle(layer, fontSize);

    // Leave a small clickable area even when the text is empty.
    const width = Math.max(
        fontSize,
        ...lines.map(line => ctx.measureText(line).width)
    );

    ctx.restore();

    return {
        lines,
        fontSize,
        lineHeight,
        width,
        height: fontSize + (lines.length - 1) * lineHeight
    };
}

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
    const layout = getCustomTextLayout(layer, source);
    const centerX = layer.x * source.width;
    const centerY = layer.y * source.height;

    ctx.font = customFontStyle(layer, layout.fontSize);
    ctx.fillStyle = layer.color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = layout.fontSize * layer.outline;
    ctx.lineJoin = 'round';

    // Position the first line so the group stays centered on the layer.
    const firstLineY = centerY - (layout.lines.length - 1) * layout.lineHeight / 2;

    layout.lines.forEach((line, index) => {
        const lineY = firstLineY + index * layout.lineHeight;

        if (layer.outline > 0) {
            ctx.strokeText(line, centerX, lineY);
        }

        ctx.fillText(line, centerX, lineY);
    });

    if (!exportMode && layer.id === selectedCustomId) {
        const padding = layout.fontSize * 0.1;

        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, source.width * 0.002);
        ctx.setLineDash([layout.fontSize * 0.15, layout.fontSize * 0.1]);

        ctx.strokeRect(
            centerX - layout.width / 2 - padding,
            centerY - layout.height / 2 - padding,
            layout.width + padding * 2,
            layout.height + padding * 2
        );

        ctx.restore();
    }
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

function customLayerContainsPoint(layer, point, source) {
    const layout = getCustomTextLayout(layer, source);
    const centerX = layer.x * source.width;
    const centerY = layer.y * source.height;

    return (
        point.x >= centerX - layout.width / 2 &&
        point.x <= centerX + layout.width / 2 &&
        point.y >= centerY - layout.height / 2 &&
        point.y <= centerY + layout.height / 2
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