// const canvas = document.getElementById('memeEditor'); already declared in core.js
// const fileInput = document.getElementById('imageLoader'); already declared in core.js
const topText = document.getElementById('topText'); // top text input
const bottomText = document.getElementById('bottomText'); // bottom text 
const fontSizeInput = document.getElementById('fontSize'); // font size input
const outlineWidthInput = document.getElementById('outlineWidth'); // outline width input
fontSizeInput.addEventListener('change', drawMeme); // redraw meme on font size change
outlineWidthInput.addEventListener('change', drawMeme); // redraw meme on outline width change
topText.addEventListener('input', drawMeme);
bottomText.addEventListener('input', drawMeme);


canvas.addEventListener('click', () => { // if user clicks the canvas
    fileInput.click(); // trigger file input click on canvas click
});

const advancedSettingsBtn = document.getElementById('advBtn'); // advanced settings button
const advancedSettingsHandler = document.getElementById('advancedSettingsHandler'); // advanced settings handler
advancedSettingsBtn.addEventListener('click', () => {
    // toggle advanced settings visibility
    advancedSettingsHandler.classList.toggle('visible');
    advancedSettingsHandler.classList.toggle('hidden');
    // toggle button text
    if (advancedSettingsBtn.textContent === 'advanced settings') {
        advancedSettingsBtn.textContent = 'close advanced settings';
    } else {
        advancedSettingsBtn.textContent = 'advanced settings';
    }
});
    