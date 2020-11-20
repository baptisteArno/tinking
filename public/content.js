/* global chrome */

chrome.runtime.onMessage.addListener(function (event) {
  if (event.message !== "load") {
    return;
  }
  main();
});

function main() {
  const extensionOrigin = "chrome-extension://" + chrome.runtime.id;
  // eslint-disable-next-line no-restricted-globals
  if (!location.ancestorOrigins.contains(extensionOrigin)) {
    fetch(chrome.runtime.getURL("index.html"))
      .then((response) => response.text())
      .then((html) => {
        const reactHTML = html.replace(
          /\/static\//g,
          `${extensionOrigin}/static/`
        );
        console.log("appending react app...");
        // eslint-disable-next-line no-undef
        $(reactHTML).appendTo("body");
      })
      .catch((error) => {
        console.warn(error);
      });
  }
}

window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  onDidReceiveMessage(event);
});

async function onDidReceiveMessage(event) {
  if (!event.data.type) {
    return;
  }
  switch (event.data.type) {
    case "GET_EXTENSION_ID": {
      window.postMessage(
        { type: "EXTENSION_ID_RESULT", extensionId: chrome.runtime.id },
        "*"
      );
      break;
    }
    case "SELECT_NODE": {
      if (event.data.command === "start") {
        selectNode();
      } else if (event.data.command === "stop") {
      }
      break;
    }
    default: {
    }
  }
}

const selectNode = () => {
  let MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";

  const onMouseMove = (e) => {
    console.log("YAS");
    let hoveredTarget = e.target;
    if (!hoveredTarget) {
      return;
    }
    if (prevTarget !== hoveredTarget) {
      if (prevTarget) {
        prevTarget.classList.remove(MOUSE_VISITED_CLASSNAME);
      }

      hoveredTarget.classList.add(MOUSE_VISITED_CLASSNAME);

      prevTarget = hoveredTarget;
    }
  };

  const onClick = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    let clicked = e.target;
    clicked.classList.remove(MOUSE_VISITED_CLASSNAME);
    console.log(clicked.className);
    window.postMessage({ type: "SELECT_NODE", value: clicked.className }, "*");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("click", onClick, true);
  };

  let prevTarget;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("click", onClick, true);
};
