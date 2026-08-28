export type FormDataAccessorData = Record<string, unknown>;

export type FormDataValueElement = HTMLElement & {
  value: unknown;
  disabled?: boolean;
  name?: string;
};

export interface FormDataAccessorEntry {
  readonly name: string;
  readonly element: FormDataValueElement;
  value: unknown;
}

const ignoredInputTypes = new Set(['button', 'image', 'reset', 'submit']);

function normalizedName(name: string): string {
  return name.endsWith('[]') ? name.slice(0, -2) : name;
}

function nativeInputType(element: FormDataValueElement): string {
  return element instanceof HTMLInputElement ? element.type.toLowerCase() : '';
}

function readValue(element: FormDataValueElement): unknown {
  if (element instanceof HTMLSelectElement && element.multiple) {
    return Array.from(element.selectedOptions, (option) => option.value);
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'file') {
      return Array.from(element.files ?? []);
    }
    if (element.type === 'checkbox') {
      return element.checked;
    }
    if (element.type === 'radio') {
      return element.checked ? element.value : undefined;
    }
  }

  return element.value;
}

function writeValue(element: FormDataValueElement, value: unknown): void {
  if (element instanceof HTMLSelectElement && element.multiple) {
    const selectedValues = new Set(Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]);
    for (const option of Array.from(element.options)) {
      option.selected = selectedValues.has(option.value);
    }
    return;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'file') {
      if (value == null || (Array.isArray(value) && value.length === 0)) {
        element.value = '';
      }
      return;
    }
    if (element.type === 'checkbox') {
      element.checked = Boolean(value);
      return;
    }
    if (element.type === 'radio') {
      element.checked = typeof value === 'boolean' ? value : element.value === String(value);
      return;
    }
  }

  element.value = value;
}

function appendFormDataValue(formData: FormData, name: string, value: unknown): void {
  if (value == null || value === false) {
    return;
  }

  if (value instanceof FormData) {
    value.forEach((entryValue, entryName) => formData.append(entryName, entryValue));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendFormDataValue(formData, name, item));
    return;
  }

  if (value instanceof Blob) {
    formData.append(name, value);
    return;
  }

  formData.append(name, String(value));
}

/** Dynamically reads and writes named value elements below a DOM root. */
export class FormDataAccessor {
  public constructor(public readonly root: ParentNode) {}

  public get entries(): FormDataAccessorEntry[] {
    const entries: FormDataAccessorEntry[] = [];

    for (const element of Array.from(this.root.querySelectorAll<HTMLElement>('[name]'))) {
      const name = this.getName(element);
      if (!name || !this.isValueElement(element)) {
        continue;
      }

      entries.push({
        name,
        element,
        get value() {
          return readValue(element);
        },
        set value(value: unknown) {
          writeValue(element, value);
        },
      });
    }

    return entries;
  }

  public get data(): FormDataAccessorData {
    const data: FormDataAccessorData = {};

    for (const [name, entries] of this.groupedEntries) {
      const value = this.readGroup(entries);
      if (value !== undefined) {
        data[name] = value;
      }
    }

    return data;
  }

  public set data(data: FormDataAccessorData) {
    for (const [name, entries] of this.groupedEntries) {
      if (Object.prototype.hasOwnProperty.call(data, name)) {
        this.writeGroup(entries, data[name]);
      }
    }
  }

  public get formData(): FormData {
    const formData = new FormData();

    for (const entry of this.entries) {
      if (this.isDisabled(entry.element)) {
        continue;
      }

      const type = nativeInputType(entry.element);
      if (type === 'checkbox' || type === 'radio') {
        const input = entry.element as HTMLInputElement;
        if (input.checked) {
          appendFormDataValue(formData, entry.name, input.value);
        }
        continue;
      }

      appendFormDataValue(formData, entry.name, entry.value);
    }

    return formData;
  }

  private get groupedEntries(): Map<string, FormDataAccessorEntry[]> {
    const groups = new Map<string, FormDataAccessorEntry[]>();

    for (const entry of this.entries) {
      const name = normalizedName(entry.name);
      const group = groups.get(name) ?? [];
      group.push(entry);
      groups.set(name, group);
    }

    return groups;
  }

  private getName(element: HTMLElement): string | null {
    const propertyName = 'name' in element && typeof element.name === 'string' ? element.name : null;
    return propertyName?.trim() || element.getAttribute('name')?.trim() || null;
  }

  private isValueElement(element: HTMLElement): element is FormDataValueElement {
    if (!('value' in element) || element instanceof HTMLButtonElement) {
      return false;
    }

    return !(element instanceof HTMLInputElement && ignoredInputTypes.has(element.type.toLowerCase()));
  }

  private isDisabled(element: FormDataValueElement): boolean {
    return Boolean(element.disabled) || element.hasAttribute('disabled') || element.matches(':disabled');
  }

  private readGroup(entries: FormDataAccessorEntry[]): unknown {
    const types = new Set(entries.map((entry) => nativeInputType(entry.element)));
    const isArray = entries.some((entry) => entry.name.endsWith('[]'));

    if (types.size === 1 && types.has('radio')) {
      return entries.find((entry) => (entry.element as HTMLInputElement).checked)?.element.value;
    }

    if (types.size === 1 && types.has('checkbox')) {
      if (entries.length === 1 && !isArray) {
        return (entries[0].element as HTMLInputElement).checked;
      }

      return entries
        .filter((entry) => (entry.element as HTMLInputElement).checked)
        .map((entry) => entry.element.value);
    }

    if (isArray) {
      return entries.flatMap((entry) => {
        const value = entry.value;
        return value === undefined ? [] : Array.isArray(value) ? value : [value];
      });
    }

    return entries.length === 1 ? entries[0].value : entries.map((entry) => entry.value).at(-1);
  }

  private writeGroup(entries: FormDataAccessorEntry[], value: unknown): void {
    const types = new Set(entries.map((entry) => nativeInputType(entry.element)));
    const isArray = entries.some((entry) => entry.name.endsWith('[]'));

    if (types.size === 1 && types.has('radio')) {
      entries.forEach((entry) => {
        const input = entry.element as HTMLInputElement;
        input.checked = input.value === String(value);
      });
      return;
    }

    if (types.size === 1 && types.has('checkbox')) {
      if (entries.length === 1 && !isArray && typeof value === 'boolean') {
        (entries[0].element as HTMLInputElement).checked = value;
        return;
      }

      const selectedValues = new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(String));
      entries.forEach((entry) => {
        const input = entry.element as HTMLInputElement;
        input.checked = selectedValues.has(input.value);
      });
      return;
    }

    if (isArray && Array.isArray(value) && entries.length > 1) {
      entries.forEach((entry, index) => {
        entry.value = value[index];
      });
      return;
    }

    entries.forEach((entry) => {
      entry.value = value;
    });
  }
}
