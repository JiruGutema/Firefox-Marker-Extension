// Web Marker Extension - Background Script
// Handles extension lifecycle and communication between content scripts

// Track which tabs have fabric.js loaded to avoid duplicate loading
var fabricLoadedTabs = {};

// Handle browser action click (extension icon click)
chrome.browserAction.onClicked.addListener(function(tab) {
  // Check if fabric.js is already loaded for this tab
  if (fabricLoadedTabs[tab.id] == null || !fabricLoadedTabs[tab.id]) {
    // Mark fabric as loaded for this tab
    fabricLoadedTabs[tab.id] = true;
    
    // Inject fabric.js library first
    chrome.tabs.executeScript(tab.id, {
        file: "fabric.min.js"
    }, function() {
      if (chrome.runtime.lastError) {
        console.log("Error loading fabric.js:", chrome.runtime.lastError);
      }
      // After fabric.js loads, initialize the marker
      initializeMarkerOnTab(tab);
    });
  } else {
    // Fabric already loaded, just initialize marker
    initializeMarkerOnTab(tab);
  }
});

// Reset fabric loaded status when tab is updated (navigated)
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading') {
    fabricLoadedTabs[tabId] = false;
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  delete fabricLoadedTabs[tabId];
});

// Initialize the marker interface on the specified tab
function initializeMarkerOnTab(tab) {
  // Inject the marker content script
  chrome.tabs.executeScript(tab.id, {
    file: "marker.js"
  }, function() {
    if (chrome.runtime.lastError) {
      console.log("Error loading marker.js:", chrome.runtime.lastError);
    }
    
    // Inject the CSS styles
    chrome.tabs.insertCSS(tab.id, {
      file: "main.css"
    }, function() {
      if (chrome.runtime.lastError) {
        // If CSS injection fails (protected page), show popup with explanation
        console.log("Error loading CSS:", chrome.runtime.lastError);
        showProtectedPagePopup();
      }
    });
  });
}

// Show popup when extension can't run on protected pages
function showProtectedPagePopup() {
  var popupWidth = 440;
  var popupHeight = 160;
  
  chrome.windows.create({
    focused: true,
    width: popupWidth,
    height: popupHeight,
    type: 'popup',
    url: 'popup.html',
    top: 0,
    left: 0
  });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle screenshot requests from the marker interface
  if (request.from === 'content_script') {
    // Capture the visible area of the current tab
    chrome.tabs.captureVisibleTab(null, {}, function (screenshotDataUrl) {
      if (chrome.runtime.lastError) {
        console.log("Error capturing screenshot:", chrome.runtime.lastError);
        sendResponse({error: chrome.runtime.lastError.message});
      } else {
        sendResponse({screenshot: screenshotDataUrl});
      }
    });
  }
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    // Open welcome page on first install
    chrome.tabs.create({
      url: "https://firefox-marker-website.vercel.app/installed.html"
    }, function (tab) {
      console.log("Extension installed successfully!");
    });
  }
});

// Set uninstall URL for feedback
chrome.runtime.setUninstallURL("https://firefox-marker-website.vercel.app/uninstalled.html");