// Web Marker - Content Script
// This script creates a drawing interface overlay on web pages

// Check if canvas already exists, if so exit, otherwise initialize
if (document.getElementById("webMarker_canvas")) {
  exitMarker();
} else {
  // Get user preferences from storage
  chrome.storage.sync.get(
    {
      penColor: "#FF0000",
      penThickness: 5,
      highlightThickness: 22,
      eraseThickness: 30,
      textSize: 20,
    },
    function (preferences) {
      initializeMarker(preferences);
    },
  );
}

// Function to remove the marker interface
function exitMarker() {
  // Save canvas state before exiting
  const canvas = document.getElementById("webMarker_canvas");
  if (canvas && window.webMarkerFabricCanvas) {
    saveCanvasToStorage();
  }

  const draggable = document.getElementById("webMarker_draggable");
  if (canvas) canvas.remove();
  if (draggable) draggable.remove();
}

// Save canvas state to Chrome storage
function saveCanvasToStorage() {
  if (window.webMarkerFabricCanvas) {
    const canvasData = JSON.stringify(window.webMarkerFabricCanvas);
    const storageKey = `webMarker_canvas_${window.location.href}`;

    chrome.storage.local.set(
      {
        [storageKey]: canvasData,
      },
      function () {
        console.log("Canvas state saved for:", window.location.href);
      },
    );
  }
}

// Load canvas state from Chrome storage
function loadCanvasFromStorage(fabricCanvas) {
  const storageKey = `webMarker_canvas_${window.location.href}`;

  chrome.storage.local.get([storageKey], function (result) {
    if (result[storageKey]) {
      try {
        fabricCanvas.loadFromJSON(result[storageKey], function () {
          fabricCanvas.renderAll();
          console.log("Canvas state loaded for:", window.location.href);
        });
      } catch (error) {
        console.log("Error loading canvas state:", error);
      }
    }
  });
}

