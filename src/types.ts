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
}

export enum OptionType {
  INFINITE_SCROLL = "Infinite Scroll",
  PAGINATION = "Pagination",
  REGEX = "Regex",
}

export type SimpleOption = {
  type: OptionType;
};
export type OptionWithValue = {
  type: OptionType;
  value: string;
};

export type StepOption = SimpleOption | OptionWithValue | undefined;

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
}

export interface ScrappedStep {
  selector: string;
  total: number;
  tagName: string;
  tagType: TagType;
  content: string;
}
