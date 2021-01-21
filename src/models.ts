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
  INFINITE_SCROLL = "Infinite Scroll",
}

export interface Step {
  id: string;
  action?: StepAction;
  selector?: string;
  totalSelected?: number;
  tagName?: string;
  tagType?: TagType;
  variableName?: string;
  content?: string | null;
  cookie?: {
    name: string;
    value: string;
  };
}

export interface ScrappedStep {
  selector: string;
  total: number;
  tagName: string;
  tagType: TagType;
  content: string;
}
