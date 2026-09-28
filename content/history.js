// Web Marker - Undo/redo history
// Stores serialized canvas snapshots. `current` is always the latest state,
// so the very first change can be undone back to the starting canvas.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  class History {
    constructor(limit = 50) {
      this.limit = limit;
      this.undoStack = [];
      this.redoStack = [];
      this.current = null;
    }

    // Start over from `state` (e.g. after loading a saved drawing).
    reset(state) {
      this.current = state;
      this.undoStack = [];
      this.redoStack = [];
    }

    // Record a new state. Returns false when nothing changed.
    record(state) {
      if (state === this.current) return false;
      if (this.current !== null) {
        this.undoStack.push(this.current);
        if (this.undoStack.length > this.limit) this.undoStack.shift();
      }
      this.current = state;
      this.redoStack = [];
      return true;
    }

    undo() {
      if (!this.undoStack.length) return null;
      this.redoStack.push(this.current);
      this.current = this.undoStack.pop();
      return this.current;
    }

    redo() {
      if (!this.redoStack.length) return null;
      this.undoStack.push(this.current);
      this.current = this.redoStack.pop();
      return this.current;
    }

    get canUndo() {
      return this.undoStack.length > 0;
    }

    get canRedo() {
      return this.redoStack.length > 0;
    }
  }

  WebMarker.History = History;
  if (typeof module === "object" && module.exports) module.exports = History;
})();
