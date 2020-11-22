/* global chrome */
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.sendMessage(tab.id, { message: "load" });
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (details.frameId === 0) {
    console.log("page loaded");
    chrome.storage.sync.get(["currentPage"], (data) => {
      console.log(data, document.location.host);
      if (details.url.includes(data.currentPage)) {
        chrome.tabs.sendMessage(details.tabId, { message: "load" });
      }
    });
  }
});
