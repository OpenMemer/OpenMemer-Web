
const exportModal = document.getElementById('exportModal');
const closeExportModal = document.getElementById('closeExportModal');
const exportOriginalBtn = document.getElementById('exportOriginalBtn');
const exportDiscordBtn = document.getElementById('exportDiscordBtn');

// Main Export Button Click
document.getElementById('exportBtn').addEventListener('click', () => {
    const exportBtn = document.getElementById('exportBtn');
    
    if (typeof isGIF !== 'undefined' && isGIF) {
        // Show Modal for GIFs
        exportModal.classList.add('show');
    } else {
        exportImage();
    }
});

// Close Modal
closeExportModal.addEventListener('click', () => {
    exportModal.classList.remove('show');
});

// Option 1: Original
exportOriginalBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
    exportGIF(document.getElementById('exportBtn'), false); // discordMode = false
});

// Option 2: Discord Mode
exportDiscordBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
    exportGIF(document.getElementById('exportBtn'), true); // discordMode = true
});

function exportImage() {
    // Re-draw at native resolution
    if (typeof drawMeme === 'function') {
        drawMeme(true);
    }

    let canvasURL = canvas.toDataURL('image/png');  // get the data URL of the canvas content
    const createEl = document.createElement('a'); // create a temporary anchor element
    createEl.href = canvasURL;

    createEl.download = 'MadeUsingOpenMemer.png'; // set the download filename

    createEl.click(); // trigger the download
    createEl.remove(); // clean up the temporary element

    // Restore display resolution
    if (typeof drawMeme === 'function') {
        drawMeme(false);
    }
}

async function exportGIF(btn, discordMode = false) {
    const originalText = btn.textContent;
    btn.textContent = discordMode ? 'Compressing GIF...' : 'Generating GIF...';
    btn.disabled = true;

    // pause preview so it doesn't interfere with export
    if (typeof animationId !== 'undefined' && animationId){ 
        cancelAnimationFrame(animationId);
    }

    // FIX: Fetch the worker code and create a local Blob URL
    const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';
    const response = await fetch(workerUrl);
    const blob = await response.blob();
    const localWorkerUrl = URL.createObjectURL(blob);

    // DISCORD MODE SETTINGS
    // Quality: 10 is default (good). 20-30 is lower quality but smaller size.
    const qualitySetting = discordMode ? 20 : 10;
    
    // Target Width: 320px is safe for Discord (< 10MB usually)
    const targetWidth = discordMode ? 320 : null;

    // start GIF export
    const gif = new GIF({
        workers: 2,
        quality: qualitySetting,
        workerScript: localWorkerUrl
    });

    // calculate speed mulriplier
    const speedInput = document.getElementById('gifSpeed');
    let speedMultiplier = 1; // hello everybody my name is Multiplier and welcome back to Five Lines at Javascript
    if (speedInput) {
        const speedVal = parseFloat(speedInput.value) || 100;
        speedMultiplier = 100 / speedVal;
    }

    // render every frame
    // use global gifFrames array
    for (let i = 0; i < gifFrames.length; i++) {
        const frame = gifFrames[i];

        // render frame to offscreen buffer
        renderGifFrameToBuffer(frame, i);

        // draw meme elements on top
        drawMeme(true, targetWidth);

        // calculate delay with speed multiplier
        let delay = frame.delay || 100;
        delay = delay * speedMultiplier;

        // add to gif
        gif.addFrame(canvas, {
            copy: true,
            delay: delay
        });
    }

    // Restore display resolution
    if (typeof drawMeme === 'function') {
        drawMeme(false);
    }

    // handle finish gif export
    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const createEl = document.createElement('a');
        createEl.href = url;
        createEl.download = discordMode ? 'OpenMemer-Compact.gif' : 'OpenMemer-Caption.gif';
        createEl.click();
        createEl.remove();
        
        // Reset UI
        btn.textContent = originalText;
        btn.disabled = false;

        // Resume animation loop
        if (typeof animateGif !== 'undefined') {
            lastFrameTime = performance.now();
            animationId = requestAnimationFrame(animateGif);
        }
    });

    gif.render();
}