// Convert hex color to rgba with opacity
function convertHexToRgba(hexColor, opacity = 0.3) {
  let hex = hexColor.replace("#", "");

  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

// Main initialization function
function initializeMarker(preferences) {
  // Tool state variables
  let isHighlighterMode = false;
  let isEraserMode = false;
  let isPointerMode = false;
  let isTextMode = false;
  let isLineMode = false;
  let isMoveMode = false;
  let isEditingText = false;
  let isDrawingLine = false;
  let currentLine = null;

  // Undo/Redo system
  let canvasState = null;
  let undoStack = [];
  let redoStack = [];

  // Get page dimensions
  const body = document.body;
  const documentElement = document.documentElement;
  const scrollTop = body.scrollTop || documentElement.scrollTop;

  let canvasHeight = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    documentElement.clientHeight,
    documentElement.scrollHeight,
    documentElement.offsetHeight,
  );

  let maxHeight = 7500;
  if (scrollTop + screen.height > maxHeight) {
    maxHeight += Math.floor((scrollTop + screen.height) / 7500) * 7500;
  }

  if (maxHeight > canvasHeight) {
    canvasHeight = maxHeight;
  }

  // Check if page is too tall
  if (canvasHeight > 25000) {
    alert(
      "Web Marker does not support pages with this height. Please try again on a different website.",
    );
    exitMarker();
    return;
  }

  // Create fabric canvas
  const fabricCanvas = new fabric.Canvas("c", { isDrawingMode: true });
  fabric.Object.prototype.transparentCorners = true;
  fabricCanvas.setDimensions({
    width: document.body.clientWidth,
    height: canvasHeight,
  });
  fabricCanvas.wrapperEl.id = "webMarker_canvas";
  document.body.appendChild(fabricCanvas.wrapperEl);

  // Make canvas globally accessible for persistence
  window.webMarkerFabricCanvas = fabricCanvas;

  // Create toolbar
  const toolbar = document.createElement("div");
  toolbar.id = "webMarker_draggable";
  document.body.appendChild(toolbar);

  // Toolbar HTML content
  toolbar.innerHTML = `
    <div id="webMarker_color">
      <div class="webMarker_title">Color</div>
      <input id="webMarker_colorSelect" type="color" value="#FF0000">
    </div>
    <div id="webMarker_tools">
      <div class="webMarker_title webMarker_toolsTitle">Tools</div>
      <div class="webMarker_toolDiv">
        <a id="webMarker_pen" class="webMarker_tool" title="Marker">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          <span>Pen</span>
        </a>
        <a id="webMarker_highlighter" class="webMarker_tool" title="Highlighter">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Highlight</span>
        </a>
        <a id="webMarker_eraser" class="webMarker_tool" title="Eraser">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
          <span>Eraser</span>
        </a>
        <a id="webMarker_pointer" class="webMarker_tool" title="Pointer">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg>
          <span>Pointer</span>
        </a>
        <a id="webMarker_text" class="webMarker_tool" title="Text">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
          <span>Text</span>
        </a>
        <a id="webMarker_move" class="webMarker_tool" title="Move">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
          <span>Move</span>
        </a>
        <a id="webMarker_line" class="webMarker_tool" title="Line">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><line x1="5" y1="19" x2="19" y2="5"></line></svg>
          <span>Line</span>
        </a>
        <a id="webMarker_save" class="webMarker_tool" title="Save Drawing">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          <span>Save</span>
        </a>
        <a id="webMarker_undo" class="webMarker_tool" title="Undo">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
          <span>Undo</span>
        </a>
        <a id="webMarker_redo" class="webMarker_tool" title="Redo">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
          <span>Redo</span>
        </a>
        <a id="webMarker_clear" class="webMarker_tool" title="Clear">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          <span>Clear</span>
        </a>
        <a id="webMarker_dashboard" class="webMarker_tool" title="Dashboard">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          <span>Dashboard</span>
        </a>
        <a id="webMarker_exit" class="webMarker_tool" title="Exit">
          <svg viewBox="0 0 24 24" class="webMarker_icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span>Exit</span>
        </a>
      </div>
    </div>
    <div id="webMarker_size">
      <div class="webMarker_title">Size</div>
      <input type="range" id="webMarker_thicknessSlider" value="5" max="60" min="1">
    </div>
  `;

  // Position toolbar
  toolbar.style.top = scrollTop + "px";

  // Make toolbar draggable
  toolbar.addEventListener("mousedown", function (event) {
    const offsetX =
      event.clientX - parseInt(window.getComputedStyle(this).left);
    const offsetY = event.clientY - parseInt(window.getComputedStyle(this).top);

    function moveToolbar(moveEvent) {
      toolbar.style.top = moveEvent.clientY - offsetY + "px";
      toolbar.style.left = moveEvent.clientX - offsetX + "px";
    }

    function stopDragging() {
      window.removeEventListener("mousemove", moveToolbar);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("contextmenu", stopDragging);
    }

    window.addEventListener("mousemove", moveToolbar);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("contextmenu", stopDragging);
  });

  // Get DOM elements
  const colorPicker = document.getElementById("webMarker_colorSelect");
  const thicknessSlider = document.getElementById("webMarker_thicknessSlider");
  const undoButton = document.getElementById("webMarker_undo");
  const redoButton = document.getElementById("webMarker_redo");

  // Tool buttons
  const penButton = document.getElementById("webMarker_pen");
  const highlighterButton = document.getElementById("webMarker_highlighter");
  const eraserButton = document.getElementById("webMarker_eraser");
  const pointerButton = document.getElementById("webMarker_pointer");
  const textButton = document.getElementById("webMarker_text");
  const moveButton = document.getElementById("webMarker_move");
  const lineButton = document.getElementById("webMarker_line");

  // Set up tool icons
  const toolButtons = document.querySelectorAll(".webMarker_tool");
  const toolFunctions = [
    selectPenTool,
    selectHighlighterTool,
    selectEraserTool,
    selectPointerTool,
    selectTextTool,
    selectMoveTool,
    selectLineTool,
    saveDrawing,
    undoAction,
    redoAction,
    clearCanvas,
    function () {
      window.open(chrome.runtime.getURL("whiteboard.html"), "_blank");
    },
    exitMarker,
  ];

  toolButtons.forEach(function (button, index) {
    button.onclick = toolFunctions[index];
  });

  // Initialize settings - make these variables mutable
  let penThickness = preferences.penThickness;
  let highlightThickness = preferences.highlightThickness;
  let eraseThickness = preferences.eraseThickness;
  let textSize = preferences.textSize;

  penButton.classList.add("active");
  thicknessSlider.value = penThickness;
  colorPicker.value = preferences.penColor;

  // Set up brushes
  const eraserBrush = new fabric.EraserBrush(fabricCanvas);
  const drawingBrush = fabricCanvas.freeDrawingBrush;
  drawingBrush.color = colorPicker.value;
  drawingBrush.width = parseInt(thicknessSlider.value) || 5;

  // Tool selection functions
  function clearToolSelection() {
    toolButtons.forEach((button) => {
      button.classList.remove("active");
    });
  }

  function selectTool(button) {
    fabricCanvas.discardActiveObject().renderAll();
    fabricCanvas.wrapperEl.style.cursor = "crosshair";
    fabricCanvas.wrapperEl.style.pointerEvents = "auto";
    fabricCanvas.selection = true;
    fabricCanvas.isDrawingMode = true;

    // Reset all modes
    isMoveMode =
      isLineMode =
      isHighlighterMode =
      isEraserMode =
      isPointerMode =
      isTextMode =
      isEditingText =
        false;

    clearToolSelection();
    button.classList.add("active");
  }

  function selectPenTool() {
    selectTool(penButton);
    fabricCanvas.freeDrawingBrush = drawingBrush;
    fabricCanvas.freeDrawingBrush.color = colorPicker.value;
    thicknessSlider.value = penThickness;
    fabricCanvas.freeDrawingBrush.width = parseInt(thicknessSlider.value) || 5;
  }

  function selectHighlighterTool() {
    selectTool(highlighterButton);
    isHighlighterMode = true;
    fabricCanvas.freeDrawingBrush = drawingBrush;
    fabricCanvas.freeDrawingBrush.color = convertHexToRgba(colorPicker.value);
    thicknessSlider.value = highlightThickness;
    fabricCanvas.freeDrawingBrush.width = parseInt(thicknessSlider.value) || 5;
  }

  function selectEraserTool() {
    selectTool(eraserButton);
    isEraserMode = true;
    fabricCanvas.freeDrawingBrush = eraserBrush;
    thicknessSlider.value = eraseThickness;
    fabricCanvas.freeDrawingBrush.width = parseInt(thicknessSlider.value) || 5;
  }

  function selectPointerTool() {
    selectTool(pointerButton);
    isPointerMode = true;
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.wrapperEl.style.pointerEvents = "none";
  }

  function selectMoveTool() {
    selectTool(moveButton);
    isMoveMode = true;
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.getObjects().forEach(function (obj) {
      obj.selectable = true;
      obj.hoverCursor = "move";
    });
  }

  function selectTextTool() {
    selectTool(textButton);
    isTextMode = true;
    fabricCanvas.isDrawingMode = false;
    thicknessSlider.value = textSize;
  }

  function selectLineTool() {
    selectTool(lineButton);
    isLineMode = true;
    thicknessSlider.value = penThickness;
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = false;
    makeObjectsNonSelectable();
  }

  function makeObjectsNonSelectable() {
    fabricCanvas.getObjects().forEach(function (obj) {
      obj.selectable = false;
      obj.hoverCursor = "normal";
    });
  }

  // Save drawing function
  function saveDrawing() {
    const toolbar = document.getElementById("webMarker_draggable");

    return new Promise(function (resolve, reject) {
      toolbar.style.display = "none";
      setTimeout(function () {
        if (toolbar.style.display === "none") {
          resolve();
        } else {
          reject();
        }
      }, 500);
    })
      .then(function () {
        chrome.runtime.sendMessage(
          { from: "content_script" },
          function (response) {
            const screenshot = response.screenshot;
            const currentDate = new Date();
            const dateString =
              currentDate.getFullYear() +
              "-" +
              ("0" + (currentDate.getMonth() + 1)).slice(-2) +
              "-" +
              ("0" + currentDate.getDate()).slice(-2);

            // Download screenshot
            const downloadLink = document.createElement("a");
            downloadLink.download =
              "Screenshot_" + dateString + "_WebMarker.png";
            downloadLink.href = screenshot;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Open in new window
            const htmlContent = `
          <h1 style="font-family:Helvetica;">Web Marker Screenshot</h1>
          <img width="100%" src="${screenshot}">
        `;
            const blob = new Blob([htmlContent], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            window.open(url);

            toolbar.style.display = "block";
          },
        );
      })
      .catch(function () {
        console.error("An error occurred while saving.");
      });
  }

  // Clear canvas function
  function clearCanvas() {
    fabricCanvas.clear();
    saveCanvasState();
  }

  // Undo/Redo system
  function toggleButtonState(button, enabled) {
    if (enabled) {
      button.style.opacity = 1;
      button.style.cursor = "pointer";
    } else {
      button.style.opacity = 0.3;
      button.style.cursor = "not-allowed";
    }
  }

  function saveCanvasState() {
    redoStack = [];
    toggleButtonState(redoButton, false);

    if (canvasState !== null) {
      undoStack.push(canvasState);
      toggleButtonState(undoButton, true);
    }

    canvasState = JSON.stringify(fabricCanvas);

    // Also save to persistent storage
    saveCanvasToStorage();
  }

  function performUndoRedo(
    sourceStack,
    targetStack,
    enableButton,
    disableButton,
  ) {
    if (sourceStack.length !== 0) {
      targetStack.push(canvasState);
      canvasState = sourceStack.pop();
      fabricCanvas.clear();
      fabricCanvas.loadFromJSON(canvasState);
      fabricCanvas.renderAll();

      toggleButtonState(enableButton, true);
      toggleButtonState(disableButton, sourceStack.length > 0);
    }
  }

  function undoAction() {
    performUndoRedo(undoStack, redoStack, redoButton, undoButton);
  }

  function redoAction() {
    performUndoRedo(redoStack, undoStack, undoButton, redoButton);
    if (isLineMode) {
      makeObjectsNonSelectable();
    }
  }

  // Initialize undo/redo buttons
  toggleButtonState(undoButton, false);
  toggleButtonState(redoButton, false);

  // Load saved canvas state for this page
  loadCanvasFromStorage(fabricCanvas);

  // Auto-save canvas state periodically (every 30 seconds)
  setInterval(function () {
    if (window.webMarkerFabricCanvas) {
      saveCanvasToStorage();
    }
  }, 30000);

  // Event listeners
  thicknessSlider.addEventListener(
    "input",
    function () {
      const newThickness = parseInt(thicknessSlider.value) || 5;

      // Update the appropriate thickness variable based on current mode
      if (isEraserMode) {
        eraseThickness = newThickness;
      } else if (isHighlighterMode) {
        highlightThickness = newThickness;
      } else if (isTextMode) {
        textSize = newThickness;
      } else {
        penThickness = newThickness;
      }

      // Update the current brush width
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.width = newThickness;
      }
    },
    false,
  );

  colorPicker.addEventListener(
    "input",
    function () {
      let color = this.value;
      if (isHighlighterMode) {
        color = convertHexToRgba(color);
      }
      fabricCanvas.freeDrawingBrush.color = color;
    },
    false,
  );

  // Canvas event listeners
  fabricCanvas.on("text:editing:entered", function () {
    isEditingText = true;
  });

  fabricCanvas.on("text:editing:exited", function () {
    isEditingText = false;
    isTextMode = false;
    selectMoveTool();
  });

  let isMouseDown = false;

  fabricCanvas.on("mouse:down", function (event) {
    isMouseDown = true;

    if (isTextMode && !isEditingText) {
      const pointer = event.e;
      const fontSize = 2 * parseInt(thicknessSlider.value);

      let x, y;
      if (pointer.type === "touchstart") {
        const rect = pointer.target.getBoundingClientRect();
        x = pointer.targetTouches[0].pageX - rect.left;
        y = pointer.targetTouches[0].pageY - rect.top;
      } else {
        x = pointer.offsetX;
        y = pointer.offsetY;
      }

      const textObject = new fabric.IText("", {
        fontFamily: "arial",
        fontSize: fontSize,
        fill: colorPicker.value,
        left: x,
        top: y - fontSize / 2,
      });

      fabricCanvas.add(textObject).setActiveObject(textObject);
      textObject.enterEditing();
    } else if (isLineMode) {
      isDrawingLine = true;
      const pointer = fabricCanvas.getPointer(event.e);
      currentLine = new fabric.Line(
        [pointer.x, pointer.y, pointer.x, pointer.y],
        {
          strokeWidth: parseInt(thicknessSlider.value),
          fill: colorPicker.value,
          stroke: colorPicker.value,
          originX: "center",
          originY: "center",
          selectable: false,
          hoverCursor: "normal",
          targetFindTolerance: true,
        },
      );
      fabricCanvas.add(currentLine);
    }
  });

  fabricCanvas.on("mouse:move", function (event) {
    if (isLineMode && isDrawingLine) {
      const pointer = fabricCanvas.getPointer(event.e);
      currentLine.set({ x2: pointer.x, y2: pointer.y });
      fabricCanvas.renderAll();
    }
  });

  fabricCanvas.on("object:modified", function () {
    saveCanvasState();
  });

  fabricCanvas.on("mouse:up", function () {
    isMouseDown = false;
    if (!isMoveMode && !isTextMode) {
      saveCanvasState();
      if (isLineMode) {
        isDrawingLine = false;
        currentLine.setCoords();
      }
    }
  });

  // Scroll handling
  window.onscroll = function () {
    const newScrollTop =
      document.body.scrollTop || document.documentElement.scrollTop;

    if (newScrollTop + screen.height > fabricCanvas.getHeight()) {
      const maxHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        documentElement.clientHeight,
        documentElement.scrollHeight,
        documentElement.offsetHeight,
      );

      const newHeight =
        fabricCanvas.getHeight() + 7500 < maxHeight
          ? fabricCanvas.getHeight() + 7500
          : maxHeight;

      if (newHeight !== fabricCanvas.getHeight()) {
        fabricCanvas.setHeight(newHeight);
      }
    }

    toolbar.style.top = newScrollTop + "px";

    if (fabricCanvas.getHeight() > 25000) {
      alert(
        "Web Marker does not support pages with this height. Please try again on a different website.",
      );
      exitMarker();
    }
  };

  // Keyboard shortcuts
  const pressedKeys = {};

  document.addEventListener("keydown", function (event) {
    pressedKeys[event.code] = true;

    // Delete selected objects with Backspace
    if (event.code === "Backspace" && !isTextMode && !isEditingText) {
      const activeObjects = fabricCanvas.getActiveObjects();
      for (let i = 0; i < activeObjects.length; i++) {
        fabricCanvas.remove(activeObjects[i]);
      }
      fabricCanvas.discardActiveObject().renderAll();
      saveCanvasState();
    }

    // Exit with Escape
    if (event.code === "Escape") {
      exitMarker();
    }

    // Keyboard shortcuts with Shift
    const shortcuts = {
      KeyZ: undoAction,
      KeyR: redoAction,
      KeyD: selectPenTool,
      KeyH: selectHighlighterTool,
      KeyM: selectMoveTool,
      KeyT: selectTextTool,
      KeyP: selectPointerTool,
      KeyL: selectLineTool,
      KeyE: selectEraserTool,
      KeyX: clearCanvas,
    };

    if (
      !isEditingText &&
      !isTextMode &&
      !isMouseDown &&
      pressedKeys.ShiftLeft &&
      shortcuts[event.code] &&
      ((event.code === "KeyX" && !isPointerMode) || event.code !== "KeyX")
    ) {
      shortcuts[event.code]();
    }
  });

  document.addEventListener("keyup", function (event) {
    pressedKeys[event.code] = false;
  });
}
