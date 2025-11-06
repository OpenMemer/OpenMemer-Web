const canvas = document.getElementById('memeEditor'); // get the canvas element
const ctx = canvas.getContext('2d'); // get 2D context for drawing
let image = new Image(); // create a new image object
let selectedMemeType = 'impactMeme'; // default meme type
const fileInput = document.getElementById('imageLoader'); // input element
fileInput.addEventListener('change', handleImage) // listen for file input changes
function handleImage() {
    const file = fileInput.files[0]; // get the selected file
    if (!file) return; // exit if no file is selected
    const url = URL.createObjectURL(file); // create a URL for the file
    image.src = url; // set the image source to the file URL

    image.onload = function () {
        /* 
        IMAGE SIZE LIMITS
        Minimum: 128x128
        Maximum: 4000x4000
        I'll think of better numbers for these later.
        Can't be assed right now.
         */

        if (image.width < 128 || image.height < 128) { // minimum size check
            alert("Image too small. Try something bigger. (Min 128x128)");
            return;
        }
        if (image.width > 4000 || image.height > 4000) { // maximum size check
            alert("Image too large. Try something smaller. (Max 4000x4000)");
            return;
        }
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


        drawMeme(); // initial draw call
    };
}
// Function to draw the base image on the canvas
function drawBaseImage() {
    if (!image || !image.complete) return; // ensure image is loaded
    // First, we clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Then, we calculate the scale to fit the image within the canvas width

    const displayWidth = canvas.clientWidth; // get the display width of the canvas
    // Next, we adjust the canvas height to maintain the aspect ratio
    canvas.width = displayWidth; // set canvas width
    const scale = canvas.width / image.width; // calculate scale factor. we do this by dividing canvas width by image width. this gives us a scale factor to maintain aspect ratio.
    canvas.height = image.height * scale; // set canvas height to maintain aspect ratio

    // Next, we determine the position to draw the image
    let y = 0; // y position to draw
    let x = 0; // x position to draw

    // Finally, we draw the image on the canvas
    ctx.drawImage(image, x, y, canvas.width, canvas.height); // redraw the image
}
function drawTopText(text, fontSize) {
    const x = canvas.width / 2;
    const y = fontSize + 10;
    ctx.fillText(text, x, y);
    ctx.strokeText(text, x, y);
}
// Function to draw meme text on the canvas
function drawBottomText(text, fontSize) {
    const x = canvas.width / 2;
    const y = canvas.height - fontSize * 0.3;
    ctx.fillText(text, x, y);
    ctx.strokeText(text, x, y);

}

function drawMeme() {
    drawBaseImage();
    const fontSize = canvas.width * 0.08;

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = fontSize * 0.02;
    ctx.textAlign = 'center';
    ctx.font = `${fontSize}px IMPACT, Anton, sans-serif`;
    ctx.textAlign = 'center';

    const topTextValue = topText.value.toUpperCase();
    const bottomTextValue = bottomText.value.toUpperCase();

    drawTopText(topTextValue, fontSize);
    drawBottomText(bottomTextValue, fontSize);
}
