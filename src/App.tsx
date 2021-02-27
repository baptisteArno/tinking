import {
  ChevronDownIcon,
  CloseIcon,
  QuestionIcon,
  SmallAddIcon,
} from "@chakra-ui/icons";
import {
  Button,
  ChakraProvider,
  Code,
  DarkMode,
  Flex,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  OrderedList,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Step, StepAction, TagType } from "./types";
import { generateScript } from "./lib/scriptGenerator";
import { v4 as uuidv4 } from "uuid";
import { StepItem } from "./StepItem/StepItem";
import {
  launchNodeSelection,
  stopNodeSelection,
} from "./service/helperFunctions";
import { atom, useAtom } from "jotai";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

export const editingStepAtom = atom<number | null>(null);

export const App = (): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: uuidv4(),
      index: 0,
      action: StepAction.NAVIGATE,
      totalSelected: 1,
      tagName: "a",
      tagType: TagType.LINK,
      content: parent.location.href,
      options: [],
    },
  ]);
  const [pointerDragPropery, setPointerDragPropery] = useState("grab");
  const [editingStepIndex, setEditingStepIndex] = useAtom(editingStepAtom);

  const scrollingContainer = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleIncomingMessageFromPage = (event: any) => {
    if (event.data.type === "LOAD_STEPS") {
      if (event.data.steps) {
        const newSteps = [...event.data.steps];
        setSteps(newSteps);
      }
      setIsLoading(false);
      return;
    }
  };
  useEffect(() => {
    parent.postMessage({ type: "APP_LOADED" }, "*");
    window.addEventListener("message", handleIncomingMessageFromPage);
    return () => {
      window.removeEventListener("message", handleIncomingMessageFromPage);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (script !== "") {
      setScript("");
    }
    saveSteps([...steps]);
  }, [steps]);

  useEffect(() => {
    if (editingStepIndex === null) {
      stopNodeSelection();
    } else {
      const step = steps[editingStepIndex];
      launchNodeSelection(editingStepIndex, step.tagType, {
        record: step.recordedClicksAndKeys !== undefined,
      });
    }
  }, [editingStepIndex]);

  const handleCloseClick = () => {
    parent.postMessage({ type: "WINDOW" }, "*");
  };

  const handleResetClick = () => {
    setSteps([
      {
        id: uuidv4(),
        index: 0,
        action: StepAction.NAVIGATE,
        selector: "",
        totalSelected: 1,
        tagName: "a",
        tagType: TagType.LINK,
        content: parent.location.href,
        options: [],
      },
    ]);
    setEditingStepIndex(null);
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: uuidv4(),
        index: steps.length,
        options: [],
      },
    ]);
    scrollToBottom();
  };

  const handleUpdateStep = (newStep: Step, stepIndex: number) => {
    steps[stepIndex] = newStep;
    setSteps([...steps]);
  };

  const handleDeleteStep = (idx: number) => {
    steps.splice(idx, 1);
    const reassignedSteps = steps.map((step, index) => ({
      ...step,
      index,
    }));
    setSteps([...reassignedSteps]);
    setEditingStepIndex(null);
  };

  const saveSteps = (steps: Step[]) => {
    parent.postMessage({ type: "STORE_STEPS", steps }, "*");
  };

  const handleGenerateCodeClick = (library: "puppeteer" | "playwright") => {
    setCopied(false);
    setScript(generateScript(steps, library));
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

  const handleDragEnd = (dropResult: DropResult) => {
    if (!dropResult.destination) return;
    if (editingStepIndex === dropResult.source.index) {
      setEditingStepIndex(dropResult.destination.index);
    }
    const stepsToModify = [...steps];
    const [reorderedStep] = stepsToModify.splice(dropResult.source.index, 1);
    stepsToModify.splice(dropResult.destination.index, 0, reorderedStep);

    const reassignedSteps = stepsToModify.map((step, index) => ({
      ...step,
      index,
    }));
    setSteps(reassignedSteps);
  };

  return (
    <ChakraProvider>
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
            <Flex alignItems="center">
              <Link
                display="flex"
                alignItems="center"
                justifyContent="center"
                colorScheme="gray"
                variant="ghost"
                size="sm"
                href="https://github.com/baptisteArno/tinking/blob/master/help.md"
                target="_blank"
                mr={2}
              >
                <QuestionIcon />
              </Link>
              <IconButton
                colorScheme="gray"
                variant="ghost"
                size="sm"
                aria-label="Close"
                onClick={handleCloseClick}
                icon={<CloseIcon />}
              />
            </Flex>
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
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="stepsList">
                    {(provided) => (
                      <OrderedList
                        spacing={3}
                        ml="0"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {steps.map((step) => (
                          <Draggable
                            key={step.id}
                            draggableId={step.id}
                            index={step.index}
                          >
                            {(provided) => (
                              <StepItem
                                draggableProvided={provided}
                                step={step}
                                stepIndex={step.index}
                                onStepChange={(newStep) =>
                                  handleUpdateStep(newStep, step.index)
                                }
                                onDeleteStep={() =>
                                  handleDeleteStep(step.index)
                                }
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </OrderedList>
                    )}
                  </Droppable>
                </DragDropContext>
                <Button
                  style={{ width: "30%" }}
                  disabled={editingStepIndex === steps.length - 1}
                  colorScheme="teal"
                  onClick={handleAddStep}
                  leftIcon={<SmallAddIcon />}
                  size="sm"
                  mt={3}
                >
                  Add step
                </Button>

                {steps.length > 1 && (
                  <Menu matchWidth>
                    <MenuButton
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      colorScheme="blue"
                      my={5}
                      minHeight="2.5rem"
                    >
                      ⚙️ Generate code
                    </MenuButton>
                    <MenuList>
                      <MenuItem
                        onClick={() => handleGenerateCodeClick("puppeteer")}
                      >
                        🤖 Puppeteer (Most popular)
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleGenerateCodeClick("playwright")}
                      >
                        🎭 Playwright
                      </MenuItem>
                    </MenuList>
                  </Menu>
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
