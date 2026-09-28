// Web Marker - Toolbar UI
// Floating, draggable, collapsible toolbar plus the save menu, shortcut
// help, and toast messages. All markup lives under #webMarker_ui.

var WebMarker = WebMarker || {};

(function () {
  "use strict";

  const U = WebMarker.util;
  const C = WebMarkerConstants;
  const EDGE = 8;
  const MAX_RECENT = 4;

  const ACTIONS = [
    { id: "undo", label: "Undo", shortcut: "Shift+Z" },
    { id: "redo", label: "Redo", shortcut: "Shift+R" },
    { id: "clear", label: "Clear canvas", shortcut: "Shift+X" },
    { id: "save", label: "Save / export", shortcut: "Shift+S", menu: true },
    { id: "dashboard", label: "Open whiteboard", pageOnly: true },
    { id: "help", label: "Keyboard shortcuts", shortcut: "?" },
    { id: "exit", label: "Exit", shortcut: "Esc", pageOnly: true },
  ];

  function keyLabel(keys) {
    return keys.map((k) => `<kbd class="wm-kbd">${U.escapeHtml(k)}</kbd>`).join('<span class="wm-plus">+</span>');
  }

  WebMarker.createToolbar = function (ctx) {
    const state = ctx.state;
    const isBoard = ctx.mode === "board";
    const tools = C.TOOLS.filter((t) => !(isBoard && t.pageOnly));
    const actions = ACTIONS.filter((a) => !(isBoard && a.pageOnly));

    const root = document.createElement("div");
    root.id = "webMarker_ui";
    root.setAttribute("data-mode", ctx.mode);

    const toolButtons = tools
      .map(
        (t) =>
          `<button type="button" class="wm-btn wm-tool" data-tool="${t.id}" aria-pressed="false" ` +
          `aria-label="${t.label}" title="${t.label} (Shift+${t.key})">${U.icon(t.id)}</button>`
      )
      .join("");

    const actionButtons = actions
      .map(
        (a) =>
          `<button type="button" class="wm-btn wm-action" data-action="${a.id}" aria-label="${a.label}" ` +
          `title="${a.label}${a.shortcut ? ` (${a.shortcut})` : ""}"` +
          `${a.menu ? ' aria-haspopup="menu" aria-expanded="false"' : ""}>${U.icon(a.id)}` +
          `${a.id === "exit" ? '<span class="wm-btn-text">Close</span>' : ""}</button>`
      )
      .join("");

    const swatches = C.PRESET_COLORS.map(
      (c) =>
        `<button type="button" class="wm-swatch" data-color="${c}" style="--wm-swatch:${c}" ` +
        `aria-label="Color ${c}" aria-pressed="false" title="${c}"></button>`
    ).join("");

    const fontOptions = C.FONTS.map((f) => `<option value="${f.value}">${f.label}</option>`).join("");

    U.setMarkup(
      root,
      `
      <div class="wm-toolbar" role="toolbar" aria-label="${C.APP_NAME}" aria-orientation="vertical">
        <div class="wm-header">
          <span class="wm-grip" data-ui="grip" title="Drag to move">${U.icon("grip")}</span>
          <button type="button" class="wm-mini" data-ui="layout" aria-label="Switch layout" title="Switch between vertical and horizontal layout">${U.icon("layout")}</button>
          <button type="button" class="wm-mini" data-ui="collapse" aria-label="Collapse toolbar" aria-expanded="true" title="Collapse">${U.icon("collapse")}</button>
        </div>
        <div class="wm-body">
          <div class="wm-section wm-tools" role="group" aria-label="Tools">${toolButtons}</div>
          <div class="wm-section wm-style">
            <div class="wm-swatches" role="group" aria-label="Colors">${swatches}</div>
            <div class="wm-swatches wm-recent" data-ui="recent" role="group" aria-label="Recent colors"></div>
            <input type="color" class="wm-color-input" data-ui="color" aria-label="Custom color" title="Custom color">
            <div class="wm-field" data-row="size">
              <div class="wm-field-head"><span class="wm-label">Size</span><span class="wm-value" data-ui="size-value"></span></div>
              <div class="wm-field-body">
                <input type="range" class="wm-range" data-ui="size" min="${C.SIZE_MIN}" max="${C.SIZE_MAX}" aria-label="Size">
                <span class="wm-preview" data-ui="preview" aria-hidden="true"><span class="wm-preview-dot"></span></span>
              </div>
            </div>
            <div class="wm-field" data-row="opacity">
              <div class="wm-field-head"><span class="wm-label">Opacity</span><span class="wm-value" data-ui="opacity-value"></span></div>
              <input type="range" class="wm-range" data-ui="opacity" min="5" max="100" aria-label="Opacity">
            </div>
            <div class="wm-field" data-row="text">
              <select class="wm-select" data-ui="font" aria-label="Font">${fontOptions}</select>
              <div class="wm-toggles">
                <button type="button" class="wm-btn wm-toggle" data-ui="bold" aria-pressed="false" aria-label="Bold" title="Bold">${U.icon("bold")}</button>
                <button type="button" class="wm-btn wm-toggle" data-ui="textbg" aria-pressed="false" aria-label="Text background" title="Background box behind text">${U.icon("textbg")}</button>
              </div>
            </div>
            <div class="wm-field" data-row="fill">
              <button type="button" class="wm-btn wm-toggle wm-wide" data-ui="fill" aria-pressed="false" title="Fill shapes">${U.icon("fill")}<span class="wm-btn-text">Fill</span></button>
            </div>
          </div>
          <div class="wm-section wm-actions" role="group" aria-label="Actions">${actionButtons}</div>
        </div>
      </div>
      <div class="wm-menu" data-ui="save-menu" role="menu" aria-label="Save" hidden></div>
      <div class="wm-overlay" data-ui="help" hidden>
        <div class="wm-dialog" role="dialog" aria-modal="true" aria-labelledby="webMarker_helpTitle">
          <div class="wm-dialog-head">
            <span class="wm-dialog-title" id="webMarker_helpTitle">Keyboard shortcuts</span>
            <button type="button" class="wm-mini" data-ui="help-close" aria-label="Close">${U.icon("exit")}</button>
          </div>
          <div class="wm-shortcuts" data-ui="shortcuts"></div>
        </div>
      </div>
      <div class="wm-toasts" aria-live="polite"></div>`
    );

    (document.documentElement || document.body).appendChild(root);

    const q = (sel) => root.querySelector(sel);
    const bar = q(".wm-toolbar");
    const menu = q('[data-ui="save-menu"]');
    const help = q('[data-ui="help"]');
    const toasts = q(".wm-toasts");
    const colorInput = q('[data-ui="color"]');
    const sizeInput = q('[data-ui="size"]');
    const opacityInput = q('[data-ui="opacity"]');
    const fontSelect = q('[data-ui="font"]');
    const saveButton = q('[data-action="save"]');
    const preview = q('[data-ui="preview"]');

    // --- Theme and layout ------------------------------------------------------

    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function applyTheme() {
      const theme = ctx.settings.theme === "auto" ? (darkQuery.matches ? "dark" : "light") : ctx.settings.theme;
      root.setAttribute("data-theme", theme);
    }
    ctx.listen(darkQuery, "change", applyTheme);
    applyTheme();

    function applyLayout() {
      bar.setAttribute("data-layout", ctx.settings.layout);
      bar.setAttribute("aria-orientation", ctx.settings.layout);
    }
    applyLayout();

    function applyCollapsed() {
      const collapsed = !!ctx.uiState.collapsed;
      bar.classList.toggle("wm-collapsed", collapsed);
      const btn = q('[data-ui="collapse"]');
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-label", collapsed ? "Expand toolbar" : "Collapse toolbar");
      btn.title = collapsed ? "Expand" : "Collapse";
      U.setMarkup(btn, U.icon(collapsed ? "expand" : "collapse"));
    }
    applyCollapsed();

    // --- Position --------------------------------------------------------------

    function clampPosition(left, top) {
      const w = bar.offsetWidth;
      const h = Math.min(bar.offsetHeight, 48);
      return {
        left: Math.round(Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE)),
        top: Math.round(Math.min(Math.max(EDGE, top), window.innerHeight - h - EDGE)),
      };
    }

    function current() {
      const r = bar.getBoundingClientRect();
      return { left: r.left, top: r.top };
    }

    function place(left, top) {
      const p = clampPosition(left, top);
      // Positions go through custom properties so the hardened stylesheet
      // (user-origin, !important) can still read them.
      bar.style.setProperty("--wm-left", p.left + "px");
      bar.style.setProperty("--wm-top", p.top + "px");
      return p;
    }

    function placeInitial() {
      const saved = ctx.uiState.position;
      if (saved && typeof saved.left === "number") place(saved.left, saved.top);
      else place(window.innerWidth - bar.offsetWidth - 16, 16);
    }
    placeInitial();
    ctx.listen(window, "resize", () => {
      const p = current();
      place(p.left, p.top);
    });

    function reclamp() {
      const p = current();
      place(p.left, p.top);
    }

    function savePosition() {
      ctx.uiState.position = current();
      WebMarkerStorage.setUiState({ position: ctx.uiState.position });
    }

    // Drag from the header only, so sliders and pickers work normally.
    const header = q(".wm-header");
    ctx.listen(header, "pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault();
      const start = current();
      const startX = e.clientX - start.left;
      const startY = e.clientY - start.top;
      try {
        header.setPointerCapture(e.pointerId);
      } catch (err) {
        // Not fatal: moves are tracked on the window below.
      }
      bar.classList.add("wm-dragging");
      const move = (ev) => place(ev.clientX - startX, ev.clientY - startY);
      const up = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", up, true);
        bar.classList.remove("wm-dragging");
        savePosition();
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("pointercancel", up, true);
    });

    // --- Style controls ---------------------------------------------------------

    function renderRecent() {
      const recent = (ctx.uiState.recentColors || []).slice(0, MAX_RECENT);
      const box = q('[data-ui="recent"]');
      U.setMarkup(
        box,
        recent
          .map(U.escapeHtml)
          .map(
            (c) =>
              `<button type="button" class="wm-swatch" data-color="${c}" style="--wm-swatch:${c}" ` +
              `aria-label="Recent color ${c}" aria-pressed="false" title="${c}"></button>`
          )
          .join("")
      );
      box.hidden = recent.length === 0;
    }
    renderRecent();

    function rememberColor(hex) {
      const color = hex.toLowerCase();
      if (C.PRESET_COLORS.indexOf(color) !== -1) return;
      const recent = [color].concat((ctx.uiState.recentColors || []).filter((c) => c !== color)).slice(0, MAX_RECENT);
      ctx.uiState.recentColors = recent;
      WebMarkerStorage.setUiState({ recentColors: recent });
      renderRecent();
    }

    function showRow(name, visible) {
      root.querySelectorAll(`[data-row="${name}"]`).forEach((el) => (el.hidden = !visible));
    }

    function setDot(values) {
      Object.keys(values).forEach((key) => preview.style.setProperty(`--wm-dot-${key}`, values[key]));
    }

    function updateStyleControls() {
      const tool = state.tool;
      const meta = WebMarker.TOOL_META[tool] || {};
      const textSelected = tool === "move" && ctx.tools && ctx.tools.selectedText();

      colorInput.value = state.color.toLowerCase();
      root.querySelectorAll(".wm-swatch").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.color.toLowerCase() === state.color.toLowerCase()));
      });

      showRow("size", !!meta.size);
      if (meta.size) {
        const size = state.sizes[meta.size];
        sizeInput.value = size;
        const shown = size * (meta.fontScale || 1);
        q('[data-ui="size-value"]').textContent = `${shown}px`;
        const dot = preview.firstElementChild;
        preview.setAttribute("data-kind", meta.size === "text" ? "text" : tool === "eraser" ? "eraser" : "dot");
        if (meta.size === "text") {
          dot.textContent = "Aa";
          setDot({
            size: "auto",
            font: Math.min(18, Math.max(9, shown)) + "px",
            color: tool === "note" ? "#1f2937" : state.color,
            bg: tool === "note" ? "#fff3a3" : "transparent",
          });
        } else {
          const d = Math.max(2, Math.min(28, size));
          dot.textContent = "";
          setDot({
            size: d + "px",
            font: "0px",
            color: "transparent",
            bg: tool === "eraser" ? "transparent" : U.hexToRgba(state.color, meta.opacity ? state.opacity[meta.opacity] : 1),
          });
        }
      }

      showRow("opacity", !!meta.opacity);
      if (meta.opacity) {
        const pct = Math.round(state.opacity[meta.opacity] * 100);
        opacityInput.value = pct;
        q('[data-ui="opacity-value"]').textContent = `${pct}%`;
      }

      showRow("text", !!meta.textStyle || !!textSelected);
      fontSelect.value = state.text.font;
      q('[data-ui="bold"]').setAttribute("aria-pressed", String(state.text.bold));
      q('[data-ui="textbg"]').setAttribute("aria-pressed", String(state.text.background));

      showRow("fill", !!meta.fill);
      q('[data-ui="fill"]').setAttribute("aria-pressed", String(state.shapeFill));
    }

    function setActiveTool(id) {
      root.querySelectorAll(".wm-tool").forEach((b) => {
        const active = b.dataset.tool === id;
        b.classList.toggle("wm-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      updateStyleControls();
    }

    function setHistoryState(canUndo, canRedo) {
      const undo = q('[data-action="undo"]');
      const redo = q('[data-action="redo"]');
      undo.disabled = !canUndo;
      redo.disabled = !canRedo;
      undo.setAttribute("aria-disabled", String(!canUndo));
      redo.setAttribute("aria-disabled", String(!canRedo));
    }

    // --- Save menu --------------------------------------------------------------

    U.setMarkup(
      menu,
      ctx.exporter.menuItems
        .map(
          (item) =>
            `<button type="button" class="wm-menu-item" role="menuitem" data-save="${item.id}">` +
            `<span>${item.label}</span>${item.hint ? `<span class="wm-menu-hint">${item.hint}</span>` : ""}</button>`
        )
        .join("")
    );

    function openSaveMenu() {
      if (!menu.hidden) return closeMenu();
      menu.hidden = false;
      saveButton.setAttribute("aria-expanded", "true");
      const barRect = bar.getBoundingClientRect();
      const btnRect = saveButton.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      let left = barRect.left - mw - 8;
      if (left < EDGE) left = Math.min(barRect.right + 8, window.innerWidth - mw - EDGE);
      let top = ctx.settings.layout === "horizontal" ? barRect.bottom + 8 : btnRect.top;
      if (ctx.settings.layout === "horizontal") left = Math.min(Math.max(EDGE, btnRect.left), window.innerWidth - mw - EDGE);
      if (top + mh > window.innerHeight - EDGE) top = Math.max(EDGE, window.innerHeight - mh - EDGE);
      menu.style.setProperty("--wm-left", Math.max(EDGE, left) + "px");
      menu.style.setProperty("--wm-top", top + "px");
      menu.querySelector(".wm-menu-item").focus();
    }

    function closeMenu() {
      if (menu.hidden) return false;
      menu.hidden = true;
      saveButton.setAttribute("aria-expanded", "false");
      return true;
    }

    ctx.listen(
      document,
      "pointerdown",
      (e) => {
        if (!menu.hidden && !menu.contains(e.target) && !saveButton.contains(e.target)) closeMenu();
      },
      true
    );

    ctx.listen(menu, "keydown", (e) => {
      const items = Array.from(menu.querySelectorAll(".wm-menu-item"));
      const i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      }
    });

    // --- Help ---------------------------------------------------------------------

    U.setMarkup(
      q('[data-ui="shortcuts"]'),
      C.SHORTCUTS.filter((s) => !(isBoard && s.pageOnly) && !(!isBoard && s.boardOnly))
        .map((s) => `<div class="wm-shortcut"><span class="wm-keys">${keyLabel(s.keys)}</span><span>${U.escapeHtml(s.action)}</span></div>`)
        .join("")
    );

    function toggleHelp(force) {
      const show = typeof force === "boolean" ? force : help.hidden;
      help.hidden = !show;
      if (show) q('[data-ui="help-close"]').focus();
    }

    ctx.listen(help, "click", (e) => {
      if (e.target === help) toggleHelp(false);
    });

    function closeOverlays() {
      if (!help.hidden) {
        toggleHelp(false);
        return true;
      }
      return closeMenu();
    }

    // --- Toasts ------------------------------------------------------------------

    function toast(message, options) {
      const opts = options || {};
      if (opts.key) {
        const existing = toasts.querySelector(`[data-key="${opts.key}"]`);
        if (existing) existing.remove();
      }
      const el = document.createElement("div");
      el.className = "wm-toast" + (opts.type === "error" ? " wm-toast-error" : "");
      el.setAttribute("role", opts.type === "error" ? "alert" : "status");
      if (opts.key) el.setAttribute("data-key", opts.key);
      const text = document.createElement("span");
      text.textContent = message;
      el.appendChild(text);
      const dismiss = () => el.remove();
      if (opts.action) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wm-toast-action";
        btn.textContent = opts.action.label;
        btn.addEventListener("click", () => {
          opts.action.onClick();
          dismiss();
        });
        el.appendChild(btn);
      }
      toasts.appendChild(el);
      while (toasts.children.length > 3) toasts.firstElementChild.remove();
      ctx.later(dismiss, opts.duration || (opts.action ? 6000 : opts.type === "error" ? 6000 : 2500));
    }

    // --- Events -------------------------------------------------------------------

    ctx.listen(root, "click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !root.contains(btn) || btn.disabled) return;
      const d = btn.dataset;
      if (d.tool) {
        ctx.setTool(d.tool);
      } else if (d.color) {
        ctx.setColor(d.color);
      } else if (d.save) {
        closeMenu();
        ctx.exporter.run(d.save);
      } else if (d.action) {
        if (d.action === "save") openSaveMenu();
        else if (d.action === "help") toggleHelp();
        else ctx.runAction(d.action);
      } else if (d.ui === "collapse") {
        ctx.uiState.collapsed = !ctx.uiState.collapsed;
        applyCollapsed();
        reclamp();
        WebMarkerStorage.setUiState({ collapsed: ctx.uiState.collapsed });
      } else if (d.ui === "layout") {
        ctx.settings.layout = ctx.settings.layout === "vertical" ? "horizontal" : "vertical";
        applyLayout();
        reclamp();
        WebMarkerStorage.setSettings({ layout: ctx.settings.layout });
      } else if (d.ui === "bold" || d.ui === "textbg") {
        const key = d.ui === "bold" ? "bold" : "background";
        ctx.setTextOption(key, !state.text[key]);
      } else if (d.ui === "fill") {
        state.shapeFill = !state.shapeFill;
        updateStyleControls();
      } else if (d.ui === "help-close") {
        toggleHelp(false);
      }
    });

    ctx.listen(colorInput, "input", () => ctx.setColor(colorInput.value, { live: true }));
    ctx.listen(colorInput, "change", () => {
      ctx.setColor(colorInput.value);
      rememberColor(colorInput.value);
    });
    ctx.listen(sizeInput, "input", () => ctx.setSize(parseInt(sizeInput.value, 10)));
    ctx.listen(opacityInput, "input", () => ctx.setOpacity(parseInt(opacityInput.value, 10) / 100));
    ctx.listen(fontSelect, "change", () => ctx.setTextOption("font", fontSelect.value));

    // Keep page-level handlers from reacting to clicks and keys in the toolbar.
    ["pointerdown", "mousedown", "click", "dblclick", "wheel"].forEach((type) =>
      ctx.listen(root, type, (e) => e.stopPropagation())
    );

    function setHidden(hidden) {
      root.toggleAttribute("data-capture-hidden", hidden);
    }

    function destroy() {
      root.remove();
    }

    return {
      root,
      setActiveTool,
      setHistoryState,
      updateStyleControls,
      toast,
      toggleHelp,
      openSaveMenu,
      closeOverlays,
      setHidden,
      destroy,
    };
  };
})();
