// Web Marker - Shared storage helpers
// Settings, saved page drawings, whiteboards and small bits of UI state.
// Loaded by the background script, the options page, the whiteboard and the
// injected content scripts.
//
// Saved drawing format (v2), stored in storage.local:
//   webMarker_canvas_<normalized url> -> {
//     v: 2, url, title, updated (ms), canvas (Fabric JSON object),
//     page: { width, height } | null, thumb (PNG data URL) | null
//   }
// Older versions stored the Fabric JSON *string* under the full URL; those
// entries are still read and are migrated the first time they are opened.

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WebMarkerStorage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CANVAS_PREFIX = "webMarker_canvas_";
  var BOARD_PREFIX = "webMarker_board_";
  var BOARDS_INDEX = "webMarker_boards";
  var UI_KEY = "webMarker_ui";
  var TMP_IMAGE_PREFIX = "webMarker_tmpImage_";
  var EXPORT_FORMAT = "web-marker-export";

  var DEFAULT_SETTINGS = {
    penColor: "#FF0000",
    penThickness: 5,
    highlightThickness: 22,
    eraseThickness: 30,
    textSize: 20,
    highlightOpacity: 0.3,
    theme: "auto", // auto | light | dark
    layout: "vertical", // vertical | horizontal
    urlMatch: "page", // page (ignore #hash) | path (ignore ?query and #hash) | exact
    pressure: true,
    autoOpen: false,
    retentionDays: 0, // 0 = keep forever
  };

  var DEFAULT_UI_STATE = {
    position: null, // { left, top } in CSS px
    collapsed: false,
    recentColors: [],
  };

  function ext() {
    if (typeof browser !== "undefined") return browser;
    throw new Error("WebExtension API is not available");
  }

  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function oneOf(value, allowed, fallback) {
    return allowed.indexOf(value) === -1 ? fallback : value;
  }

  // Coerce whatever is stored (older versions saved slider values as strings)
  // into a complete, valid settings object.
  function sanitizeSettings(raw) {
    var s = Object.assign({}, DEFAULT_SETTINGS, raw || {});
    var d = DEFAULT_SETTINGS;
    return {
      penColor: /^#[0-9a-f]{6}$/i.test(s.penColor) ? s.penColor : d.penColor,
      penThickness: Math.round(clampNumber(s.penThickness, 1, 60, d.penThickness)),
      highlightThickness: Math.round(clampNumber(s.highlightThickness, 1, 60, d.highlightThickness)),
      eraseThickness: Math.round(clampNumber(s.eraseThickness, 1, 60, d.eraseThickness)),
      textSize: Math.round(clampNumber(s.textSize, 1, 60, d.textSize)),
      highlightOpacity: clampNumber(s.highlightOpacity, 0.05, 1, d.highlightOpacity),
      theme: oneOf(s.theme, ["auto", "light", "dark"], d.theme),
      layout: oneOf(s.layout, ["vertical", "horizontal"], d.layout),
      urlMatch: oneOf(s.urlMatch, ["page", "path", "exact"], d.urlMatch),
      pressure: s.pressure !== false,
      autoOpen: s.autoOpen === true,
      retentionDays: Math.round(clampNumber(s.retentionDays, 0, 3650, d.retentionDays)),
    };
  }

  function getSettings() {
    return ext()
      .storage.sync.get(DEFAULT_SETTINGS)
      .then(sanitizeSettings);
  }

  function setSettings(partial) {
    return ext().storage.sync.set(partial);
  }

  function resetSettings() {
    return ext().storage.sync.set(Object.assign({}, DEFAULT_SETTINGS));
  }

  // --- URLs ---------------------------------------------------------------

  function normalizeUrl(href, mode) {
    var url;
    try {
      url = new URL(href);
    } catch (e) {
      return String(href);
    }
    if (mode === "exact") return url.href;
    url.hash = "";
    if (mode === "path") url.search = "";
    return url.href;
  }

  function pageKey(href, mode) {
    return CANVAS_PREFIX + normalizeUrl(href, mode);
  }

  function isExtensionUrl(url) {
    return /^(moz|chrome)-extension:/.test(url);
  }

  // --- Records ------------------------------------------------------------

  // Turn a stored value (v2 object or legacy JSON string) into a v2 record.
  function toRecord(value, key) {
    if (value == null) return null;
    var urlFromKey = key && key.indexOf(CANVAS_PREFIX) === 0 ? key.slice(CANVAS_PREFIX.length) : "";
    if (typeof value === "string") {
      try {
        return {
          v: 2,
          url: urlFromKey,
          title: "",
          updated: 0,
          canvas: JSON.parse(value),
          page: null,
          thumb: null,
          legacy: true,
        };
      } catch (e) {
        return null;
      }
    }
    if (typeof value === "object" && value.canvas && typeof value.canvas === "object") {
      if (!value.url && urlFromKey) value.url = urlFromKey;
      return value;
    }
    return null;
  }

  function isEmptyCanvas(canvasJson) {
    return !canvasJson || !Array.isArray(canvasJson.objects) || canvasJson.objects.length === 0;
  }

  function hasPage(href, mode) {
    var key = pageKey(href, mode);
    var exactKey = CANVAS_PREFIX + href;
    return ext()
      .storage.local.get([key, exactKey])
      .then(function (got) {
        return got[key] != null || got[exactKey] != null;
      });
  }

  // Load the drawing for a page. Entries saved under the exact URL by older
  // versions are moved to the normalized key.
  function loadPage(href, mode) {
    var local = ext().storage.local;
    var key = pageKey(href, mode);
    var exactKey = CANVAS_PREFIX + href;
    return local.get([key, exactKey]).then(function (got) {
      if (got[key] != null) {
        return { key: key, record: toRecord(got[key], key) };
      }
      if (exactKey !== key && got[exactKey] != null) {
        var record = toRecord(got[exactKey], exactKey);
        if (!record) return { key: key, record: null };
        record.url = normalizeUrl(href, mode);
        var update = {};
        update[key] = record;
        return local
          .set(update)
          .then(function () {
            return local.remove(exactKey);
          })
          .then(function () {
            return { key: key, record: record };
          });
      }
      return { key: key, record: null };
    });
  }

  // Save a page drawing. Empty drawings are removed instead of stored.
  function savePage(key, record) {
    var local = ext().storage.local;
    if (isEmptyCanvas(record.canvas)) {
      return local.remove(key).then(function () {
        return false;
      });
    }
    var update = {};
    update[key] = record;
    return local.set(update).then(function () {
      return true;
    });
  }

  function summarize(key, record) {
    var url = record.url || key.slice(CANVAS_PREFIX.length);
    return {
      key: key,
      url: url,
      title: record.title || "",
      updated: record.updated || 0,
      thumb: record.thumb || null,
      objects: (record.canvas.objects || []).length,
    };
  }

  function listPages() {
    return ext()
      .storage.local.get(null)
      .then(function (all) {
        return Object.keys(all)
          .filter(function (key) {
            return key.indexOf(CANVAS_PREFIX) === 0;
          })
          .map(function (key) {
            var record = toRecord(all[key], key);
            if (!record) return null;
            var summary = summarize(key, record);
            return isExtensionUrl(summary.url) ? null : summary;
          })
          .filter(Boolean)
          .sort(function (a, b) {
            return b.updated - a.updated;
          });
      });
  }

  function deleteKeys(keys) {
    return ext().storage.local.remove(keys);
  }

  // Delete page drawings not updated in `days` days. Legacy entries have no
  // date and are left alone. Returns the number of deleted drawings.
  function deleteOlderThan(days, now) {
    if (!days || days <= 0) return Promise.resolve(0);
    var cutoff = (now || Date.now()) - days * 24 * 60 * 60 * 1000;
    return listPages().then(function (pages) {
      var stale = pages
        .filter(function (p) {
          return p.updated > 0 && p.updated < cutoff;
        })
        .map(function (p) {
          return p.key;
        });
      if (!stale.length) return 0;
      return deleteKeys(stale).then(function () {
        return stale.length;
      });
    });
  }

  // --- Whiteboards ----------------------------------------------------------

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function listBoards() {
    return ext()
      .storage.local.get(BOARDS_INDEX)
      .then(function (got) {
        var index = got[BOARDS_INDEX];
        return Array.isArray(index) ? index : [];
      });
  }

  function writeBoards(index) {
    var update = {};
    update[BOARDS_INDEX] = index;
    return ext().storage.local.set(update);
  }

  function createBoard(name) {
    return listBoards().then(function (index) {
      var now = Date.now();
      var board = { id: newId(), name: name || "Untitled board", created: now, updated: now, background: "grid" };
      index.push(board);
      return writeBoards(index).then(function () {
        return board;
      });
    });
  }

  function updateBoard(id, changes) {
    return listBoards().then(function (index) {
      var board = index.find(function (b) {
        return b.id === id;
      });
      if (!board) return null;
      Object.assign(board, changes);
      return writeBoards(index).then(function () {
        return board;
      });
    });
  }

  function deleteBoard(id) {
    return listBoards().then(function (index) {
      var rest = index.filter(function (b) {
        return b.id !== id;
      });
      return writeBoards(rest).then(function () {
        return ext().storage.local.remove(BOARD_PREFIX + id);
      });
    });
  }

  function loadBoard(id) {
    var key = BOARD_PREFIX + id;
    return ext()
      .storage.local.get(key)
      .then(function (got) {
        return toRecord(got[key], key);
      });
  }

  function saveBoard(id, record) {
    var update = {};
    update[BOARD_PREFIX + id] = record;
    return ext()
      .storage.local.set(update)
      .then(function () {
        return updateBoard(id, { updated: record.updated || Date.now() });
      });
  }

  // Move a drawing saved on the old single whiteboard page into a board.
  function migrateLegacyWhiteboard(whiteboardUrl, boardId) {
    var local = ext().storage.local;
    var keys = [CANVAS_PREFIX + whiteboardUrl, CANVAS_PREFIX + normalizeUrl(whiteboardUrl, "page")];
    return local.get(keys).then(function (got) {
      var key = keys.find(function (k) {
        return got[k] != null;
      });
      if (!key) return false;
      var record = toRecord(got[key], key);
      if (!record) return false;
      record.url = "";
      return saveBoard(boardId, record)
        .then(function () {
          return local.remove(keys);
        })
        .then(function () {
          return true;
        });
    });
  }

  // --- Export / import ------------------------------------------------------

  function exportAll() {
    return ext()
      .storage.local.get(null)
      .then(function (all) {
        var entries = {};
        Object.keys(all).forEach(function (key) {
          if (
            key.indexOf(CANVAS_PREFIX) === 0 ||
            key.indexOf(BOARD_PREFIX) === 0 ||
            key === BOARDS_INDEX
          ) {
            entries[key] = all[key];
          }
        });
        return {
          format: EXPORT_FORMAT,
          version: 1,
          exportedAt: new Date().toISOString(),
          entries: entries,
        };
      });
  }

  // Validate an export file and work out what to write. Pure, so it can be
  // unit tested. Page drawings and boards in the file replace existing ones
  // with the same key; the board list is merged by id.
  function planImport(data, existingBoards) {
    if (!data || data.format !== EXPORT_FORMAT || !data.entries || typeof data.entries !== "object") {
      throw new Error("This file isn't a Web Marker export.");
    }
    var update = {};
    var pages = 0;
    var boards = 0;
    Object.keys(data.entries).forEach(function (key) {
      var value = data.entries[key];
      if (key.indexOf(CANVAS_PREFIX) === 0 || key.indexOf(BOARD_PREFIX) === 0) {
        if (!toRecord(value, key)) return;
        update[key] = value;
        if (key.indexOf(CANVAS_PREFIX) === 0) pages++;
      }
    });
    var imported = data.entries[BOARDS_INDEX];
    var merged = (existingBoards || []).slice();
    if (Array.isArray(imported)) {
      imported.forEach(function (board) {
        if (!board || typeof board.id !== "string") return;
        var i = merged.findIndex(function (b) {
          return b.id === board.id;
        });
        if (i === -1) merged.push(board);
        else merged[i] = board;
        boards++;
      });
      update[BOARDS_INDEX] = merged;
    }
    return { update: update, pages: pages, boards: boards };
  }

  function importAll(data) {
    return listBoards().then(function (existing) {
      var plan = planImport(data, existing);
      return ext()
        .storage.local.set(plan.update)
        .then(function () {
          return { pages: plan.pages, boards: plan.boards };
        });
    });
  }

  // --- UI state -------------------------------------------------------------

  function getUiState() {
    return ext()
      .storage.local.get(UI_KEY)
      .then(function (got) {
        return Object.assign({}, DEFAULT_UI_STATE, got[UI_KEY] || {});
      });
  }

  function setUiState(partial) {
    return getUiState().then(function (state) {
      var update = {};
      update[UI_KEY] = Object.assign(state, partial);
      return ext().storage.local.set(update);
    });
  }

  // --- Temporary images (for the image viewer tab) --------------------------

  function putTempImage(dataUrl) {
    var id = newId();
    var update = {};
    update[TMP_IMAGE_PREFIX + id] = dataUrl;
    return ext()
      .storage.local.set(update)
      .then(function () {
        return id;
      });
  }

  function takeTempImage(id) {
    var key = TMP_IMAGE_PREFIX + id;
    var local = ext().storage.local;
    return local.get(key).then(function (got) {
      return local.remove(key).then(function () {
        return got[key] || null;
      });
    });
  }

  function clearTempImages() {
    var local = ext().storage.local;
    return local.get(null).then(function (all) {
      var keys = Object.keys(all).filter(function (k) {
        return k.indexOf(TMP_IMAGE_PREFIX) === 0;
      });
      return keys.length ? local.remove(keys) : undefined;
    });
  }

  return {
    CANVAS_PREFIX: CANVAS_PREFIX,
    BOARD_PREFIX: BOARD_PREFIX,
    BOARDS_INDEX: BOARDS_INDEX,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    sanitizeSettings: sanitizeSettings,
    getSettings: getSettings,
    setSettings: setSettings,
    resetSettings: resetSettings,
    normalizeUrl: normalizeUrl,
    pageKey: pageKey,
    toRecord: toRecord,
    isEmptyCanvas: isEmptyCanvas,
    hasPage: hasPage,
    loadPage: loadPage,
    savePage: savePage,
    listPages: listPages,
    deleteKeys: deleteKeys,
    deleteOlderThan: deleteOlderThan,
    listBoards: listBoards,
    createBoard: createBoard,
    updateBoard: updateBoard,
    deleteBoard: deleteBoard,
    loadBoard: loadBoard,
    saveBoard: saveBoard,
    migrateLegacyWhiteboard: migrateLegacyWhiteboard,
    exportAll: exportAll,
    planImport: planImport,
    importAll: importAll,
    getUiState: getUiState,
    setUiState: setUiState,
    putTempImage: putTempImage,
    takeTempImage: takeTempImage,
    clearTempImages: clearTempImages,
  };
});
