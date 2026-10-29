const customLayers = []; // Array to hold custom text layers

const customTextDropdown = document.getElementById('customTextDropdown');
const customTextMenu = document.getElementById('customTextMenu');
let selectedCustomId = null; // ID of the currently selected custom text layer
let nextCustomId = 1; // Counter for generating unique IDs for custom text layers

function selectedCustomLayer() { // Returns the currently selected custom text layer object
    return customLayers.find(layer => layer.id === selectedCustomId); // Finds the layer in customLayers with the matching ID
}

function selectCustomLayer(id) { // Function to select a custom text layer by its ID
    if (id !== selectedCustomId) closeCustomMobileEditor();
    selectedCustomId = id;
    const layer = selectedCustomLayer(); // Get the currently selected custom text layer
    document.body.classList.toggle('custom-has-selection', Boolean(layer));
    document.getElementById('customProperties').classList.toggle('hidden', !layer);
    document.getElementById('customText').value = layer ? layer.text : ''; // Update the textarea with the text of the selected layer, or clear it if no layer is selected
    document.getElementById('customSize').value = layer ? layer.size * 100 : 8;
    document.getElementById('customColor').value = layer ? layer.color : '#ffffff';
    document.getElementById('customOutline').value = layer ? layer.outline * 100 : 3;
    document.getElementById('customFont').value = layer ? layer.font : 'impact';
    refreshCustomLayerList();

    if (currentMemeMode === 'custom') {
        drawMeme();
    }
}

function getCustomStartPosition() {
    // Keep the existing center position on desktop.
    if (!window.matchMedia('(max-width: 600px)').matches) {
        return {
            x: 0.5,
            y: 0.5
        };
    }

    const canvasRect = canvas.getBoundingClientRect();
    const controlsRect = document.querySelector('.controls').getBoundingClientRect();

    // Find the part of the image visible above the controls.
    const visibleTop = Math.max(canvasRect.top, 0);
    const visibleBottom = Math.min(canvasRect.bottom, window.innerHeight, controlsRect.top);

    // If no image area is visible, fall back to its center.
    if (visibleBottom <= visibleTop || canvasRect.width <= 0 || canvasRect.height <= 0) {
        return {
            x: 0.5,
            y: 0.5
        };
    }

    const screenY = (visibleTop + visibleBottom) / 2;

    return {
        x: 0.5,
        y: (screenY - canvasRect.top) / canvasRect.height
    };
}

