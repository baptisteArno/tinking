import { useToast, Button } from "@chakra-ui/react";
import { saveTink } from "./service/helperFunctions";
import React, { useState } from "react";
import { Step } from "./types";

type TinkSaveProps = {
  steps: Step[];
};

export const TinkSave = ({ steps }: TinkSaveProps): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onLoad = async () => {
    setLoading(true);
    const savedTink = await saveTink(steps);
    console.log(savedTink);
    setLoading(false);
    toast({
      title: "Saved",
      description: `Successfully saved Tink with ID: "${savedTink}".`,
      status: "success",
      isClosable: true,
    });
  };

  return (
    <Button
      ml={4}
      colorScheme="blue"
      onClick={onLoad}
      isLoading={loading}
      disabled={steps.length < 2}
      type="submit"
      height="25px"
      size="sm"
    >
      Save
    </Button>
  );
};
