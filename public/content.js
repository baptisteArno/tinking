/* global chrome */
/* global tippy */

let finder;
(async () => {
  const src = chrome.runtime.getURL("./finder.js");
  finder = await import(src);
})();

chrome.runtime.onMessage.addListener(function (event) {
  if (event.message !== "load") {
    return;
  }
  main();
});

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  document.querySelector(
    "#miner-extension-window .handle"
  ).onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.target.classList.add("grabbing");
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document
      .querySelector("#miner-extension-window .handle")
      .classList.remove("grabbing");
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function main() {
  const existingWindow = document.querySelector("#miner-extension-window");
  if (existingWindow) {
    existingWindow.parentNode.removeChild(existingWindow);
    chrome.storage.sync.clear();
    return;
  }
  const extensionOrigin = "chrome-extension://" + chrome.runtime.id;
  // eslint-disable-next-line no-restricted-globals
  if (!location.ancestorOrigins.contains(extensionOrigin)) {
    fetch(chrome.runtime.getURL("index.html"))
      .then((response) => response.text())
      .then((html) => {
        const draggable = document.createElement("div");
        const handle = document.createElement("div");
        draggable.id = "miner-extension-window";
        handle.classList = ["handle"];
        const iframe = document.createElement("iframe");
        iframe.id = "miner-extension-iframe";
        draggable.appendChild(handle);
        draggable.appendChild(iframe);
        document.body.appendChild(draggable);
        const reactHTML = html.replace(
          /\/static\//g,
          `${extensionOrigin}/static/`
        );
        console.log("appending window...");
        chrome.storage.sync.set({ scrapping: true });
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.write(reactHTML);
        iframeDoc.close();
        dragElement(document.getElementById("miner-extension-window"));
      })
      .catch((error) => {
        console.warn(error);
      });
  }
}

window.addEventListener("message", function (event) {
  onDidReceiveMessage(event);
});

async function onDidReceiveMessage(event) {
  if (!event.data.type) {
    return;
  }
  const iframe = document.getElementById("miner-extension-iframe");
  switch (event.data.type) {
    case "APP_LOADED": {
      chrome.storage.sync.get(["steps"], function (data) {
        console.log(data);
        if (Object.keys(data).length === 0) {
          iframe.contentWindow.postMessage({ type: "LOAD_STEPS" }, "*");
          return;
        }
        iframe.contentWindow.postMessage(
          { type: "LOAD_STEPS", steps: data.steps },
          "*"
        );
      });
      break;
    }
    case "SELECT_NODE": {
      if (event.data.command === "start") {
        startSelectNode(event.data.stepIndex, event.data.tagType);
      } else if (event.data.command === "stop") {
        stopSelectNode(event.data.stepIndex);
      } else if (event.data.command === "update") {
        console.log(event.data);
        onClick(null, event.data.stepIndex, {
          selector: event.data.selector,
          elementIndex: event.data.elementIndex,
        });
      } else if (event.data.command === "findUniqueSelector") {
        const elem = document.querySelectorAll(event.data.selector)[
          event.data.index
        ];
        if (elem.classList?.contains(MOUSE_VISITED_CLASSNAME))
          elem.classList.remove(MOUSE_VISITED_CLASSNAME);
        iframe.contentWindow.postMessage(
          {
            type: "SELECT_NODE",
            command: "findUniqueSelector",
            index: event.data.index,
            selector: finder.finder(elem),
            selectingNodeIndex: event.data.selectingNodeIndex,
          },
          "*"
        );
      }
      break;
    }
    case "STORE_STEPS": {
      chrome.storage.sync.set({ steps: event.data.steps }, function () {
        console.log("Value saved");
      });
      break;
    }
    case "WINDOW": {
      main();
      break;
    }
    default: {
    }
  }
}

