const canvas = document.getElementById('memeEditor'); // get the canvas element
const canvasHolder = document.getElementById('canvasHolder'); // ensure ref
const ctx = canvas.getContext('2d'); // get 2D context for drawing
let image = new Image(); // create a new image object
let currentMemeMode = 'impact'; // default meme mode
const fileInput = document.getElementById('imageLoader'); // input element
const uploadHint = document.getElementById('uploadHint'); // upload hint element
let hasImageBeenLoaded = false; // flag to track if an image has been loaded

let isGIF = false; // flag to track if the image is a GIF
let gifFrames = []; // array to hold GIF frames\
let gifCanvas = document.createElement('canvas'); // offscreen canvas for GIF processing
let gifCtx = gifCanvas.getContext('2d'); // context for GIF canvas
let currentGifFrameIndex = 0; // current frame index
let lastFrameTime = 0; // timestamp of last frame change
let animationId = null; // ID for the animation frame

// analytics visit event
if (typeof trackVisit === "function") {
  trackVisit();
}

fileInput.addEventListener('change', handleImage) // listen for file input changes
function handleImage() {
    const file = fileInput.files[0]; // get the selected file
    if (!file) return; // exit if no file is selected

    // clean up previous GIF state and stop animation
    if (animationId) {
        cancelAnimationFrame(animationId); // stop any ongoing animation
        isGIF = false; // reset GIF flag
    }
    // Determine if the file is a GIF or static image
    if (file.type === 'image/gif') {
        handleGif(file);
    } else {
        handleStaticImage(file);
    }
}

// Clipboard Paste Support
window.addEventListener('paste', async (event) => {
    // Prefer clipboard items on the paste event (widely supported)
    const items = event.clipboardData && event.clipboardData.items ? event.clipboardData.items : [];

    // Try to find an image item (PNG/JPEG/GIF)
    let imageItem = null;
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file') {
            const type = it.type.toLowerCase();
            if (type.startsWith('image/')) {
                imageItem = it;
                break;
            }
        }
    }

    if (imageItem) {
        const blob = imageItem.getAsFile();
        if (!blob) return;

        // Stop any ongoing GIF animation when replacing content
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        // Route based on MIME type
        if (blob.type === 'image/gif') {
            handleGif(blob);
        } else {
            handleStaticImage(blob);
        }

        // Hide upload hint on successful paste
        if (uploadHint) uploadHint.classList.add('hidden');
        return;
    }

    // Fallback path: try Navigator Clipboard API (requires permissions and HTTPS)
    if (navigator.clipboard && navigator.clipboard.read) {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const ci of clipboardItems) {
                // Find first image type available
                const types = ci.types || [];
                const imgType = types.find(t => t.startsWith('image/'));
                if (imgType) {
                    const blob = await ci.getType(imgType);
                    if (blob) {
                        if (animationId) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                        if (blob.type === 'image/gif') {
                            handleGif(blob);
                        } else {
                            handleStaticImage(blob);
                        }
                        if (uploadHint) uploadHint.classList.add('hidden');
                        break;
                    }
                }
            }
        } catch (err) {
            // Silently ignore permission or platform errors
            console.warn('Clipboard read failed:', err);
        }
    }
});

// Drag & Drop Support
const dropTarget = document.getElementById('canvasHolder');
if (dropTarget) {
    // Prevent default to allow drop
    ['dragenter', 'dragover'].forEach(evt => {
        dropTarget.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropTarget.classList.add('drag-hover');
        });
    });

    ['dragleave', 'dragend'].forEach(evt => {
        dropTarget.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropTarget.classList.remove('drag-hover');
        });
    });

    dropTarget.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropTarget.classList.remove('drag-hover');

        const dt = e.dataTransfer;
        if (!dt) return;

        const files = dt.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file || !file.type || !file.type.startsWith('image/')) return;

        // Stop any ongoing GIF animation when replacing content
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        // Route based on MIME type
        if (file.type === 'image/gif') {
            handleGif(file);
        } else {
            handleStaticImage(file);
        }

        if (uploadHint) uploadHint.classList.add('hidden');
    });
}
// GIF DECODER
function handleGif(file) {
    const reader = new FileReader(); // create a FileReader to read the file
    reader.readAsArrayBuffer(file); // read the file as an ArrayBuffer
    reader.onload = function (event) {
        const buffer = event.target.result; // get the file data
        // Use gifuct-js to parse the GIF
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);

        if (frames.length > 0) {
            isGIF = true; // set GIF flag
            hasImageBeenLoaded = true; // set image loaded flag
            
            // Update Export Button Text
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) exportBtn.textContent = "Export GIF";

            gifFrames = frames; // store frames globally

            // Set up GIF canvas size
            gifCanvas.width = gifFrames[0].dims.width;
            gifCanvas.height = gifFrames[0].dims.height;

            if (uploadHint) uploadHint.classList.add('hidden'); // hide upload hint
            // START YOUR FUCKING ENGINES
            currentGifFrameIndex = 0;
            lastFrameTime = performance.now();
            requestAnimationFrame(animateGif);
        };
    }
}

