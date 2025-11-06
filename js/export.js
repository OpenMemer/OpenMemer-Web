
document.getElementById('exportBtn').addEventListener('click', () => {
    let canvasURL = canvas.toDataURL('image/png');  // get the data URL of the canvas content
    const createEl = document.createElement('a'); // create a temporary anchor element
    createEl.href = canvasURL;

    createEl.download = 'meme.png'; // set the download filename

    createEl.click(); // trigger the download
    createEl.remove(); // clean up the temporary element
});