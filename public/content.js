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
        const div = document.createElement("div");
        div.id = "miner-extension-window";
        document.body.appendChild(div);
        const reactHTML = html.replace(
          /\/static\//g,
          `${extensionOrigin}/static/`
        );
        console.log("appending window...");
        // eslint-disable-next-line no-undef
        $(reactHTML).appendTo("#miner-extension-window");
        chrome.storage.sync.set({ currentPage: document.location.host });
        setTimeout(() => {
          chrome.storage.sync.get(["steps"], function (data) {
            console.log(data);
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
      } else if (event.data.command === "update") {
        console.log(event.data);
        onClick(
          null,
          event.data.selector,
          event.data.elementIndex,
          event.data.stepIndex
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

const onClick = (e, selector, elementIndex, stepIndex) => {
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

  const selectedNodes = document.querySelectorAll(
    `.${MOUSE_VISITED_CLASSNAME}`
  );
  if (e) {
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
        selector: value.querySelector,
        total: selectedNodes.length,
        tagName: clicked.tagName.toLowerCase(),
      },
      "*"
    );
  }
  if (selectedNodes.length > 1) {
    let tippyClickedMenu = tippy(clicked, {
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
        tippyClickedMenu.destroy();
        console.log(finder.finder(clicked));
        if (stepIndex !== undefined) {
          window.postMessage(
            {
              type: "SELECT_NODE",
              command: "update",
              selector: finder.finder(clicked),
              total: 1,
              tagName: clicked.tagName.toLowerCase(),
              stepIndex,
            },
            "*"
          );
        } else {
          window.postMessage(
            {
              type: "SELECT_NODE",
              command: "update",
              selector: finder.finder(clicked),
              total: 1,
              tagName: clicked.tagName.toLowerCase(),
            },
            "*"
          );
        }
      },
      true
    );
  }
};