function addCustomText() { // Function to add a new custom text layer
    const start = getCustomStartPosition();
    const layer = {
        id: nextCustomId++,
        text: 'your text',
        x: start.x,
        y: start.y,
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
document.getElementById('customAddText').addEventListener('click', function () {
    addCustomText();
    setCustomTextMenuOpen(false);
}); // Event listener for the "add text" button in custom mode

document.getElementById('customMobileAddText').addEventListener('click', function () {
    addCustomText();
}); // Event listener for the "add text" button in custom mode on mobile

document.getElementById('customText').addEventListener('input', function (event) { // Event listener for the custom text input field
    const layer = selectedCustomLayer(); // Get the currently selected custom text layer
    if (!layer) return; // If no layer is selected, exit the function

    layer.text = event.target.value; // Update the text of the selected layer with the input value
    refreshCustomLayerList();
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

function setCustomTextMenuOpen(open) {
    customTextMenu.hidden = !open;
    customTextDropdown.setAttribute('aria-expanded', String(open));
}

customTextDropdown.addEventListener('click', function () {
    setCustomTextMenuOpen(customTextMenu.hidden);
});

document.getElementById('customChangeImage').addEventListener('click', function () {
    fileInput.click();
});

function getCustomTextLayout(layer, source) {
    const fontSize = source.width * layer.size;
    const lineHeight = fontSize * 1.2;
    const maxWidth = source.width * 0.9;
    const lines = [];

    ctx.save();
    ctx.font = customFontStyle(layer, fontSize);

    // Keep the line breaks the user typed.
    const paragraphs = layer.text.split('\n');

    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let currentLine = '';

        for (const word of words) {
            const candidate = currentLine ? `${currentLine} ${word}` : word;

            if (currentLine && ctx.measureText(candidate).width > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = candidate;
            }
        }

        lines.push(currentLine);
    }

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
    if (!exportMode) {
        updateCustomDeleteButton();
        updateCustomTouchTargets(source);
        updateCustomMobileHandles(source);
    }
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
            canvas.focus();
            return;
        }
    }
    // If no text was clicked, clear the selection.
    selectCustomLayer(null);
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


function refreshCustomLayerList() {
    const list = document.getElementById('customLayerList');
    list.replaceChildren();

    customTextDropdown.textContent = `text (${customLayers.length}) ▼`;

    customLayers.forEach((layer, index) => {
        const button = document.createElement('button');
        button.type = 'button';

        // Show the first line as the layer's label.
        const firstLine = layer.text.split('\n')[0].trim();
        button.textContent = `${index + 1}. ${firstLine || 'empty text'}`;
        button.setAttribute('aria-pressed', String(layer.id === selectedCustomId));

        button.addEventListener('click', function () {
            selectCustomLayer(layer.id);
            setCustomTextMenuOpen(false);
        });

        list.appendChild(button);
    });
}

const customDeleteText = document.getElementById('customDeleteText');

function updateCustomDeleteButton() {
    const layer = selectedCustomLayer();
    const source = isGIF ? gifCanvas : image;

    if (currentMemeMode !== 'custom' || !hasImageBeenLoaded ||
        !layer || !source.width || !source.height) {
        customDeleteText.hidden = true;
        return;
    }

    const layout = getCustomTextLayout(layer, source);
    const padding = layout.fontSize * 0.1;

    // Find the selection box's top-left corner in image coordinates.
    const left = layer.x * source.width - layout.width / 2 - padding;
    const top = layer.y * source.height - layout.height / 2 - padding;

    // Convert image coordinates into the canvas's displayed size.
    const x = canvas.offsetLeft + left * canvas.clientWidth / source.width;
    const y = canvas.offsetTop + top * canvas.clientHeight / source.height;

    customDeleteText.hidden = false;

    // Keep the button inside the canvas holder, even near an image edge.
    customDeleteText.style.left = `${Math.max(0, Math.min(
        canvasHolder.clientWidth - customDeleteText.offsetWidth, x
    ))}px`;
    customDeleteText.style.top = `${Math.max(0, Math.min(
        canvasHolder.clientHeight - customDeleteText.offsetHeight, y
    ))}px`;
}

customDeleteText.addEventListener('click', function () {
    const index = customLayers.findIndex(layer => layer.id === selectedCustomId);
    if (index === -1) return;

    customLayers.splice(index, 1);
    selectCustomLayer(null);
});


// Close the text menu when clicking anywhere outside it.
document.addEventListener('click', function (event) {
    const dropdown = document.querySelector('.custom-dropdown');

    if (!dropdown.contains(event.target)) {
        setCustomTextMenuOpen(false);
    }
});

// Escape closes the menu and returns focus to its button.
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !customTextMenu.hidden) {
        setCustomTextMenuOpen(false);
        customTextDropdown.focus();
    }
});


canvas.addEventListener('keydown', function (event) {
    if (currentMemeMode !== 'custom') return;

    const layer = selectedCustomLayer();
    if (!layer) return;

    const step = event.shiftKey ? 0.02 : 0.005;

    switch (event.key) {
        case 'ArrowLeft':
            layer.x -= step;
            break;
        case 'ArrowRight':
            layer.x += step;
            break;
        case 'ArrowUp':
            layer.y -= step;
            break;
        case 'ArrowDown':
            layer.y += step;
            break;
        default:
            return;
    }

    layer.x = Math.max(0, Math.min(1, layer.x));
    layer.y = Math.max(0, Math.min(1, layer.y));

    event.preventDefault();
    drawMeme();
});

let customScrollFrame = null;
let customScrollTime = null;

function moveCustomTextWithFinger() {
    if (!customTouchDrag || currentMemeMode !== 'custom') return;

    const layer = customLayers.find(item => item.id === customTouchDrag.id);
    const source = isGIF ? gifCanvas : image;
    if (!layer || !source.width || !source.height) return;

    const point = getCustomMousePosition({
        clientX: customTouchDrag.clientX,
        clientY: customTouchDrag.clientY
    });

    layer.x = Math.max(0, Math.min(1, (point.x - customTouchDrag.offsetX) / source.width));
    layer.y = Math.max(0, Math.min(1, (point.y - customTouchDrag.offsetY) / source.height));

    drawMeme();
}

