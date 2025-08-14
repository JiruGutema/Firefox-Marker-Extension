var addedFabric = {};
chrome.browserAction.onClicked.addListener(function(tab) {
  if (addedFabric[tab.id] == null || !addedFabric[tab.id]) {
    addedFabric[tab.id] = true;
    chrome.tabs.executeScript(tab.id, {
        file: "fabric.min.js"
    }, function() {
      if (chrome.runtime.lastError) {}
      addMarker(tab);
    });
  } else {
    addMarker(tab);
  }
});

chrome.tabs.onUpdated.addListener(function(tabId) {
  addedFabric[tabId] = false;
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete addedFabric[tabId];
});

function addMarker(tab) {
  chrome.tabs.executeScript(tab.id, {
    file: "marker.js"
  }, function() {
    if (chrome.runtime.lastError) {}
    chrome.tabs.insertCSS(null, {
      file: "main.css"
    }, function() {
      if (chrome.runtime.lastError) {
        var w = 440;
        var h = 160;
        chrome.windows.create({
          focused: true,
          width: w,
          height: h,
          type: 'popup',
          url: 'popup.html',
          top: 0,
          left: 0
        });
      }
    });
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.from == 'content_script') {
    chrome.tabs.captureVisibleTab(null, {}, function (image) {
      sendResponse({screenshot: image});
    });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(function (details) {
  if(details.reason == "install"){
    chrome.tabs.create({url: "https://firefox-marker-website.vercel.app/installed.html"}, function (tab) {
      console.log("Installed!");
    });
  }
});

chrome.runtime.setUninstallURL("https://firefox-marker-website.vercel.app/uninstalled.html");