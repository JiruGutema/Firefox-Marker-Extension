// Web Marker - Drawing tools
// One `currentTool` value drives the canvas mode; each tool's behaviour is
// described by TOOL_META and the canvas event handlers below.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;

  // mode: draw (free-hand brush) | shape (drag to create) | text | note |
  //       select (move/resize objects) | passthrough (clicks reach the page)
  // size/opacity: which size and opacity setting the tool uses.
  const TOOL_META = {
    pen: { mode: "draw", size: "pen", opacity: "pen" },
    highlighter: { mode: "draw", size: "highlighter", opacity: "highlighter" },
    eraser: { mode: "draw", size: "eraser" },
    laser: { mode: "draw" },
    pointer: { mode: "passthrough" },
    move: { mode: "select" },
    text: { mode: "text", size: "text", textStyle: true, fontScale: 2 },
    note: { mode: "note", size: "text", fontScale: 1 },
    line: { mode: "shape", size: "pen", opacity: "pen" },
    arrow: { mode: "shape", size: "pen", opacity: "pen" },
    rect: { mode: "shape", size: "pen", opacity: "pen", fill: true },
    ellipse: { mode: "shape", size: "pen", opacity: "pen", fill: true },
  };

  const NOTE_WIDTH = 220;
  const NOTE_COLLAPSED_WIDTH = 160;
  const LASER_COLOR = "rgba(255, 45, 45, 0.95)";

  WebMarker.TOOL_META = TOOL_META;

  WebMarker.createTools = function (ctx) {
    const canvas = ctx.canvas;
    const state = ctx.state;

    const pencil = new fabric.PencilBrush(canvas);
    const pressure = new WebMarker.PressureBrush(canvas);
    const eraser = new fabric.EraserBrush(canvas);
    const laser = new fabric.PencilBrush(canvas);
    laser.color = LASER_COLOR;
    laser.width = 5;
    laser.shadow = new fabric.Shadow({ color: "rgba(255, 0, 0, 0.8)", blur: 12 });

    let drag = null; // shape being dragged: { kind, start, obj }
    let straight = false; // Shift+drag with pen/highlighter
    let switching = false;

    // --- Style helpers -------------------------------------------------------

    function meta(tool) {
      return TOOL_META[tool || state.tool] || {};
    }

    function sizeFor(tool) {
      const m = meta(tool);
      return m.size ? state.sizes[m.size] : 5;
    }

    function colorFor(tool) {
      const m = meta(tool);
      return m.opacity ? U.hexToRgba(state.color, state.opacity[m.opacity]) : state.color;
    }

    function brushCursor(diameter) {
      const d = Math.max(4, Math.min(120, Math.round(diameter)));
      const s = d + 4;
      const c = s / 2;
      const r = d / 2;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">` +
        `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="white" stroke-width="3"/>` +
        `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="black" stroke-width="1"/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
    }

    function refreshBrush() {
      const tool = state.tool;
      if (tool === "eraser") {
        canvas.freeDrawingBrush = eraser;
      } else if (tool === "laser") {
        canvas.freeDrawingBrush = laser;
      } else if (canvas.freeDrawingBrush !== pressure) {
        canvas.freeDrawingBrush = pencil;
      }
      eraser.width = state.sizes.eraser;
      pencil.color = pressure.color = colorFor(tool);
      pencil.width = pressure.width = sizeFor(tool);
      pencil.strokeLineCap = tool === "highlighter" ? "square" : "round";

      const zoom = canvas.getZoom();
      canvas.freeDrawingCursor =
        tool === "pen" || tool === "highlighter" || tool === "eraser"
          ? brushCursor(sizeFor(tool) * zoom)
          : "crosshair";
      // Fabric only updates the cursor on the next mouse move.
      if (canvas.isDrawingMode && canvas.upperCanvasEl) {
        canvas.upperCanvasEl.style.cursor = canvas.freeDrawingCursor;
      }
    }

    // Only the Select tool can pick objects; everything else draws over them.
    function applyInteractivity() {
      const selectable = state.tool === "move";
      canvas.getObjects().forEach((obj) => {
        if (obj.wmTransient) return;
        obj.selectable = selectable;
        obj.evented = selectable;
        obj.hoverCursor = selectable ? "move" : null;
      });
    }

    function finishTextEditing() {
      const active = canvas.getActiveObject();
      if (active && active.isEditing) active.exitEditing();
    }

    function activate(tool) {
      if (!TOOL_META[tool] || !ctx.isToolAvailable(tool)) return;
      switching = true;
      finishTextEditing();
      switching = false;
      canvas.discardActiveObject();
      drag = null;
      straight = false;

      state.tool = tool;
      const m = meta(tool);
      canvas.isDrawingMode = m.mode === "draw";
      canvas.selection = m.mode === "select";
      canvas.skipTargetFind = m.mode !== "select";
      canvas.defaultCursor = m.mode === "select" ? "default" : "crosshair";
      canvas.wrapperEl.style.pointerEvents = m.mode === "passthrough" ? "none" : "auto";
      if (tool !== "pen") canvas.freeDrawingBrush = pencil;

      refreshBrush();
      applyInteractivity();
      canvas.requestRenderAll();
    }

    // --- Shapes --------------------------------------------------------------

    function snapAngle(a, b, stepDeg) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const step = (stepDeg * Math.PI) / 180;
      const angle = Math.round(Math.atan2(dy, dx) / step) * step;
      return { x: a.x + Math.cos(angle) * len, y: a.y + Math.sin(angle) * len };
    }

    // Straight highlighter: snap to horizontal when close to it, since it is
    // mostly used over lines of text.
    function snapHighlight(a, b) {
      const angle = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
      if (angle < 15 || angle > 165) return { x: b.x, y: a.y };
      return snapAngle(a, b, 45);
    }

    function arrowPath(a, b, width) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(12, width * 3);
      const spread = Math.PI / 7;
      const h1 = { x: b.x - head * Math.cos(angle - spread), y: b.y - head * Math.sin(angle - spread) };
      const h2 = { x: b.x - head * Math.cos(angle + spread), y: b.y - head * Math.sin(angle + spread) };
      return `M ${a.x} ${a.y} L ${b.x} ${b.y} M ${h1.x} ${h1.y} L ${b.x} ${b.y} L ${h2.x} ${h2.y}`;
    }

    function buildShape(kind, a, b, snap) {
      const styleTool = kind === "straight" ? state.tool : kind;
      const color = colorFor(styleTool);
      const base = {
        stroke: color,
        strokeWidth: sizeFor(styleTool),
        fill: "",
        selectable: false,
        evented: false,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        wmKind: kind === "straight" ? state.tool : kind,
      };
      if (kind === "straight") {
        const end = state.tool === "highlighter" ? snapHighlight(a, b) : snapAngle(a, b, 45);
        if (state.tool === "highlighter") base.strokeLineCap = "butt";
        return new fabric.Line([a.x, a.y, end.x, end.y], base);
      }
      if (kind === "line") {
        const end = snap ? snapAngle(a, b, 45) : b;
        return new fabric.Line([a.x, a.y, end.x, end.y], base);
      }
      if (kind === "arrow") {
        const end = snap ? snapAngle(a, b, 45) : b;
        return new fabric.Path(arrowPath(a, end, base.strokeWidth), base);
      }
      let w = b.x - a.x;
      let h = b.y - a.y;
      if (snap) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = (w < 0 ? -1 : 1) * side;
        h = (h < 0 ? -1 : 1) * side;
      }
      const box = {
        left: Math.min(a.x, a.x + w),
        top: Math.min(a.y, a.y + h),
        fill: state.shapeFill ? color : "",
      };
      if (kind === "rect") {
        return new fabric.Rect(Object.assign({}, base, box, { width: Math.abs(w), height: Math.abs(h), rx: 2, ry: 2 }));
      }
      return new fabric.Ellipse(Object.assign({}, base, box, { rx: Math.abs(w) / 2, ry: Math.abs(h) / 2 }));
    }

    // --- Text and sticky notes --------------------------------------------------

    function textBackground() {
      if (!state.text.background) return "";
      return U.luminance(state.color) > 0.6 ? "rgba(17, 24, 39, 0.8)" : "rgba(255, 255, 255, 0.85)";
    }

    function textStyle() {
      return {
        fontFamily: state.text.font,
        fontWeight: state.text.bold ? "bold" : "normal",
        backgroundColor: textBackground(),
      };
    }

    function createText(p) {
      const fontSize = TOOL_META.text.fontScale * state.sizes.text;
      const text = new fabric.IText(
        "",
        Object.assign(textStyle(), {
          left: p.x,
          top: p.y - fontSize / 2,
          fontSize,
          fill: state.color,
          wmKind: "text",
        })
      );
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
    }

    function createNote(p) {
      const note = new fabric.Textbox("", {
        left: p.x,
        top: p.y,
        width: NOTE_WIDTH,
        fontSize: Math.max(8, TOOL_META.note.fontScale * state.sizes.text),
        fontFamily: state.text.font,
        fill: "#1f2937",
        backgroundColor: "#fff3a3",
        shadow: new fabric.Shadow({ color: "rgba(0, 0, 0, 0.25)", blur: 8, offsetX: 2, offsetY: 3 }),
        wmKind: "note",
      });
      canvas.add(note);
      canvas.setActiveObject(note);
      note.enterEditing();
    }

    function toggleNote(note) {
      if (!note || note.wmKind !== "note") return;
      if (note.wmCollapsed) {
        note.set({ text: note.wmFullText || "", wmFullText: null, wmCollapsed: false, editable: true, width: NOTE_WIDTH });
      } else {
        const first = (note.text.split("\n")[0] || "Note").trim();
        note.set({
          wmFullText: note.text,
          wmCollapsed: true,
          editable: false,
          width: NOTE_COLLAPSED_WIDTH,
          text: "📝 " + (first.length > 16 ? first.slice(0, 16) + "…" : first),
        });
      }
      note.initDimensions();
      note.setCoords();
      canvas.requestRenderAll();
      ctx.record();
    }

    // --- Selection styling -------------------------------------------------

    function isText(obj) {
      return obj.type === "i-text" || obj.type === "textbox";
    }

    function withAlpha(hex, color) {
      return U.hexToRgba(hex, U.alphaOf(color));
    }

    // Apply the toolbar colour to the selected objects (Select tool only).
    function recolorSelection(hex) {
      if (state.tool !== "move") return false;
      const objs = canvas.getActiveObjects();
      if (!objs.length) return false;
      objs.forEach((obj) => {
        if (obj.wmKind === "note") return;
        if (isText(obj)) {
          obj.set("fill", hex);
        } else if (obj.stroke) {
          obj.set("stroke", withAlpha(hex, obj.stroke));
          if (obj.fill && typeof obj.fill === "string") obj.set("fill", withAlpha(hex, obj.fill));
        } else if (typeof obj.fill === "string" && obj.fill) {
          obj.set("fill", withAlpha(hex, obj.fill));
        }
      });
      canvas.requestRenderAll();
      ctx.record();
      return true;
    }

    // Apply the text options to selected text objects.
    function restyleSelection() {
      const objs = canvas.getActiveObjects().filter((obj) => isText(obj) && obj.wmKind !== "note");
      if (!objs.length) return false;
      objs.forEach((obj) => {
        obj.set({
          fontFamily: state.text.font,
          fontWeight: state.text.bold ? "bold" : "normal",
          backgroundColor: state.text.background
            ? U.luminance(typeof obj.fill === "string" ? obj.fill : "#000") > 0.6
              ? "rgba(17, 24, 39, 0.8)"
              : "rgba(255, 255, 255, 0.85)"
            : "",
        });
        if (obj.initDimensions) obj.initDimensions();
        obj.setCoords();
      });
      canvas.requestRenderAll();
      ctx.record();
      return true;
    }

    function selectedText() {
      return canvas.getActiveObjects().find((obj) => isText(obj) && obj.wmKind !== "note") || null;
    }

    // --- Laser ---------------------------------------------------------------

    function fadeOut(path) {
      ctx.later(() => {
        if (U.prefersReducedMotion()) {
          canvas.remove(path);
          canvas.requestRenderAll();
          return;
        }
        path.animate("opacity", 0, {
          duration: 500,
          abort: () => ctx.disposed,
          onChange: () => canvas.requestRenderAll(),
          onComplete: () => {
            canvas.remove(path);
            canvas.requestRenderAll();
          },
        });
      }, 600);
    }

    // --- Canvas events -----------------------------------------------------

    // Runs before Fabric sees the pointer: pick the brush for this stroke and
    // turn Shift+drag into a straight line.
    ctx.listen(
      canvas.wrapperEl,
      "pointerdown",
      (e) => {
        const tool = state.tool;
        if ((tool === "pen" || tool === "highlighter") && e.shiftKey) {
          straight = true;
          canvas.isDrawingMode = false;
        } else if (tool === "pen") {
          canvas.freeDrawingBrush = ctx.settings.pressure && e.pointerType === "pen" ? pressure : pencil;
          refreshBrush();
        }
      },
      true
    );

    canvas.on("mouse:down", (opt) => {
      const p = canvas.getPointer(opt.e);
      const m = meta();
      if (straight) {
        drag = { kind: "straight", start: p, obj: null };
      } else if (m.mode === "shape") {
        drag = { kind: state.tool, start: p, obj: null };
      } else if (m.mode === "text" && !state.editingText) {
        createText(p);
      } else if (m.mode === "note" && !state.editingText) {
        createNote(p);
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!drag) return;
      const p = canvas.getPointer(opt.e);
      const obj = buildShape(drag.kind, drag.start, p, opt.e.shiftKey);
      canvas.renderOnAddRemove = false;
      if (drag.obj) canvas.remove(drag.obj);
      canvas.add(obj);
      canvas.renderOnAddRemove = true;
      drag.obj = obj;
      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", (opt) => {
      if (drag) {
        const { obj, start } = drag;
        drag = null;
        if (obj) {
          const p = canvas.getPointer(opt.e);
          if (Math.hypot(p.x - start.x, p.y - start.y) < 3) canvas.remove(obj);
          else obj.setCoords();
        }
        if (straight) {
          straight = false;
          canvas.isDrawingMode = true;
        }
        ctx.record();
        return;
      }
      if (meta().mode === "draw" && state.tool !== "laser") ctx.record();
    });

    canvas.on("path:created", (opt) => {
      const path = opt.path;
      if (!path) return;
      if (state.tool === "laser") {
        path.set({ wmTransient: true, selectable: false, evented: false, erasable: false });
        fadeOut(path);
      } else {
        path.set({ wmKind: state.tool, selectable: false, evented: false });
      }
    });

    canvas.on("erasing:end", () => ctx.record());
    canvas.on("object:modified", () => ctx.record());

    canvas.on("text:editing:entered", () => {
      state.editingText = true;
    });

    canvas.on("text:editing:exited", (opt) => {
      state.editingText = false;
      const obj = opt.target;
      if (obj && !obj.wmCollapsed && !obj.text.trim()) canvas.remove(obj);
      ctx.record();
      // After placing text, switch to Select so it can be moved straight away.
      if (!switching && (state.tool === "text" || state.tool === "note")) ctx.setTool("move");
    });

    canvas.on("mouse:dblclick", (opt) => {
      const obj = opt.target;
      if (obj && obj.wmKind === "note" && obj.wmCollapsed) {
        toggleNote(obj);
        canvas.setActiveObject(obj);
        obj.enterEditing();
      }
    });

    ["selection:created", "selection:updated", "selection:cleared"].forEach((name) =>
      canvas.on(name, () => ctx.toolbar && ctx.toolbar.updateStyleControls())
    );

    return {
      activate,
      refreshBrush,
      applyInteractivity,
      toggleNote,
      recolorSelection,
      restyleSelection,
      selectedText,
      finishTextEditing,
    };
  };
})();