function handleStaticImage(file) {
    const url = URL.createObjectURL(file); // create a URL for the file
    image.src = url; // set the image source to the file URL

    image.onload = function () {
        /*
        Handling image loading and drawing to canvas
        0. Log image loaded
        1. Clear the canvas
        2. Calculate scaling to fit image within canvas
        3. Adjust canvas height to maintain aspect ratio
        4. Draw the image on the canvas
        */

        // draw the image on the canvas when it loads
        console.log("Image loaded!");
        hasImageBeenLoaded = true; // set flag to true
        
        // Reset Export Button Text
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.textContent = "export";

        if (uploadHint) {
            uploadHint.classList.add('hidden');
        }

        drawMeme(); // initial draw call
    };
}

function animateGif(time) {
    if (!isGIF || gifFrames.length === 0) return; // exit if not a GIF or no frames

    const frame = gifFrames[currentGifFrameIndex]; // get the current frame

    let delay = frame.delay || 100; // get frame delay, default to 100ms

    // Apply Speed Multiplier
    const speedInput = document.getElementById('gifSpeed');
    if (speedInput) {
        const speedVal = parseFloat(speedInput.value) || 100;
        // 200% speed means half the delay. 50% speed means double the delay.
        delay = delay * (100 / speedVal);
    }

    if (time - lastFrameTime >= delay) {
        // Draw the current frame to the GIF canvas
        renderGifFrameToBuffer(frame, currentGifFrameIndex);

        drawMeme(); // draw the meme with the current frame

        currentGifFrameIndex++; // move to the next frame
        if (currentGifFrameIndex >= gifFrames.length) {
            currentGifFrameIndex = 0; // loop back to the first frame
        }
        lastFrameTime = time; // update last frame time
    }
    animationId = requestAnimationFrame(animateGif);
}

function renderGifFrameToBuffer(frame, index) {
    const dims = frame.dims;

    if (index === 0) {
        // Clear canvas for the first frame
        gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
    }
    if (index > 0) {
        const prevFrame = gifFrames[index - 1];
        if (prevFrame.disposalType === 2) {
            // Clear the area of the previous frame
            gifCtx.clearRect(prevFrame.dims.left, prevFrame.dims.top, prevFrame.dims.width, prevFrame.dims.height);
        }
    }

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = dims.width;
    patchCanvas.height = dims.height;
    const patchCtx = patchCanvas.getContext('2d');

    const imageData = new ImageData(frame.patch , dims.width, dims.height);
    patchCtx.putImageData(imageData, 0, 0);
    gifCtx.drawImage(patchCanvas, dims.left, dims.top);
}




// Function to draw the base image on the canvas
function drawBaseImage(exportMode = false, targetWidth = null) {
    if (hasImageBeenLoaded == true) {

        const source = isGIF ? gifCanvas : image;

        if (!source || (source instanceof HTMLImageElement && !source.complete)) return; // honestly no idea why this would ever be null here but whatever
        
        // First, we clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get device pixel ratio for high DPI screens
        const dpr = exportMode ? 1 : (window.devicePixelRatio || 1);

        // Then, we calculate the scale to fit the image within the canvas width
        let displayWidth;
        if (targetWidth) {
            displayWidth = targetWidth;
        } else {
            displayWidth = exportMode ? source.width : canvasHolder.clientWidth; // get the display width of the canvas
        }
        
        // Next, we adjust the canvas height to maintain the aspect ratio
        // Multiply by dpr to set internal resolution higher than display size
        canvas.width = displayWidth * dpr; 
        
        const scale = canvas.width / source.width; // calculate scale factor. we do this by dividing canvas width by image width. this gives us a scale factor to maintain aspect ratio.
        canvas.height = source.height * scale; // set canvas height to maintain aspect ratio

        // Next, we determine the position to draw the image
        let y = 0; // y position to draw
        let x = 0; // x position to draw

        // Finally, we draw the image on the canvas
        ctx.drawImage(source, x, y, canvas.width, canvas.height); // redraw the image
    }
}

