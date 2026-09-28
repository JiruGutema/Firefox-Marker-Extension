// Web Marker - Shared constants
// Tool list and keyboard shortcuts, used by the toolbar, the help overlay and
// the options page so they never drift apart.

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WebMarkerConstants = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var APP_NAME = "Web Marker";

  // `key` is the letter used with Shift to select the tool.
  var TOOLS = [
    { id: "pen", label: "Pen", key: "D" },
    { id: "highlighter", label: "Highlighter", key: "H" },
    { id: "eraser", label: "Eraser", key: "E" },
    { id: "pointer", label: "Pointer (use the page)", key: "P", pageOnly: true },
    { id: "move", label: "Select & move", key: "M" },
    { id: "text", label: "Text", key: "T" },
    { id: "line", label: "Line", key: "L" },
    { id: "arrow", label: "Arrow", key: "A" },
    { id: "rect", label: "Rectangle", key: "B" },
    { id: "ellipse", label: "Ellipse", key: "O" },
    { id: "note", label: "Sticky note", key: "N" },
    { id: "laser", label: "Laser pointer", key: "K" },
  ];

  var SHORTCUTS = TOOLS.map(function (tool) {
    return { keys: ["Shift", tool.key], action: tool.label, pageOnly: !!tool.pageOnly };
  }).concat([
    { keys: ["Shift", "Z"], action: "Undo" },
    { keys: ["Ctrl", "Z"], action: "Undo" },
    { keys: ["Shift", "R"], action: "Redo" },
    { keys: ["Ctrl", "Shift", "Z"], action: "Redo" },
    { keys: ["Shift", "X"], action: "Clear the canvas" },
    { keys: ["Shift", "S"], action: "Save / export menu" },
    { keys: ["Shift", "(hold)"], action: "Straight line with pen/highlighter; snap angles, squares and circles with shapes" },
    { keys: ["Delete"], action: "Delete the selection (Select tool)" },
    { keys: ["C"], action: "Collapse or expand the selected sticky note" },
    { keys: ["?"], action: "Show this list" },
    { keys: ["Esc"], action: "Close menus, then exit", pageOnly: true },
    { keys: ["Esc"], action: "Close menus", boardOnly: true },
    { keys: ["Space", "drag"], action: "Pan the whiteboard", boardOnly: true },
    { keys: ["Ctrl", "scroll"], action: "Zoom the whiteboard", boardOnly: true },
  ]);

  var PRESET_COLORS = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#111827",
    "#ffffff",
  ];

  var FONTS = [
    { value: "Arial", label: "Sans" },
    { value: "Georgia", label: "Serif" },
    { value: "Courier New", label: "Mono" },
    { value: "Comic Sans MS", label: "Casual" },
  ];

  return {
    APP_NAME: APP_NAME,
    TOOLS: TOOLS,
    SHORTCUTS: SHORTCUTS,
    PRESET_COLORS: PRESET_COLORS,
    FONTS: FONTS,
    SIZE_MIN: 1,
    SIZE_MAX: 60,
  };
});
