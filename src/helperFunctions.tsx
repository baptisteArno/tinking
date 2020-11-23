export enum TagType {
  CONTAINER = "container",
  LINK = "link",
  IMAGE = "image",
}
export enum StepAction {
  NAVIGATE = "Navigate to",
  CLICK = "Click on",
  EXTRACT_TEXT = "Extract text of",
  EXTRACT_HREF = "Extract",
  EXTRACT_IMAGE_SRC = "Extract source from",
}
export interface Step {
  id: string;
  action: StepAction;
  selector: string;
  total: number;
  tagName: string;
  tagType: TagType;
  variableName?: string;
  content?: string | null;
}

export const parseTagType = (tagName: string) => {
  if (tagName === "a") {
    return TagType.LINK;
  }
  if (tagName === "img") {
    return TagType.IMAGE;
  }
  return TagType.CONTAINER;
};

export const parseDefaultAction = (tagName: string) => {
  if (tagName === "a") {
    return StepAction.NAVIGATE;
  }
  if (tagName === "img") {
    return StepAction.EXTRACT_IMAGE_SRC;
  }
  return StepAction.EXTRACT_TEXT;
};

export const getSelectorContent = (selector: string, action: StepAction) => {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }
  switch (action) {
    case StepAction.EXTRACT_TEXT: {
      return element.textContent;
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

export const parseStepFromWebpage = (data: any): Omit<Step, "id"> => {
  const action = parseDefaultAction(data.tagName);
  return {
    selector: data.selector,
    action,
    total: data.total,
    tagName: data.tagName,
    tagType: parseTagType(data.tagName),
    content: getSelectorContent(data.selector, action),
  };
};