function drawMeme(exportMode = false, targetWidth = null) {
    // Sanitize argument (event objects from UI listeners should be treated as false)
    if (typeof exportMode !== 'boolean') exportMode = false;

    // If no image is loaded, stop
    if (!hasImageBeenLoaded || !image.complete) return;
    // The Manager decides who does the work
    if (currentMemeMode === 'demotivational') {
        drawDemotivationalMeme(exportMode, targetWidth);
    } else if (currentMemeMode === 'gif-mode') {
        drawGifCaptionMeme(exportMode, targetWidth);
    } else if (currentMemeMode === 'freeform') {
        drawFreeFormMeme(exportMode, targetWidth);
    }
    else {
        drawImpactMeme(exportMode, targetWidth);
    }
}
function setMemeMode(mode) {
    currentMemeMode = mode;
    if (hasImageBeenLoaded) {
        drawMeme();
    }
}

function drawDemotivationalMeme(exportMode = false, targetWidth = null) {
    const source = isGIF ? gifCanvas : image;
    if (!source || (source instanceof HTMLImageElement && !source.complete) || (source instanceof HTMLCanvasElement && source.width === 0)) return;

    const padding = source.width * 0.1;
    const border = Math.max(2, source.width * 0.008);
    
    const titleVal = parseFloat(document.getElementById('fontSize').value) / 100;
    const subtitleVal = parseFloat(document.getElementById('subtitleSize').value) / 100;

    const titleSize = source.width * titleVal; 
    const subtitleSize = source.width * subtitleVal;

    const dpr = exportMode ? 1 : (window.devicePixelRatio || 1);
    const displayWidth = canvasHolder.clientWidth;

    const topTextValue = topText.value.toUpperCase();
    const bottomTextValue = bottomText.value;

    const maxTextWidth = (source.width + (padding * 2)) * 0.9; 
    ctx.font = `${titleSize}px "Times New Roman", Serif`;
    const titleLines = topTextValue ? wrapText(ctx, topTextValue, maxTextWidth) : [];

    ctx.font = `${subtitleSize}px "Times New Roman", Serif`;
    const subtitleLines = bottomTextValue ? wrapText(ctx, bottomTextValue, maxTextWidth) : [];

    // calc height
    let textContentHeight = 0;
    
    if (titleLines.length > 0) {
        // Add height for each title line (1.2 is line height multiplier)
        textContentHeight += (titleSize * 1.2) * titleLines.length;
        textContentHeight += padding * 0.2; // Gap between title and subtitle
    }
    
    if (subtitleLines.length > 0) {
        textContentHeight += (subtitleSize * 1.2) * subtitleLines.length;
    }


    const logicalWidth = source.width + (padding * 2);
    // add (padding * 3) to account for: top, gap (between image/text), and bottom
    const logicalHeight = source.height + (padding * 3) + textContentHeight; 

    // resize canvas
    let scaleFactor;
    if (targetWidth) {
        // If targetWidth is provided, scale logicalWidth to match targetWidth
        scaleFactor = targetWidth / logicalWidth;
    } else {
        scaleFactor = exportMode ? 1 : ((displayWidth * dpr) / logicalWidth);
    }
    
    canvas.width = logicalWidth * scaleFactor;
    canvas.height = logicalHeight * scaleFactor;

    // now draw
    ctx.scale(scaleFactor, scaleFactor);
    
    // Background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Image
    ctx.drawImage(source, padding, padding, source.width, source.height);

    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = border;
    ctx.strokeRect(padding - (border / 2), padding - (border / 2), source.width + border, source.height + border);

    // Text
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    const centerX = logicalWidth / 2;
    
    // start drawing text below the image + gap
    let currentY = source.height + padding + (padding *1.5); 

    // draw title lines
    if (titleLines.length > 0) {
        ctx.font = `${titleSize}px "Times New Roman", Serif`;
        titleLines.forEach(line => {
            ctx.fillText(line, centerX, currentY);
            currentY += titleSize * 1.2; // Move down for next line
        });
        currentY += padding * 0.1; // Add gap before subtitle
    }

    // draw sub lines
    if (subtitleLines.length > 0) {
        ctx.font = `${subtitleSize}px "Times New Roman", Serif`;
        subtitleLines.forEach(line => {
            ctx.fillText(line, centerX, currentY);
            currentY += subtitleSize * 1.3;
        });
    }
}

function drawFreeFormMeme(exportMode = false, targetWidth = null, items = null) {
    if (hasImageBeenLoaded == false) return;

    const source = isGIF ? gifCanvas : image;
    if (!source || (source instanceof HTMLImageElement && !source.complete) || (source instanceof HTMLCanvasElement && source.width === 0)) return;
    const dpr = exportMode ? 1 : (window.devicePixelRatio || 1);
    drawBaseImage(exportMode, targetWidth);
    ctx.font = "1.25rem sans-serif";
    ctx.fillStyle = "#FFFFFF";
    if (items) {
        items.forEach(item => {
        ctx.fillText(item.text, item.x + 125, item.y + 100);
    });

    }
}

