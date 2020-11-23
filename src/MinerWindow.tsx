import React, { ChangeEvent, useRef } from "react";
import Draggable from "react-draggable";
import { useEffect, useState } from "react";
import { MdDragHandle } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";
import root from "react-shadow/emotion";
import CopyToClipboard from "react-copy-to-clipboard";
import {
  ChakraProvider,
  Flex,
  IconButton,
  Spinner,
  OrderedList,
  ListItem,
  Button,
  Select,
  Text,
  theme,
  Tag,
  Box,
  Input,
  DarkMode,
  Code,
} from "@chakra-ui/react";
import { CloseIcon, DeleteIcon } from "@chakra-ui/icons";
import { generateScript } from "./scriptGenerator";
import {
  Step,
  StepAction,
  TagType,
  parseStepFromWebpage,
  getSelectorContent,
} from "./helperFunctions";
import useDebounce from "use-debounce/lib/useDebounce";

export const MinerWindow = () => {
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapping, setIsScrapping] = useState(false);
  const [steps, setSteps] = useState<Step[]>([
    {
      id: uuidv4(),
      action: StepAction.NAVIGATE,
      selector: "",
      total: 1,
      tagName: "a",
      tagType: TagType.LINK,
      content: window.location.href,
    },
  ]);
  const [debouncedSteps] = useDebounce(steps, 1000);
  const [pointerDragPropery, setPointerDragPropery] = useState("grab");

  const stepsRef = useRef<Step[]>([...steps]);
  const scrollingContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (
        event.data.type &&
        event.data.type === "SELECT_NODE" &&
        event.data.selector &&
        event.data.command === "push"
      ) {
        stepsRef.current = [
          ...stepsRef.current,
          {
            id: uuidv4(),
            ...parseStepFromWebpage(event.data),
          },
        ];
        setSteps([...stepsRef.current]);
      }
      if (
        event.data.type === "SELECT_NODE" &&
        event.data.command === "update"
      ) {
        stepsRef.current[stepsRef.current.length - 1] = {
          ...stepsRef.current[stepsRef.current.length - 1],
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    saveSteps([...stepsRef.current]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSteps]);

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
  };

  const handleActionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    idx: number
  ) => {
    const action = e.target.value as StepAction;
    steps[idx].action = action;
    steps[idx].content = getSelectorContent(steps[idx].selector, action);
    setSteps([...steps]);
    stepsRef.current = [...steps];
  };

  const saveSteps = (steps: Step[]) => {
    window.postMessage({ type: "STORE_STEPS", steps }, "*");
  };

  const handleCloseClick = () => {
    window.postMessage({ type: "WINDOW" }, "*");
  };

  const handleGenerateCodeClick = () => {
    setScript(generateScript(steps));
    setTimeout(() => {
      scrollingContainer.current!.scrollTo({ top: 99999 });
    }, 100);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
    steps[idx].variableName = e.target.value;
    setSteps([...steps]);
    stepsRef.current = [...steps];
  };

  return (
    <root.div>
      <ChakraProvider theme={theme}>
        <DarkMode>
          <Draggable handle=".handle">
            <Flex
              bgColor="gray.900"
              color="white"
              direction="column"
              pos="fixed"
              top="20px"
              right="20px"
              rounded="lg"
              shadow="lg"
              w="400px"
              h="700px"
              zIndex={99999}
            >
              <Flex
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
                <MdDragHandle size={24} />
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
                      {(() => {
                        let inLoop = false;
                        return steps.map((step, idx) => {
                          if (idx > 0 && steps[idx - 1].total > 1) {
                            inLoop = true;
                          }
                          return (
                            <ListItem
                              key={step.id}
                              display="flex"
                              flexDirection="column"
                            >
                              {idx > 0 && steps[idx - 1].total > 1 && (
                                <Text mb={1}>
                                  For each node:
                                  <br />
                                </Text>
                              )}
                              <Flex
                                ml={inLoop ? "20px" : 0}
                                backgroundColor="teal.900"
                                p="10px"
                                rounded="lg"
                              >
                                <Text flex="1" mr={1}>
                                  <Select
                                    size="sm"
                                    mr={2}
                                    dispay="inline-flex"
                                    w="160px"
                                    value={step.action}
                                    onChange={(e) => handleActionChange(e, idx)}
                                  >
                                    <option value={StepAction.EXTRACT_TEXT}>
                                      {StepAction.EXTRACT_TEXT}
                                    </option>
                                    {step.tagName === "img" && (
                                      <option
                                        value={StepAction.EXTRACT_IMAGE_SRC}
                                      >
                                        {StepAction.EXTRACT_IMAGE_SRC}
                                      </option>
                                    )}
                                    {step.tagName === "a" && (
                                      <option value={StepAction.EXTRACT_HREF}>
                                        {StepAction.EXTRACT_HREF}
                                      </option>
                                    )}
                                    {step.tagName === "a" && (
                                      <option value={StepAction.NAVIGATE}>
                                        {StepAction.NAVIGATE}
                                      </option>
                                    )}
                                  </Select>
                                  {step.tagType}{" "}
                                  {!(
                                    step.action === StepAction.CLICK ||
                                    step.action === StepAction.NAVIGATE
                                  ) && (
                                    <>
                                      and save it as{" "}
                                      <Input
                                        size="sm"
                                        placeholder="My variable"
                                        maxW="160px"
                                        value={step.variableName}
                                        onChange={(e) =>
                                          handleInputChange(e, idx)
                                        }
                                      />
                                    </>
                                  )}
                                  {step.content && (
                                    <Box display="inline-flex" align="center">
                                      <Tag
                                        colorScheme="green"
                                        whiteSpace="nowrap"
                                        overflow="hidden"
                                        textOverflow="ellipsis"
                                        maxW="150px"
                                      >
                                        {step.content}
                                      </Tag>
                                    </Box>
                                  )}{" "}
                                  {idx > 0 && step.total > 1 && (
                                    <Box display="inline-flex" align="center">
                                      <Tag>{step.total} nodes</Tag>
                                    </Box>
                                  )}
                                </Text>
                                {idx > 0 && (
                                  <IconButton
                                    size="sm"
                                    colorScheme="red"
                                    aria-label="Remove"
                                    icon={<DeleteIcon />}
                                    onClick={() => handleDeleteStep(idx)}
                                  />
                                )}
                              </Flex>
                            </ListItem>
                          );
                        });
                      })()}
                    </OrderedList>
                    <Button
                      colorScheme="teal"
                      onClick={launchNodeSelection}
                      minHeight="2.5rem"
                      mt="1rem"
                    >
                      {isScrapping ? "Stop scrapping" : "Add step"}
                    </Button>
                    <Button
                      colorScheme="blue"
                      onClick={handleGenerateCodeClick}
                      minHeight="2.5rem"
                      mt={1}
                      mb="1rem"
                    >
                      Generate code
                    </Button>
                    {script !== "" && (
                      <>
                        <Code>{script}</Code>
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
          </Draggable>
        </DarkMode>
      </ChakraProvider>
    </root.div>
  );
};
