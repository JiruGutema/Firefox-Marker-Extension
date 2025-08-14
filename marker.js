document.getElementById("pageMarker_canvas")
  ? exit()
  : chrome.storage.sync.get(
      {
        penColor: "#FF0000",
        penThickness: 5,
        highlightThickness: 22,
        eraseThickness: 30,
        textSize: 20,
      },
      function (g) {
        init(g);
      }
    );
function exit() {
  document.getElementById("pageMarker_canvas").remove();
  document.getElementById("pageMarker_draggable").remove();
}
function convertHex(g, p) {
  p = void 0 === p ? 0.3 : p;
  var d = g.replace("#", "");
  3 === d.length && (d = d[0] + d[0] + d[1] + d[1] + d[2] + d[2]);
  var H = parseInt(d.substring(0, 2), 16),
    z = parseInt(d.substring(2, 4), 16);
  d = parseInt(d.substring(4, 6), 16);
  return "rgba(" + H + "," + z + "," + d + "," + p + ")";
}
function init(g) {
  function p(a, c) {
    a.style.background = "";
  }
  function d(a) {
    b.discardActiveObject().renderAll();
    b.wrapperEl.style.cursor = "crosshair";
    b.wrapperEl.style.pointerEvents = "auto";
    b.selection = !0;
    b.isDrawingMode = !0;
    I = q = A = J = K = n = isEditingText = !1;
    R.forEach(p);
    a.style.background = "rgba(0,0,0,0.2)";
  }
  function H() {
    var a = document.getElementById("pageMarker_draggable");
    new Promise(function (c, e) {
      a.style.display = "none";
      setTimeout(function () {
        "none" == a.style.display ? c() : e();
      }, 500);
    })
      .then(function () {
        chrome.runtime.sendMessage({ from: "content_script" }, function (c) {
          screenshot = c.screenshot;
          c = new Date();
          c =
            c.getFullYear() +
            "-" +
            ("0" + (c.getMonth() + 1)).slice(-2).toString() +
            "-" +
            ("0" + c.getDate()).slice(-2);
          var e = document.createElement("a");
          e.download = "Screenshot_" + c + "_PageMarker.png";
          e.href = screenshot;
          document.body.appendChild(e);
          e.click();
          document.body.removeChild(e);
          c = URL.createObjectURL(
            new Blob(
              [
                '<h1 style="font-family:Helvetica;">Page Marker Screenshot</h1><img width="100%" src="' +
                  screenshot +
                  '"></img>',
              ],
              { type: "text/html" }
            )
          );
          window.open(c);
          a.style.display = "block";
        });
      })
      ["catch"](function () {
        console.error("An error has occured.");
      });
  }
  function z() {
    b.clear();
    B();
  }
  function S() {
    d(fa);
    J = !0;
    b.freeDrawingBrush = ha;
    f.value = T;
    b.freeDrawingBrush.width = parseInt(f.value) || 5;
  }
  function U() {
    d(ia);
    A = !0;
    b.freeDrawingBrush = C;
    b.freeDrawingBrush.color = convertHex(l.value);
    f.value = V;
    b.freeDrawingBrush.width = parseInt(f.value) || 5;
  }
  function W() {
    d(X);
    b.freeDrawingBrush = C;
    b.freeDrawingBrush.color = l.value;
    f.value = D;
    b.freeDrawingBrush.width = parseInt(f.value) || 5;
  }
  function Y() {
    d(ja);
    K = !0;
    b.isDrawingMode = !1;
    b.wrapperEl.style.pointerEvents = "none";
  }
  function L() {
    d(ka);
    b.isDrawingMode = !1;
    I = !0;
    b.getObjects().forEach(function (a) {
      a.selectable = !0;
      a.hoverCursor = "move";
    });
  }
  function Z() {
    d(la);
    n = !0;
    b.isDrawingMode = !1;
    f.value = ma;
  }
  function r() {
    d(na);
    q = !0;
    f.value = D;
    b.isDrawingMode = !1;
    b.selection = !1;
    aa();
  }
  function aa() {
    b.getObjects().forEach(function (a) {
      a.selectable = !1;
      a.hoverCursor = "normal";
    });
  }
  function t(a, c) {
    c
      ? ((a.style.opacity = 1), (a.style.cursor = "pointer"))
      : ((a.style.opacity = 0.3), (a.style.cursor = "not-allowed"));
  }
  function B() {
    M = [];
    t(E, !1);
    null !== u && (N.push(u), t(F, !0));
    u = JSON.stringify(b);
  }
  function ba(a, c, e, h) {
    0 != a.length &&
      (c.push(u),
      (u = a.pop()),
      b.clear(),
      b.loadFromJSON(u),
      b.renderAll(),
      t(e, !0),
      t(h, 0 < a.length));
  }
  function ca() {
    ba(N, M, E, F);
  }
  function da() {
    ba(M, N, F, E);
    q && aa();
  }
  var G = document.body,
    v = document.documentElement,
    w = document.body.scrollTop || document.documentElement.scrollTop,
    x = Math.max(
      G.scrollHeight,
      G.offsetHeight,
      v.clientHeight,
      v.scrollHeight,
      v.offsetHeight
    ),
    y = 7500;
  w + screen.height > y && (y += ((w + screen.height) / 7500) * 7500);
  y > x && (y = x);
  25e3 < y &&
    (alert(
      "Page Marker does not support pages with this height. Please try again on a different website."
    ),
    exit());
  var b = (this.__canvas = new fabric.Canvas("c", { isDrawingMode: !0 }));
  fabric.Object.prototype.transparentCorners = !0;
  b.setDimensions({ width: document.body.clientWidth, height: y });
  b.wrapperEl.id = "pageMarker_canvas";
  document.body.appendChild(b.wrapperEl);
  var k = document.createElement("div");
  k.id = "pageMarker_draggable";
  document.body.appendChild(k);
  k.innerHTML =
    '<div id="pageMarker_color"><div class="pageMarker_title">Color</div><input id="pageMarker_colorSelect" type="color" value="#FF0000"></div><div id="pageMarker_tools"><div class="pageMarker_title pageMarker_toolsTitle">Tools</div><div class="pageMarker_toolDiv"><a id="pageMarker_pen" class="pageMarker_tool"><img id="pageMarker_penImg" class="pageMarker_icon" alt="Marker" title="Marker"></img></a><a id="pageMarker_highlighter" class="pageMarker_tool"><img id="pageMarker_highlighterImg" class="pageMarker_icon" alt="Highlighter" title="Highlighter"></img></a><a id="pageMarker_eraser" class="pageMarker_tool"><img id="pageMarker_eraserImg" class="pageMarker_icon" alt="Eraser" title="Eraser"></img></a><a id="pageMarker_pointer" class="pageMarker_tool"><img id="pageMarker_pointerImg" class="pageMarker_icon" alt="Pointer" title="Pointer"></img></a><a id="pageMarker_text" class="pageMarker_tool"><img id="pageMarker_textImg" class="pageMarker_icon" alt="Text" title="Text"></img></a><a id="pageMarker_move" class="pageMarker_tool"><img id="pageMarker_moveImg" class="pageMarker_icon" alt="Move" title="Move"></img></a><a id="pageMarker_line" class="pageMarker_tool"><img id="pageMarker_lineImg" class="pageMarker_icon" alt="Line" title="Line"></img></a><a id="pageMarker_save" class="pageMarker_tool"><img id="pageMarker_saveImg" class="pageMarker_icon" alt="Save" title="Save Drawing"></img></a><a id="pageMarker_undo" class="pageMarker_tool"><img id="pageMarker_undoImg" class="pageMarker_icon" alt="Undo" title="Undo"></img></a><a id="pageMarker_redo" class="pageMarker_tool"><img id="pageMarker_redoImg" class="pageMarker_icon" alt="Redo" title="Redo"></img></a><a id="pageMarker_clear" class="pageMarker_tool"><img id="pageMarker_clearImg" class="pageMarker_icon" alt="Clear" title="Clear"></img></a><a id="pageMarker_exit" class="pageMarker_tool"><img id="pageMarker_exitImg" class="pageMarker_icon" alt="Exit" title="Exit"></img></a></div></div><div id="pageMarker_size"><div class="pageMarker_title">Size</div><input type="range" id="pageMarker_thicknessSlider" value="5" max="60" min="1"></div>';
  k.style.top = w + "px";
  0 == Math.floor(2 * Math.random()) &&
    ((x = document.createElement("div")),
    (x.id = "pageMarker_donateContainer"),
    (x.innerHTML =
      '<a title="Whiteboard" id="pageMarker_donate" class="pageMarker_kofi-button" href="https://whitesketchboard.vercel.app" target="_blank">WhiteBoard</a>'),
    k.appendChild(x));
  k.addEventListener("mousedown", function (a) {
    function c(ea) {
      k.style.top = ea.clientY - oa + "px";
      k.style.left = ea.clientX - h + "px";
    }
    function e() {
      window.removeEventListener("mousemove", c);
      window.removeEventListener("mouseup", e);
      window.removeEventListener("contextmenu", e);
    }
    var h = a.clientX - parseInt(window.getComputedStyle(this).left),
      oa = a.clientY - parseInt(window.getComputedStyle(this).top);
    window.addEventListener("mousemove", c);
    f.addEventListener("mousemove", e);
    window.addEventListener("mouseup", e);
    window.addEventListener("contextmenu", e);
  });
  var R = document.querySelectorAll(".pageMarker_tool");
  R.forEach(function (a, c) {
    var e = [W, U, S, Y, Z, L, r, H, ca, da, z, exit],
      h = a.querySelector("img");
    h.src = chrome.runtime.getURL(h.alt.toLowerCase() + ".png");
    a.onclick = e[c];
  });
  var l = document.getElementById("pageMarker_colorSelect"),
    X = document.getElementById("pageMarker_pen"),
    ja = document.getElementById("pageMarker_pointer"),
    ka = document.getElementById("pageMarker_move"),
    la = document.getElementById("pageMarker_text"),
    na = document.getElementById("pageMarker_line"),
    fa = document.getElementById("pageMarker_eraser"),
    ia = document.getElementById("pageMarker_highlighter"),
    f = document.getElementById("pageMarker_thicknessSlider"),
    D = g.penThickness,
    V = g.highlightThickness,
    T = g.eraseThickness,
    ma = g.textSize;
  X.style.background = "rgba(0,0,0,0.2)";
  f.value = D;
  l.value = g.penColor;
  var ha = new fabric.EraserBrush(b),
    C = b.freeDrawingBrush;
  C.color = l.value;
  C.width = parseInt(f.value) || 5;
  f.addEventListener(
    "input",
    function () {
      J ? (T = f.value) : A ? (V = f.value) : (D = f.value);
      b.freeDrawingBrush.width = parseInt(f.value) || 5;
    },
    !1
  );
  l.addEventListener(
    "input",
    function () {
      var a = this.value;
      A && (a = convertHex(a));
      b.freeDrawingBrush.color = a;
      document.getElementById("pageMarker_donate") &&
        (document.getElementById("pageMarker_donate").style.backgroundColor =
          this.value);
    },
    !1
  );
  var A = !1,
    J = !1,
    K = !1,
    n = !1,
    q = !1,
    I = !1,
    O = !1;
  b.getContext("2d");
  b.on("text:editing:entered", function (a) {
    isEditingText = !0;
  });
  b.on("text:editing:exited", function (a) {
    isEditingText = n = !1;
    L();
  });
  var P = !1;
  b.on("mouse:down", function (a) {
    P = !0;
    if (n && !isEditingText) {
      var c = a.e;
      a = 2 * parseInt(f.value);
      if ("touchstart" == c.type) {
        var e = c.target.getBoundingClientRect();
        var h = c.targetTouches[0].pageX - e.left;
        c = c.targetTouches[0].pageY - e.top;
      } else (h = c.offsetX), (c = c.offsetY);
      a = new fabric.IText("", {
        fontFamily: "arial",
        fontSize: a,
        fill: l.value,
        left: h,
        top: c - a / 2,
      });
      b.add(a).setActiveObject(a);
      a.enterEditing();
    } else q && ((O = !0), (a = b.getPointer(a.e)), (r = new fabric.Line([a.x, a.y, a.x, a.y], { strokeWidth: parseInt(f.value), fill: l.value, stroke: l.value, originX: "center", originY: "center", selectable: !1, hoverCursor: "normal", targetFindTolerance: !0 })), b.add(r));
  });
  b.on("mouse:move", function (a) {
    q &&
      O &&
      ((a = b.getPointer(a.e)), r.set({ x2: a.x, y2: a.y }), b.renderAll());
  });
  b.on("object:modified", function (a) {
    B();
  });
  b.on("mouse:up", function (a) {
    P = !1;
    I || n || (B(), q && ((O = !1), r.setCoords()));
  });
  window.onscroll = function () {
    w = document.body.scrollTop || document.documentElement.scrollTop;
    if (w + screen.height > b.getHeight()) {
      var a = b,
        c = Math.max(
          G.scrollHeight,
          G.offsetHeight,
          v.clientHeight,
          v.scrollHeight,
          v.offsetHeight
        );
      c = a.getHeight() + 7500 < c ? a.getHeight() + 7500 : c;
      c != a.getHeight() && a.setHeight(c);
    }
    k.style.top = w + "px";
    25e3 < b.getHeight() &&
      (alert(
        "Page Marker does not support pages with this height. Please try again on a different website."
      ),
      exit());
  };
  var F = document.getElementById("pageMarker_undo"),
    E = document.getElementById("pageMarker_redo");
  t(F, !1);
  t(E, !1);
  var u,
    N = [],
    M = [],
    Q = {};
  document.addEventListener("keydown", function (a) {
    Q[a.code] = !0;
    if ("Backspace" == a.code && !n && !isEditingText) {
      for (var c = 0; c < b.getActiveObjects().length; c++)
        b.remove(b.getActiveObjects()[c]);
      b.discardActiveObject().renderAll();
      B();
    }
    "Escape" == a.code && exit();
    m = {
      KeyZ: ca,
      KeyR: da,
      KeyD: W,
      KeyH: U,
      KeyM: L,
      KeyT: Z,
      KeyP: Y,
      KeyL: r,
      KeyE: S,
      KeyX: z,
    };
    if (
      !isEditingText &&
      !n &&
      !P &&
      Q.ShiftLeft &&
      m[a.code] &&
      (("KeyX" == a.code && !K) || "KeyX" != a.code)
    )
      m[a.code]();
  });
  document.addEventListener("keyup", function (a) {
    Q[a.code] = !1;
  });
}
