import { DeleteIcon, CheckIcon, SmallAddIcon } from "@chakra-ui/icons";
import {
  ListItem,
  Flex,
  Select,
  Input,
  Box,
  Tag,
  VStack,
  IconButton,
  Text,
  Button,
  OrderedList,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React, { ChangeEvent, useEffect, useRef } from "react";
import { useState } from "react";
import { MdEdit } from "react-icons/md";
import { editingStepAtom } from "../App";
import {
  actionIsExpectingSelector,
  findUniqueSelector,
  getSelectorContent,
  parseDefaultAction,
  parseStepFromWebpage,
  parseTagType,
} from "../service/helperFunctions";
import { KeyInput, MouseClick, Step, StepAction, StepOption } from "../types";
import { OptionItem } from "./OptionItem";
import { RecordItem } from "./RecordItem";

type StepItemProps = {
  step: Step;
  stepIndex: number;
  onStepChange: (updatedStep: Step) => void;
  onDeleteStep: () => void;
};

export const StepItem = ({
  step,
  stepIndex,
  onStepChange,
  onDeleteStep,
}: StepItemProps): JSX.Element => {
  const stepRefForEventCallbacks = useRef<Step>(step);
  const [currentStep, setCurrentStep] = useState(step);
  const [formattedContent, setFormattedContent] = useState(step.content);
  const [editingStepIndex, setEditingStepIndex] = useAtom(editingStepAtom);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleIncomingMessageFromPage = (event: any) => {
    if (
      event.data.type === "SELECT_NODE" &&
      event.data.command === "update" &&
      event.data.stepIndex === stepIndex &&
      (event.data.optionIndex === undefined || event.data.optionIndex === null)
    ) {
      setCurrentStep({
        ...stepRefForEventCallbacks.current,
        ...parseStepFromWebpage(event.data),
      });
      if (event.data.content) {
        setFormattedContent(event.data.content);
      }
    }
    if (
      event.data.type === "SELECT_NODE" &&
      event.data.command === "findUniqueSelector" &&
      event.data.selectingNodeIndex === stepIndex
    ) {
      setCurrentStep({
        ...stepRefForEventCallbacks.current,
        selector: event.data.selector,
      });
    }
    if (
      event.data.type === "RECORD_CLICKS_KEYS" &&
      event.data.command === "update" &&
      event.data.stepIndex === stepIndex
    ) {
      if (!stepRefForEventCallbacks.current.recordedClicksAndKeys) return;
      const recordedClicksAndKeys =
        stepRefForEventCallbacks.current.recordedClicksAndKeys;
      if (event.data.selector) {
        recordedClicksAndKeys?.push({ selector: event.data.selector });
      } else {
        const char = event.data.input;
        if (char === "CapsLock") return;
        const lastRecord = [
          ...stepRefForEventCallbacks.current.recordedClicksAndKeys,
        ].pop();
        if (lastRecord && "input" in lastRecord) {
          let input;
          if (char === "Backspace") {
            input = lastRecord.input.substr(0, lastRecord.input.length - 1);
          } else if (char === "Space") {
            input = lastRecord.input + " ";
            // Ignore other keys than letter
          } else if (char.length > 1) {
            return;
          } else {
            input = lastRecord.input + char;
          }
          recordedClicksAndKeys.splice(recordedClicksAndKeys.length - 1, 1, {
            input,
          });
        } else {
          if (char.length > 1) return;
          recordedClicksAndKeys?.push({ input: char });
        }
      }
      setCurrentStep({
        ...stepRefForEventCallbacks.current,
        recordedClicksAndKeys,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleIncomingMessageFromPage);
    return () => {
      window.removeEventListener("message", handleIncomingMessageFromPage);
    };
  }, []);

  useEffect(() => {
    if (!currentStep) {
      return;
    }
    stepRefForEventCallbacks.current = currentStep;
    onStepChange(currentStep);
  }, [currentStep]);

  const handleAddOptionClick = () => {
    const options = currentStep.options;
    setCurrentStep({ ...currentStep, options: [...options, undefined] });
  };

  const handleOptionChange = (
    newOption: StepOption,
    optionIndex: number,
    newContent?: string | null
  ) => {
    currentStep.options[optionIndex] = newOption;
    if (newContent) {
      setFormattedContent(newContent);
    } else if (newContent === null) {
      setFormattedContent(currentStep.content);
    }
    setCurrentStep({ ...currentStep });
  };

  const handleOptionDelete = (optionIndex: number) => {
    setFormattedContent(currentStep.content);
    currentStep.options.splice(optionIndex, 1);
    setCurrentStep({ ...currentStep });
  };

  const handleActionChange = (action: StepAction) => {
    if (action === StepAction.RECORD_CLICKS_KEYS) {
      setCurrentStep({ ...currentStep, action, recordedClicksAndKeys: [] });
      setEditingStepIndex(stepIndex);
    } else if (!currentStep.selector && actionIsExpectingSelector(action)) {
      setCurrentStep({ ...currentStep, action });
      setEditingStepIndex(stepIndex);
    } else {
      setCurrentStep({
        ...currentStep,
        content: getSelectorContent(action, currentStep.selector),
      });
    }
  };
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) => {
    let selector = e.target.value;
    setCurrentStep({ ...currentStep, selector });
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
        findUniqueSelector(selector, parseInt(onlyThisIndex[1]), stepIndex);
        nodes = undefined;
      }
    } catch (e) {
      // Invalid selector
      setCurrentStep({
        ...currentStep,
        totalSelected: 0,
        tagName: undefined,
        tagType: undefined,
        action: undefined,
        content: undefined,
        selector: selector,
      });
      return;
    }
    if (nodes && nodes.length > 0) {
      const tagName = nodes[0].tagName.toLowerCase();
      setCurrentStep({
        ...currentStep,
        totalSelected: nodes.length,
        tagName,
        tagType: parseTagType(tagName),
        action: parseDefaultAction(tagName),
        content: getSelectorContent(parseDefaultAction(tagName), selector),
        selector,
      });
      parent.document.querySelectorAll(".crx_mouse_visited").forEach((node) => {
        node.classList.remove("crx_mouse_visited");
      });
      parent.document.querySelectorAll(selector).forEach((node) => {
        node.classList.add("crx_mouse_visited");
      });
    } else {
      setCurrentStep({
        ...currentStep,
        totalSelected: 0,
        tagName: undefined,
        tagType: undefined,
        action: undefined,
        content: undefined,
        selector: selector,
      });
    }
  };

  const handleRecordChange = (
    newRecord: KeyInput | MouseClick,
    idx: number
  ) => {
    if (!currentStep.recordedClicksAndKeys) return;
    currentStep.recordedClicksAndKeys[idx] = newRecord;
    setCurrentStep({ ...currentStep });
  };

  const handleRecordDelete = (idx: number) => {
    if (!currentStep.recordedClicksAndKeys) return;
    currentStep.recordedClicksAndKeys.splice(idx, 1);
    setCurrentStep({ ...currentStep });
  };

  return (
    <ListItem display="flex" flexDirection="column">
      <Flex
        backgroundColor="teal.900"
        p="10px"
        rounded="lg"
        justify="space-between"
        w="full"
        align="start"
      >
        {editingStepIndex !== stepIndex ? (
          <VStack align="stretch" flex={1} mr={1}>
            <Flex style={{ gap: 10 }}>
              <Tag height="2rem">{stepIndex + 1}</Tag>
              <SelectAction
                step={currentStep}
                onActionChange={handleActionChange}
              />
              {(currentStep.action === StepAction.EXTRACT_HREF ||
                currentStep.action === StepAction.EXTRACT_IMAGE_SRC ||
                currentStep.action === StepAction.EXTRACT_TEXT) && (
                <p>and save it as</p>
              )}
            </Flex>
            {(currentStep.action === StepAction.EXTRACT_HREF ||
              currentStep.action === StepAction.EXTRACT_IMAGE_SRC ||
              currentStep.action === StepAction.EXTRACT_TEXT) && (
              <Input
                size="sm"
                placeholder="My variable"
                value={currentStep.variableName}
                onChange={(e) =>
                  setCurrentStep({
                    ...currentStep,
                    variableName: e.target.value,
                  })
                }
              />
            )}
            {currentStep.recordedClicksAndKeys &&
              currentStep.recordedClicksAndKeys?.map((record, idx) => (
                <RecordItem
                  key={idx}
                  record={record}
                  onRecordChange={(newRecord) =>
                    handleRecordChange(newRecord, idx)
                  }
                  onRecordDelete={() => handleRecordDelete(idx)}
                />
              ))}
            {currentStep.options && currentStep.options.length > 0 && (
              <VStack flex="1" overflow="hidden" alignItems="stretch">
                {currentStep.options.map((_, idx) => (
                  <OptionItem
                    key={idx}
                    step={currentStep}
                    stepIndex={stepIndex}
                    optionIndex={idx}
                    onOptionChange={(option, newContent) =>
                      handleOptionChange(option, idx, newContent)
                    }
                    onOptionDelete={() => handleOptionDelete(idx)}
                  />
                ))}
              </VStack>
            )}
            {stepIndex > 0 &&
              currentStep.totalSelected &&
              currentStep.totalSelected > 0 && (
                <Button
                  colorScheme="teal"
                  onClick={handleAddOptionClick}
                  leftIcon={<SmallAddIcon />}
                  size="xs"
                  variant="outline"
                >
                  Add an option
                </Button>
              )}
            {formattedContent && (
              <Box
                display="inline-flex"
                align="center"
                maxW="300px"
                whiteSpace="pre"
                overflow="hidden"
              >
                <Tag colorScheme="green" overflow="hidden">
                  {formattedContent}
                </Tag>
              </Box>
            )}{" "}
            {stepIndex > 0 &&
              currentStep.totalSelected &&
              currentStep.totalSelected > 1 && (
                <Box display="inline-flex" align="center">
                  <Tag>{currentStep.totalSelected} nodes</Tag>
                </Box>
              )}
          </VStack>
        ) : (
          <VStack align="start" w="full" overflow="hidden" mr={2}>
            {currentStep.recordedClicksAndKeys ? (
              <>
                <Text>⌨️ Recording... </Text>
                <OrderedList>
                  {currentStep.recordedClicksAndKeys.map((recorded, idx) => {
                    return (
                      <ListItem key={idx}>
                        {"selector" in recorded ? (
                          <>
                            Click:{" "}
                            <Tag whiteSpace="pre" overflow="hidden">
                              {recorded.selector}
                            </Tag>
                          </>
                        ) : (
                          `Type: ${recorded.input}`
                        )}
                      </ListItem>
                    );
                  })}
                </OrderedList>
              </>
            ) : (
              <>
                <Text>Click on the element you wish to extract or</Text>
                <VStack flex="1" align="start" w="full">
                  <Input
                    value={currentStep.selector ?? ""}
                    size="sm"
                    placeholder="Type a query selector"
                    onChange={handleSelectorChange}
                  />
                  {currentStep.totalSelected && (
                    <Flex maxW="full" flexWrap="wrap" style={{ gap: 5 }}>
                      {currentStep.content && (
                        <Tag whiteSpace="pre" overflow="hidden">
                          {currentStep.content}
                        </Tag>
                      )}
                      <Tag whiteSpace="pre" overflow="hidden">
                        {currentStep.totalSelected} elements
                      </Tag>
                    </Flex>
                  )}
                </VStack>
              </>
            )}
          </VStack>
        )}
        {stepIndex > 0 && (
          <VStack>
            <IconButton
              size="sm"
              colorScheme="red"
              aria-label="Remove"
              icon={<DeleteIcon />}
              onClick={onDeleteStep}
            />
            <IconButton
              size="sm"
              colorScheme="blue"
              aria-label="Edit"
              icon={editingStepIndex === stepIndex ? <CheckIcon /> : <MdEdit />}
              disabled={
                editingStepIndex === stepIndex &&
                !currentStep.totalSelected &&
                (!currentStep.recordedClicksAndKeys ||
                  currentStep.recordedClicksAndKeys?.length === 0)
              }
              onClick={() => {
                setEditingStepIndex(
                  editingStepIndex === stepIndex ? null : stepIndex
                );
              }}
            />
          </VStack>
        )}
      </Flex>
      {currentStep.totalSelected !== undefined &&
        currentStep.totalSelected > 1 &&
        currentStep.action === StepAction.NAVIGATE && (
          <Text mt={1}>
            For each link:
            <br />
          </Text>
        )}
    </ListItem>
  );
};

const SelectAction = ({
  step,
  onActionChange,
}: {
  step: Step;
  onActionChange: (val: StepAction) => void;
}) => (
  <Select
    size="sm"
    display="inline-flex"
    w="160px"
    value={step.action}
    onChange={(e) => onActionChange(e.target.value as StepAction)}
  >
    <option>Select an action</option>
    <option value={StepAction.EXTRACT_TEXT}>{StepAction.EXTRACT_TEXT}</option>
    <option value={StepAction.EXTRACT_IMAGE_SRC}>
      {StepAction.EXTRACT_IMAGE_SRC}
    </option>
    <option value={StepAction.EXTRACT_HREF}>{StepAction.EXTRACT_HREF}</option>
    <option value={StepAction.NAVIGATE}>{StepAction.NAVIGATE}</option>
    <option value={StepAction.RECORD_CLICKS_KEYS}>
      {StepAction.RECORD_CLICKS_KEYS}
    </option>
  </Select>
);
