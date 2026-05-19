export type FormValuePluginTarget = {
  tagnames: string[];
  types?: string[] | null;
};

export interface FormValuePluginInterface {
  supportedElements: FormValuePluginTarget[];
  getValue(element: HTMLElement): unknown;
  setValue(element: HTMLElement, value: unknown): void;
  skipChildren(element: HTMLElement): boolean;
}
