export enum TagType {
  CONTAINER = "container",
  LINK = "link",
  IMAGE = "image",
}

export enum StepAction {
  NAVIGATE = "Go to link",
  EXTRACT_TEXT = "Extract text",
  EXTRACT_HREF = "Extract link",
  EXTRACT_IMAGE_SRC = "Extract image URL",
  RECORD_CLICKS_KEYS = "Record clicks and keys",
}

export enum OptionType {
  INFINITE_SCROLL = "Infinite Scroll",
  PAGINATION = "Pagination",
  REGEX = "Regex",
  CUSTOM_AMOUNT_TO_EXTRACT = "Custom amount to extract",
}

export type SimpleOption = {
  type: OptionType;
};
export type OptionWithValue = {
  type: OptionType;
  value: string;
};

export type StepOption = SimpleOption | OptionWithValue | undefined;

export type MouseClick = {
  selector: string;
};
export type KeyInput = {
  input: string;
};
export interface Step {
  id: string;
  action?: StepAction;
  options: StepOption[];
  selector?: string;
  totalSelected?: number;
  tagName?: string;
  tagType?: TagType;
  variableName?: string;
  content?: string | null;
  recordedClicksAndKeys?: (MouseClick | KeyInput)[];
}

export interface ScrappedStep {
  selector: string;
  total: number;
  tagName: string;
  tagType: TagType;
  content: string;
}
