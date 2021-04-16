import {
  Flex,
  Spacer,
  Text,
  Input,
  useToast,
  Button,
  FormControl,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { loadTink } from "./service/helperFunctions";
import React from "react";

type TinkLoaderProps = {
  callback: any;
};

type FormValues = {
  tinkID: string;
};

export const TinkLoader = ({ callback }: TinkLoaderProps): JSX.Element => {
  const { handleSubmit, errors, register, formState } = useForm();
  const toast = useToast();

  const onLoad = async (values: FormValues) => {
    const loadedTink = await loadTink(values.tinkID);
    if (loadedTink) {
      toast({
        title: "Loaded",
        description: "Successfully loaded Tink.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      callback(loadedTink);
    } else {
      toast({
        title: "Load failed",
        description: `Failed to load toast with ID: "${values.tinkID}".`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex flexDir="column">
      <Text mb={2}>Load Tink</Text>
      <form onSubmit={handleSubmit(onLoad)}>
        <FormControl isInvalid={errors.name}>
          <Flex>
            <Input
              name="tinkID"
              placeholder="Tink ID"
              ref={register({ required: true })}
            />
            <Spacer />
            <Button
              ml={2}
              colorScheme="blue"
              isLoading={formState.isSubmitting}
              type="submit"
            >
              Load
            </Button>
          </Flex>
        </FormControl>
      </form>
      <Text opacity={0.5}>{errors.tinkID && "Please provide a Tink ID."}</Text>
    </Flex>
  );
};
