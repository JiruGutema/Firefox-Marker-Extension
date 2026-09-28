// Web Marker - Options page
// Settings (saved automatically), the saved-drawings manager, and the
// shortcut reference.

(function () {
  "use strict";

  const S = WebMarkerStorage;
  const C = WebMarkerConstants;
  const $ = (sel) => document.querySelector(sel);

  let settings = null;

  // --- Tabs ----------------------------------------------------------------

  const TABS = ["settings", "saved", "shortcuts"];

  function showTab(name) {
    const tab = TABS.indexOf(name) === -1 ? "settings" : name;
    document.querySelectorAll(".tab").forEach((btn) => {
      const selected = btn.dataset.tab === tab;
      btn.setAttribute("aria-selected", String(selected));
      btn.tabIndex = selected ? 0 : -1;
    });
    TABS.forEach((t) => {
      $(`#panel-${t}`).hidden = t !== tab;
    });
    if (tab === "saved") renderSaved();
    if (location.hash !== `#${tab}`) history.replaceState(null, "", `#${tab}`);
  }

  document.querySelector(".tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (btn) showTab(btn.dataset.tab);
  });

  document.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const current = TABS.indexOf(document.querySelector('.tab[aria-selected="true"]').dataset.tab);
    const next = TABS[(current + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
    showTab(next);
    document.querySelector(`.tab[data-tab="${next}"]`).focus();
  });

  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  // --- Status messages ---------------------------------------------------------

  function flash(el, message, isError) {
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.textContent = "";
    }, isError ? 6000 : 2500);
  }

  function confirmAction(title, message, okLabel) {
    const dialog = $("#confirmDialog");
    $("#confirmTitle").textContent = title;
    $("#confirmMessage").textContent = message;
    $("#confirmOk").textContent = okLabel || "Delete";
    dialog.returnValue = "";
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    });
  }

  // --- Settings ------------------------------------------------------------------

  const fields = Array.from(document.querySelectorAll("[data-setting]"));

  function fieldValue(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.dataset.scale) return Number(el.value) / Number(el.dataset.scale);
    if (el.type === "range" || el.id === "retentionDays") return Number(el.value);
    return el.value;
  }

  function setField(el, value) {
    if (el.type === "checkbox") el.checked = !!value;
    else if (el.dataset.scale) el.value = Math.round(value * Number(el.dataset.scale));
    else el.value = value;
  }

  function renderOutputs() {
    document.querySelectorAll("[data-output]").forEach((out) => {
      const key = out.dataset.output;
      const value = settings[key];
      if (key === "highlightOpacity") out.textContent = `${Math.round(value * 100)}%`;
      else if (key === "textSize") out.textContent = `${value * 2}px`;
      else out.textContent = `${value}px`;
    });
    renderPreviews();
  }

  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function renderPreviews() {
    const muted = getComputedStyle(document.documentElement).getPropertyValue("--wm-muted").trim() || "#888";
    document.querySelectorAll("[data-preview]").forEach((canvas) => {
      const kind = canvas.dataset.preview;
      const dpr = window.devicePixelRatio || 1;
      const w = 120;
      const h = 40;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const g = canvas.getContext("2d");
      g.scale(dpr, dpr);
      g.clearRect(0, 0, w, h);
      if (kind === "text") {
        const size = Math.min(34, settings.textSize * 2);
        g.fillStyle = settings.penColor;
        g.font = `600 ${size}px Arial, sans-serif`;
        g.textBaseline = "middle";
        g.fillText("Aa", 10, h / 2 + 1);
        return;
      }
      if (kind === "eraser") {
        const r = Math.min(18, settings.eraseThickness / 2);
        g.strokeStyle = muted;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(w / 2, h / 2, Math.max(1, r), 0, Math.PI * 2);
        g.stroke();
        return;
      }
      const highlight = kind === "highlighter";
      g.strokeStyle = highlight ? hexToRgba(settings.penColor, settings.highlightOpacity) : settings.penColor;
      g.lineWidth = Math.min(16, highlight ? settings.highlightThickness : settings.penThickness);
      g.lineCap = highlight ? "square" : "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(14, h * 0.62);
      g.bezierCurveTo(40, h * 0.1, 70, h * 0.95, 106, h * 0.38);
      g.stroke();
    });
  }

  let pending = {};
  let saveTimer = null;

  function queueSave(key, value) {
    settings[key] = value;
    pending[key] = value;
    renderOutputs();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const update = pending;
      pending = {};
      try {
        await S.setSettings(update);
        flash($("#status"), "Saved ✓");
      } catch (err) {
        flash($("#status"), `Couldn't save: ${err.message}`, true);
      }
    }, 250);
  }

  async function onAutoOpenChange(el) {
    const origins = { origins: ["<all_urls>"] };
    if (el.checked) {
      // Must be called straight from the user's click.
      const granted = await browser.permissions.request(origins);
      if (!granted) {
        el.checked = false;
        flash($("#status"), "Permission not granted, so drawings won't open automatically.", true);
        return;
      }
    } else {
      await browser.permissions.remove(origins);
    }
    queueSave("autoOpen", el.checked);
  }

  fields.forEach((el) => {
    const key = el.dataset.setting;
    if (key === "autoOpen") {
      el.addEventListener("change", () => onAutoOpenChange(el));
      return;
    }
    const event = el.type === "range" || el.type === "color" ? "input" : "change";
    el.addEventListener(event, () => queueSave(key, fieldValue(el)));
  });

  async function loadSettings() {
    settings = await S.getSettings();
    // Auto-open is only real if the permission is still granted.
    if (settings.autoOpen && !(await browser.permissions.contains({ origins: ["<all_urls>"] }))) {
      settings.autoOpen = false;
    }
    fields.forEach((el) => setField(el, settings[el.dataset.setting]));
    renderOutputs();
  }

  $("#reset").addEventListener("click", async () => {
    const ok = await confirmAction("Reset settings?", "All settings go back to their defaults. Saved drawings are not affected.", "Reset");
    if (!ok) return;
    await S.resetSettings();
    await browser.permissions.remove({ origins: ["<all_urls>"] }).catch(() => {});
    await loadSettings();
    flash($("#status"), "Settings reset ✓");
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => settings && renderPreviews());

  // --- Saved drawings --------------------------------------------------------------

  function formatDate(ms) {
    if (!ms) return "Date unknown";
    return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "text") node.textContent = v;
      else if (k === "className") node.className = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach((child) => child && node.appendChild(child));
    return node;
  }

  function card({ thumb, title, subtitle, meta, openLabel, onOpen, onDelete }) {
    const thumbBox = el("div", { className: "drawing-thumb" }, [
      thumb ? el("img", { src: thumb, alt: "" }) : el("span", { className: "no-thumb", text: "No preview" }),
    ]);
    const body = el("div", { className: "drawing-body" }, [
      el("span", { className: "drawing-title", text: title, title }),
      subtitle ? el("span", { className: "drawing-url", text: subtitle, title: subtitle }) : null,
      el("span", { className: "drawing-meta", text: meta }),
    ]);
    const open = el("button", { className: "btn", type: "button", text: openLabel });
    open.addEventListener("click", onOpen);
    const del = el("button", { className: "btn btn-danger", type: "button", text: "Delete", "aria-label": `Delete ${title}` });
    del.addEventListener("click", onDelete);
    return el("li", { className: "drawing" }, [thumbBox, body, el("div", { className: "drawing-actions" }, [open, del])]);
  }

  function hostOf(url) {
    try {
      return new URL(url).host || url;
    } catch (e) {
      return url;
    }
  }

  async function renderSaved() {
    const [pages, boards, current] = await Promise.all([S.listPages(), S.listBoards(), S.getSettings()]);

    const pageList = $("#pageList");
    pageList.textContent = "";
    pages.forEach((page) => {
      pageList.appendChild(
        card({
          thumb: page.thumb,
          title: page.title || hostOf(page.url),
          subtitle: page.url,
          meta: `${formatDate(page.updated)} · ${page.objects} mark${page.objects === 1 ? "" : "s"}`,
          openLabel: "Open page",
          onOpen: () => browser.tabs.create({ url: page.url }),
          onDelete: async () => {
            const ok = await confirmAction("Delete this drawing?", page.url);
            if (!ok) return;
            await S.deleteKeys([page.key]);
            renderSaved();
          },
        })
      );
    });
    $("#pageEmpty").hidden = pages.length > 0;

    const boardList = $("#boardList");
    boardList.textContent = "";
    boards
      .slice()
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .forEach((board) => {
        const li = card({
          thumb: null,
          title: board.name,
          subtitle: "",
          meta: `Edited ${formatDate(board.updated)}`,
          openLabel: "Open board",
          onOpen: () => browser.tabs.create({ url: browser.runtime.getURL(`whiteboard.html#board=${encodeURIComponent(board.id)}`) }),
          onDelete: async () => {
            const ok = await confirmAction(`Delete "${board.name}"?`, "The board and everything on it will be deleted.");
            if (!ok) return;
            await S.deleteBoard(board.id);
            renderSaved();
          },
        });
        boardList.appendChild(li);
        // Board thumbnails live in the board record.
        S.loadBoard(board.id).then((record) => {
          if (record && record.thumb) {
            const box = li.querySelector(".drawing-thumb");
            box.textContent = "";
            box.appendChild(el("img", { src: record.thumb, alt: "" }));
          }
        });
      });
    $("#boardEmpty").hidden = boards.length > 0;

    const summary = pages.length
      ? `${pages.length} page${pages.length === 1 ? "" : "s"} with drawings. Open a page, then click Web Marker to see its drawing${current.autoOpen ? " (or wait, since drawings open automatically)" : ""}.`
      : "Drawings you make on pages are saved here automatically.";
    $("#savedSummary").textContent = summary;
    $("#deleteAll").disabled = pages.length === 0;
    $("#exportAll").disabled = pages.length === 0 && boards.length === 0;
    const cleanup = $("#cleanup");
    cleanup.hidden = !current.retentionDays;
    cleanup.textContent = `Delete older than ${current.retentionDays} days`;
  }

  $("#deleteAll").addEventListener("click", async () => {
    const pages = await S.listPages();
    const ok = await confirmAction(
      "Delete all page drawings?",
      `This removes ${pages.length} saved drawing${pages.length === 1 ? "" : "s"}. Whiteboards are kept. Export first if you want a backup.`,
      "Delete all"
    );
    if (!ok) return;
    await S.deleteKeys(pages.map((p) => p.key));
    renderSaved();
    flash($("#savedStatus"), "All page drawings deleted");
  });

  $("#cleanup").addEventListener("click", async () => {
    const removed = await S.deleteOlderThan(settings.retentionDays);
    renderSaved();
    flash($("#savedStatus"), removed ? `Deleted ${removed} old drawing${removed === 1 ? "" : "s"}` : "Nothing old enough to delete");
  });

  $("#exportAll").addEventListener("click", async () => {
    const data = await S.exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: `web-marker-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    flash($("#savedStatus"), "Export downloaded");
  });

  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const result = await S.importAll(data);
      renderSaved();
      flash($("#savedStatus"), `Imported ${result.pages} page drawing${result.pages === 1 ? "" : "s"} and ${result.boards} whiteboard${result.boards === 1 ? "" : "s"}`);
    } catch (err) {
      flash($("#savedStatus"), `Import failed: ${err.message}`, true);
    }
  });

  // --- Shortcuts -------------------------------------------------------------------

  function renderShortcuts() {
    const rows = $("#shortcutRows");
    C.SHORTCUTS.forEach((s) => {
      const keys = el("td");
      s.keys.forEach((k, i) => {
        if (i) keys.appendChild(el("span", { className: "plus", text: "+" }));
        keys.appendChild(el("kbd", { text: k }));
      });
      const action = el("td", { text: s.action });
      if (s.boardOnly) action.appendChild(el("span", { className: "tag", text: "Whiteboard" }));
      if (s.pageOnly) action.appendChild(el("span", { className: "tag", text: "Pages" }));
      rows.appendChild(el("tr", {}, [keys, action]));
    });

    browser.commands.getAll().then((commands) => {
      const toggle = commands.find((c) => c.name === "_execute_browser_action");
      if (!toggle) return;
      const box = $("#toggleShortcut");
      box.textContent = "";
      if (!toggle.shortcut) {
        box.textContent = "(no shortcut set)";
        return;
      }
      toggle.shortcut.split("+").forEach((k, i) => {
        if (i) box.appendChild(document.createTextNode(" + "));
        box.appendChild(el("kbd", { text: k }));
      });
    });
  }

  // --- Init ----------------------------------------------------------------------------

  renderShortcuts();
  loadSettings().then(() => showTab(location.hash.slice(1)));
})();
