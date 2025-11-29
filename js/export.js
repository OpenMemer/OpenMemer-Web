
document.getElementById('exportBtn').addEventListener('click', () => {
    const exportBtn = document.getElementById('exportBtn');
    // check global isGIF flag
    if (typeof isGIF !== 'undefined' && isGIF) {
        exportGIF(exportBtn)
        } else {
            exportImage();
        }
});

function exportImage() {
    let canvasURL = canvas.toDataURL('image/png');  // get the data URL of the canvas content
    const createEl = document.createElement('a'); // create a temporary anchor element
    createEl.href = canvasURL;

    createEl.download = 'MadeUsingOpenMemer.png'; // set the download filename

    createEl.click(); // trigger the download
    createEl.remove(); // clean up the temporary element
}

async function exportGIF(btn) {
    const originalText = btn.textContent;
    btn.textContent = "exporting. please wait";
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

    // start GIF export
    const gif = new GIF({
        workers: 2,
        quality: 10,
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
        drawMeme();

        // calculate delay with speed multiplier
        let delay = frame.delay || 100;
        delay = delay * speedMultiplier;

        // add to gif
        gif.addFrame(canvas, {
            copy: true,
            delay: delay
        });
    }
    // handle finish gif export
    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const createEl = document.createElement('a');
        createEl.href = url;
        createEl.download = 'MadeWithOpenMemer.gif';
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
