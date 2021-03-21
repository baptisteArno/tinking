import { useForm } from "react-hook-form";
import React from "react";
import {
  Flex,
  FormErrorMessage,
  FormLabel,
  FormControl,
  Textarea,
  Button,
  Checkbox,
  useToast,
} from "@chakra-ui/react";
import { WarningTwoIcon } from "@chakra-ui/icons";
import { Step } from "./types";
import { submitFeedback } from "./service/helperFunctions"

type FeedbackProps = {
  steps: Step[];
  callback: Function;
};

type FormValues = {
  description: string;
  relatedTink: Boolean;
}

export const FeedbackForm = ({ steps, callback }: FeedbackProps) => {
  const { handleSubmit, errors, register, formState } = useForm();
  const toast = useToast()

  const onSubmit = async (values: FormValues) => {
    const feedbackID = await submitFeedback(values.description, steps)
    toast({
      title: "Report submitted.",
      position: "top",
      description: `Track your report here: ${feedbackID}.`,
      status: "success",
      isClosable: true,
    })
    callback()
    return
  }

  return (
    <Flex>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl
          isInvalid={errors.name}
        >
          <Checkbox
            name="relateTink"
            ref={register}
            defaultIsChecked
            mt={2}
          >Related to current scrape</Checkbox>
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
}