// Web Marker - Stylesheet hardening
// Adds !important to every declaration so main.css can be injected as a
// user-origin sheet that page styles (even !important ones) can't override.
// Keyframe blocks are left alone because !important is invalid there.
// Assumes no ";" or braces inside strings/url() values, which holds for
// main.css.

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WebMarkerCss = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var KEYFRAMES = /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;

  function hardenBlock(body) {
    return body
      .split(";")
      .map(function (decl) {
        if (decl.indexOf(":") === -1 || /!important\s*$/.test(decl)) return decl;
        return decl.replace(/\s*$/, " !important");
      })
      .join(";");
  }

  function harden(css) {
    var kept = [];
    var text = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(KEYFRAMES, function (block) {
        kept.push(block);
        return "\u0000" + (kept.length - 1) + "\u0000";
      });
    text = text.replace(/\{([^{}]*)\}/g, function (match, body) {
      return "{" + hardenBlock(body) + "}";
    });
    return text.replace(/\u0000(\d+)\u0000/g, function (match, i) {
      return kept[Number(i)];
    });
  }

  return { harden: harden };
});
