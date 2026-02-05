// const canvas = document.getElementById('memeEditor'); already declared in core.js
// const fileInput = document.getElementById('imageLoader'); already declared in core.js
const topText = document.getElementById('topText'); // top text input
const bottomText = document.getElementById('bottomText'); // bottom text 
const fontSizeInput = document.getElementById('fontSize'); 
const outlineWidthInput = document.getElementById('outlineWidth'); 
const subtitleSizeInput = document.getElementById('subtitleSize');

fontSizeInput.addEventListener('change', drawMeme); 
outlineWidthInput.addEventListener('change', drawMeme); 
subtitleSizeInput.addEventListener('change', drawMeme);
topText.addEventListener('input', drawMeme);
bottomText.addEventListener('input', drawMeme);

// Mobile keyboard handling
const inputs = [topText, bottomText];
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
        input.classList.add('active-input');
    });
    input.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
        input.classList.remove('active-input');
    });
});

canvas.addEventListener('click', () => { // if user clicks the canvas
    fileInput.click(); // trigger file input click on canvas click
});

const advancedSettingsBtn = document.getElementById('advBtn'); // advanced settings button
const advancedSettingsHandler = document.getElementById('advancedSettingsHandler'); // advanced settings handler
advancedSettingsBtn.addEventListener('click', () => {
    const isVisible = advancedSettingsHandler.classList.toggle('visible');
    document.body.classList.toggle('adv-open', isVisible);

});

// Handle pill controls
document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        
        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        let val = parseFloat(input.value);

        if (btn.classList.contains('decrement')) {
            val -= step;
        } else {
            val += step;
        }

        // Clamp value
        if (!isNaN(min) && val < min) val = min;
        if (!isNaN(max) && val > max) val = max;

        // Round to avoid floating point errors
        val = Math.round(val * 100) / 100;

        input.value = val;
        
        // Trigger change event manually so drawMeme picks it up
        input.dispatchEvent(new Event('change'));
    });
});

// Handle Android "Back" button closing keyboard without blurring
if (window.visualViewport) {
    let viewportBaseHeight = window.visualViewport.height;
    let isKeyboardLikelyOpen = false;
    
    window.visualViewport.addEventListener('resize', () => {
        const currentHeight = window.visualViewport.height;

        // Update base height if the new height is larger (e.g. keyboard closed or browser bars hid)
        if (currentHeight > viewportBaseHeight) {
            viewportBaseHeight = currentHeight;
        }

        // If height is significantly smaller than base, keyboard is open
        if (viewportBaseHeight - currentHeight > 150) {
            isKeyboardLikelyOpen = true;
        }

        // If the viewport height is close to the base height, the keyboard is likely closed
        if (Math.abs(viewportBaseHeight - currentHeight) < 50) {
            // Only blur if we knew the keyboard was open previously
            if (isKeyboardLikelyOpen && document.body.classList.contains('keyboard-open')) {
                if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                    document.activeElement.blur();
                }
            }
            isKeyboardLikelyOpen = false;
        }
    });
}

// Changelog Data
let changelogs = [];
let currentChangelogIndex = 0;

const versionBtn = document.getElementById('versionBtn');
const modal = document.getElementById('changelogModal');
const closeBtn = document.querySelector('.close-btn');
const newerNav = document.getElementById('newerNav');
const olderNav = document.getElementById('olderNav');
const newerLabel = document.getElementById('newerVersionLabel');
const olderLabel = document.getElementById('olderVersionLabel');
const changelogTitle = document.getElementById('changelogTitle');
const changelogList = document.getElementById('changelogList');

// Mode Toggling
const modeBtns = document.querySelectorAll('.mode-btn');

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 1. Visual Update: Switch the 'active' class
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 2. Get the mode from the HTML (data-mode="...")
        const mode = btn.dataset.mode;
        
        const fontSizeLabel = document.getElementById('fontSizeLabel');
        const outlineGroup = document.getElementById('outlineGroup');
        const subtitleGroup = document.getElementById('subtitleGroup');
        const gifSpeedGroup = document.getElementById('gifSpeedGroup');

        // 3. Clear Freeform elements if switching away
        const $freeform = document.querySelector('#freeform-base');
        if ($freeform) $freeform.remove();
        const $addedTexts = document.querySelectorAll('.draggable-text-box');
        $addedTexts.forEach(item => item.remove());
        topText.style.display = ''; // Reset display
        bottomText.style.display = ''; // Reset display

        // 4. Update Input Placeholders (UX improvement)
        if (mode === 'demotivational') {
            topText.placeholder = "title";
            bottomText.placeholder = "subtitle";
            bottomText.style.display = 'block'; // Ensure visible

            fontSizeLabel.textContent = "Title Size:";
            outlineGroup.classList.add('hidden');
            subtitleGroup.classList.remove('hidden');
            if(gifSpeedGroup) gifSpeedGroup.classList.add('hidden');
        } else if (mode === 'gif-mode') {
            topText.placeholder = "top text";
            bottomText.placeholder = "bottom text";
            topText.placeholder = "caption";
            bottomText.style.display = 'none'; // Hide bottom text

            fontSizeLabel.textContent = "Caption Size:";
            outlineGroup.classList.add('hidden'); // No outline in this style
            subtitleGroup.classList.add('hidden');
            if(gifSpeedGroup) gifSpeedGroup.classList.remove('hidden');
        
        } else if (mode=='freeform'){

            droppedItems.length = 0; // Clear dropped items
            topText.style.display = 'none'; // Hide top text
            bottomText.style.display = 'none'; // Hide bottom text

            const $controls = document.querySelector('.horizGroupImpact');
            const $freeFormTemplate = document.querySelector('#freeform-template').content.cloneNode(true);
            console.log($freeFormTemplate.outerHTML);
            $controls.prepend($freeFormTemplate);
            document.querySelector("#freeform-make-text-button").addEventListener('click', createFreeFormText);
        } else {
            topText.placeholder = "top text";
            bottomText.placeholder = "bottom text";
            bottomText.style.display = 'block'; // Ensure visible

            fontSizeLabel.textContent = "Font Size:";
            outlineGroup.classList.remove('hidden');
            subtitleGroup.classList.add('hidden');
            if(gifSpeedGroup) gifSpeedGroup.classList.add('hidden');
        }

        // 5. Tell Core to switch modes
        if (typeof setMemeMode === 'function') {
            setMemeMode(mode);
        }
    });
});

