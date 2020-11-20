const addCSS = (s) =>
  ((d) => {
    d.head.appendChild(d.createElement("style")).innerHTML = s;
  })(document);

let MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";

addCSS(`
.${MOUSE_VISITED_CLASSNAME} {
  background-clip: #bcd5eb !important;
  outline: 1px dashed #e9af6e !important;
}
`);
let prevTarget;
document.addEventListener(
  "mousemove",
  function (e) {
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
  },
  false
);
