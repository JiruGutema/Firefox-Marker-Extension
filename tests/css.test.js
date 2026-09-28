const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { harden } = require("../shared/css.js");

test("adds !important to declarations, keeps existing ones", () => {
  const out = harden("#a .b { color: red; top: var(--x, 1px) } #c{display:none !important;}");
  assert.match(out, /color: red !important;/);
  assert.match(out, /top: var\(--x, 1px\) !important\s*\}/);
  assert.equal((out.match(/!important/g) || []).length, 3);
});

test("handles nested @media and leaves @keyframes untouched", () => {
  const out = harden("@media (x) { .a { color: red; } } @keyframes k { from { opacity: 0; } to { opacity: 1; } }");
  assert.match(out, /\.a \{ color: red !important; \}/);
  assert.match(out, /from \{ opacity: 0; \}/);
});

test("main.css hardens into balanced CSS with no unmarked declarations", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "main.css"), "utf8");
  const out = harden(css);
  assert.equal((out.match(/\{/g) || []).length, (out.match(/\}/g) || []).length);
  const withoutKeyframes = out.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const bodies = withoutKeyframes.match(/\{[^{}]*\}/g) || [];
  bodies.forEach((body) => {
    body
      .slice(1, -1)
      .split(";")
      .filter((d) => d.includes(":"))
      .forEach((d) => assert.match(d, /!important\s*$/, d));
  });
});
