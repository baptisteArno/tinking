import { TagType, StepAction, Step, ScrappedStep } from "../types";

export const parseTagTypeFromAction = (action: StepAction): TagType => {
  if (action === StepAction.EXTRACT_HREF || action === StepAction.NAVIGATE) {
    return TagType.LINK;
  }
  if (action === StepAction.EXTRACT_IMAGE_SRC) {
    return TagType.IMAGE;
  }
  return TagType.CONTAINER;
};
export const parseTagType = (tagName: string): TagType => {
  if (tagName === "a") {
    return TagType.LINK;
  }
  if (tagName === "img") {
    return TagType.IMAGE;
  }
  return TagType.CONTAINER;
};

export const parseDefaultAction = (tagName: string): StepAction => {
  if (tagName === "a") {
    return StepAction.NAVIGATE;
  }
  if (tagName === "img") {
    return StepAction.EXTRACT_IMAGE_SRC;
  }
  return StepAction.EXTRACT_TEXT;
};

export const getSelectorContent = (
  action: StepAction,
  selector?: string
): string | undefined => {
  if (!selector) {
    return "";
  }
  const element = parent.document.querySelector(selector);
  if (!element) {
    return;
  }
  switch (action) {
    case StepAction.EXTRACT_TEXT: {
      return element.textContent ?? undefined;
    }
    case StepAction.EXTRACT_IMAGE_SRC: {
      return (element as HTMLImageElement).src;
    }
    case StepAction.EXTRACT_HREF:
    case StepAction.NAVIGATE: {
      return (element as HTMLAnchorElement).href;
    }
  }
  return;
};

export const parseStepFromWebpage = (
  data: ScrappedStep
): Omit<Step, "id" | "options"> => {
  return {
    selector: data.selector,
    totalSelected: data.total,
    amountToScrape: -1,
    tagName: data.tagName,
    tagType: parseTagType(data.tagName),
    content: data.content,
  };
};

export const actionIsExpectingSelector = (action: StepAction): boolean =>
  [
    StepAction.EXTRACT_HREF,
    StepAction.EXTRACT_IMAGE_SRC,
    StepAction.EXTRACT_TEXT,
    StepAction.NAVIGATE,
  ].includes(action);

export const isAnExtractionAction = (action?: StepAction): boolean =>
  [
    StepAction.EXTRACT_HREF,
    StepAction.EXTRACT_IMAGE_SRC,
    StepAction.EXTRACT_TEXT,
  ].includes(action ?? StepAction.NAVIGATE);

export const launchNodeSelection = (
  stepIndex: number,
  tagType?: TagType | "pagination",
  params?: { optionIndex?: number; record?: boolean }
): void =>
  params?.record
    ? startRecordingClicksKeys(stepIndex)
    : startNodeSelection(stepIndex, tagType, params);

export const stopNodeSelection = (): void => {
  parent.postMessage({ type: "SELECT_NODE", command: "stop" }, "*");
};

const startNodeSelection = (
  stepIndex: number,
  tagType?: TagType | "pagination",
  params?: { optionIndex?: number; record?: boolean }
): void =>
  parent.postMessage(
    {
      type: "SELECT_NODE",
      command: "start",
      stepIndex,
      tagType,
      optionIndex: params?.optionIndex ?? null,
    },
    "*"
  );

const startRecordingClicksKeys = (stepIndex: number): void =>
  parent.postMessage(
    {
      type: "RECORD_CLICKS_KEYS",
      command: "start",
      stepIndex,
    },
    "*"
  );

export const stopRecordingClicksKeys = (stepIndex: number): void =>
  parent.postMessage(
    {
      type: "RECORD_CLICKS_KEYS",
      command: "stop",
      stepIndex,
    },
    "*"
  );

export const findUniqueSelector = (
  selector: string,
  index: number,
  selectingNodeIndex: number
): void => {
  parent.postMessage(
    {
      type: "SELECT_NODE",
      command: "findUniqueSelector",
      selector,
      index,
      selectingNodeIndex,
    },
    "*"
  );
};

export const isStepInActionProcess = (step: Step): boolean => {
  const isRecordingButNoInputs =
    step.recordedClicksAndKeys !== undefined &&
    step.recordedClicksAndKeys.length === 0;
  const isSelectingButNoTagName = !step.tagName;

  if (step.action === StepAction.RECORD_CLICKS_KEYS) {
    return isRecordingButNoInputs;
  }
  return isSelectingButNoTagName;
};
