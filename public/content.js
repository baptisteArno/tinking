/* global chrome */
/* global tippy */

chrome.runtime.onMessage.addListener(function (event) {
  if (event.message !== "load") {
    return;
  }
  console.log(event);
  main();
});

function main() {
  const existingWindow = document.querySelector(".miner-extension-window");
  if (existingWindow) {
    existingWindow.parentNode.removeChild(existingWindow);
    chrome.storage.sync.set({ currentPage: null });
    return;
  }
  const extensionOrigin = "chrome-extension://" + chrome.runtime.id;
  // eslint-disable-next-line no-restricted-globals
  if (!location.ancestorOrigins.contains(extensionOrigin)) {
    fetch(chrome.runtime.getURL("index.html"))
      .then((response) => response.text())
      .then((html) => {
        const div = document.createElement("div");
        div.classList.add("miner-extension-window");
        document.body.appendChild(div);
        const reactHTML = html.replace(
          /\/static\//g,
          `${extensionOrigin}/static/`
        );
        console.log("appending window...");
        // eslint-disable-next-line no-undef
        $(reactHTML).appendTo(".miner-extension-window");
        chrome.storage.sync.set({ currentPage: document.location.host });
        setTimeout(() => {
          chrome.storage.sync.get(["steps"], function (data) {
            if (Object.keys(data).length === 0) {
              window.postMessage({ type: "LOAD_STEPS" }, "*");
              return;
            }
            window.postMessage({ type: "LOAD_STEPS", steps: data.steps }, "*");
          });
        }, 500);
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
    case "SELECT_NODE": {
      if (event.data.command === "start") {
        startSelectNode();
      } else if (event.data.command === "stop") {
        stopSelectNode();
      }
      break;
    }
    case "STORE_STEPS": {
      chrome.storage.sync.set({ steps: event.data.steps }, function () {
        console.log("Value saved");
      });
      break;
    }
    default: {
    }
  }
}

const parseQuerySelector = (node) => {
  let querySelector = node.tagName.toLowerCase();
  if (node.classList.length > 0) {
    querySelector += "." + [...node.classList].join(".");
    if (querySelector.endsWith(".")) {
      querySelector = querySelector.substr(0, querySelector.length - 1);
    }
  }
  return querySelector;
};

const getQuerySelectorWithThirdParents = (node) => {
  let querySelector = parseQuerySelector(node);

  let parent = node;
  for (let i = 0; i < 3; i++) {
    if (parent === document.body) {
      break;
    }
    parent = parent.parentNode;
  }
  querySelector = parseQuerySelector(parent) + " " + querySelector;

  return querySelector;
};

const zoomIn = (currentValue, clickedNode) => {
  if (currentValue.depth <= 1) {
    if (currentValue.querySelector.includes(":nth-child")) {
      return currentValue;
    }
    // Want to select only this element
  }

  let nextDepth = currentValue.depth;
  if (currentValue.querySelector.includes(" < ")) {
    nextDepth += 1;
  }

  return moveParentDepth(currentValue, clickedNode, nextDepth);
};

const zoomOut = (currentValue, clickedNode) => {
  if (currentValue.querySelector.startsWith("body")) {
    return currentValue;
  }

  let nextDepth = currentValue.depth;
  if (!currentValue.querySelector.includes(" < ")) {
    nextDepth += 1;
  }

  return moveParentDepth(currentValue, clickedNode, nextDepth);
};

const moveParentDepth = (
  currentValue,
  node,
  newDepth,
  directChilds = false
) => {
  if (currentValue.depth === newDepth) {
    // Just change directChilds prop
    if (currentValue.querySelector.includes(" < ")) {
      return currentValue.querySelector.split(" < ").join(" ");
    }
    return currentValue.querySelector.split(" ").join(" < ");
  }

  console.log(node);
  let parentNode = node;
  for (let i = 0; i < newDepth; i++) {
    parentNode = parentNode.parentNode;
  }

  let querySelector = parseQuerySelector(node);

  querySelector = (
    parseQuerySelector(parentNode) +
    " " +
    querySelector
  ).replace(/.miner-relative|.crx_mouse_visited/g, "");
  return {
    querySelector,
    depth: currentValue.depth - 1,
  };
};

// ----- SELECT NODE -----
let MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";
let prevTarget;
let prevQuerySelector;
let tippyInstance;

const startSelectNode = () => {
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
};

const stopSelectNode = () => {
  console.log("stop !");
  document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`).forEach((node) => {
    node.classList.remove(MOUSE_VISITED_CLASSNAME);
  });
  document.removeEventListener("mousemove", onMouseMove, true);
  document.removeEventListener("click", onClick, true);
};

const onClick = (e) => {
  let clicked = e.target;
  if (clicked.closest(".miner-extension-window")) {
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  const selectedNodes = document.querySelectorAll(
    `.${MOUSE_VISITED_CLASSNAME}`
  );
  let value = {
    querySelector: getQuerySelectorWithThirdParents(clicked).split(
      `.${MOUSE_VISITED_CLASSNAME}`
    )[0],
    depth: 3,
  };
  window.postMessage(
    {
      type: "SELECT_NODE",
      command: "push",
      value: value.querySelector,
      total: selectedNodes.length,
    },
    "*"
  );
  // clicked.classList.add("miner-relative");
  // eslint-disable-next-line no-undef
  // $(`<div class='miner-zooms-container'>
  //   <button class="miner-zoom-btn" id="miner-zoom-only">Only this</button>
  //   <button class="miner-zoom-btn" id="miner-zoom-in">Zoom in</button>
  //   <button class="miner-zoom-btn" id="miner-zoom-out">Zoom out</button>
  //   <button class="miner-zoom-btn" id="miner-zoom-ok">OK</button>
  // </div>`).appendTo(clicked);
  let prevZoomedInValue = value;
  let prevZoomedOutValue = value;
  // document.getElementById("miner-zoom-in").addEventListener("click", (e) => {
  //   e.preventDefault();
  //   let zoomedInSelector = zoomIn(prevZoomedInValue, clicked);
  //   console.log(prevZoomedInValue, zoomedInSelector);
  //   if (prevZoomedInValue.querySelector === zoomedInSelector.querySelector) {
  //     return;
  //   }
  //   document
  //     .querySelectorAll(prevZoomedInValue.querySelector)
  //     .forEach((node) => {
  //       node.classList.remove(MOUSE_VISITED_CLASSNAME);
  //     });
  //   prevZoomedInValue = zoomedInSelector;
  //   document
  //     .querySelectorAll(zoomedInSelector.querySelector)
  //     .forEach((node) => {
  //       node.classList.add(MOUSE_VISITED_CLASSNAME);
  //     });
  //   window.postMessage(
  //     {
  //       type: "SELECT_NODE",
  //       command: "update",
  //       value: zoomedInSelector,
  //       total: selectedNodes.length,
  //     },
  //     "*"
  //   );
  // });
  // document.getElementById("miner-zoom-out").addEventListener("click", (e) => {
  //   e.preventDefault();
  //   let zoomedOutSelector = zoomOut(prevZoomedOutValue, clicked);
  //   if (prevZoomedOutValue === zoomedOutSelector) {
  //     return;
  //   }
  //   document
  //     .querySelectorAll(prevZoomedOutValue.querySelector)
  //     .forEach((node) => {
  //       node.classList.remove(MOUSE_VISITED_CLASSNAME);
  //     });
  //   prevZoomedOutValue = zoomedOutSelector;
  //   document
  //     .querySelectorAll(zoomedOutSelector.querySelector)
  //     .forEach((node) => {
  //       node.classList.add(MOUSE_VISITED_CLASSNAME);
  //     });
  //   window.postMessage(
  //     {
  //       type: "SELECT_NODE",
  //       command: "update",
  //       value: zoomedOutSelector,
  //       total: selectedNodes.length,
  //     },
  //     "*"
  //   );
  // });
  // document.getElementById("miner-zoom-ok").addEventListener("click", (e) => {
  //   e.preventDefault();
  //   document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`).forEach((node) => {
  //     node.classList.remove(MOUSE_VISITED_CLASSNAME);
  //   });
  //   window.postMessage(
  //     {
  //       type: "SELECT_NODE",
  //       command: "stop",
  //       total: selectedNodes.length,
  //     },
  //     "*"
  //   );
  // });
  // document.getElementById("miner-zoom-only").addEventListener("click", (e) => {
  //   e.preventDefault();
  //   document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`).forEach((node) => {
  //     node.classList.remove(MOUSE_VISITED_CLASSNAME);
  //   });
  //   window.postMessage(
  //     {
  //       type: "SELECT_NODE",
  //       command: "stop",
  //       total: selectedNodes.length,
  //     },
  //     "*"
  //   );
  // });
  stopSelectNode();
};

const onMouseMove = (e) => {
  let hoveredTarget = e.target;
  if (!hoveredTarget) {
    return;
  }
  if (hoveredTarget.closest(".miner-extension-window")) {
    return;
  }
  if (prevTarget !== hoveredTarget) {
    if (prevQuerySelector) {
      document
        .querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`)
        .forEach((node) => {
          node.classList.remove(MOUSE_VISITED_CLASSNAME);
        });
    }

    let querySelector = getQuerySelectorWithThirdParents(hoveredTarget);

    document.querySelectorAll(querySelector).forEach((node) => {
      node.classList.add(MOUSE_VISITED_CLASSNAME);
    });

    if (tippyInstance) {
      tippyInstance.destroy();
    }
    tippyInstance = tippy(hoveredTarget, {
      content: hoveredTarget.tagName.toLowerCase(),
      showOnCreate: true,
    });

    prevTarget = hoveredTarget;
    prevQuerySelector = querySelector;
  }
};
