/* global chrome */
chrome.browserAction.onClicked.addListener(function (tab) {
  chrome.tabs.sendMessage(tab.id, { message: "load" });
});
