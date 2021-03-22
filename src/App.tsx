import {
  ChevronDownIcon,
  CloseIcon,
  QuestionIcon,
  SmallAddIcon,
  WarningTwoIcon,
} from "@chakra-ui/icons";
import {
  Button,
  Text,
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
  useClipboard,
} from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import { Step, StepAction, TagType } from "./types";
import { generateScript } from "./lib/scriptGenerator";
import { v4 as uuidv4 } from "uuid";
import { StepItem } from "./StepItem/StepItem";
import { FeedbackForm } from "./FeedbackForm";
import { TinkLoader } from "./TinkLoader";
import { TinkSave } from "./TinkSave";
import {
  launchNodeSelection,
  stopNodeSelection,
} from "./service/helperFunctions";
import { atom, useAtom } from "jotai";
import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { InitialStep } from "./StepItem/InitialStep";

export const editingStepAtom = atom<number | null>(null);

export const App = (): JSX.Element => {
  const [script, setScript] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: uuidv4(),
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
  const { hasCopied, onCopy } = useClipboard(script);

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

  const handleCloseClick = async () => {
    parent.postMessage({ type: "WINDOW" }, "*");
  };

  const handleResetClick = () => {
    setSteps([
      {
        id: uuidv4(),
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
    setSteps([...steps]);
    setEditingStepIndex(null);
  };

  const saveSteps = (steps: Step[]) => {
    parent.postMessage({ type: "STORE_STEPS", steps }, "*");
  };

  const handleGenerateCodeClick = (library: "puppeteer" | "playwright") => {
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
    const reorderedSteps = [...steps];
    const movingStep = { ...reorderedSteps[dropResult.source.index] };
    reorderedSteps.splice(dropResult.source.index, 1);
    reorderedSteps.splice(dropResult.destination.index, 0, movingStep);
    setSteps(reorderedSteps);
  };

  const lastStepHasNoAction =
    steps.length > 1 && steps[steps.length - 1].action === undefined;

  const onTinkLoaded = (steps: Step[]) => {
    setSteps(steps);
    setTimeout(() => {
      scrollToBottom();
    }, 10);
  };

  const onFeedbackSubmit = () => {
    setShowIssueForm(false);
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
          <Flex mt="70px" px="10px">
            <TinkLoader callback={onTinkLoaded} />
          </Flex>

          <Flex
            ref={scrollingContainer}
            style={{ scrollBehavior: "smooth" }}
            overflowY="scroll"
            h="630px"
            mt={4}
            direction="column"
            px="10px"
          >
            {isLoading ? (
              <Spinner m="auto" />
            ) : (
              <>
                <Flex mb={2} alignItems="bottom">
                  <Text>🧶 Tink</Text>
                  <TinkSave steps={steps} />
                </Flex>
                <InitialStep step={steps[0]} />
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="stepsList">
                    {(provided) => (
                      <OrderedList
                        spacing={3}
                        ml="0"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {steps.slice(1).map((step, idx) => (
                          <StepItem
                            key={step.id}
                            step={step}
                            stepIndex={idx + 1}
                            onStepChange={(newStep) =>
                              handleUpdateStep(newStep, idx + 1)
                            }
                            onDeleteStep={() => handleDeleteStep(idx + 1)}
                          />
                        ))}
                        {provided.placeholder}
                      </OrderedList>
                    )}
                  </Droppable>
                </DragDropContext>
                <Button
                  width="130px"
                  isDisabled={editingStepIndex !== null || lastStepHasNoAction}
                  colorScheme="teal"
                  onClick={handleAddStep}
                  leftIcon={<SmallAddIcon />}
                  size="sm"
                  mt={2}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore
                  flexShrink="0"
                >
                  Add step
                </Button>

                {steps.length > 1 && (
                  <Menu matchWidth>
                    <MenuButton
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      colorScheme="blue"
                      my={4}
                      minHeight="2.5rem"
                    >
                      Generate code
                    </MenuButton>
                    <MenuList border="none">
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
                    <Code overflowY="scroll" pos="relative" flex="0 0 360px">
                      {script}
                      <Button
                        colorScheme="blue"
                        pos="absolute"
                        top={2}
                        right={2}
                        isDisabled={hasCopied}
                        onClick={onCopy}
                      >
                        {hasCopied ? "Copied" : "Copy"}
                      </Button>
                    </Code>
                    <Link
                      as="a"
                      href="https://github.com/baptisteArno/tinking-code-starter"
                      target="_blank"
                      marginY={2}
                      textAlign="center"
                    >
                      How to use this code?
                    </Link>
                  </>
                )}
                <Button
                  width="140px"
                  colorScheme="pink"
                  onClick={() => setShowIssueForm(!showIssueForm)}
                  leftIcon={<WarningTwoIcon />}
                  rightIcon={<ChevronDownIcon />}
                  size="sm"
                  mt={4}
                >
                  Report issue
                </Button>
                {showIssueForm && (
                  <FeedbackForm steps={steps} callback={onFeedbackSubmit} />
                )}
              </>
            )}
          </Flex>
        </Flex>
      </DarkMode>
    </ChakraProvider>
  );
};
