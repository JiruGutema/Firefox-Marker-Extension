// Web Marker - Content utilities
// Small helpers and the icon set shared by the toolbar and the whiteboard.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const ICON_PATHS = {
    pen: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    highlighter: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    eraser: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>',
    pointer: '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>',
    move: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="19 9 22 12 19 15"/><polyline points="9 19 12 22 15 19"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
    text: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    line: '<line x1="5" y1="19" x2="19" y2="5"/>',
    arrow: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
    note: '<path d="M4 4h16v10l-6 6H4z"/><path d="M14 20v-6h6"/>',
    laser: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    undo: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    redo: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    clear: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    save: '<path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/>',
    dashboard: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><line x1="12" y1="17.5" x2="12" y2="17.51"/>',
    exit: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    grip: '<circle class="wm-fill" cx="9" cy="6" r="1.5"/><circle class="wm-fill" cx="15" cy="6" r="1.5"/><circle class="wm-fill" cx="9" cy="12" r="1.5"/><circle class="wm-fill" cx="15" cy="12" r="1.5"/><circle class="wm-fill" cx="9" cy="18" r="1.5"/><circle class="wm-fill" cx="15" cy="18" r="1.5"/>',
    collapse: '<line x1="5" y1="12" x2="19" y2="12"/>',
    expand: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    layout: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/>',
    fill: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><rect class="wm-fill wm-soft" x="4" y="6" width="16" height="12" rx="1.5"/>',
    bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7z"/><path d="M7 12h7a4 4 0 0 1 0 8H7z"/>',
    textbg: '<rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="8 9 8 8 16 8 16 9"/><line x1="12" y1="8" x2="12" y2="16"/>',
    zoomIn: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    zoomOut: '<line x1="5" y1="12" x2="19" y2="12"/>',
  };

  function icon(name) {
    return (
      '<svg class="wm-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (ICON_PATHS[name] || "") +
      "</svg>"
    );
  }

  function parseHex(hex) {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function hexToRgba(hex, opacity) {
    const { r, g, b } = parseHex(hex);
    const a = opacity == null ? 1 : opacity;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Relative luminance, 0 (black) to 1 (white).
  function luminance(hex) {
    const { r, g, b } = parseHex(hex);
    const lin = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  // Read the alpha channel of an rgba()/hex colour string.
  function alphaOf(color) {
    const m = /rgba?\([^)]*,\s*([\d.]+)\s*\)/.exec(String(color || ""));
    return m && /rgba/.test(color) ? parseFloat(m[1]) : 1;
  }

  function debounce(fn, ms) {
    let id = null;
    function debounced() {
      clearTimeout(id);
      id = setTimeout(() => {
        id = null;
        fn();
      }, ms);
    }
    debounced.cancel = () => {
      clearTimeout(id);
      id = null;
    };
    debounced.pending = () => id !== null;
    return debounced;
  }

  const NON_TEXT_INPUTS = ["button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit"];

  // True when keystrokes on this element are meant for typing.
  function isEditableTarget(target) {
    if (!target || target.nodeType !== 1) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") return NON_TEXT_INPUTS.indexOf((target.type || "text").toLowerCase()) === -1;
    return false;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't load the image"));
      img.src = src;
    });
  }

  function dataUrlToBlob(dataUrl) {
    const mime = /^data:([^;,]+)/.exec(dataUrl);
    return new Blob([WebMarkerPdf.dataUrlToBytes(dataUrl)], { type: mime ? mime[1] : "application/octet-stream" });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    (document.body || document.documentElement).appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  }

  function send(message) {
    return browser.runtime.sendMessage(message);
  }

  // Replace an element's children with parsed markup. Only used with the
  // extension's own templates; dynamic values go through escapeHtml().
  function setMarkup(el, markup) {
    const doc = new DOMParser().parseFromString(`<body>${markup}</body>`, "text/html");
    el.replaceChildren(...Array.from(doc.body.childNodes).map((node) => document.adoptNode(node)));
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  WebMarker.util = {
    icon,
    hexToRgba,
    luminance,
    alphaOf,
    debounce,
    isEditableTarget,
    prefersReducedMotion,
    sleep,
    nextFrame,
    loadImage,
    dataUrlToBlob,
    downloadBlob,
    timestamp,
    send,
    escapeHtml,
    setMarkup,
  };
})();
