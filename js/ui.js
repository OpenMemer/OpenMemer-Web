// const canvas = document.getElementById('memeEditor'); already declared in core.js
// const fileInput = document.getElementById('imageLoader'); already declared in core.js
const topText = document.getElementById('topText'); // top text input
const bottomText = document.getElementById('bottomText'); // bottom text 
topText.addEventListener('input', drawMeme);
bottomText.addEventListener('input', drawMeme);

canvas.addEventListener('click', () => { // if user clicks the canvas
    fileInput.click(); // trigger file input click on canvas click
});