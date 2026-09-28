const test = require("node:test");
const assert = require("node:assert/strict");
const Pdf = require("../shared/pdf.js");

test("fromJpeg builds a PDF with a valid cross-reference table", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
  const bytes = Pdf.fromJpeg(jpeg, 200, 100);
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4\n"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/MediaBox \[0 0 150 75\]/);
  assert.match(text, /\/Length 9 >>/);

  const startxref = Number(/startxref\n(\d+)/.exec(text)[1]);
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  const entries = text.slice(startxref).split("\n").slice(3, 8);
  entries.forEach((entry, i) => {
    assert.equal(entry.length + 1, 20, "xref entries are 20 bytes");
    const offset = Number(entry.slice(0, 10));
    assert.equal(text.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`);
  });
});

test("very tall pages are scaled to the PDF size limit", () => {
  const bytes = Pdf.fromJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 1000, 40000);
  const text = Buffer.from(bytes).toString("latin1");
  const [, w, h] = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(text).map(Number);
  assert.ok(h <= 14400 && w > 0);
});

test("dataUrlToBytes decodes base64", () => {
  assert.deepEqual(Array.from(Pdf.dataUrlToBytes("data:text/plain;base64,SGk=")), [72, 105]);
});
