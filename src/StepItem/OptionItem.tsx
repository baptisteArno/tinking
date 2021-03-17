import { CheckIcon, CloseIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Select,
} from "@chakra-ui/react";
import React, { ChangeEvent, useEffect, useState } from "react";
import {
  launchNodeSelection,
  parseInputPlaceholderFromOption,
  stopNodeSelection,
} from "../service/helperFunctions";
import {
  OptionType,
  OptionWithValue,
  SimpleOption,
  Step,
  StepOption,
} from "../types";

type OptionItemProps = {
  step: Step;
  stepIndex: number;
  optionIndex: number;
  onOptionChange: (
    newOption: StepOption,
    updatedStepContent?: string | null
  ) => void;
  onOptionDelete: () => void;
};

export const OptionItem = ({
  step,
  stepIndex,
  optionIndex,
  onOptionChange,
  onOptionDelete,
}: OptionItemProps): JSX.Element => {
  const option = step.options[optionIndex];

  const [isSelectingPaginateElement, setIsSelectingPaginateElement] = useState(
    false
  );
  const [regexValid, setRegexValid] = useState<boolean | undefined>();
  const [inputPlaceholder, setInputPlaceholder] = useState(
    parseInputPlaceholderFromOption(option?.type)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleIncomingMessageFromPage = (event: any) => {
    if (
      event.data.type === "SELECT_NODE" &&
      event.data.command === "update" &&
      event.data.stepIndex === stepIndex &&
      event.data.optionIndex === optionIndex
    ) {
      const newOption = step.options[event.data.optionIndex] as OptionWithValue;
      newOption.value = event.data.selector;
      onOptionChange(newOption);
      stopNodeSelection();
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleIncomingMessageFromPage);
    return () => {
      window.removeEventListener("message", handleIncomingMessageFromPage);
    };
  });

  const handleOptionTypeChange = (optionType: OptionType) => {
    let newOption: SimpleOption | OptionWithValue;
    const optionNeedValue =
      optionType === OptionType.PAGINATION ||
      optionType === OptionType.REGEX ||
      optionType === OptionType.CUSTOM_AMOUNT_TO_EXTRACT;

    if (optionNeedValue) {
      newOption = {
        type: optionType,
        value: "",
      };
      setInputPlaceholder(parseInputPlaceholderFromOption(optionType));
    } else {
      newOption = {
        type: optionType,
      };
    }
    onOptionChange(newOption);
    if (optionType === OptionType.PAGINATION) {
      setIsSelectingPaginateElement(true);
      launchNodeSelection(stepIndex, "pagination", { optionIndex });
    }
  };

  const handleDeleteOptionClick = () => {
    if (isSelectingPaginateElement) stopNodeSelection();
    onOptionDelete();
  };

  const handleOptionValueChange = (
    e: ChangeEvent<HTMLInputElement>,
    option: OptionWithValue
  ) => {
    if (isSelectingPaginateElement) stopNodeSelection();
    if (!step.options) return;
    option.value = e.target.value;
    onOptionChange(option);
    if (option.type === OptionType.REGEX && step.content) {
      try {
        const regex = new RegExp(option.value, "gm");
        setRegexValid(true);
        const matchedArray = [...step.content.matchAll(regex)];
        const match = matchedArray[0][1];
        if (match !== "") {
          // Update formattedContent in StepItem with the new RegEx match
          onOptionChange(option, match);
        }
      } catch {
        onOptionChange(option, null);
        setRegexValid(false);
      }
    }
  };

  return (
    <Flex alignItems="center" justifyContent="space-between">
      <SelectOption
        option={option?.type}
        onOptionChange={(option) => handleOptionTypeChange(option)}
      />
      {option && "value" in option && (
        <InputGroup size="sm">
          <Input
            ml={1}
            placeholder={inputPlaceholder}
            value={option.value}
            onChange={(e) => handleOptionValueChange(e, option)}
          />
          {regexValid !== undefined && (
            <InputRightElement>
              {regexValid ? (
                <CheckIcon color="teal.200" fontSize={"small"} />
              ) : (
                <CloseIcon color="red.200" fontSize={"x-small"} />
              )}
            </InputRightElement>
          )}
        </InputGroup>
      )}
      <IconButton
        size="xs"
        ml={1}
        icon={<DeleteIcon />}
        aria-label="Delete option"
        variant="ghost"
        onClick={handleDeleteOptionClick}
      />
    </Flex>
  );
};

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
    <option value={OptionType.CUSTOM_AMOUNT_TO_EXTRACT}>
      {OptionType.CUSTOM_AMOUNT_TO_EXTRACT}
    </option>
    <option value={OptionType.INFINITE_SCROLL}>
      {OptionType.INFINITE_SCROLL}
    </option>
    <option value={OptionType.PAGINATION}>{OptionType.PAGINATION}</option>
    <option value={OptionType.REGEX}>{OptionType.REGEX}</option>
  </Select>
);
