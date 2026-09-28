// Web Marker - Main controller
// Creates one marker instance (canvas + toolbar + tools) and tears all of it
// down again on exit: DOM nodes, event listeners, timers and observers.
//
// Entry points:
//   WebMarker.toggle()      open or close the marker on the current page
//   WebMarker.autoOpen()    show saved drawings on page load (no-op if none)
//   WebMarker.start(opts)   used by the whiteboard ({ mode: "board", boardId })

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;
  const S = WebMarkerStorage;
  const C = WebMarkerConstants;

  const PAGE_MAX_HEIGHT = 25000;
  // Custom object properties that must survive save/undo.
  const SERIALIZE_PROPS = ["wmKind", "wmCollapsed", "wmFullText", "wmTransient", "editable"];

  let current = null;

  WebMarker.toggle = function () {
    if (current) {
      current.exit();
      return undefined;
    }
    return launch({ mode: "page" });
  };

  WebMarker.autoOpen = function () {
    if (current) return undefined;
    return launch({ mode: "page", autoOpen: true });
  };

  WebMarker.start = function (opts) {
    if (current) current.exit();
    return launch(opts);
  };

  function launch(opts) {
    // Placeholder so a second toggle while settings load cancels the first.
    const pending = {
      cancelled: false,
      exit() {
        pending.cancelled = true;
        if (current === pending) current = null;
      },
    };
    current = pending;
    return Promise.all([S.getSettings(), S.getUiState()])
      .then(([settings, uiState]) => {
        if (pending.cancelled) return null;
        const instance = createInstance(opts, settings, uiState);
        current = instance;
        return instance.ready.then(() => instance);
      })
      .catch((err) => {
        if (current === pending) current = null;
        console.error("Web Marker failed to start", err);
        throw err;
      });
  }

  function styleSelectionControls() {
    Object.assign(fabric.Object.prototype, {
      transparentCorners: false,
      cornerStyle: "circle",
      cornerColor: "#ffffff",
      cornerStrokeColor: "#4f46e5",
      borderColor: "#4f46e5",
      cornerSize: 10,
      padding: 4,
    });
  }

  function createInstance(opts, settings, uiState) {
    const isBoard = opts.mode === "board";
    const cleanups = [];
    const timers = new Set();
    let storageKey = null;
    let restoring = false;

    const ctx = {
      mode: opts.mode,
      opts,
      settings,
      uiState: opts.autoOpen ? Object.assign({}, uiState, { collapsed: true }) : uiState,
      disposed: false,
      state: {
        tool: "pen",
        color: settings.penColor,
        sizes: {
          pen: settings.penThickness,
          highlighter: settings.highlightThickness,
          eraser: settings.eraseThickness,
          text: settings.textSize,
        },
        opacity: { pen: 1, highlighter: settings.highlightOpacity },
        text: { font: C.FONTS[0].value, bold: false, background: false },
        shapeFill: false,
        editingText: false,
      },
    };

    ctx.listen = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      cleanups.push(() => target.removeEventListener(type, fn, options));
    };
    ctx.later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!ctx.disposed) fn();
      }, ms);
      timers.add(id);
      return id;
    };
    ctx.isToolAvailable = (tool) => !(isBoard && tool === "pointer");
    ctx.backgroundColor = () => (opts.getBackgroundColor ? opts.getBackgroundColor() : null);

    // --- Canvas ----------------------------------------------------------------

    styleSelectionControls();
    const canvasEl = document.createElement("canvas");
    const canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: false,
      enablePointerEvents: true,
      selection: false,
      preserveObjectStacking: true,
      targetFindTolerance: 6,
    });
    ctx.canvas = canvas;
    const wrapper = canvas.wrapperEl;
    wrapper.id = "webMarker_canvas";
    // Ignore input until the saved drawing has loaded.
    wrapper.style.pointerEvents = "none";
    if (isBoard) {
      wrapper.classList.add("wm-board");
      document.body.appendChild(wrapper);
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    } else {
      // Attach to <html> so a positioned <body> can't offset the drawing.
      document.documentElement.appendChild(wrapper);
    }

    // --- Modules ---------------------------------------------------------------

    const history = new WebMarker.History(50);
    ctx.history = history;
    const exporter = WebMarker.createExporter(ctx);
    ctx.exporter = exporter;
    const toolbar = WebMarker.createToolbar(ctx);
    ctx.toolbar = toolbar;
    ctx.toast = toolbar.toast;
    const tools = WebMarker.createTools(ctx);
    ctx.tools = tools;
    WebMarker.createShortcuts(ctx);
    const board = isBoard && WebMarker.createBoardNavigation ? WebMarker.createBoardNavigation(ctx) : null;

    // --- History ---------------------------------------------------------------

    ctx.serialize = () => {
      const json = canvas.toJSON(SERIALIZE_PROPS);
      json.objects = json.objects.filter((obj) => !obj.wmTransient);
      return json;
    };

    function updateHistoryUi() {
      toolbar.setHistoryState(history.canUndo, history.canRedo);
    }

    ctx.record = () => {
      if (restoring || ctx.disposed) return;
      if (history.record(JSON.stringify(ctx.serialize()))) {
        updateHistoryUi();
        persist.schedule();
      }
    };

    function restore(state) {
      restoring = true;
      canvas.discardActiveObject();
      canvas.loadFromJSON(state, () => {
        restoring = false;
        if (ctx.disposed) return;
        tools.applyInteractivity();
        canvas.requestRenderAll();
        updateHistoryUi();
        persist.schedule();
      });
    }

    ctx.undo = () => {
      tools.finishTextEditing();
      const state = history.undo();
      if (state !== null) restore(state);
    };

    ctx.redo = () => {
      tools.finishTextEditing();
      const state = history.redo();
      if (state !== null) restore(state);
    };

    ctx.clear = () => {
      tools.finishTextEditing();
      const objs = canvas.getObjects().filter((obj) => !obj.wmTransient);
      if (!objs.length) {
        ctx.toast("Nothing to clear", { key: "clear" });
        return;
      }
      canvas.discardActiveObject();
      canvas.remove.apply(canvas, objs);
      canvas.requestRenderAll();
      ctx.record();
      ctx.toast("Canvas cleared", { key: "clear", action: { label: "Undo", onClick: ctx.undo } });
    };

    // --- Toolbar actions -------------------------------------------------------

    ctx.setTool = (tool, options) => {
      if (!ctx.isToolAvailable(tool)) return;
      tools.activate(tool);
      toolbar.setActiveTool(tool);
      if (options && options.announce) {
        const info = C.TOOLS.find((t) => t.id === tool);
        ctx.toast(info ? info.label : tool, { key: "tool", duration: 1200 });
      }
    };

    ctx.setColor = (hex, options) => {
      ctx.state.color = hex;
      tools.refreshBrush();
      toolbar.updateStyleControls();
      if (!(options && options.live)) tools.recolorSelection(hex);
    };

    ctx.setSize = (size) => {
      const meta = WebMarker.TOOL_META[ctx.state.tool];
      if (!meta || !meta.size || !size) return;
      ctx.state.sizes[meta.size] = size;
      tools.refreshBrush();
      toolbar.updateStyleControls();
    };

    ctx.setOpacity = (value) => {
      const meta = WebMarker.TOOL_META[ctx.state.tool];
      if (!meta || !meta.opacity) return;
      ctx.state.opacity[meta.opacity] = value;
      tools.refreshBrush();
      toolbar.updateStyleControls();
    };

    ctx.setTextOption = (key, value) => {
      ctx.state.text[key] = value;
      toolbar.updateStyleControls();
      tools.restyleSelection();
    };

    ctx.runAction = (id) => {
      if (id === "undo") ctx.undo();
      else if (id === "redo") ctx.redo();
      else if (id === "clear") ctx.clear();
      else if (id === "exit") ctx.exit();
      else if (id === "dashboard") {
        U.send({ type: "openDashboard" }).catch((err) => ctx.toast(`Couldn't open the whiteboard: ${err.message}`, { type: "error" }));
      }
    };

    // --- Persistence -------------------------------------------------------------

    function buildRecord() {
      const json = ctx.serialize();
      const record = {
        v: 2,
        updated: Date.now(),
        canvas: json,
        thumb: json.objects.length ? exporter.thumbnail() : null,
      };
      if (isBoard) {
        record.viewport = canvas.viewportTransform.slice();
      } else {
        record.url = S.normalizeUrl(location.href, settings.urlMatch);
        record.title = document.title || "";
        record.page = { width: canvas.getWidth(), height: document.documentElement.scrollHeight };
      }
      return record;
    }

    const persist = {
      save() {
        if (!isBoard && !storageKey) return Promise.resolve();
        let record;
        try {
          record = buildRecord();
        } catch (err) {
          console.error("Web Marker: couldn't serialize the drawing", err);
          return Promise.resolve();
        }
        const write = isBoard ? S.saveBoard(opts.boardId, record) : S.savePage(storageKey, record);
        return write.catch((err) => {
          console.error("Web Marker: couldn't save the drawing", err);
          if (!ctx.disposed) ctx.toast("Couldn't save your drawing", { type: "error", key: "save-error" });
        });
      },
      flush() {
        if (!persist.schedule.pending()) return Promise.resolve();
        persist.schedule.cancel();
        return persist.save();
      },
    };
    persist.schedule = U.debounce(() => persist.save(), 1000);
    ctx.persist = persist;

    ctx.listen(window, "pagehide", () => persist.flush());
    ctx.listen(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") persist.flush();
    });

    // --- Page sizing ---------------------------------------------------------------

    let heightCapNotified = false;

    // Canvas backing stores are limited in size, more so on high-DPI screens.
    function maxPageHeight(width) {
      const dpr = window.devicePixelRatio || 1;
      return Math.floor(Math.min(PAGE_MAX_HEIGHT, 32000 / dpr, 128e6 / (Math.max(1, width) * dpr * dpr)));
    }

    function fitPage() {
      const d = document.documentElement;
      const width = d.clientWidth || window.innerWidth;
      const pageHeight = Math.max(
        d.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        window.scrollY + window.innerHeight
      );
      const cap = maxPageHeight(width);
      // Never shrink: content below may still be drawn on.
      const height = Math.min(cap, Math.max(pageHeight, canvas.getHeight()));
      if (pageHeight > cap && !heightCapNotified) {
        heightCapNotified = true;
        ctx.toast(`This page is very long. Drawing is limited to the first ${cap.toLocaleString()}px.`, { duration: 6000 });
      }
      if (width !== canvas.getWidth() || height !== canvas.getHeight()) {
        canvas.setDimensions({ width, height });
      }
    }

    if (!isBoard) {
      let queued = false;
      const queueFit = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (!ctx.disposed) fitPage();
        });
      };
      canvas.setDimensions({ width: 1, height: 1 });
      fitPage();
      ctx.listen(window, "scroll", queueFit, { passive: true });
      ctx.listen(window, "resize", queueFit);
      if (window.ResizeObserver && document.body) {
        const observer = new ResizeObserver(queueFit);
        observer.observe(document.body);
        cleanups.push(() => observer.disconnect());
      }
    }

    // --- Exit --------------------------------------------------------------------

    function exit() {
      if (ctx.disposed) return Promise.resolve();
      tools.finishTextEditing();
      const saving = persist.flush();
      ctx.disposed = true;
      if (current === instance) current = null;
      cleanups.reverse().forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error(err);
        }
      });
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      toolbar.destroy();
      canvas.dispose();
      canvasEl.remove();
      return saving;
    }
    ctx.exit = exit;

    // --- Load ----------------------------------------------------------------------

    const ready = (async () => {
      let record = null;
      try {
        if (isBoard) {
          record = await S.loadBoard(opts.boardId);
        } else {
          const result = await S.loadPage(location.href, settings.urlMatch);
          storageKey = result.key;
          record = result.record;
        }
      } catch (err) {
        console.error("Web Marker: couldn't load the saved drawing", err);
        if (!isBoard) storageKey = S.pageKey(location.href, settings.urlMatch);
      }
      if (ctx.disposed) return;
      if (opts.autoOpen && !record) {
        exit();
        return;
      }
      if (record && record.canvas) {
        await new Promise((resolve) => canvas.loadFromJSON(record.canvas, resolve));
        if (ctx.disposed) return;
      }
      if (board && record && Array.isArray(record.viewport)) {
        canvas.setViewportTransform(record.viewport);
      }
      if (isBoard && opts.onViewportChange) opts.onViewportChange(canvas.viewportTransform.slice());

      history.reset(JSON.stringify(ctx.serialize()));
      updateHistoryUi();
      ctx.setTool(opts.autoOpen ? "pointer" : "pen");

      if (!isBoard && record && record.page && Math.abs(record.page.width - canvas.getWidth()) > 40) {
        ctx.toast("This page's layout has changed since you drew on it, so some marks may be out of place.", {
          duration: 7000,
        });
      }
    })();

    const instance = {
      ready,
      exit,
      save: () => persist.flush(),
      board,
      ctx,
    };
    return instance;
  }
})();
