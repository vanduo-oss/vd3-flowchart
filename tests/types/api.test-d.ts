// Type-level smoke test for the published @vanduo-oss/vd3-flowchart surface.
// Run via `pnpm test:types` (tsc --noEmit -p tests/types/tsconfig.json).
// Imports resolve the package's own "exports" map (self-reference) → the
// built dist/*.d.ts.

import {
  VdFlowchartCore,
  computeLayout,
  LAYOUT_MODES,
  FLOWCHART_NODE_TYPES,
  FLOWCHART_KEYBOARD_SHORTCUTS,
  VD_FLOWCHART_VERSION,
  VdFlowchart as VdFlowchartVue,
  type FlowchartKeyboardShortcuts,
  type FlowchartNode,
  type FlowchartEdge,
  type FlowchartDocument,
  type FlowchartSelectEvent,
  type FlowchartChangeEvent,
  type FlowchartHistoryEvent,
  type LayoutMode,
  type VdFlowchartProps,
} from '@vanduo-oss/vd3-flowchart';
import * as FlowchartApi from '@vanduo-oss/vd3-flowchart';

const editor = new VdFlowchartCore({
  element: '#app',
  autoFit: true,
  history: true,
  historyLimit: 50,
});

editor.selectNode('a').deselect();
editor.selectEdge('e1');
editor.load({ nodes: [], edges: [] }, { preserveSelection: true });

const removed: boolean = editor.removeNode('a', { cascade: true });
const edge: FlowchartEdge | null = editor.addEdge({ from: 'a', to: 'b', autoPort: true });

const node: FlowchartNode = editor.addNode({
  text: 'n',
  relativeTo: { node: 'a', direction: 'right', distance: 200 },
});
const child = editor.addChildNode('a', { text: 'child', direction: 'down' });
const branch = editor.insertBranchNode('a', { direction: 'left', edit: true });
const sibling = editor.insertSiblingNode('b', { before: true });
const navigated: boolean = editor.navigateSelection('up');
editor.zoomTo(1).toggleShortcutsHelp(true);
editor.startTextEdit('a', { initialText: 'x' });
editor.updateOptions({ keyboardShortcuts: 'basic' });
const shortcutModes: readonly FlowchartKeyboardShortcuts[] = FLOWCHART_KEYBOARD_SHORTCUTS;
// @ts-expect-error — only 'mindmap' and 'basic' are keyboard models.
editor.updateOptions({ keyboardShortcuts: 'vim' });
editor.updateOptions({ snapGuides: false, minimap: false, autoLayout: true });
editor.selectNodes(['a', 'b'], { primary: 'b' }).toggleNodeSelection('c');
const selectedIds: string[] = editor.getSelectedNodeIds();
const groupMoved: FlowchartNode[] = editor.nudgeNodes(selectedIds, 'right', 24);
const collapsedNow: boolean = editor.setCollapsed('a', true) && editor.toggleCollapsed('a');
const visibleNodes: FlowchartNode[] = editor.getVisibleNodes();
const labelled: boolean =
  editor.selectSideEdge('a', 'right') && editor.startEdgeLabelEdit('e1', { initialText: 'y' });
editor.setMinimapEnabled(false).centerViewOn(0, 0);
const savedNode: FlowchartNode = { ...node, collapsed: true };

editor.layout('radial', { root: 'a', radius: 240 }).autoArrange({ columns: 4 });
const canUndo: boolean = editor.canUndo();
const canRedo: boolean = editor.canRedo();
editor.undo().redo().clearHistory();

editor.on('select', (event: FlowchartSelectEvent) => {
  const ids: string[] = event.nodeIds;
  void ids;
  if (event.selection?.kind === 'node') {
    const n: FlowchartNode = event.selection.node;
    void n.id;
  }
});
editor.on('change', (event: FlowchartChangeEvent) => void event.reason);
editor.on('history', (event: FlowchartHistoryEvent) => void event.canUndo);
editor.on('ready', (instance) => instance.fitView());

const doc: FlowchartDocument = editor.toJSON();
const docVersion: string = doc.version;
const positions: Map<string, { x: number; y: number }> = computeLayout(doc, 'tree');
const modes: readonly LayoutMode[] = LAYOUT_MODES;

const flowchartVersion: string = VD_FLOWCHART_VERSION;

const flowchartProps: VdFlowchartProps = {
  data: { nodes: [], edges: [] },
  readonly: false,
  history: true,
  historyLimit: 20,
  keyboardShortcuts: 'mindmap',
  snapGuides: true,
  minimap: true,
  autoLayout: false,
};
// @ts-expect-error — `history` is a boolean flag, not a number.
const badFlowchartProps: VdFlowchartProps = { history: 5 };
// @ts-expect-error — the vanilla auto-init scanner (`init`) was excised.
FlowchartApi.init?.(document.body);

void VdFlowchartVue;
void FLOWCHART_NODE_TYPES;
void removed;
void edge;
void node;
void child;
void branch;
void groupMoved;
void collapsedNow;
void visibleNodes;
void labelled;
void savedNode;
void sibling;
void navigated;
void shortcutModes;
void canUndo;
void canRedo;
void docVersion;
void positions;
void modes;
void flowchartVersion;
void flowchartProps;
void badFlowchartProps;
