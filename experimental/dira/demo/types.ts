export type WrustbrotType = {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  module?: string;
  types?: string;
  files?: string[];
  private?: boolean;
};
