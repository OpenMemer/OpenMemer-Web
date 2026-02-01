// js/analytics.js

const ENABLE_ANALYTICS = false; // default off for repo
const ANALYTICS_ENDPOINT = ""; // set in deployment only

function trackEvent(eventData) {
  if (!ENABLE_ANALYTICS) return;
  if (!ANALYTICS_ENDPOINT) return;

  try {
    const payload = {
      ...eventData,
      timestamp: Date.now()
    };

    // basic validation
    if (!payload.event) return;

    if (payload.event === "export") {
      if (!payload.meme_mode || !payload.media_type) return;

      if (payload.media_type === "gif") {
        if (!payload.gif_mode) return;
      } else {
        delete payload.gif_mode;
      }
    }

    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {
    // never break OpenMemer
    console.warn("Analytics error:", e);
  }
}

function trackVisit() {
  trackEvent({ event: "visit" });
}

function trackExport({ meme_mode, media_type, gif_mode }) {
  trackEvent({
    event: "export",
    meme_mode,
    media_type,
    gif_mode
  });
}

// expose globally
window.trackVisit = trackVisit;
window.trackExport = trackExport;
