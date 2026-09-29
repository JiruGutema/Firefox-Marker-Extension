# Web Marker
<img width="1909" height="1077" alt="Screenshot From 2026-09-27 19-51-26" src="https://github.com/user-attachments/assets/499f5cee-3d21-44f2-8f13-170bfd4a4dfe" />

A Firefox extension for drawing on and annotating any webpage: pen, highlighter, shapes, arrows, text, sticky notes and a laser pointer, plus an infinite whiteboard.

## Features

- **Drawing tools**: pen (with stylus pressure), highlighter, eraser, line, arrow, rectangle, ellipse, text, sticky notes and a laser pointer. Hold **Shift** for straight lines, 45° angles, squares and circles.
- **Toolbar**: floating, draggable, collapsible, vertical or horizontal, light or dark. It has color swatches, recent colors, opacity, and size with a live preview.
- **Saving**: drawings are saved per page automatically and come back when you reopen the marker. You can optionally show them as soon as the page loads.
- **Export**: visible or full-page screenshot (PNG/PDF), drawing-only PNG or SVG, copy to clipboard, or open in a new tab.
- **Whiteboard**: multiple boards on an infinite canvas with pan and zoom, several backgrounds, and PNG/SVG/PDF export.
- **Saved drawings manager**: browse, open and delete saved drawings, export and import backups, and delete old drawings automatically.

## Using it

- Click the toolbar button, press **Alt+Shift+M**, or right-click a page and choose **Annotate this page**.
- Press **?** while the marker is open to see all keyboard shortcuts.
- Settings, saved drawings and the shortcut list are on the options page (`about:addons` → Web Marker → Preferences).

Web Marker can't run on protected pages (browser pages, the add-ons site, the PDF viewer). The toolbar button shows a **!** badge there.

## Development

The extension is plain JavaScript, HTML and CSS, with no build step.

### Load it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json`.

Or, with Node.js installed:

```bash
npm install
npm start        # web-ext run: launches Firefox with the extension loaded
npm run lint     # web-ext lint
npm test         # unit tests (node --test)
npm run build    # zip for addons.mozilla.org, in web-ext-artifacts/
```

### Layout

| Path | What it is |
|------|------------|
| `background.js` | Event page. Injects the marker, and handles screenshots, the clipboard, menus, auto-open and cleanup. |
| `content/` | The marker itself. `main.js` (lifecycle), `toolbar.js`, `tools.js`, `history.js`, `exporter.js`, `shortcuts.js`, `brushes.js` (pressure pen), `board.js` (whiteboard pan and zoom). |
| `shared/` | Code used everywhere. `storage.js` (settings, drawings, boards), `constants.js` (tools and shortcuts), `pdf.js`, `css.js`, and `ui.css` for extension pages. |
| `main.css` | Canvas and toolbar styles. On web pages it's injected as a hardened user-origin stylesheet, so page CSS can't restyle the toolbar. |
| `options.*`, `whiteboard.*`, `viewer.*` | Extension pages. |
| `tests/` | Unit tests for the pure modules. |

## Third-party libraries

- **Fabric.js** (`fabric.min.js`, v4.6.0, with the eraser brush)
  - Purpose: HTML5 canvas library for interactive drawing.
  - License: MIT
  - Source: [fabricjs.com](https://fabricjs.com/)
