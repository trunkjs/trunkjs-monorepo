import type { TDemoDefinition, TNavData, TNavTreeNode } from '../types';

const DEMO_HASH_PREFIX = '#/demo/';

export class DemoRegistry {
  readonly demos: readonly TDemoDefinition[];

  constructor(demos: readonly TDemoDefinition[]) {
    this.demos = Array.isArray(demos) ? [...demos] : [];
  }

  getNavData(): TNavData {
    type TMutableNavLeafNode = {
      name: string;
      href: string;
    };

    type TMutableNavBranchNode = {
      name: string;
      children: TMutableNavTreeNode[];
    };

    type TMutableNavTreeNode = TMutableNavLeafNode | TMutableNavBranchNode;

    const tree: TMutableNavTreeNode[] = [];

    for (const demo of this.demos) {
      if (!demo.filename) {
        continue;
      }

      const segments = demo.filename.split('/');
      let currentLevel = tree;

      for (const [index, segment] of segments.entries()) {
        const isLeaf = index === segments.length - 1;

        if (isLeaf) {
          currentLevel.push({
            name: this.getDemoLabel(segment),
            href: this.getDemoHref(demo.filename),
          });
          continue;
        }

        let branch = currentLevel.find((item) => 'children' in item && item.name === segment) as
          | TMutableNavBranchNode
          | undefined;

        if (!branch) {
          branch = {
            name: segment,
            children: [],
          };
          currentLevel.push(branch);
        }

        currentLevel = branch.children;
      }
    }

    return {
      title: 'TDemos',
      description: 'Gefundene Demo-Dateien',
      tree: tree as TNavTreeNode[],
    };
  }

  getDemoByHash(hash: string): TDemoDefinition | undefined {
    if (!hash.startsWith(DEMO_HASH_PREFIX)) {
      return undefined;
    }

    try {
      return this.getDemoByFilename(decodeURIComponent(hash.slice(DEMO_HASH_PREFIX.length)));
    } catch {
      return undefined;
    }
  }

  getDemoByFilename(filename: string): TDemoDefinition | undefined {
    return this.demos.find((demo) => demo.filename === filename);
  }

  getDemoHref(demo: Pick<TDemoDefinition, 'filename'> | string): string {
    const filename = typeof demo === 'string' ? demo : (demo.filename ?? '');
    return DEMO_HASH_PREFIX + encodeURIComponent(filename);
  }

  getDemoLabel(demo: Pick<TDemoDefinition, 'filename' | 'title'> | string): string {
    if (typeof demo === 'string') {
      return demo.replace(/\.tdemo\.ts$/, '');
    }

    if (demo.title) {
      return demo.title;
    }

    return (
      (demo.filename ?? '')
        .split('/')
        .pop()
        ?.replace(/\.tdemo\.ts$/, '') ?? ''
    );
  }
}
