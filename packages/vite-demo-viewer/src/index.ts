import type {
  TControlDefinition,
  TDemoDefinition,
  TNavBranchNode,
  TNavData,
  TNavLeafNode,
  TNavTreeNode,
} from '@trunkjs/demo-viewer';

export * from './lib/tjDemoViewerPlugin';
export type { TControlDefinition, TDemoDefinition, TNavBranchNode, TNavData, TNavLeafNode, TNavTreeNode };

export function defineDemo(demo: TDemoDefinition): TDemoDefinition {
  return demo;
}
