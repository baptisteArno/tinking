import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import {
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Tag,
} from "@chakra-ui/react";
import React, { ChangeEvent, useEffect, useState } from "react";
import { BiHash } from "react-icons/bi";
import { VscRegex } from "react-icons/vsc";
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
  StepAction,
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
        stepAction={step.action}
        optionType={option?.type}
        onOptionChange={(option) => handleOptionTypeChange(option)}
      />
      {option && "value" in option && (
        <>
          {option.type === OptionType.REGEX ? (
            <Popover placement="top" autoFocus={false}>
              <PopoverTrigger>
                <InputGroup size="sm" flex="1">
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
              </PopoverTrigger>
              <PopoverContent border="none">
                <PopoverBody>
                  <Flex flexDir="column">
                    <Text textDecor="underline">Examples:</Text>
                    <HStack>
                      <Text>50$ 👉 </Text> <Tag>(\d+)$</Tag> <Text>👉 50</Text>
                    </HStack>
                    <HStack>
                      <Text>I like cookies 👉 </Text> <Tag>I (\w+) cookies</Tag>{" "}
                      <Text>👉 like</Text>
                    </HStack>
                  </Flex>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          ) : (
            <InputGroup size="sm" flex="1">
              <Input
                ml={1}
                placeholder={inputPlaceholder}
                value={option.value}
                onChange={(e) => handleOptionValueChange(e, option)}
              />
            </InputGroup>
          )}
        </>
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
  stepAction,
  optionType,
  onOptionChange,
}: {
  stepAction?: StepAction;
  optionType?: OptionType;
  onOptionChange: (val: OptionType) => void;
}) => (
  <Menu>
    <MenuButton
      size="sm"
      as={Button}
      rightIcon={<ChevronDownIcon />}
      _focus={{ outline: "none" }}
    >
      {optionType ?? "Select an option"}
    </MenuButton>
    <MenuList bgColor="teal.700" border="none">
      <MenuItem
        onClick={() => onOptionChange(OptionType.CUSTOM_AMOUNT_TO_EXTRACT)}
        icon={<BiHash />}
      >
        {OptionType.CUSTOM_AMOUNT_TO_EXTRACT}
      </MenuItem>
      <MenuItem
        icon={<VscRegex />}
        onClick={() => onOptionChange(OptionType.REGEX)}
      >
        {OptionType.REGEX}
      </MenuItem>
      {stepAction === StepAction.NAVIGATE && (
        <MenuItem
          icon={<ChevronRightIcon />}
          onClick={() => onOptionChange(OptionType.PAGINATION)}
        >
          {OptionType.PAGINATION}
        </MenuItem>
      )}
      <MenuItem
        icon={<ChevronDownIcon />}
        onClick={() => onOptionChange(OptionType.INFINITE_SCROLL)}
      >
        {OptionType.INFINITE_SCROLL}
      </MenuItem>
    </MenuList>
  </Menu>
);
