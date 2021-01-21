import { DeleteIcon, CheckIcon } from "@chakra-ui/icons";
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
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import { useState } from "react";
import { MdEdit } from "react-icons/md";
import { Step, StepAction } from "../models";

type StepItemProps = {
  step: Step;
  steps: Step[];
  idx: number;
  isSelecting: boolean;
  onActionChange: (newAction: StepAction) => void;
  onVariableInputChange: (newVal: string) => void;
  onSelectorInputChange: (newVal: string) => void;
  onDeleteStep: () => void;
  stopNodeSelecting: () => void;
  startNodeSelecting: () => void;
};

export const StepItem = ({
  step,
  steps,
  idx,
  isSelecting,
  onActionChange,
  onVariableInputChange,
  onSelectorInputChange,
  onDeleteStep,
  stopNodeSelecting,
  startNodeSelecting,
}: StepItemProps): JSX.Element => {
  const [isEdittingSelector, setIsEdittingSelector] = useState(isSelecting);

  useEffect(() => {
    setIsEdittingSelector(isSelecting);
  }, [isSelecting]);

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
          <Flex
            flex="1"
            flexWrap="wrap"
            style={{ gap: 10 }}
            overflow="hidden"
            mr={2}
          >
            <Tag color="blue" height="2rem">
              {idx + 1}
            </Tag>
            <SelectAction step={step} onActionChange={onActionChange} />
            {(step.action === StepAction.EXTRACT_HREF ||
              step.action === StepAction.EXTRACT_IMAGE_SRC ||
              step.action === StepAction.EXTRACT_TEXT) && (
              <>
                and save it as{" "}
                <Input
                  size="sm"
                  placeholder="My variable"
                  maxW="160px"
                  value={step.variableName}
                  onChange={(e) => onVariableInputChange(e.target.value)}
                />
              </>
            )}
            {step.content && (
              <Box
                display="inline-flex"
                align="center"
                maxW="full"
                whiteSpace="pre"
                overflow="hidden"
              >
                <Tag colorScheme="green" overflow="hidden">
                  {step.content}
                </Tag>
              </Box>
            )}{" "}
            {idx > 0 && step.totalSelected && step.totalSelected > 1 && (
              <Box display="inline-flex" align="center">
                <Tag>{step.totalSelected} nodes</Tag>
              </Box>
            )}
          </Flex>
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
        {idx > 0 && (
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
      {steps[idx]?.totalSelected !== undefined &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        steps[idx].totalSelected > 1 &&
        steps[idx].action === StepAction.NAVIGATE && (
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
    <option value={StepAction.INFINITE_SCROLL}>
      {StepAction.INFINITE_SCROLL}
    </option>
  </Select>
);
