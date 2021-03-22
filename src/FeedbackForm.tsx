import { useForm } from "react-hook-form";
import React from "react";
import { ExternalLinkIcon, CheckCircleIcon } from "@chakra-ui/icons";
import {
  Flex,
  FormControl,
  Textarea,
  Button,
  Checkbox,
  useToast,
  Box,
  Link,
  Heading,
  Text,
} from "@chakra-ui/react";
import { Step } from "./types";
import { submitFeedback, makeGithubIssue } from "./service/helperFunctions";

type FeedbackProps = {
  steps: Step[];
  callback: any;
};

type FormValues = {
  description: string;
  relateTink: boolean;
};

export const FeedbackForm = ({ steps, callback }: FeedbackProps) => {
  const { handleSubmit, errors, register, formState } = useForm();
  const toast = useToast();

  const onSubmit = async (values: FormValues) => {
    const tinkID = await submitFeedback(
      values.description,
      values.relateTink,
      steps
    );

    if (tinkID === false) {
      toast({
        title: "Failed",
        description:
          "Please try reopening Tinking and try again. Otherwise save the tink and load it.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const issueURL = await makeGithubIssue(values.description, tinkID);

    const toastImmitation = () => (
      <Box p={3} bg="#9ae6b4" borderRadius="10px">
        <Flex>
          <CheckCircleIcon w={5} h={5} mx={2} />
          <Flex direction="column">
            <Heading size="sm"> Report submitted</Heading>
            <Text>Track your report here: </Text>
            <Link fontWeight="bold" href={issueURL} isExternal>
              GitHub <ExternalLinkIcon mx="2px" />
            </Link>
          </Flex>
        </Flex>
      </Box>
    );

    toast({
      render: toastImmitation,
      duration: 20000,
      status: "success",
      isClosable: true,
    });
    callback();
    return;
  };

  return (
    <Flex>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl isInvalid={errors.name}>
          <Checkbox name="relateTink" ref={register} defaultIsChecked mt={2}>
            Related to current Tink
          </Checkbox>
          <Textarea
            name="description"
            placeholder="describe the issue"
            ref={register({ required: true })}
            mt={2}
          />
          <Flex opacity="0.5">
            {errors.description && "A description of the issue is required"}
          </Flex>
        </FormControl>
        <Button
          mt={2}
          colorScheme="pink"
          isLoading={formState.isSubmitting}
          type="submit"
          size="sm"
        >
          Submit
        </Button>
      </form>
    </Flex>
  );
};