function drawGifCaptionMeme(exportMode = false, targetWidth = null) {
    // Identify source 
    const source = isGIF ? gifCanvas : image;
    const dpr = exportMode ? 1 : (window.devicePixelRatio || 1);
    
    let displayWidth;
    if (targetWidth) {
        displayWidth = targetWidth;
    } else {
        displayWidth = exportMode ? source.width : canvasHolder.clientWidth;
    }

    // Calculate scaling
    const scale = (displayWidth * dpr) / source.width;
    const scaledImageHeight = source.height * scale;
    const scaledImageWidth = source.width * scale;

    // calculate font and layout
    const fontSizeValue = parseFloat(document.getElementById('fontSize').value); // AI told me this is a more efficient way to do it but idk
    const fontSize = scaledImageWidth * (fontSizeValue / 100);
    const padding = fontSize * 0.5;

    // configure font context to measure text
    ctx.font = `${fontSize}px "Futura PT Condensed Bold", sans-serif`;

    const captionText = topText.value;
    const maxTextWidth = scaledImageWidth - (padding * 2);
    // wrap text into lines
    const lines = captionText ? wrapText(ctx, captionText, maxTextWidth) : [];

    // calculate white space for text
    let captionHeight = 0;
    if (lines.length > 0) {
        captionHeight = (lines.length * fontSize * 1.2) + (padding * 2); // line height + padding
    }

    // resize canvas
    canvas.width = scaledImageWidth;
    canvas.height = scaledImageHeight + captionHeight;

    // draw background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw text
    if (lines.length > 0) {
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${fontSize}px "Futura PT Condensed Bold", "Futura Condensed PT Medium", "Futura PT Bold", Arial, sans-serif`;

        let y = padding;
        const x = canvas.width / 2;
        lines.forEach(line => {
            ctx.fillText(line, x, y);
            y += fontSize * 1.2; // move to next line position
        });
    }
    // draw image
    ctx.drawImage(source, 0, captionHeight, scaledImageWidth, scaledImageHeight);
}



/*The Functions made for Impact Memes */
// TOP TEXT:
function drawTopText(text, fontSize) {
    const maxWidth = canvas.width * 0.9; // 90% of canvas width
    const lines = wrapText(ctx, text, maxWidth);
    const x = canvas.width / 2;
    // Use relative padding instead of fixed pixels to handle scaling
    let y = fontSize + (fontSize * 0.2);

    lines.forEach(line => { // draw each line
        ctx.fillText(line, x, y);
        ctx.strokeText(line, x, y);
        y += fontSize * 1.1; // move to next line position
    });
}
// BOTTOM TEXT:
function drawBottomText(text, fontSize) {
    const maxWidth = canvas.width * 0.9; // 90% of canvas width
    const lines = wrapText(ctx, text, maxWidth);
    const x = canvas.width / 2;
    let y = canvas.height - (fontSize * 0.3);
    for (let i = lines.length - 1; i >= 0; i--) { // draw lines from bottom to top

        ctx.fillText(lines[i], x, y);
        ctx.strokeText(lines[i], x, y);
        y -= fontSize * 1.1; // move to next line position
    }

}
// IMPACT MEME DRAWING FUNCTION
function drawImpactMeme(exportMode = false, targetWidth = null) {
    if (hasImageBeenLoaded == true) {
        drawBaseImage(exportMode, targetWidth);
        const fontSizeValue = fontSizeInput.value / 100; // convert percentage to fraction
        const strokeWidthValue = outlineWidthInput.value / 100; // convert percentage to fraction
        const fontSize = canvas.width * fontSizeValue;


        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = fontSize * strokeWidthValue;
        ctx.textAlign = 'center';
        ctx.font = `${fontSize}px IMPACT, Anton, sans-serif`;
        ctx.textAlign = 'center';

        const topTextValue = topText.value.toUpperCase();
        const bottomTextValue = bottomText.value.toUpperCase();

        drawTopText(topTextValue, fontSize);
        drawBottomText(bottomTextValue, fontSize);
    }
}
// WORD WRAP HELPER
function wrapText(ctx, text, maxWidth) { // helper function to wrap text
    const words = text.split(' '); // split text into words into an array
    let line = ''; // current line
    const lines = []; // array to hold lines
    for (let i = 0; i < words.length; i++) { // iterate over words
        const testLine = line + words[i] + ' '; // test adding the next word
        const testWidth = ctx.measureText(testLine).width; // measure the width of the test line
        if (testWidth > maxWidth && i > 0) { // if it exceeds max width
            lines.push(line.trim()); // push current line to lines array
            line = words[i] + ' '; // start new line with current word
        } else {
            line = testLine; // otherwise, continue adding to the line
        }
    }
    lines.push(line.trim());
    return lines;

}

// Ensure canvas stays sharp on resize/orientation change
window.addEventListener('resize', () => {
    if (hasImageBeenLoaded) {
        drawMeme();
    }
});
