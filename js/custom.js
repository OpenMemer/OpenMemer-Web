const customLayers = []; // Array to hold custom text layers
let selectedCustomId = null; // ID of the currently selected custom text layer
let nextCustomId = 1; // Counter for generating unique IDs for custom text layers

function selectedCustomLayer() { // Returns the currently selected custom text layer object
    return customLayers.find(layer => layer.id === selectedCustomId); // Finds the layer in customLayers with the matching ID
}

function selectCustomLayer(id) { // Function to select a custom text layer by its ID
    selectedCustomId = id;

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

function drawCustomMeme(exportMode = false, targetWidth = null) { // you know the drill
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
        ctx.fillText(
            layer.text,
            layer.x * source.width,
            layer.y * source.height
        );
    }

    ctx.restore();
}