const droppedItems = [];

function createFreeFormText(e) {
    
    const $controls = document.querySelector('.controls .added-text-box');
    const textValue = document.querySelector('#freeform-text').value;
    document.querySelector('#freeform-text').value = '';
    if (textValue.trim() === "") return;

    const $textItemTemplate = document.querySelector('#added-text-template').content.firstElementChild.cloneNode(true);
    $textItemTemplate.querySelector('span.draggable-text-content').innerHTML = textValue;
    $textItemTemplate.querySelector('span.draggable-text-content').style.color = "white";

    $controls.prepend($textItemTemplate);

    const canvas = document.querySelector("canvas");

    document.querySelectorAll(".draggable-text-box").forEach(item => {
        item.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text", item.querySelector("span.draggable-text-content").innerHTML);
        });
    });

    document.querySelectorAll(".delete-text-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            removeItemAll(droppedItems, btn.parentElement.querySelector("span.draggable-text-content").innerHTML);
            btn.parentElement.remove();
            drawFreeFormMeme(false, null, droppedItems);
        });
    });

    canvas.addEventListener("dragover", e => {
        e.preventDefault();
    });

    canvas.addEventListener("drop", e => {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;

        //Division by canvas width/height to normalize position and it's back to it's original form in drawFreeFormMeme
        droppedItems.push({ x: x / canvas.width, y: y / canvas.height, text: e.dataTransfer.getData("text") });
        drawFreeFormMeme(false, null, droppedItems);
    });
}

function removeItemAll(arr, text) {
  let i = 0;
  while (i < arr.length) {
    if (arr[i].text === text) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}

async function loadChangelogs() {
    try {
        const response = await fetch('changelog.json');
        changelogs = await response.json();
    } catch (error) {
        console.error('Failed to load changelogs:', error);
        changelogs = [{
            version: "Error",
            changes: ["Could not load changelogs."]
        }];
    }
}

function updateChangelogUI() {
    if (changelogs.length === 0) return;
    
    const log = changelogs[currentChangelogIndex];
    
    // Update Content
    changelogTitle.textContent = `Update changelog: ${log.version}`;
    changelogList.innerHTML = log.changes.map(change => `<li>${change}</li>`).join('');

    // Update Navigation
    // Newer (Left side in design, lower index in array)
    if (currentChangelogIndex > 0) {
        newerNav.classList.remove('hidden');
        newerLabel.textContent = changelogs[currentChangelogIndex - 1].version;
    } else {
        newerNav.classList.add('hidden');
    }

    // Older (Right side in design, higher index in array)
    if (currentChangelogIndex < changelogs.length - 1) {
        olderNav.classList.remove('hidden');
        olderLabel.textContent = changelogs[currentChangelogIndex + 1].version;
    } else {
        olderNav.classList.add('hidden');
    }
}

// Initialize
loadChangelogs();

if (versionBtn && modal) {
    versionBtn.addEventListener('click', () => {
        currentChangelogIndex = 0; // Always open latest
        updateChangelogUI();
        modal.classList.add('show');
    });


    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Navigation Clicks
    newerNav.addEventListener('click', () => {
        if (currentChangelogIndex > 0) {
            currentChangelogIndex--;
            updateChangelogUI();
        }
    });

    olderNav.addEventListener('click', () => {
        if (currentChangelogIndex < changelogs.length - 1) {
            currentChangelogIndex++;
            updateChangelogUI();
        }
    });
}

// Error Modal Handling
const errorModal = document.getElementById('errorModal');
const closeErrorModal = document.getElementById('closeErrorModal');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const errorOkBtn = document.getElementById('errorOkBtn');

function showError(title, message) {
    if (errorTitle) errorTitle.textContent = title;
    if (errorMessage) errorMessage.innerHTML = message.replace(/\n/g, '<br>');
    if (errorModal) errorModal.classList.add('show');
}

if (closeErrorModal) {
    closeErrorModal.addEventListener('click', () => {
        errorModal.classList.remove('show');
    });
}

if (errorOkBtn) {
    errorOkBtn.addEventListener('click', () => {
        errorModal.classList.remove('show');
    });
}

// Close on click outside
window.addEventListener('click', (e) => {
    if (e.target === errorModal) {
        errorModal.classList.remove('show');
    }
});
