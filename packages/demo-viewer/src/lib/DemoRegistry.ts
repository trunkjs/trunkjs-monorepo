import type { TDemoDefinition, TNavData, TNavTreeNode } from '../types';

const DEMO_HASH_PREFIX = '#/demo/';

export class DemoRegistry {
  readonly demos: readonly TDemoDefinition[];

  constructor(demos: readonly TDemoDefinition[]) {
    this.demos = Array.isArray(demos) ? [...demos].sort((left, right) => this.compareDemos(left, right)) : [];
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

      const segments = [...this.getDemoNavPath(demo), demo.filename];
      let currentLevel = tree;

      for (const [index, segment] of segments.entries()) {
        const isLeaf = index === segments.length - 1;

        if (isLeaf) {
          currentLevel.push({
            name: this.getDemoLabel(demo),
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

  getFirstDemo(): TDemoDefinition | undefined {
    return this.demos.find((demo) => demo.filename);
  }

  getDemoHref(demo: Pick<TDemoDefinition, 'filename'> | string): string {
    const filename = typeof demo === 'string' ? demo : (demo.filename ?? '');
    return DEMO_HASH_PREFIX + encodeURIComponent(filename);
  }

  getDemoLabel(demo: Pick<TDemoDefinition, 'filename' | 'title'> | string): string {
    if (typeof demo === 'string') {
      return demo.replace(/\.demo\.ts$/, '');
    }

    if (demo.title) {
      return demo.title;
    }

    return (
      (demo.filename ?? '')
        .split('/')
        .pop()
        ?.replace(/\.demo\.ts$/, '') ?? ''
    );
  }

  private getDemoNavPath(demo: TDemoDefinition): string[] {
    if (demo.navPath !== undefined) {
      const path = Array.isArray(demo.navPath) ? demo.navPath : demo.navPath.split('/');
      return path.map((segment) => segment.trim()).filter(Boolean);
    }

    if (demo.group) {
      return [demo.group];
    }

    return (demo.filename ?? '').split('/').slice(0, -1);
  }

  private compareDemos(left: TDemoDefinition, right: TDemoDefinition): number {
    const leftOrder = Number.isFinite(left.order) ? (left.order as number) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.order) ? (right.order as number) : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftPath = [...this.getDemoNavPath(left), this.getDemoLabel(left)];
    const rightPath = [...this.getDemoNavPath(right), this.getDemoLabel(right)];

    for (let index = 0; index < Math.max(leftPath.length, rightPath.length); index += 1) {
      if (leftPath[index] === undefined) return -1;
      if (rightPath[index] === undefined) return 1;

      const segmentOrder = leftPath[index].localeCompare(rightPath[index], undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      if (segmentOrder !== 0) {
        return segmentOrder;
      }
    }

    return (left.filename ?? '').localeCompare(right.filename ?? '', undefined, { numeric: true });
  }
}
