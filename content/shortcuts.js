// Web Marker - Keyboard shortcuts
// Ignored while the user is typing in the page or editing text on the canvas.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;

  WebMarker.createShortcuts = function (ctx) {
    const canvas = ctx.canvas;
    const state = ctx.state;
    const toolByCode = {};
    WebMarkerConstants.TOOLS.forEach((t) => {
      toolByCode["Key" + t.key] = t.id;
    });

    function stop(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    function deleteSelection() {
      const objs = canvas.getActiveObjects();
      if (!objs.length) return false;
      objs.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      ctx.record();
      return true;
    }

    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return;
      // Typing in page inputs, in toolbar selects, or in canvas text
      // (Fabric uses a hidden textarea) should never trigger shortcuts.
      if (U.isEditableTarget(e.target) || state.editingText) return;

      const code = e.code;

      if (e.key === "Escape") {
        if (ctx.toolbar.closeOverlays()) return stop(e);
        if (ctx.mode === "page") {
          stop(e);
          ctx.exit();
        }
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        stop(e);
        ctx.toolbar.toggleHelp();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.altKey) return;
        if (code === "KeyZ") {
          stop(e);
          if (e.shiftKey) ctx.redo();
          else ctx.undo();
        } else if (code === "KeyY" && !e.shiftKey) {
          stop(e);
          ctx.redo();
        }
        return;
      }

      if (e.altKey) return;

      if (e.shiftKey) {
        const tool = toolByCode[code];
        if (tool) {
          if (ctx.isToolAvailable(tool)) {
            stop(e);
            ctx.setTool(tool, { announce: true });
          }
          return;
        }
        if (code === "KeyZ") {
          stop(e);
          ctx.undo();
        } else if (code === "KeyR") {
          stop(e);
          ctx.redo();
        } else if (code === "KeyX" && state.tool !== "pointer") {
          stop(e);
          ctx.clear();
        } else if (code === "KeyS") {
          stop(e);
          ctx.toolbar.openSaveMenu();
        }
        return;
      }

      if ((code === "Delete" || code === "Backspace") && state.tool === "move") {
        if (deleteSelection()) stop(e);
        return;
      }

      if (code === "KeyC" && state.tool === "move") {
        const obj = canvas.getActiveObject();
        if (obj && obj.wmKind === "note") {
          stop(e);
          ctx.tools.toggleNote(obj);
        }
      }
    }

    ctx.listen(window, "keydown", onKeyDown, true);
  };
})();
