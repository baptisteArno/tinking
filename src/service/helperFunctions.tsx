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

export const parseStepFromWebpage = (data: ScrappedStep): Omit<Step, "id"> => {
  return {
    selector: data.selector,
    totalSelected: data.total,
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

export const launchNodeSelection = (
  stepIndex: number,
  tagType?: TagType,
  params?: { optionIndex?: number }
): void => {
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
};