const parseQuerySelector = (node) => {
  let querySelector = node.tagName.toLowerCase();
  if (node.classList.length > 0) {
    const classList = [...node.classList].filter(
      (className) =>
        className !== LINK_SELECT_HELPER_CLASS &&
        className !== IMG_SELECT_HELPER_CLASS
    );
    querySelector += "." + classList.join(".");
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

// ----- SELECT NODE -----
let MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";
const LINK_SELECT_HELPER_CLASS = "bs_link_helper";
const IMG_SELECT_HELPER_CLASS = "bs_img_helper";
let prevTarget;
let prevQuerySelector;
let tippyInstance;
let tippyOnlyThisButton;

const onStepIndex = function (stepIndex, type) {
  return function actualOnClick(event) {
    let tag;
    if (type === "link") {
      tag = "a";
    } else if (type === "image") {
      tag = "img";
    }
    onClick(event, stepIndex, { type: tag });
  };
};

const handlers = [];

const startSelectNode = (stepIndex, type) => {
  document.addEventListener("mousemove", onMouseMove, { capture: true });
  document.addEventListener(
    "click",
    (handlers[stepIndex] = onStepIndex(stepIndex, type)),
    { capture: true }
  );
};

const stopSelectNode = (stepIndex) => {
  if (tippyOnlyThisButton) {
    tippyOnlyThisButton.destroy();
  }
  document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`).forEach((node) => {
    node.classList.remove(MOUSE_VISITED_CLASSNAME);
  });
  document.removeEventListener("mousemove", onMouseMove, true);
  document.removeEventListener("click", handlers[stepIndex], true);
};

const onMouseMove = (e) => {
  let hoveredTarget = e.target;
  if (!hoveredTarget) {
    return;
  }
  if (hoveredTarget.closest("#miner-extension-window")) {
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

const findClosest = (tagName, node) => {
  let inspectingNode = node;
  while (
    $(inspectingNode).find(tagName).length === 0 &&
    !["body", tagName].includes(inspectingNode.tagName.toLowerCase())
  ) {
    inspectingNode = inspectingNode.parentNode;
  }
  if (inspectingNode.tagName.toLowerCase() === "body") {
    return node;
  }
  if (inspectingNode.tagName.toLowerCase() === tagName) {
    return inspectingNode;
  }
  return $(inspectingNode).find(tagName)[0];
};
const tryToFindLink = (node) => findClosest("a", node);
const tryToFindImage = (node) => findClosest("img", node);

const onClick = (e, stepIndex, { type, selector, elementIndex }) => {
  let clicked;
  if (selector && elementIndex !== undefined) {
    clicked = document.querySelectorAll(selector)[elementIndex];
  } else {
    clicked = e.target;
  }
  if (
    clicked.closest("#miner-extension-window") ||
    document.getElementById("miner-onlythis-btn") === clicked
  ) {
    if (tippyInstance) {
      tippyInstance.destroy();
    }
    return;
  }
  if (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  let selectedNodes = document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`);
  if (type && clicked.tagName.toLowerCase() !== type) {
    console.log("Trying to find ", type);
    switch (type) {
      case "a": {
        clicked = tryToFindLink(clicked);
        break;
      }
      case "img": {
        clicked = tryToFindImage(clicked);
        break;
      }
    }
    selectedNodes = document.querySelectorAll(
      getQuerySelectorWithThirdParents(clicked)
    );
  }

  if (e) {
    let selector = getQuerySelectorWithThirdParents(clicked);
    if (selector.endsWith(MOUSE_VISITED_CLASSNAME)) {
      selector = selector.split(`.${MOUSE_VISITED_CLASSNAME}`)[0];
    }
    let content;
    switch (type) {
      case "a": {
        content = selectedNodes[0].href;
        break;
      }
      case "img": {
        content = selectedNodes[0].src;
        break;
      }
      default: {
        content = selectedNodes[0].textContent;
      }
    }
    const iframe = document.getElementById("miner-extension-iframe");
    iframe.contentWindow.postMessage(
      {
        type: "SELECT_NODE",
        command: "update",
        selector,
        total: selectedNodes.length,
        content,
        tagName: clicked.tagName.toLowerCase(),
        stepIndex,
      },
      "*"
    );
  }
  if (selectedNodes.length > 1) {
    tippyOnlyThisButton = tippy(clicked, {
      allowHTML: true,
      content: `<button class="miner-zoom-btn" id="miner-onlythis-btn">
          Only this
        </button>`,
      showOnCreate: true,
      interactive: true,
      trigger: "manual",
    });
    tippyInstance.destroy();
    document.getElementById("miner-onlythis-btn").addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        tippyOnlyThisButton.destroy();
        const iframe = document.getElementById("miner-extension-iframe");
        let content = clicked.innerText;
        switch (type) {
          case "a": {
            content = clicked.href;
            break;
          }
          case "img": {
            content = clicked.src;
            break;
          }
        }
        console.log(clicked.href);
        if (stepIndex !== undefined) {
          iframe.contentWindow.postMessage(
            {
              type: "SELECT_NODE",
              command: "update",
              selector: finder.finder(clicked),
              total: 1,
              tagName: clicked.tagName.toLowerCase(),
              content,
              stepIndex,
            },
            "*"
          );
        }
      },
      true
    );
  }
};
