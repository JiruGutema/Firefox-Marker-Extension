// Web Marker - Whiteboard page
// Manages the list of boards and the background, and runs the marker in
// "board" mode (infinite canvas) for the selected board.

(function () {
  "use strict";

  const S = WebMarkerStorage;
  const $ = (sel) => document.querySelector(sel);
  const INTRO_KEY = "webMarker_whiteboardIntroSeen";

  const BACKGROUNDS = {
    white: { color: "#ffffff", pattern: null },
    grid: { color: "#ffffff", pattern: "grid", ink: "rgba(0, 0, 0, 0.08)" },
    dots: { color: "#ffffff", pattern: "dots", ink: "rgba(0, 0, 0, 0.3)" },
    lines: { color: "#ffffff", pattern: "lines", ink: "rgba(0, 0, 0, 0.18)" },
    dark: { color: "#1a1a1a", pattern: null },
    "dark-grid": { color: "#1a1a1a", pattern: "grid", ink: "rgba(255, 255, 255, 0.08)" },
    "dark-dots": { color: "#1a1a1a", pattern: "dots", ink: "rgba(255, 255, 255, 0.3)" },
    "dark-lines": { color: "#1a1a1a", pattern: "lines", ink: "rgba(255, 255, 255, 0.18)" },
  };
  const CELL = 20;

  const grid = $("#grid");
  const boardSelect = $("#boardSelect");
  const backgroundSelect = $("#backgroundSelect");
  const zoomLabel = $("#zoomReset");

  let boards = [];
  let activeId = null;
  let instance = null;
  let background = BACKGROUNDS.grid;
  let viewport = [1, 0, 0, 1, 0, 0];

  // --- Background ----------------------------------------------------------

  function patternImage(bg) {
    if (bg.pattern === "grid") {
      return `linear-gradient(${bg.ink} 1px, transparent 1px), linear-gradient(90deg, ${bg.ink} 1px, transparent 1px)`;
    }
    if (bg.pattern === "dots") return `radial-gradient(circle, ${bg.ink} 1px, transparent 1.5px)`;
    if (bg.pattern === "lines") return `linear-gradient(${bg.ink} 1px, transparent 1px)`;
    return "none";
  }

  // Keep the pattern in step with the canvas pan and zoom.
  function syncGrid() {
    const zoom = viewport[0];
    const size = CELL * zoom;
    grid.style.backgroundImage = patternImage(background);
    const x = viewport[4];
    const y = viewport[5];
    if (background.pattern === "lines") {
      grid.style.backgroundSize = `100% ${size}px`;
      grid.style.backgroundPosition = `0 ${y}px`;
    } else if (background.pattern === "dots") {
      grid.style.backgroundSize = `${size}px ${size}px`;
      grid.style.backgroundPosition = `${x - size / 2}px ${y - size / 2}px`;
    } else {
      grid.style.backgroundSize = `${size}px ${size}px`;
      grid.style.backgroundPosition = `${x}px ${y}px`;
    }
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function applyBackground(name) {
    const key = BACKGROUNDS[name] ? name : "grid";
    background = BACKGROUNDS[key];
    backgroundSelect.value = key;
    document.body.style.background = background.color;
    syncGrid();
  }

  // --- Dialogs -------------------------------------------------------------------

  function askName(title, initial, okLabel) {
    const dialog = $("#nameDialog");
    const input = $("#nameInput");
    $("#nameTitle").textContent = title;
    $("#nameOk").textContent = okLabel || "Save";
    input.value = initial || "";
    dialog.returnValue = "";
    dialog.showModal();
    input.select();
    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => resolve(dialog.returnValue === "ok" ? input.value.trim() || initial || "Untitled board" : null),
        { once: true }
      );
    });
  }

  function confirmDelete(name) {
    const dialog = $("#confirmDialog");
    $("#confirmTitle").textContent = `Delete "${name}"?`;
    $("#confirmMessage").textContent = "The board and everything on it will be deleted. This can't be undone.";
    dialog.returnValue = "";
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    });
  }

  // --- Boards ----------------------------------------------------------------------

  function renderBoardSelect() {
    boardSelect.textContent = "";
    boards.forEach((b) => {
      const option = document.createElement("option");
      option.value = b.id;
      option.textContent = b.name;
      boardSelect.appendChild(option);
    });
    boardSelect.value = activeId;
    $("#deleteBoard").disabled = boards.length < 2;
  }

  function activeBoard() {
    return boards.find((b) => b.id === activeId);
  }

  async function openBoard(id) {
    if (instance) await instance.exit();
    instance = null;
    activeId = id;
    history.replaceState(null, "", `#board=${encodeURIComponent(id)}`);
    renderBoardSelect();
    const board = activeBoard();
    document.title = `${board ? board.name : "Whiteboard"} · Web Marker`;
    applyBackground(board && board.background);
    instance = await WebMarker.start({
      mode: "board",
      boardId: id,
      getBackgroundColor: () => background.color,
      onViewportChange: (vpt) => {
        viewport = vpt;
        syncGrid();
      },
    });
  }

  boardSelect.addEventListener("change", () => openBoard(boardSelect.value));

  $("#newBoard").addEventListener("click", async () => {
    const name = await askName("New board", `Board ${boards.length + 1}`, "Create");
    if (name === null) return;
    const board = await S.createBoard(name);
    board.background = activeBoard() ? activeBoard().background : "grid";
    await S.updateBoard(board.id, { background: board.background });
    boards = await S.listBoards();
    openBoard(board.id);
  });

  $("#renameBoard").addEventListener("click", async () => {
    const board = activeBoard();
    if (!board) return;
    const name = await askName("Rename board", board.name, "Rename");
    if (name === null) return;
    await S.updateBoard(board.id, { name });
    boards = await S.listBoards();
    renderBoardSelect();
    document.title = `${name} · Web Marker`;
  });

  $("#deleteBoard").addEventListener("click", async () => {
    const board = activeBoard();
    if (!board || boards.length < 2) return;
    if (!(await confirmDelete(board.name))) return;
    if (instance) await instance.exit();
    instance = null;
    await S.deleteBoard(board.id);
    boards = await S.listBoards();
    openBoard(boards[0].id);
  });

  backgroundSelect.addEventListener("change", () => {
    applyBackground(backgroundSelect.value);
    if (activeId) {
      S.updateBoard(activeId, { background: backgroundSelect.value }).then(async () => {
        boards = await S.listBoards();
      });
    }
  });

  $("#zoomIn").addEventListener("click", () => instance && instance.board.zoomBy(1.25));
  $("#zoomOut").addEventListener("click", () => instance && instance.board.zoomBy(0.8));
  $("#zoomReset").addEventListener("click", () => instance && instance.board.resetView());
  $("#helpButton").addEventListener("click", () => $("#introDialog").showModal());

  window.addEventListener("hashchange", () => {
    const id = boardFromHash();
    if (id && id !== activeId && boards.some((b) => b.id === id)) openBoard(id);
  });

  function boardFromHash() {
    const m = /board=([^&]+)/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // --- Init ------------------------------------------------------------------------------

  async function init() {
    boards = await S.listBoards();
    if (!boards.length) {
      const first = await S.createBoard("My board");
      // Bring over the drawing from the old single-board whiteboard.
      await S.migrateLegacyWhiteboard(location.href.split("#")[0], first.id);
      boards = await S.listBoards();
    }
    const requested = boardFromHash();
    const byRecent = boards.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const id = boards.some((b) => b.id === requested) ? requested : byRecent[0].id;
    await openBoard(id);

    let introSeen = false;
    try {
      introSeen = localStorage.getItem(INTRO_KEY) === "1";
      localStorage.setItem(INTRO_KEY, "1");
    } catch (e) {
      introSeen = true;
    }
    if (!introSeen) $("#introDialog").showModal();
  }

  init().catch((err) => {
    console.error("Web Marker whiteboard failed to start", err);
    const message = document.createElement("p");
    message.textContent = "The whiteboard couldn't load. Try reloading the page.";
    message.style.cssText = "position:fixed;inset:auto 16px 16px;padding:12px;border-radius:8px;background:#b91c1c;color:#fff";
    document.body.appendChild(message);
  });
})();
