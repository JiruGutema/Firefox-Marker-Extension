// Web Marker - Whiteboard navigation
// Infinite canvas: scroll to pan, Ctrl+scroll to zoom, Space+drag or
// middle-button drag to pan. Only loaded by the whiteboard page.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 8;

  WebMarker.createBoardNavigation = function (ctx) {
    const canvas = ctx.canvas;
    const wrapper = canvas.wrapperEl;
    let spaceDown = false;
    let pan = null;

    function changed() {
      ctx.tools.refreshBrush();
      if (ctx.opts.onViewportChange) ctx.opts.onViewportChange(canvas.viewportTransform.slice());
      ctx.persist.schedule();
    }

    function zoomAt(x, y, zoom) {
      canvas.zoomToPoint(new fabric.Point(x, y), Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)));
      changed();
    }

    function resize() {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }

    ctx.listen(window, "resize", resize);

    ctx.listen(
      wrapper,
      "wheel",
      (e) => {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? window.innerHeight : 1;
        if (e.ctrlKey || e.metaKey) {
          zoomAt(e.clientX, e.clientY, canvas.getZoom() * Math.pow(0.998, e.deltaY * unit));
        } else {
          const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
          const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY * unit;
          canvas.relativePan(new fabric.Point(-dx, -dy));
          changed();
        }
      },
      { passive: false }
    );

    function setGrab(on) {
      wrapper.classList.toggle("wm-grab", on);
    }

    ctx.listen(window, "keydown", (e) => {
      if (e.code !== "Space" || U.isEditableTarget(e.target) || ctx.state.editingText) return;
      e.preventDefault();
      if (!spaceDown) {
        spaceDown = true;
        setGrab(true);
      }
    });

    ctx.listen(window, "keyup", (e) => {
      if (e.code !== "Space") return;
      spaceDown = false;
      if (!pan) setGrab(false);
    });

    // Capture phase on the wrapper runs before Fabric's own handlers.
    ctx.listen(
      wrapper,
      "pointerdown",
      (e) => {
        if (!(spaceDown || e.button === 1)) return;
        e.preventDefault();
        e.stopPropagation();
        pan = { x: e.clientX, y: e.clientY };
        wrapper.classList.add("wm-grabbing");
      },
      true
    );

    ctx.listen(window, "pointermove", (e) => {
      if (!pan) return;
      canvas.relativePan(new fabric.Point(e.clientX - pan.x, e.clientY - pan.y));
      pan = { x: e.clientX, y: e.clientY };
      canvas.requestRenderAll();
    });

    ctx.listen(window, "pointerup", () => {
      if (!pan) return;
      pan = null;
      wrapper.classList.remove("wm-grabbing");
      if (!spaceDown) setGrab(false);
      changed();
    });

    return {
      zoomBy(factor) {
        zoomAt(window.innerWidth / 2, window.innerHeight / 2, canvas.getZoom() * factor);
      },
      resetView() {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        changed();
      },
      getZoom() {
        return canvas.getZoom();
      },
    };
  };
})();