function scrollWhileDragging(time) {
    if (!customTouchDrag || currentMemeMode !== 'custom') {
        customScrollFrame = null;
        customScrollTime = null;
        return;
    }

    const elapsed = customScrollTime === null ?
        0 :
        Math.min((time - customScrollTime) / 1000, 0.05);

    customScrollTime = time;

    const controls = document.querySelector('.controls').getBoundingClientRect();
    const bottom = Math.min(window.innerHeight, controls.top);
    const edgeSize = Math.min(80, bottom / 3);
    const fingerY = customTouchDrag.clientY;

    let speed = 0;

    if (edgeSize > 0 && fingerY < edgeSize) {
        speed = -300 * Math.min(1, (edgeSize - fingerY) / edgeSize);
    } else if (edgeSize > 0 && fingerY > bottom - edgeSize) {
        speed = 300 * Math.min(1, (fingerY - (bottom - edgeSize)) / edgeSize);
    }

    const previousScroll = window.scrollY;
    window.scrollBy(0, speed * elapsed);

    // The canvas has moved on screen, so update the text's image position.
    if (window.scrollY !== previousScroll) {
        moveCustomTextWithFinger();
    }

    customScrollFrame = requestAnimationFrame(scrollWhileDragging);
}
const customTouchLayer = document.getElementById('customTouchLayer');
const customTouchTargets = new Map();
let customTouchDrag = null;

function updateCustomTouchTargets(source) {
    const activeIds = new Set();

    for (const layer of customLayers) {
        activeIds.add(layer.id);

        let target = customTouchTargets.get(layer.id);

        if (!target) {
            target = document.createElement('div');
            target.className = 'custom-touch-target';
            target.dataset.layerId = layer.id;
            customTouchLayer.appendChild(target);
            customTouchTargets.set(layer.id, target);
        }

        const layout = getCustomTextLayout(layer, source);
        const padding = layout.fontSize * 0.1;

        const left = layer.x * source.width - layout.width / 2 - padding;
        const top = layer.y * source.height - layout.height / 2 - padding;

        target.style.left = `${canvas.offsetLeft + left / source.width * canvas.clientWidth}px`;
        target.style.top = `${canvas.offsetTop + top / source.height * canvas.clientHeight}px`;
        target.style.width = `${(layout.width + padding * 2) / source.width * canvas.clientWidth}px`;
        target.style.height = `${(layout.height + padding * 2) / source.height * canvas.clientHeight}px`;
    }

    // Remove targets for layers that have been deleted.
    for (const [id, target] of customTouchTargets) {
        if (!activeIds.has(id)) {
            target.remove();
            customTouchTargets.delete(id);
        }
    }
}
customTouchLayer.addEventListener('pointerdown', function (event) {
    if (currentMemeMode !== 'custom' || event.pointerType !== 'touch') return;

    const target = event.target.closest('.custom-touch-target');
    if (!target) return;

    const id = Number(target.dataset.layerId);
    const layer = customLayers.find(item => item.id === id);
    const source = isGIF ? gifCanvas : image;
    if (!layer || !source.width || !source.height) return;

    const point = getCustomMousePosition(event);

    customTouchDrag = {
        id: layer.id,
        pointerId: event.pointerId,
        offsetX: point.x - layer.x * source.width,
        offsetY: point.y - layer.y * source.height,
        clientX: event.clientX,
        clientY: event.clientY
    };

    target.setPointerCapture(event.pointerId);
    selectCustomLayer(layer.id);
    event.preventDefault();
});

