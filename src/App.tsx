import * as React from "react";
import {
  ChakraProvider,
  Button,
  Flex,
  Text,
  VStack,
  theme,
  Icon,
} from "@chakra-ui/react";
import Draggable from "react-draggable";
import { useEffect, useState } from "react";
import { DragHandleIcon } from "@chakra-ui/icons";

export const App = () => {
  const [isScrapping, setIsScrapping] = useState(false);
  const [clickedNode, setClickedNode] = useState("");
  const [isGrabbing, setIsGrabbing] = useState(false);

  useEffect(() => {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (
        event.data.type &&
        event.data.type === "SELECT_NODE" &&
        event.data.value
      ) {
        setIsScrapping(false);
        setClickedNode(event.data.value);
      }
    });
  }, []);

  const launchNodeSelection = () => {
    if (isScrapping) {
      window.postMessage({ type: "SELECT_NODE", command: "stop" }, "*");
      setIsScrapping(false);
    } else {
      window.postMessage({ type: "SELECT_NODE", command: "start" }, "*");
      setIsScrapping(true);
    }
  };

  return (
    <ChakraProvider resetCSS={false}>
      <Draggable handle=".handle" onDrag={() => setIsGrabbing(true)}>
        <Flex
          w="400px"
          h="700px"
          pos="absolute"
          top="0"
          left="0"
          zIndex="9999"
          align="center"
          justify="center"
          rounded="md"
          shadow="lg"
          flexDirection="column"
          backgroundColor="gray.900"
        >
          <Flex
            w="full"
            pos="absolute"
            justify="center"
            align="center"
            top="0"
            className="handle"
            cursor={isGrabbing ? "grabbing" : "grab"}
            height="70px"
            onMouseDown={() => setIsGrabbing(true)}
            onMouseUp={() => setIsGrabbing(false)}
          >
            <Icon as={DragHandleIcon} />
          </Flex>
          <VStack>
            <Text>{clickedNode}</Text>
            <Button onClick={launchNodeSelection}>
              {isScrapping ? "STOP SCRAPPING" : "SCRAP"}
            </Button>
          </VStack>
        </Flex>
      </Draggable>
    </ChakraProvider>
  );
};
