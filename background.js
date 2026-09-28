// Web Marker - Background script (event page)
// Injects the marker into tabs and handles work content scripts can't do
// themselves: screenshots, clipboard, opening extension pages.

const S = WebMarkerStorage;

// Injected in this order. Scripts stay loaded in the tab until it navigates,
// so later clicks only need to call WebMarker.toggle().
const CONTENT_FILES = [
  "fabric.min.js",
  "shared/constants.js",
  "shared/storage.js",
  "shared/pdf.js",
  "content/util.js",
  "content/history.js",
  "content/brushes.js",
  "content/toolbar.js",
  "content/tools.js",
  "content/exporter.js",
  "content/shortcuts.js",
  "content/main.js",
];

const READY_CHECK = 'typeof WebMarker !== "undefined" && typeof WebMarker.toggle === "function"';

let hardenedCss = null;

// main.css as a user-origin sheet with every rule !important, so page
// styles can't restyle the toolbar.
async function pageCss() {
  if (!hardenedCss) {
    const text = await (await fetch(browser.runtime.getURL("main.css"))).text();
    hardenedCss = WebMarkerCss.harden(text);
  }
  return hardenedCss;
}

async function injectAndRun(tabId, call) {
  const [ready] = await browser.tabs.executeScript(tabId, { code: READY_CHECK });
  if (!ready) {
    await browser.tabs.insertCSS(tabId, { code: await pageCss(), cssOrigin: "user" });
    for (const file of CONTENT_FILES) {
      await browser.tabs.executeScript(tabId, { file });
    }
  }
  await browser.tabs.executeScript(tabId, { code: `${call}; undefined;` });
}

async function toggleMarker(tab) {
  if (!tab || tab.id == null) return;
  try {
    await injectAndRun(tab.id, "WebMarker.toggle()");
  } catch (err) {
    console.warn("Web Marker can't run on this page:", err);
    showUnavailable(tab);
  }
}

// Protected pages (about:, the add-ons store, reader view, the PDF viewer...)
// can't be scripted. Flag the toolbar button and explain once.
function showUnavailable(tab) {
  browser.browserAction.setBadgeText({ tabId: tab.id, text: "!" });
  browser.browserAction.setBadgeBackgroundColor({ tabId: tab.id, color: "#dc2626" });
  browser.browserAction.setTitle({ tabId: tab.id, title: "Web Marker can't draw on this page" });
  browser.notifications.create("web-marker-unavailable", {
    type: "basic",
    iconUrl: browser.runtime.getURL("icon.png"),
    title: "Web Marker",
    message:
      "Web Marker can't draw on this page. Browser pages, the add-ons site and built-in viewers are protected. Open a regular website to start annotating.",
  });
}

function clearUnavailable(tabId) {
  browser.browserAction.setBadgeText({ tabId, text: "" });
  browser.browserAction.setTitle({ tabId, title: null });
}

browser.browserAction.onClicked.addListener(toggleMarker);

// --- Tab updates: reset the badge, optionally show saved drawings -----------

async function maybeAutoOpen(tabId, tab) {
  if (!/^https?:/.test(tab.url || "")) return;
  const settings = await S.getSettings();
  if (!settings.autoOpen) return;
  const allowed = await browser.permissions.contains({ origins: ["<all_urls>"] });
  if (!allowed) return;
  if (!(await S.hasPage(tab.url, settings.urlMatch))) return;
  try {
    await injectAndRun(tabId, "WebMarker.autoOpen()");
  } catch (err) {
    console.warn("Web Marker: auto-open failed", err);
  }
}

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading") clearUnavailable(tabId);
    else if (changeInfo.status === "complete") maybeAutoOpen(tabId, tab);
  },
  { properties: ["status"] }
);

// --- Messages from the marker and extension pages ---------------------------

async function capture(message, sender) {
  const tab = sender.tab;
  if (!tab) return { error: "No tab to capture" };
  try {
    if (message.rect) {
      const dataUrl = await browser.tabs.captureTab(tab.id, {
        format: "png",
        rect: message.rect,
        scale: message.scale,
      });
      return { dataUrl };
    }
    const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    return { dataUrl };
  } catch (err) {
    return { error: err.message };
  }
}

async function copyImage(dataUrl) {
  const buffer = await (await fetch(dataUrl)).arrayBuffer();
  const type = dataUrl.startsWith("data:image/jpeg") ? "jpeg" : "png";
  await browser.clipboard.setImageData(buffer, type);
  return { ok: true };
}

async function openImage(dataUrl) {
  const id = await S.putTempImage(dataUrl);
  await browser.tabs.create({ url: browser.runtime.getURL(`viewer.html#${id}`) });
  return { ok: true };
}

function openWhiteboard() {
  return browser.tabs.create({ url: browser.runtime.getURL("whiteboard.html") }).then(() => ({ ok: true }));
}

browser.runtime.onMessage.addListener((message, sender) => {
  const withErrors = (promise) => promise.catch((err) => ({ error: err.message }));
  switch (message && message.type) {
    case "capture":
      return capture(message, sender);
    case "copyImage":
      return withErrors(copyImage(message.dataUrl));
    case "openImage":
      return withErrors(openImage(message.dataUrl));
    case "openDashboard":
      return withErrors(openWhiteboard());
    case "openOptions":
      return withErrors(browser.runtime.openOptionsPage().then(() => ({ ok: true })));
    default:
      return undefined;
  }
});

// --- Context menus ------------------------------------------------------------

async function createMenus() {
  await browser.menus.removeAll();
  browser.menus.create({
    id: "web-marker-toggle",
    title: "Annotate this page",
    contexts: ["page", "selection", "link", "image"],
  });
  browser.menus.create({ id: "web-marker-whiteboard", title: "Open whiteboard", contexts: ["browser_action"] });
  browser.menus.create({ id: "web-marker-saved", title: "Saved drawings", contexts: ["browser_action"] });
}

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "web-marker-toggle") toggleMarker(tab);
  else if (info.menuItemId === "web-marker-whiteboard") openWhiteboard();
  else if (info.menuItemId === "web-marker-saved") {
    browser.tabs.create({ url: browser.runtime.getURL("options.html#saved") });
  }
});

// --- Lifecycle ------------------------------------------------------------------

async function housekeeping() {
  try {
    const settings = await S.getSettings();
    const removed = await S.deleteOlderThan(settings.retentionDays);
    if (removed) console.log(`Web Marker: removed ${removed} old drawing(s)`);
    await S.clearTempImages();
  } catch (err) {
    console.warn("Web Marker: housekeeping failed", err);
  }
}

browser.runtime.onInstalled.addListener((details) => {
  createMenus();
  housekeeping();
  if (details.reason === "install") {
    browser.tabs.create({ url: "https://firefox-marker-website.vercel.app/installed.html" });
  }
});

browser.runtime.onStartup.addListener(() => {
  createMenus();
  housekeeping();
});

browser.runtime.setUninstallURL("https://firefox-marker-website.vercel.app/uninstalled.html");