customTouchLayer.addEventListener('pointermove', function (event) {
    if (!customTouchDrag || event.pointerId !== customTouchDrag.pointerId) return;

    customTouchDrag.clientX = event.clientX;
    customTouchDrag.clientY = event.clientY;
    moveCustomTextWithFinger();

    if (customScrollFrame === null) {
        customScrollTime = null;
        customScrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
});

function endCustomTouchDrag(event) {
    if (!customTouchDrag || event.pointerId !== customTouchDrag.pointerId) return;

    customTouchDrag = null;

    if (customScrollFrame !== null) {
        cancelAnimationFrame(customScrollFrame);
        customScrollFrame = null;
    }

    customScrollTime = null;
}

customTouchLayer.addEventListener('pointerup', endCustomTouchDrag);
customTouchLayer.addEventListener('pointercancel', endCustomTouchDrag);

// Mobile editing uses the same textarea and layer properties as desktop.
const customTextInput = document.getElementById('customText');
const customEditText = document.getElementById('customEditText');
const customResizeText = document.getElementById('customResizeText');
let customResizeDrag = null;

function closeCustomMobileEditor() {
    if (!document.body.classList.contains('custom-editing')) return;
    document.body.classList.remove('custom-editing');
    if (document.activeElement === document.getElementById('customText')) document.activeElement.blur();
    document.documentElement.style.removeProperty('--custom-keyboard-offset');
}

function updateCustomKeyboardOffset() {
    if (!document.body.classList.contains('custom-editing')) return;
    const viewport = window.visualViewport;
    const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    document.documentElement.style.setProperty('--custom-keyboard-offset', `${offset}px`);
}

customEditText.addEventListener('click', function () {
    if (!selectedCustomLayer()) return;
    document.body.classList.add('custom-editing');
    customTextInput.focus();
    updateCustomKeyboardOffset();
});
customTextInput.addEventListener('blur', closeCustomMobileEditor);
document.addEventListener('pointerdown', function (event) {
    if (document.body.classList.contains('custom-editing') && !customTextInput.contains(event.target)) {
        closeCustomMobileEditor();
    }
}, true);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateCustomKeyboardOffset);
    window.visualViewport.addEventListener('scroll', updateCustomKeyboardOffset);
}

function updateCustomMobileHandles(source) {
    const layer = selectedCustomLayer();
    const visible = currentMemeMode === 'custom' && layer && hasImageBeenLoaded &&
        window.matchMedia('(max-width: 600px)').matches;
    customEditText.hidden = !visible;
    customResizeText.hidden = !visible;
    if (!visible) return;

    const layout = getCustomTextLayout(layer, source);
    const padding = layout.fontSize * 0.1;
    const right = canvas.offsetLeft + (layer.x * source.width + layout.width / 2 + padding) / source.width * canvas.clientWidth;
    const top = canvas.offsetTop + (layer.y * source.height - layout.height / 2 - padding) / source.height * canvas.clientHeight;
    const bottom = canvas.offsetTop + (layer.y * source.height + layout.height / 2 + padding) / source.height * canvas.clientHeight;

    for (const [button, y] of [[customEditText, top], [customResizeText, bottom]]) {
        const radius = button.offsetWidth / 2;
        button.style.left = `${Math.max(radius, Math.min(canvasHolder.clientWidth - radius, right))}px`;
        button.style.top = `${Math.max(radius, Math.min(canvasHolder.clientHeight - radius, y))}px`;
    }
}

customResizeText.addEventListener('pointerdown', function (event) {
    const layer = selectedCustomLayer();
    if (!layer || currentMemeMode !== 'custom') return;
    event.preventDefault();
    customResizeDrag = { pointerId: event.pointerId, id: layer.id, x: event.clientX, y: event.clientY, size: layer.size };
    customResizeText.setPointerCapture(event.pointerId);
});

customResizeText.addEventListener('pointermove', function (event) {
    if (!customResizeDrag || event.pointerId !== customResizeDrag.pointerId) return;
    const layer = customLayers.find(item => item.id === customResizeDrag.id);
    if (!layer || !canvas.clientWidth) return;
    const distance = ((event.clientX - customResizeDrag.x) + (event.clientY - customResizeDrag.y)) / 2;
    layer.size = Math.max(0.01, Math.min(1, customResizeDrag.size + distance / canvas.clientWidth));
    document.getElementById('customSize').value = Math.round(layer.size * 1000) / 10;
    drawMeme();
});

function endCustomResize(event) {
    if (customResizeDrag && event.pointerId === customResizeDrag.pointerId) customResizeDrag = null;
}
customResizeText.addEventListener('pointerup', endCustomResize);
customResizeText.addEventListener('pointercancel', endCustomResize);
customResizeText.addEventListener('lostpointercapture', endCustomResize);
