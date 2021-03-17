import { Box, Flex, Tag } from "@chakra-ui/react";
import React from "react";
import { Step } from "../types";

type InitialStepProps = {
  step: Step;
};

export const InitialStep = ({ step }: InitialStepProps): JSX.Element => {
  return (
    <Flex
      backgroundColor="teal.900"
      p="10px"
      rounded="lg"
      w="full"
      align="center"
    >
      <Tag height="2rem" mr={2}>
        1
      </Tag>
      Navigate to
      <Box
        display="inline-flex"
        align="center"
        maxW="235px"
        whiteSpace="pre"
        overflowX="hidden"
        ml={2}
      >
        <Tag
          colorScheme="green"
          overflowX="scroll"
          css={{
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          {step.content}
        </Tag>
      </Box>
    </Flex>
  );
};
