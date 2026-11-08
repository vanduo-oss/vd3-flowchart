import type { DefineComponent } from 'vue';
import type {
  FlowchartDocument,
  FlowchartNode,
  FlowchartEdge,
  FlowchartChangeEvent,
  FlowchartSelectEvent,
  FlowchartViewportEvent,
  FlowchartConnectEvent,
  VdFlowchart as VdFlowchartCore,
  LayoutMode,
  LayoutOptions,
  FlowchartKeyboardShortcuts,
  FlowchartColorPreset,
  FlowchartNodeColorPatch,
  FlowchartNodeAlignment,
  FlowchartDistributeAxis,
  ExportSvgOptions,
} from './core';

/** Loosely-typed document accepted by the `data` prop. */
export interface VdFlowchartDocument extends Partial<FlowchartDocument> {
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface VdFlowchartProps {
  /** Flowchart document ({ nodes, edges }). */
  data?: VdFlowchartDocument;
  /** Render as a non-editable viewer. */
  readonly?: boolean;
  /** Background grid size in px. */
  gridSize?: number;
  /** Keep the current selection across data-driven reloads when possible. */
  preserveSelection?: boolean;
  /** Fit the view to content once the editor reports a measurable size. */
  autoFit?: boolean;
  /** Enable the built-in undo/redo history (default true). */
  history?: boolean;
  /** Maximum number of history entries to retain. */
  historyLimit?: number;
  /** Keyboard model on the focused canvas (default `'mindmap'`). */
  keyboardShortcuts?: FlowchartKeyboardShortcuts;
  /** Snap dragged nodes to alignment guides; Alt bypasses (default true). */
  snapGuides?: boolean;
  /** Show the overview minimap (default true). */
  minimap?: boolean;
  /** Re-run the current layout after keyboard or handle insertions (default false). */
  autoLayout?: boolean;
  /** Lowest camera scale. Defaults to 0.35. Set it together with `maxScale`. */
  minScale?: number;
  /** Highest camera scale. Defaults to 3. Set it together with `minScale`. */
  maxScale?: number;
  /** Smallest resizable-node side. Defaults to 56. Set it together with `maxNodeSize`. */
  minNodeSize?: number;
  /** Largest resizable-node side. Defaults to 420. Set it together with `minNodeSize`. */
  maxNodeSize?: number;
}

export interface VdFlowchartEmits {
  (event: 'change', payload: FlowchartChangeEvent): void;
  (event: 'select', payload: FlowchartSelectEvent): void;
  (event: 'viewport', payload: FlowchartViewportEvent): void;
  (event: 'connect', payload: FlowchartConnectEvent): void;
  (event: 'ready', instance: VdFlowchartCore): void;
}

/** Methods exposed via a template ref. */
export interface VdFlowchartExposed {
  getInstance(): VdFlowchartCore | null;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  layout(mode?: LayoutMode, options?: LayoutOptions): void;
  fitNode(nodeId: string, padding?: number): void;
  setNodeColor(
    nodeId: string,
    colorOrPatch: FlowchartColorPreset | string | FlowchartNodeColorPatch | null,
  ): FlowchartNode | null;
  setEdgeColor(
    edgeId: string,
    color: FlowchartColorPreset | string | { color?: string | null; stroke?: string | null } | null,
  ): FlowchartEdge | null;
  setSelectionColor(
    colorOrPatch: FlowchartColorPreset | string | FlowchartNodeColorPatch | null,
  ): void;
  clearSelectionColor(): void;
  bringToFront(targetId?: string | string[]): void;
  bringForward(targetId?: string | string[]): void;
  sendBackward(targetId?: string | string[]): void;
  sendToBack(targetId?: string | string[]): void;
  alignNodes(alignment?: FlowchartNodeAlignment, nodeIds?: string[]): void;
  distributeNodes(axis?: FlowchartDistributeAxis, nodeIds?: string[]): void;
  setNodeLocked(nodeId?: string | string[] | boolean, locked?: boolean): boolean;
  toggleNodeLocked(nodeId?: string | string[]): boolean;
  duplicateSelection(): FlowchartNode | FlowchartNode[] | null;
  copySelection(): boolean;
  pasteClipboard(): FlowchartNode | FlowchartNode[] | null;
  pasteSelection(): FlowchartNode | FlowchartNode[] | null;
  cutSelection(): boolean;
  exportSvg(options?: ExportSvgOptions): string;
}

/* eslint-disable @typescript-eslint/no-empty-object-type -- DefineComponent filler params */
export declare const VdFlowchart: DefineComponent<
  VdFlowchartProps,
  VdFlowchartExposed,
  {},
  {},
  {},
  {},
  {},
  VdFlowchartEmits
>;
/* eslint-enable @typescript-eslint/no-empty-object-type */
