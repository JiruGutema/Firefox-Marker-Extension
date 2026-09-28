// Web Marker - Pressure-sensitive brush
// Used by the pen tool for stylus input. Each stroke is stored as a filled
// outline whose width follows the pen pressure.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const MIN_WIDTH_RATIO = 0.2;
  const MAX_WIDTH_RATIO = 1.4;

  function pressureOf(e) {
    if (e && e.pointerType === "pen" && e.pressure > 0) return e.pressure;
    return 0.5;
  }

  const PressureBrush = fabric.util.createClass(fabric.BaseBrush, {
    initialize(canvas) {
      this.canvas = canvas;
      this._points = [];
    },

    onMouseDown(pointer, options) {
      this._points = [];
      this._addPoint(pointer, options && options.e);
      this._render();
    },

    onMouseMove(pointer, options) {
      if (this._addPoint(pointer, options && options.e)) this._render();
    },

    onMouseUp() {
      this._finalize();
      return false;
    },

    _addPoint(pointer, e) {
      const last = this._points[this._points.length - 1];
      if (last && Math.hypot(last.x - pointer.x, last.y - pointer.y) < 1) return false;
      const ratio = MIN_WIDTH_RATIO + (1 - MIN_WIDTH_RATIO) * pressureOf(e) * 1.4;
      this._points.push({
        x: pointer.x,
        y: pointer.y,
        w: Math.max(0.5, this.width * Math.min(MAX_WIDTH_RATIO, ratio)),
      });
      return true;
    },

    // Build a closed SVG path around the stroke: left edge, round end cap,
    // right edge (reversed), round start cap.
    _outline() {
      const pts = this._points;
      if (!pts.length) return null;
      const f = (n) => Math.round(n * 100) / 100;
      if (pts.length === 1) {
        const { x, y, w } = pts[0];
        const r = w / 2;
        return `M ${f(x - r)} ${f(y)} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;
      }
      // Smooth widths so pressure noise doesn't make the edge jagged.
      const widths = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)].w;
        const b = pts[Math.min(pts.length - 1, i + 1)].w;
        return (a + 2 * p.w + b) / 4;
      });
      const left = [];
      const right = [];
      pts.forEach((p, i) => {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const h = widths[i] / 2;
        left.push([p.x + nx * h, p.y + ny * h]);
        right.push([p.x - nx * h, p.y - ny * h]);
      });
      right.reverse();

      const smooth = (line) => {
        let d = "";
        for (let i = 1; i < line.length - 1; i++) {
          const mx = (line[i][0] + line[i + 1][0]) / 2;
          const my = (line[i][1] + line[i + 1][1]) / 2;
          d += ` Q ${f(line[i][0])} ${f(line[i][1])} ${f(mx)} ${f(my)}`;
        }
        const last = line[line.length - 1];
        return d + ` L ${f(last[0])} ${f(last[1])}`;
      };
      const endR = widths[widths.length - 1] / 2;
      const startR = widths[0] / 2;
      return (
        `M ${f(left[0][0])} ${f(left[0][1])}` +
        smooth(left) +
        ` A ${f(endR)} ${f(endR)} 0 0 1 ${f(right[0][0])} ${f(right[0][1])}` +
        smooth(right) +
        ` A ${f(startR)} ${f(startR)} 0 0 1 ${f(left[0][0])} ${f(left[0][1])} Z`
      );
    },

    _render() {
      const canvas = this.canvas;
      const ctx = canvas.contextTop;
      canvas.clearContext(ctx);
      const d = this._outline();
      if (!d) return;
      const v = canvas.viewportTransform;
      ctx.save();
      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
      ctx.fillStyle = this.color;
      ctx.fill(new Path2D(d));
      ctx.restore();
    },

    _finalize() {
      const canvas = this.canvas;
      const d = this._outline();
      canvas.clearContext(canvas.contextTop);
      this._points = [];
      if (!d) return;
      const path = new fabric.Path(d, { fill: this.color, stroke: null, strokeWidth: 0 });
      canvas.fire("before:path:created", { path });
      canvas.add(path);
      canvas.requestRenderAll();
      path.setCoords();
      canvas.fire("path:created", { path });
    },
  });

  WebMarker.PressureBrush = PressureBrush;
})();
