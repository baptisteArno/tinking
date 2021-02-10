import { DeleteIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Input, Text } from "@chakra-ui/react";
import React, { ChangeEvent } from "react";
import { KeyInput, MouseClick } from "../types";

type RecordItemProps = {
  record: MouseClick | KeyInput;
  onRecordChange: (newRecord: MouseClick | KeyInput) => void;
  onRecordDelete: () => void;
};

export const RecordItem = ({
  record,
  onRecordChange,
  onRecordDelete,
}: RecordItemProps): JSX.Element => {
  const handleValueChange = (
    e: ChangeEvent<HTMLInputElement>,
    record: MouseClick | KeyInput
  ) => {
    if ("selector" in record) {
      onRecordChange({ selector: e.target.value });
    } else {
      onRecordChange({ input: e.target.value });
    }
  };
  return (
    <Flex alignItems="center" justifyContent="space-between">
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <Text style={{ flexShrink: "0" }}>
        {"selector" in record ? "Click on" : "Type"}
      </Text>
      <Input
        size="sm"
        ml={1}
        placeholder="Input value"
        value={"selector" in record ? record.selector : record.input}
        onChange={(e) => handleValueChange(e, record)}
      />
      <IconButton
        size="xs"
        ml={1}
        icon={<DeleteIcon />}
        aria-label="Delete option"
        variant="ghost"
        onClick={onRecordDelete}
      />
    </Flex>
  );
};
