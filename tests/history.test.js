const test = require("node:test");
const assert = require("node:assert/strict");
const History = require("../content/history.js");

test("the first change can be undone back to the starting state", () => {
  const h = new History();
  h.reset("empty");
  h.record("one");
  assert.equal(h.canUndo, true);
  assert.equal(h.undo(), "empty");
  assert.equal(h.canUndo, false);
  assert.equal(h.redo(), "one");
});

test("recording the same state again is a no-op", () => {
  const h = new History();
  h.reset("a");
  assert.equal(h.record("a"), false);
  assert.equal(h.canUndo, false);
});

test("a new change clears redo", () => {
  const h = new History();
  h.reset("a");
  h.record("b");
  h.undo();
  h.record("c");
  assert.equal(h.canRedo, false);
  assert.equal(h.undo(), "a");
});

test("history is capped", () => {
  const h = new History(3);
  h.reset("0");
  ["1", "2", "3", "4", "5"].forEach((s) => h.record(s));
  const seen = [];
  let s;
  while ((s = h.undo()) !== null) seen.push(s);
  assert.deepEqual(seen, ["4", "3", "2"]);
});
