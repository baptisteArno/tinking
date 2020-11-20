import * as React from "react";
import Draggable from "react-draggable";
import { useEffect, useState } from "react";

export const App = () => {
  const [isScrapping, setIsScrapping] = useState(false);
  const [clickedNode, setClickedNode] = useState("");
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (
        event.data.type &&
        event.data.type === "SELECT_NODE" &&
        event.data.value
      ) {
        setIsScrapping(false);
        setClickedNode(event.data.value);
      }
    });
  }, []);

  const launchNodeSelection = () => {
    if (isScrapping) {
      window.postMessage({ type: "SELECT_NODE", command: "stop" }, "*");
      setIsScrapping(false);
    } else {
      window.postMessage({ type: "SELECT_NODE", command: "start" }, "*");
      setIsScrapping(true);
    }
  };

  return (
    <Draggable handle=".handle" onDrag={() => setIsGrabbing(true)}>
      <div
        className="flex absolute items-center justify-center top-0 left-0 rounded-lg shadow-lg flex-col bg-gray-900ﬁ"
        style={{ width: "400px", height: "700px", zIndex: 99999 }}
      >
        <div
          className={
            "w-full absolute justify-center items-center top-0 handle h-10 " +
            (isGrabbing ? "grabbing" : "grab")
          }
          style={{ height: "70px" }}
          onMouseDown={() => setIsGrabbing(true)}
          onMouseUp={() => setIsGrabbing(false)}
        ></div>
        <div>
          <p>{clickedNode}</p>
          <button onClick={launchNodeSelection}>
            {isScrapping ? "STOP SCRAPPING" : "SCRAP"}
          </button>
        </div>
      </div>
    </Draggable>
  );
};
