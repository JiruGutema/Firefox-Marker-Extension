// Web Marker - Save and export
// Screenshots (visible area or full page), drawing-only PNG/SVG, PDF,
// clipboard and "open in a new tab".

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;

  // Keep captures within Firefox's canvas limits.
  const MAX_CAPTURE_SIDE = 16384;
  const MAX_CAPTURE_PIXELS = 64e6;
  const PADDING = 16;

  const PAGE_MENU = [
    { id: "screenshot", label: "Screenshot (visible area)", hint: "PNG" },
    { id: "screenshot-full", label: "Screenshot (full page)", hint: "PNG" },
    { id: "pdf-full", label: "Full page as PDF", hint: "PDF" },
    { id: "copy", label: "Copy screenshot", hint: "Clipboard" },
    { id: "open", label: "Open screenshot in a new tab" },
    { id: "drawing-png", label: "Drawing only", hint: "PNG" },
    { id: "drawing-svg", label: "Drawing only", hint: "SVG" },
  ];

  const BOARD_MENU = [
    { id: "board-png", label: "Board as image", hint: "PNG" },
    { id: "board-svg", label: "Board as vector", hint: "SVG" },
    { id: "board-pdf", label: "Board as PDF", hint: "PDF" },
    { id: "board-copy", label: "Copy board", hint: "Clipboard" },
    { id: "board-open", label: "Open board in a new tab" },
  ];

  WebMarker.createExporter = function (ctx) {
    const canvas = ctx.canvas;

    function drawnObjects() {
      return canvas.getObjects().filter((obj) => !obj.wmTransient);
    }

    // Bounding box of everything drawn, in canvas (scene) coordinates.
    function contentBounds() {
      const objs = drawnObjects();
      if (!objs.length) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      objs.forEach((obj) => {
        const r = obj.getBoundingRect(true, true);
        minX = Math.min(minX, r.left);
        minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.left + r.width);
        maxY = Math.max(maxY, r.top + r.height);
      });
      minX -= PADDING;
      minY -= PADDING;
      maxX += PADDING;
      maxY += PADDING;
      if (ctx.mode === "page") {
        minX = Math.max(0, minX);
        minY = Math.max(0, minY);
      }
      return { left: minX, top: minY, width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY) };
    }

    // Render a region of the scene, ignoring the current pan/zoom.
    function renderRegion(bounds, options) {
      const opts = options || {};
      const vpt = canvas.viewportTransform.slice();
      const bg = canvas.backgroundColor;
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      if (opts.background) canvas.backgroundColor = opts.background;
      try {
        return canvas.toDataURL({
          format: opts.format || "png",
          quality: opts.quality || 0.92,
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          multiplier: opts.multiplier || 1,
          enableRetinaScaling: false,
        });
      } finally {
        canvas.viewportTransform = vpt;
        canvas.backgroundColor = bg;
        canvas.requestRenderAll();
      }
    }

    function drawingPng(background) {
      const bounds = contentBounds();
      if (!bounds) return null;
      const scale = Math.min(
        window.devicePixelRatio || 1,
        MAX_CAPTURE_SIDE / bounds.width,
        MAX_CAPTURE_SIDE / bounds.height,
        Math.sqrt(MAX_CAPTURE_PIXELS / (bounds.width * bounds.height))
      );
      return renderRegion(bounds, { multiplier: scale, background });
    }

    // Small preview for the saved-drawings list.
    function thumbnail() {
      const bounds = contentBounds();
      if (!bounds) return null;
      const scale = Math.min(1, 240 / bounds.width, 160 / bounds.height);
      return renderRegion(bounds, { multiplier: scale, background: ctx.backgroundColor() });
    }

    function drawingSvg(background) {
      const bounds = contentBounds();
      if (!bounds) return null;
      const vpt = canvas.viewportTransform.slice();
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      let svg;
      try {
        svg = canvas.toSVG({
          width: bounds.width,
          height: bounds.height,
          viewBox: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height },
        });
      } finally {
        canvas.viewportTransform = vpt;
        canvas.requestRenderAll();
      }
      if (background) {
        const open = svg.indexOf("<svg");
        const end = svg.indexOf(">", open) + 1;
        const rect = `\n<rect x="${bounds.left}" y="${bounds.top}" width="${bounds.width}" height="${bounds.height}" fill="${background}"/>`;
        svg = svg.slice(0, end) + rect + svg.slice(end);
      }
      return svg;
    }

    // Capture the tab with the toolbar hidden.
    async function screenshot(fullPage) {
      ctx.toolbar.setHidden(true);
      try {
        // Flush styles so the capture never includes the toolbar. Frames
        // don't run in background tabs, so don't wait on them forever.
        void ctx.toolbar.root.offsetHeight;
        await Promise.race([U.nextFrame().then(U.nextFrame), U.sleep(150)]);
        let message = { type: "capture" };
        if (fullPage) {
          const d = document.documentElement;
          const width = Math.max(d.clientWidth, d.scrollWidth);
          const height = Math.max(d.clientHeight, d.scrollHeight, document.body ? document.body.scrollHeight : 0);
          const scale = Math.min(
            window.devicePixelRatio || 1,
            MAX_CAPTURE_SIDE / width,
            MAX_CAPTURE_SIDE / height,
            Math.sqrt(MAX_CAPTURE_PIXELS / (width * height))
          );
          message = { type: "capture", rect: { x: 0, y: 0, width, height }, scale };
        }
        const response = await U.send(message);
        if (!response || response.error || !response.dataUrl) {
          throw new Error((response && response.error) || "the browser didn't return an image");
        }
        return { dataUrl: response.dataUrl, cssWidth: message.rect ? message.rect.width : window.innerWidth };
      } finally {
        ctx.toolbar.setHidden(false);
      }
    }

    function filename(ext) {
      return `WebMarker_${U.timestamp()}.${ext}`;
    }

    function downloadPng(dataUrl) {
      const name = filename("png");
      U.downloadBlob(U.dataUrlToBlob(dataUrl), name);
      ctx.toast(`Saved ${name}`);
    }

    async function downloadPdf(dataUrl, cssWidth) {
      const img = await U.loadImage(dataUrl);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0);
      const jpeg = WebMarkerPdf.dataUrlToBytes(c.toDataURL("image/jpeg", 0.92));
      const pdf = WebMarkerPdf.fromJpeg(jpeg, c.width, c.height, cssWidth);
      const name = filename("pdf");
      U.downloadBlob(new Blob([pdf], { type: "application/pdf" }), name);
      ctx.toast(`Saved ${name}`);
    }

    async function copy(dataUrl) {
      const response = await U.send({ type: "copyImage", dataUrl });
      if (!response || response.error) throw new Error((response && response.error) || "clipboard unavailable");
      ctx.toast("Copied to clipboard");
    }

    async function openInTab(dataUrl) {
      const response = await U.send({ type: "openImage", dataUrl });
      if (!response || response.error) throw new Error((response && response.error) || "couldn't open a tab");
    }

    function requireDrawing(value) {
      if (!value) throw new Error("there's nothing drawn yet");
      return value;
    }

    const ACTIONS = {
      screenshot: async () => downloadPng((await screenshot(false)).dataUrl),
      "screenshot-full": async () => downloadPng((await screenshot(true)).dataUrl),
      "pdf-full": async () => {
        const shot = await screenshot(true);
        await downloadPdf(shot.dataUrl, shot.cssWidth);
      },
      copy: async () => copy((await screenshot(false)).dataUrl),
      open: async () => openInTab((await screenshot(false)).dataUrl),
      "drawing-png": async () => downloadPng(requireDrawing(drawingPng())),
      "drawing-svg": async () => {
        const name = filename("svg");
        U.downloadBlob(new Blob([requireDrawing(drawingSvg())], { type: "image/svg+xml" }), name);
        ctx.toast(`Saved ${name}`);
      },
      "board-png": async () => downloadPng(requireDrawing(drawingPng(ctx.backgroundColor()))),
      "board-svg": async () => {
        const name = filename("svg");
        U.downloadBlob(new Blob([requireDrawing(drawingSvg(ctx.backgroundColor()))], { type: "image/svg+xml" }), name);
        ctx.toast(`Saved ${name}`);
      },
      "board-pdf": async () => {
        const bounds = contentBounds();
        await downloadPdf(requireDrawing(drawingPng(ctx.backgroundColor())), bounds && bounds.width);
      },
      "board-copy": async () => copy(requireDrawing(drawingPng(ctx.backgroundColor()))),
      "board-open": async () => openInTab(requireDrawing(drawingPng(ctx.backgroundColor()))),
    };

    async function run(id) {
      const action = ACTIONS[id];
      if (!action) return;
      try {
        await action();
      } catch (err) {
        console.error("Web Marker: save failed", err);
        ctx.toast(`Couldn't save: ${err.message}`, { type: "error" });
      }
    }

    return {
      menuItems: ctx.mode === "board" ? BOARD_MENU : PAGE_MENU,
      run,
      thumbnail,
      contentBounds,
    };
  };
})();
