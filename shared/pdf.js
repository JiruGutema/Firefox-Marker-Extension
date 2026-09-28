// Web Marker - Minimal PDF writer
// Wraps a single JPEG image in a one-page PDF. No dependencies: the JPEG is
// embedded as-is (DCTDecode), so the output is small and fast to build.

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WebMarkerPdf = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // PDF viewers reject pages larger than 14400pt (200in) on either side.
  var MAX_PAGE_POINTS = 14400;
  var PX_TO_PT = 0.75; // 96 dpi CSS pixels to 72 dpi points

  function ascii(text) {
    var bytes = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    return bytes;
  }

  function pad10(n) {
    var s = String(n);
    while (s.length < 10) s = "0" + s;
    return s;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  // jpegBytes: Uint8Array of a baseline JPEG. width/height: image pixels.
  // cssWidth (optional): the width the image represents in CSS pixels, used
  // to pick a sensible physical page size for high-DPI captures.
  function fromJpeg(jpegBytes, width, height, cssWidth) {
    var pxScale = cssWidth ? cssWidth / width : 1;
    var pageW = width * pxScale * PX_TO_PT;
    var pageH = height * pxScale * PX_TO_PT;
    var fit = Math.min(1, MAX_PAGE_POINTS / pageW, MAX_PAGE_POINTS / pageH);
    pageW = round2(pageW * fit);
    pageH = round2(pageH * fit);

    var parts = [];
    var offsets = [];
    var length = 0;

    function push(bytes) {
      parts.push(bytes);
      length += bytes.length;
    }
    function object(num, body) {
      offsets[num] = length;
      push(ascii(num + " 0 obj\n" + body + "\nendobj\n"));
    }

    push(ascii("%PDF-1.4\n"));
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker comment

    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] " +
        "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"
    );

    offsets[4] = length;
    push(
      ascii(
        "4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + width + " /Height " + height +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
          jpegBytes.length + " >>\nstream\n"
      )
    );
    push(jpegBytes);
    push(ascii("\nendstream\nendobj\n"));

    var content = "q " + pageW + " 0 0 " + pageH + " 0 0 cm /Im0 Do Q";
    object(5, "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");

    var xrefOffset = length;
    var xref = "xref\n0 6\n0000000000 65535 f \n";
    for (var i = 1; i <= 5; i++) xref += pad10(offsets[i]) + " 00000 n \n";
    push(ascii(xref + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n"));

    var out = new Uint8Array(length);
    var pos = 0;
    parts.forEach(function (bytes) {
      out.set(bytes, pos);
      pos += bytes.length;
    });
    return out;
  }

  function dataUrlToBytes(dataUrl) {
    var base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  return { fromJpeg: fromJpeg, dataUrlToBytes: dataUrlToBytes };
});
