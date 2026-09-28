// Web Marker - Screenshot viewer
// Shows an image handed over by the background script, with download and
// copy buttons.

(function () {
  "use strict";

  const status = document.getElementById("status");

  function flash(message, isError) {
    status.textContent = message;
    status.classList.toggle("error", !!isError);
  }

  function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  }

  async function init() {
    const id = location.hash.slice(1);
    const dataUrl = id ? await WebMarkerStorage.takeTempImage(id) : null;
    if (!dataUrl) {
      document.getElementById("missing").hidden = false;
      return;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const url = URL.createObjectURL(blob);
    const img = document.getElementById("image");
    img.src = url;
    img.hidden = false;

    const download = document.getElementById("download");
    download.disabled = false;
    download.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = url;
      link.download = `WebMarker_${timestamp()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    const copy = document.getElementById("copy");
    copy.disabled = false;
    copy.addEventListener("click", async () => {
      try {
        await browser.clipboard.setImageData(await blob.arrayBuffer(), "png");
        flash("Copied to clipboard");
      } catch (err) {
        flash(`Couldn't copy: ${err.message}`, true);
      }
    });
  }

  init().catch((err) => flash(`Couldn't load the screenshot: ${err.message}`, true));
})();
