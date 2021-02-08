import { CloseIcon, SmallAddIcon } from "@chakra-ui/icons";
import {
  Button,
  ChakraProvider,
  Code,
  DarkMode,
  Flex,
  IconButton,
  Link,
  OrderedList,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import useDebounce from "use-debounce/lib/useDebounce";
import { theme } from "./customTheme";
import {
  parseStepFromWebpage,
  getSelectorContent,
  parseTagType,
  parseDefaultAction,
  actionIsExpectingSelector,
  parseTagTypeFromAction,
  launchNodeSelection,
} from "./service/helperFunctions";
import { Step, StepAction, StepOption, TagType } from "./types";
import { generateScript } from "./lib/scriptGenerator";
import { v4 as uuidv4 } from "uuid";
import { StepItem } from "./StepItem";

export const App = (): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: uuidv4(),
      action: StepAction.NAVIGATE,
      totalSelected: 1,
      tagName: "a",
      tagType: TagType.LINK,
      content: parent.location.href,
    },
  ]);
  const [selectingNodeIndex, setSelectingNodeIndex] = useState<
    number | undefined
  >();

  const [debouncedSteps] = useDebounce(steps, 1000);
  const [pointerDragPropery, setPointerDragPropery] = useState("grab");

  const stepsRef = useRef<Step[]>([...steps]);
  const scrollingContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parent.postMessage({ type: "APP_LOADED" }, "*");
    window.addEventListener("message", function (event) {
      if (
        event.data.type === "SELECT_NODE" &&
        event.data.command === "update" &&
        (event.data.optionIndex === undefined ||
          event.data.optionIndex === null)
      ) {
        const index = event.data.stepIndex;
        stepsRef.current[index] = {
          ...stepsRef.current[index],
          ...parseStepFromWebpage(event.data),
        };
        setSteps([...stepsRef.current]);
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
      if (
        event.data.type === "SELECT_NODE" &&
        event.data.command === "findUniqueSelector"
      ) {
        console.log(event.data);
        if (
          event.data.selectingNodeIndex === undefined ||
          !event.data.selector
        ) {
          throw Error("selectingNodeIndex and selector expected");
        }
        const updatedSteps = [...stepsRef.current];
        updatedSteps[event.data.selectingNodeIndex].selector =
          event.data.selector;
        setSteps(updatedSteps);
        stepsRef.current = updatedSteps;
      }
    });
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    saveSteps([...stepsRef.current]);
  }, [debouncedSteps]);

  const handleAddStep = () => {
    stepsRef.current.push({
      id: uuidv4(),
    });
    setSteps([...stepsRef.current]);
    scrollToBottom();
  };

  const handleDeleteStep = (idx: number) => {
    if (selectingNodeIndex !== undefined) {
      parent.postMessage(
        { type: "SELECT_NODE", command: "stop", stepIndex: selectingNodeIndex },
        "*"
      );
    }
    stepsRef.current.splice(idx, 1);
    setSelectingNodeIndex(undefined);
    setSteps([...stepsRef.current]);
  };

  const handleActionChange = (action: StepAction, idx: number) => {
    steps[idx].action = action;
    if (!steps[idx].selector && actionIsExpectingSelector(action)) {
      setSelectingNodeIndex(idx);
      launchNodeSelection(idx, parseTagTypeFromAction(action));
    } else {
      steps[idx].content = getSelectorContent(action, steps[idx].selector);
    }
    setSteps([...steps]);
    stepsRef.current = [...steps];
  };

  const stopNodeSelection = (stepIndex: number) => {
    parent.postMessage(
      { type: "SELECT_NODE", command: "stop", stepIndex },
      "*"
    );
  };

  const saveSteps = (steps: Step[]) => {
    parent.postMessage({ type: "STORE_STEPS", steps }, "*");
  };

  const handleCloseClick = () => {
    parent.postMessage({ type: "WINDOW" }, "*");
  };

  const findUniqueSelector = (selector: string, index: number) => {
    parent.postMessage(
      {
        type: "SELECT_NODE",
        command: "findUniqueSelector",
        selector,
        index,
        selectingNodeIndex,
      },
      "*"
    );
  };

  const handleGenerateCodeClick = () => {
    setScript(generateScript(steps));
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (!scrollingContainer.current) {
        return;
      }
      scrollingContainer.current.scrollTo({ top: 99999 });
    }, 100);
  };

  const handleVariableChange = (variable: string, idx: number) => {
    steps[idx].variableName = variable;
    setSteps([...steps]);
    stepsRef.current = [...steps];
  };

  const handleSelectorChange = (selector: string, idx: number) => {
    steps[idx].selector = selector;
    setSteps([...steps]);
    if (selector === "") {
      return;
    }
    let nodes;
    const onlyThisIndex = selector.match(/\[(\d)\]/);
    if (onlyThisIndex) {
      selector = selector.split(`[${onlyThisIndex[1]}]`)[0].trim();
    }
    try {
      nodes = parent.document.querySelectorAll(selector);
      if (onlyThisIndex) {
        findUniqueSelector(selector, parseInt(onlyThisIndex[1]));
        nodes = undefined;
      }
    } catch (e) {
      // Invalid selector
      steps[idx] = {
        ...steps[idx],
        totalSelected: 0,
        tagName: undefined,
        tagType: undefined,
        action: undefined,
        content: undefined,
        selector: selector,
      };
      setSteps([...steps]);
      stepsRef.current = [...steps];
      return;
    }
    if (nodes && nodes.length > 0) {
      const tagName = nodes[0].tagName.toLowerCase();
      steps[idx] = {
        ...steps[idx],
        totalSelected: nodes.length,
        tagName,
        tagType: parseTagType(tagName),
        action: parseDefaultAction(tagName),
        content: getSelectorContent(parseDefaultAction(tagName), selector),
        selector,
      };
      setSteps([...steps]);
      stepsRef.current = [...steps];
      parent.document.querySelectorAll(".crx_mouse_visited").forEach((node) => {
        node.classList.remove("crx_mouse_visited");
      });
      parent.document.querySelectorAll(selector).forEach((node) => {
        node.classList.add("crx_mouse_visited");
      });
    } else {
      steps[idx] = {
        ...steps[idx],
        totalSelected: 0,
        tagName: undefined,
        tagType: undefined,
        action: undefined,
        content: undefined,
        selector: selector,
      };
      setSteps([...steps]);
      stepsRef.current = [...steps];
    }
  };

  const handleResetClick = () => {
    stepsRef.current = [
      {
        id: uuidv4(),
        action: StepAction.NAVIGATE,
        selector: "",
        totalSelected: 1,
        tagName: "a",
        tagType: TagType.LINK,
        content: parent.location.href,
      },
    ];
    setSteps([...stepsRef.current]);
  };

  const handleOptionsChange = (options: StepOption[], idx: number) => {
    steps[idx].options = options;
    setSteps([...steps]);
    stepsRef.current = [...steps];
  };

  return (
    <ChakraProvider theme={theme}>
      <DarkMode>
        <Flex
          bgColor="gray.900"
          color="white"
          direction="column"
          rounded="lg"
          shadow="lg"
          w="full"
          h="full"
        >
          <Flex
            as="header"
            w="full"
            pos="absolute"
            justify="space-between"
            align="center"
            top={0}
            height="70px"
            cursor={pointerDragPropery}
            className="handle"
            onMouseDown={() => setPointerDragPropery("grabbing")}
            onMouseUp={() => setPointerDragPropery("grab")}
            px="10px"
          >
            <Button
              colorScheme="gray"
              variant="ghost"
              onClick={handleResetClick}
            >
              Reset
            </Button>
            <IconButton
              colorScheme="gray"
              variant="ghost"
              size="sm"
              aria-label="Close"
              onClick={handleCloseClick}
              icon={<CloseIcon />}
            />
          </Flex>

          <Flex
            ref={scrollingContainer}
            style={{ scrollBehavior: "smooth" }}
            overflowY="scroll"
            h="630px"
            mt="70px"
            direction="column"
            px="10px"
          >
            {isLoading ? (
              <Spinner m="auto" />
            ) : (
              <>
                <OrderedList spacing={3} ml="0">
                  {steps.map((step, idx) => (
                    <StepItem
                      key={step.id}
                      step={step}
                      steps={steps}
                      stepIndex={idx}
                      isSelecting={idx === selectingNodeIndex}
                      onActionChange={(action) =>
                        handleActionChange(action, idx)
                      }
                      onOptionsChange={(options) =>
                        handleOptionsChange(options, idx)
                      }
                      onVariableInputChange={(value) =>
                        handleVariableChange(value, idx)
                      }
                      onSelectorInputChange={(value) =>
                        handleSelectorChange(value, idx)
                      }
                      onDeleteStep={() => handleDeleteStep(idx)}
                      stopNodeSelecting={() => stopNodeSelection(idx)}
                      startNodeSelecting={() =>
                        launchNodeSelection(idx, step.tagType)
                      }
                    />
                  ))}
                  <Button
                    colorScheme="teal"
                    onClick={handleAddStep}
                    leftIcon={<SmallAddIcon />}
                    size="sm"
                    mt={0.5}
                  >
                    Add step
                  </Button>
                </OrderedList>

                {steps.length > 1 && (
                  <Button
                    colorScheme="blue"
                    onClick={handleGenerateCodeClick}
                    minHeight="2.5rem"
                    mt={2}
                    mb="1rem"
                  >
                    Generate code
                  </Button>
                )}
                {script !== "" && (
                  <>
                    <Code>{script}</Code>
                    <Link
                      as="a"
                      href="https://github.com/baptisteArno/tinking-code-starter"
                      target="_blank"
                      marginY={2}
                    >
                      How to use this code?
                    </Link>
                    <CopyToClipboard
                      text={script}
                      onCopy={() => setCopied(true)}
                    >
                      <Button
                        colorScheme="green"
                        isDisabled={copied}
                        onClick={() => setScript(generateScript(steps))}
                        minHeight="2.5rem"
                        mt={1}
                        mb="1rem"
                      >
                        {copied ? "Copied" : "Copy code"}
                      </Button>
                    </CopyToClipboard>
                  </>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </DarkMode>
    </ChakraProvider>
  );
};
