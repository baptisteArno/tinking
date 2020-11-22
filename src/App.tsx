import React, { useRef } from "react";
import Draggable from "react-draggable";
import { useEffect, useState } from "react";
import { MdDragHandle } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";
/** @jsxRuntime classic */
/** @jsx jsx */
import { css, jsx } from "@emotion/react";

enum StepType {
  NAVIGATE = "Navigate to",
  CLICK = "Click on",
  EXTRACT_TEXT = "Extract text of",
  EXTRACT_HREF = "Extract URL",
  EXTRACT_IMAGE_SRC = "Extract image source",
}
interface Step {
  id: string;
  type: StepType;
  value: string;
  total: number;
  tagName: string;
}

export const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  const [isScrapping, setIsScrapping] = useState(false);
  const [steps, setSteps] = useState([
    {
      id: uuidv4(),
      type: StepType.NAVIGATE,
      value: window.location.href,
      total: 1,
      tagName: "a",
    },
  ]);

  const [pointerDragPropery, setPointerDragPropery] = useState("grab");
  const stepsRef = useRef<Step[]>([...steps]);

  useEffect(() => {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (
        event.data.type &&
        event.data.type === "SELECT_NODE" &&
        event.data.value &&
        event.data.command === "push"
      ) {
        stepsRef.current = [
          ...stepsRef.current,
          {
            id: uuidv4(),
            value: event.data.value,
            type: event.data.value.startsWith("a")
              ? StepType.NAVIGATE
              : StepType.EXTRACT_TEXT,
            total: event.data.total,
            tagName: event.data.tagName,
          },
        ];
        setSteps([...stepsRef.current]);
        saveSteps([...stepsRef.current]);
      }
      if (
        event.data.type === "SELECT_NODE" &&
        event.data.command === "update"
      ) {
        stepsRef.current[stepsRef.current.length - 1].value = event.data.value;
        stepsRef.current[stepsRef.current.length - 1].total = event.data.total;
        setSteps([...stepsRef.current]);
        saveSteps([...stepsRef.current]);
      }
      if (event.data.type === "LOAD_STEPS") {
        if (event.data.steps) {
          const newSteps = [...event.data.steps];
          setSteps(newSteps);
          stepsRef.current = newSteps;
        }
        setIsLoading(false);
        return;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDeleteStep = (idx: number) => {
    stepsRef.current.splice(idx, 1);
    setSteps([...stepsRef.current]);
    saveSteps([...stepsRef.current]);
  };

  const handleActionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    idx: number
  ) => {
    steps[idx].type = e.target.value as StepType;
    setSteps([...steps]);
    stepsRef.current = [...steps];
    saveSteps([...stepsRef.current]);
  };

  const saveSteps = (steps: Step[]) => {
    window.postMessage({ type: "STORE_STEPS", steps }, "*");
  };

  const handleCloseClick = () => {
    window.postMessage({ type: "WINDOW" }, "*");
  };

  return (
    <Draggable handle=".handle">
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: fixed;
          top: 20px;
          right: 20px;
          border-radius: 20px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
          background-color: rgba(31, 41, 55, 0.97);
          width: 400px;
          height: 700px;
          z-index: 99999;
          padding: 0 10px;
          color: white;
        `}
      >
        <div
          css={css`
            width: 100%;
            display: flex;
            position: absolute;
            justify-content: center;
            align-items: center;
            top: 0;
            height: 70px;
            cursor: ${pointerDragPropery};
          `}
          className="handle"
          style={{ height: "70px" }}
          onMouseDown={() => setPointerDragPropery("grabbing")}
          onMouseUp={() => setPointerDragPropery("grab")}
        >
          <MdDragHandle size={24} />
          <button onClick={handleCloseClick}>X</button>
        </div>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <ol
            css={css`
              width: 100%;
            `}
          >
            {steps.map((step, idx) => {
              return (
                <li
                  key={step.id}
                  css={css`
                    display: flex;
                    justify-content: space-between;
                  `}
                >
                  <span>
                    <select
                      value={step.type}
                      onChange={(e) => handleActionChange(e, idx)}
                    >
                      <option value={StepType.EXTRACT_TEXT}>
                        {StepType.EXTRACT_TEXT}
                      </option>
                      {step.tagName === "img" && (
                        <option value={StepType.EXTRACT_IMAGE_SRC}>
                          {StepType.EXTRACT_IMAGE_SRC}
                        </option>
                      )}
                      {step.tagName === "a" && (
                        <option value={StepType.EXTRACT_HREF}>
                          {StepType.EXTRACT_HREF}
                        </option>
                      )}
                      {step.tagName === "a" && (
                        <option value={StepType.NAVIGATE}>
                          {StepType.NAVIGATE}
                        </option>
                      )}
                    </select>
                    <span>
                      {step.value} ({step.total} nodes)
                    </span>
                  </span>
                  <button onClick={() => handleDeleteStep(idx)}>X</button>
                </li>
              );
            })}
            <button onClick={launchNodeSelection}>
              {isScrapping ? "STOP SCRAPPING" : "Add step"}
            </button>
          </ol>
        )}
      </div>
    </Draggable>
  );
};
