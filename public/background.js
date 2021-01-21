/* global chrome */
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.sendMessage(tab.id, { message: "load" });
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (details.frameId === 0) {
    chrome.storage.sync.get(["scrapping"], (data) => {
      if (data.scrapping) {
        chrome.tabs.sendMessage(details.tabId, { message: "load" });
      }
    });
  }
});
