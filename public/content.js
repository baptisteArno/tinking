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

let extensionIframe;
const selectNodeOverlay = document.createElement("div");
selectNodeOverlay.classList.add("tinking-select-overlay");
const overlayContent = document.createElement("div");
selectNodeOverlay.appendChild(overlayContent);

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  document.querySelector(
    "#tinking-extension-window .handle"
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
      .querySelector("#tinking-extension-window .handle")
      .classList.remove("grabbing");
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function main() {
  const existingWindow = document.querySelector("#tinking-extension-window");
  if (existingWindow) {
    existingWindow.parentNode.removeChild(existingWindow);
    chrome.storage.sync.clear();
    return;
  }
  const extensionOrigin = "chrome-extension://" + chrome.runtime.id;
  if (!location.ancestorOrigins.contains(extensionOrigin)) {
    fetch(chrome.runtime.getURL("index.html"))
      .then((response) => response.text())
      .then((html) => {
        const draggable = document.createElement("div");
        const handle = document.createElement("div");
        draggable.id = "tinking-extension-window";
        handle.classList = ["handle"];
        const iframe = document.createElement("iframe");
        iframe.id = "tinking-extension-iframe";
        draggable.appendChild(handle);
        draggable.appendChild(iframe);
        document.body.appendChild(draggable);
        const reactHTML = html.replace(
          /\/static\//g,
          `${extensionOrigin}/static/`
        );
        chrome.storage.sync.set({ currentPage: window.location.hostname });
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.write(reactHTML);
        iframeDoc.close();
        dragElement(document.getElementById("tinking-extension-window"));
        extensionIframe = iframe;
        document.body.prepend(selectNodeOverlay);
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
  switch (event.data.type) {
    case "APP_LOADED": {
      chrome.storage.sync.get(["steps"], function (data) {
        if (Object.keys(data).length === 0) {
          extensionIframe.contentWindow.postMessage(
            { type: "LOAD_STEPS" },
            "*"
          );
          return;
        }
        extensionIframe.contentWindow.postMessage(
          { type: "LOAD_STEPS", steps: data.steps },
          "*"
        );
      });
      break;
    }
    case "SELECT_NODE": {
      if (event.data.command === "start") {
        startSelectNode(
          event.data.stepIndex,
          event.data.tagType,
          event.data.optionIndex ?? null
        );
      } else if (event.data.command === "stop") {
        stopSelectNode();
      } else if (event.data.command === "update") {
        onClick(null, event.data.stepIndex, {
          selector: event.data.selector,
          elementIndex: event.data.elementIndex,
          optionIndex: event.data.optionIndex ?? null,
        });
      } else if (event.data.command === "findUniqueSelector") {
        const elem = document.querySelectorAll(event.data.selector)[
          event.data.index
        ];
        if (elem.classList?.contains(MOUSE_VISITED_CLASSNAME))
          elem.classList.remove(MOUSE_VISITED_CLASSNAME);
        extensionIframe.contentWindow.postMessage(
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
    case "RECORD_CLICKS_KEYS": {
      if (event.data.command === "start") {
        startClicksKeysRecording(event.data.stepIndex);
      }
      break;
    }
    case "STORE_STEPS": {
      chrome.storage.sync.set({ steps: event.data.steps });
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

const onStepIndex = function (stepIndex, { type, extractUnique, optionIndex }) {
  return function actualOnClick(event) {
    let tag;
    if (type === "link") {
      tag = "a";
    } else if (type === "image") {
      tag = "img";
    }
    onClick(event, stepIndex, { type: tag, extractUnique, optionIndex });
  };
};

let handlers = [];

const startSelectNode = (stepIndex, type, optionIndex) => {
  console.log(
    "🚀 ~ file: content.js ~ line 235 ~ startSelectNode ~ stepIndex, type, optionIndex",
    stepIndex,
    type,
    optionIndex
  );
  stopSelectNode();
  if (type === "link") {
    overlayContent.innerHTML = "👇 Click on the link you wish to extract";
  } else if (type === "image") {
    overlayContent.innerHTML = "👇 Click on the image you wish to extract";
  } else if (type === "pagination") {
    overlayContent.innerHTML =
      '👇 Click on the "next" element of the pagination bar';
  } else {
    overlayContent.innerHTML = "👇 Click on the element you wish to extract";
  }
  selectNodeOverlay.style.display = "flex";

  document.addEventListener("mousemove", onMouseMove, { capture: true });
  document.addEventListener(
    "click",
    (handlers[stepIndex] = onStepIndex(stepIndex, {
      type,
      extractUnique: type === "pagination",
      optionIndex,
    })),
    { capture: true }
  );
};

const stopSelectNode = () => {
  console.log(handlers);
  selectNodeOverlay.style.display = "none";
  if (tippyOnlyThisButton) {
    tippyOnlyThisButton.destroy();
  }
  document.querySelectorAll(`.${MOUSE_VISITED_CLASSNAME}`).forEach((node) => {
    node.classList.remove(MOUSE_VISITED_CLASSNAME);
  });
  document.removeEventListener("mousemove", onMouseMove, { capture: true });
  for (const handler of handlers) {
    console.log("remove", handler);
    document.removeEventListener("click", handler, { capture: true });
  }
  handlers = [];
  stopClicksKeysRecording();
};

const onRecordClick = function (stepIndex) {
  return function event(e) {
    if (e.target.closest("#tinking-extension-window")) {
      return;
    }
    extensionIframe.contentWindow.postMessage(
      {
        type: "RECORD_CLICKS_KEYS",
        command: "update",
        stepIndex,
        selector: finder.finder(e.target),
      },
      "*"
    );
  };
};
const onRecordKeyup = function (stepIndex) {
  return function event(e) {
    extensionIframe.contentWindow.postMessage(
      {
        type: "RECORD_CLICKS_KEYS",
        command: "update",
        stepIndex,
        input: e.key,
      },
      "*"
    );
  };
};
const startClicksKeysRecording = (stepIndex) => {
  stopClicksKeysRecording();
  overlayContent.innerHTML = "👇 Click and type what you want";
  selectNodeOverlay.style.display = "flex";
  document.addEventListener("mousemove", () => {
    selectNodeOverlay.style.display = "none";
  });
  document.addEventListener(
    "click",
    (handlers["record-click"] = onRecordClick(stepIndex))
  );
  document.addEventListener(
    "keyup",
    (handlers["record-key"] = onRecordKeyup(stepIndex))
  );
};

const stopClicksKeysRecording = () => {
  selectNodeOverlay.style.display = "none";
  document.removeEventListener("mousemove", () => {
    selectNodeOverlay.style.display = "none";
  });
  document.removeEventListener("click", handlers["record-click"]);
  document.removeEventListener("keyup", handlers["record-key"]);
};

const onMouseMove = (e) => {
  let hoveredTarget = e.target;
  if (!hoveredTarget) {
    return;
  }
  if (hoveredTarget.closest("#tinking-extension-window")) {
    return;
  }
  selectNodeOverlay.style.display = "none";
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

const onClick = (
  e,
  stepIndex,
  { type, selector, elementIndex, optionIndex, extractUnique }
) => {
  let clicked;
  if (selector && elementIndex !== undefined) {
    clicked = document.querySelectorAll(selector)[elementIndex];
  } else {
    clicked = e.target;
  }
  if (
    clicked.closest("#tinking-extension-window") ||
    document.getElementById("tinking-onlythis-btn") === clicked
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

  let querySelector = `.${MOUSE_VISITED_CLASSNAME}`;
  if (type && clicked.tagName.toLowerCase() !== type) {
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
    querySelector = getQuerySelectorWithThirdParents(clicked);
  }
  querySelector = extractUnique ? finder.finder(clicked) : querySelector;
  selectedNodes = document.querySelectorAll(querySelector);

  if (e) {
    querySelector = getQuerySelectorWithThirdParents(clicked);
    if (querySelector.endsWith(MOUSE_VISITED_CLASSNAME)) {
      querySelector = querySelector
        .split(` .${MOUSE_VISITED_CLASSNAME}`)[0]
        .replace(" >", "");
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
    extensionIframe.contentWindow.postMessage(
      {
        type: "SELECT_NODE",
        command: "update",
        selector: querySelector,
        total: selectedNodes.length,
        content,
        tagName: clicked.tagName.toLowerCase(),
        stepIndex,
        optionIndex,
      },
      "*"
    );
  }
  if (selectedNodes.length > 1) {
    if (tippyOnlyThisButton) {
      tippyOnlyThisButton.destroy();
    }
    tippyOnlyThisButton = tippy(clicked, {
      allowHTML: true,
      content: `<button class="tinking-zoom-btn" id="tinking-onlythis-btn">
          Only this
        </button>`,
      showOnCreate: true,
      interactive: true,
      hideOnClick: false,
      trigger: "manual",
    });
    tippyInstance.destroy();
    document.getElementById("tinking-onlythis-btn").addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        tippyOnlyThisButton.destroy();
        let content = clicked.textContent;
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
        if (stepIndex !== undefined) {
          extensionIframe.contentWindow.postMessage(
            {
              type: "SELECT_NODE",
              command: "update",
              selector: finder.finder(clicked),
              total: 1,
              tagName: clicked.tagName.toLowerCase(),
              content,
              stepIndex,
              optionIndex,
            },
            "*"
          );
        }
      },
      true
    );
  }
};
