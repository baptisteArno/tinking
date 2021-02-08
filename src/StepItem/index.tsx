import {
  DeleteIcon,
  CheckIcon,
  SmallAddIcon,
  CloseIcon,
} from "@chakra-ui/icons";
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
} from "@chakra-ui/react";
import React, { ChangeEvent, useEffect } from "react";
import { useState } from "react";
import { MdEdit } from "react-icons/md";
import useDebounce from "use-debounce/lib/useDebounce";
import { launchNodeSelection } from "../service/helperFunctions";
import {
  Step,
  StepAction,
  OptionType,
  OptionWithValue,
  SimpleOption,
  TagType,
} from "../types";

type StepItemProps = {
  step: Step;
  steps: Step[];
  stepIndex: number;
  isSelecting: boolean;
  onActionChange: (newAction: StepAction) => void;
  onOptionsChange: (
    options: (SimpleOption | OptionWithValue | undefined)[]
  ) => void;
  onVariableInputChange: (newVal: string) => void;
  onSelectorInputChange: (newVal: string) => void;
  onDeleteStep: () => void;
  stopNodeSelecting: () => void;
  startNodeSelecting: () => void;
};

export const StepItem = ({
  step,
  steps,
  stepIndex,
  isSelecting,
  onActionChange,
  onOptionsChange,
  onVariableInputChange,
  onSelectorInputChange,
  onDeleteStep,
  stopNodeSelecting,
  startNodeSelecting,
}: StepItemProps): JSX.Element => {
  const [isEdittingSelector, setIsEdittingSelector] = useState(isSelecting);
  const [options, setOptions] = useState(step.options);
  const [optionsDebounced] = useDebounce(options, 500);
  const [isSelectingPaginateElement, setIsSelectingPaginateElement] = useState(
    false
  );

  useEffect(() => {
    setIsEdittingSelector(isSelecting);
  }, [isSelecting]);

  useEffect(() => {
    if (!optionsDebounced) {
      return;
    }
    onOptionsChange(optionsDebounced);
  }, [optionsDebounced]);

  const handleAddOptionClick = () => {
    if (isSelectingPaginateElement) stopNodeSelecting();
    if (!options) {
      setOptions([undefined]);
      return;
    }
    setOptions([...options, undefined]);
  };

  const handleOptionChange = (option: OptionType, optionIndex: number) => {
    if (!options) {
      return;
    }
    let newOption: SimpleOption | OptionWithValue;
    if (option === OptionType.PAGINATION || option === OptionType.REGEX) {
      newOption = {
        type: option,
        value: "",
      };
    } else {
      newOption = {
        type: option,
      };
    }
    options[optionIndex] = newOption;
    console.log([...options]);
    setOptions([...options]);
    if (option === OptionType.PAGINATION) {
      setIsSelectingPaginateElement(true);
      launchNodeSelection(stepIndex, TagType.LINK, { optionIndex });
      window.addEventListener("message", function (event) {
        if (
          event.data.type === "SELECT_NODE" &&
          event.data.command === "update" &&
          event.data.stepIndex === stepIndex &&
          event.data.optionIndex === optionIndex
        ) {
          const newOption = options[event.data.optionIndex] as OptionWithValue;
          newOption.value = event.data.selector;
          setOptions([...options]);
          stopNodeSelecting();
        }
      });
    }
  };

  const handleDeleteOptionClick = (optionIndex: number) => {
    if (isSelectingPaginateElement) stopNodeSelecting();
    if (!options) return;
    options.splice(optionIndex, 1);
    setOptions([...options]);
  };

  const handleOptionValueChange = (
    e: ChangeEvent<HTMLInputElement>,
    option: OptionWithValue
  ) => {
    if (isSelectingPaginateElement) stopNodeSelecting();
    if (!options) return;
    option.value = e.target.value;
    setOptions([...options]);
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
        {!isEdittingSelector ? (
          <VStack align="stretch" flex={1} mr={1}>
            <Flex style={{ gap: 10 }}>
              <Tag height="2rem">{stepIndex + 1}</Tag>
              <SelectAction step={step} onActionChange={onActionChange} />
              {(step.action === StepAction.EXTRACT_HREF ||
                step.action === StepAction.EXTRACT_IMAGE_SRC ||
                step.action === StepAction.EXTRACT_TEXT) && (
                <p>and save it as</p>
              )}
            </Flex>
            {(step.action === StepAction.EXTRACT_HREF ||
              step.action === StepAction.EXTRACT_IMAGE_SRC ||
              step.action === StepAction.EXTRACT_TEXT) && (
              <Input
                size="sm"
                placeholder="My variable"
                value={step.variableName}
                onChange={(e) => onVariableInputChange(e.target.value)}
              />
            )}
            {options && options.length > 0 && (
              <VStack flex="1" overflow="hidden" alignItems="stretch">
                {options.map((option, idx) => (
                  <Flex
                    key={idx}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <SelectOption
                      option={option?.type}
                      onOptionChange={(option) =>
                        handleOptionChange(option, idx)
                      }
                    />
                    {option && "value" in option && (
                      <Input
                        ml={1}
                        size="sm"
                        placeholder="Click on an element"
                        maxW="160px"
                        value={option.value}
                        onChange={(e) => handleOptionValueChange(e, option)}
                      />
                    )}
                    <IconButton
                      size="xs"
                      ml={1}
                      icon={<CloseIcon />}
                      aria-label="Delete option"
                      variant="ghost"
                      onClick={() => handleDeleteOptionClick(idx)}
                    />
                  </Flex>
                ))}
              </VStack>
            )}
            {stepIndex > 0 && step.totalSelected && step.totalSelected > 0 && (
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
            {step.content && (
              <Box
                display="inline-flex"
                align="center"
                maxW="300px"
                whiteSpace="pre"
                overflow="hidden"
              >
                <Tag colorScheme="green" overflow="hidden">
                  {step.content}
                </Tag>
              </Box>
            )}{" "}
            {stepIndex > 0 && step.totalSelected && step.totalSelected > 1 && (
              <Box display="inline-flex" align="center">
                <Tag>{step.totalSelected} nodes</Tag>
              </Box>
            )}
          </VStack>
        ) : (
          <VStack align="start" w="full" overflow="hidden" mr={2}>
            <Text>Click on the element you wish to extract or</Text>
            <VStack flex="1" align="start" w="full">
              <Input
                value={step.selector ?? ""}
                size="sm"
                placeholder="Type a CSS selector"
                onChange={(e) => onSelectorInputChange(e.target.value)}
              />
              {step.totalSelected && (
                <Flex maxW="full" flexWrap="wrap" style={{ gap: 5 }}>
                  {step.content && (
                    <Tag whiteSpace="pre" overflow="hidden">
                      {step.content}
                    </Tag>
                  )}
                  <Tag whiteSpace="pre" overflow="hidden">
                    {step.totalSelected} elements
                  </Tag>
                </Flex>
              )}
            </VStack>
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
              icon={isEdittingSelector ? <CheckIcon /> : <MdEdit />}
              disabled={isEdittingSelector && !step.totalSelected}
              onClick={() => {
                setIsEdittingSelector(!isEdittingSelector);
                if (isEdittingSelector) {
                  stopNodeSelecting();
                }
                if (!isEdittingSelector) {
                  startNodeSelecting();
                }
              }}
            />
          </VStack>
        )}
      </Flex>
      {steps[stepIndex]?.totalSelected !== undefined &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        steps[stepIndex].totalSelected > 1 &&
        steps[stepIndex].action === StepAction.NAVIGATE && (
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
  </Select>
);

const SelectOption = ({
  option,
  onOptionChange,
}: {
  option?: OptionType;
  onOptionChange: (val: OptionType) => void;
}) => (
  <Select
    size="sm"
    display="inline-flex"
    w="160px"
    value={option}
    onChange={(e) => onOptionChange(e.target.value as OptionType)}
  >
    <option>Select an option</option>
    <option value={OptionType.INFINITE_SCROLL}>
      {OptionType.INFINITE_SCROLL}
    </option>
    <option value={OptionType.PAGINATION}>{OptionType.PAGINATION}</option>
    <option value={OptionType.REGEX}>{OptionType.REGEX}</option>
  </Select>
);
