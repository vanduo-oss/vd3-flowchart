// Type definitions for the framework-agnostic flowchart editor core.
// Hand-written to mirror the runtime in ./core.js (the vanilla auto-init layer
// has been excised).

export type FlowchartNodeType =
  'rounded-rect' | 'rect' | 'diamond' | 'circle' | 'textbox' | 'label' | 'junction';

export type FlowchartPort = 'top' | 'right' | 'bottom' | 'left';
export type FlowchartEdgeMarker = 'none' | 'arrow' | 'dot';
export type FlowchartEdgeRoute = 'curve' | 'straight' | 'orthogonal';
export type FlowchartEdgeKind = 'line' | 'arrow';
export type FlowchartDirection = 'right' | 'left' | 'up' | 'down';
export type LayoutMode = 'tree' | 'radial' | 'grid';

export interface FlowchartViewport {
  x: number;
  y: number;
  scale: number;
}

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  data: Record<string, unknown>;
}

export interface FlowchartEndpoint {
  nodeId: string;
  port: FlowchartPort;
}

export interface FlowchartEdge {
  id: string;
  from: FlowchartEndpoint;
  to: FlowchartEndpoint;
  kind: FlowchartEdgeKind;
  startMarker: FlowchartEdgeMarker;
  endMarker: FlowchartEdgeMarker;
  strokeWidth: number;
  route: FlowchartEdgeRoute;
  label: string;
  data: Record<string, unknown>;
}

export interface FlowchartDocument {
  version: string;
  viewport: FlowchartViewport;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

/** Snapshot delivered by the `select` event and `getSelectionSnapshot()`. */
export type FlowchartSelection =
  | { kind: 'node'; id: string; node: FlowchartNode }
  | { kind: 'edge'; id: string; edge: FlowchartEdge };

/** Reference to an anchor node for relative placement. */
export interface FlowchartRelativeTo {
  node?: string;
  nodeId?: string;
  id?: string;
  direction?: FlowchartDirection;
  distance?: number;
  /** Angle in degrees, screen space (0 = right, 90 = down). Overrides direction. */
  angle?: number;
}

export interface FlowchartNodeInput {
  id?: string;
  type?: FlowchartNodeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  data?: Record<string, unknown>;
  /** Place relative to another node instead of at the viewport center. */
  relativeTo?: string | FlowchartRelativeTo;
}

export interface FlowchartEndpointInput {
  nodeId?: string;
  port?: FlowchartPort;
}

export interface FlowchartEdgeInput {
  id?: string;
  from?: string | FlowchartEndpointInput;
  to?: string | FlowchartEndpointInput;
  /** Infer omitted ports from node geometry. */
  autoPort?: boolean;
  kind?: FlowchartEdgeKind;
  startMarker?: FlowchartEdgeMarker;
  endMarker?: FlowchartEdgeMarker;
  strokeWidth?: number;
  route?: FlowchartEdgeRoute;
  label?: string;
  data?: Record<string, unknown>;
}

export interface AddChildNodeOptions extends FlowchartNodeInput {
  direction?: FlowchartDirection;
  distance?: number;
  angle?: number;
  /** Extra options merged into the parent → child edge. */
  edge?: FlowchartEdgeInput;
}

export interface LayoutOptions {
  /** Force a specific root node id; defaults to nodes with no incoming edges. */
  root?: string;
  direction?: FlowchartDirection;
  levelGap?: number;
  siblingGap?: number;
  radius?: number;
  columns?: number;
  gap?: number;
  /** Re-pick edge ports after moving nodes (default true). */
  reroutePorts?: boolean;
  /** Call fitView() after arranging. */
  fit?: boolean;
}

export interface MutationOptions {
  reason?: string;
  inspector?: boolean;
}

export interface LoadOptions {
  /** Keep the prior selection if the entity still exists after load. */
  preserveSelection?: boolean;
  /** Suppress change notification; an identical document is a no-op. Used by Vue data updates. */
  silent?: boolean;
}

export interface RemoveNodeOptions {
  /** Also remove every node reachable through outgoing edges (cycle-safe). */
  cascade?: boolean;
  reason?: string;
}

export interface FlowchartChangeEvent {
  reason: string;
  document: FlowchartDocument;
  node?: FlowchartNode;
  edge?: FlowchartEdge;
  nodeId?: string;
  nodeIds?: string[];
  edgeId?: string;
  mode?: LayoutMode;
}

export interface FlowchartSelectEvent {
  selection: FlowchartSelection | null;
}

export interface FlowchartViewportEvent {
  reason: string;
  viewport: FlowchartViewport;
  document: FlowchartDocument;
}

export interface FlowchartConnectEvent {
  edge: FlowchartEdge;
}

export interface FlowchartHistoryEvent {
  reason: string;
  canUndo: boolean;
  canRedo: boolean;
}

export interface FlowchartEventMap {
  change: FlowchartChangeEvent;
  select: FlowchartSelectEvent;
  viewport: FlowchartViewportEvent;
  connect: FlowchartConnectEvent;
  history: FlowchartHistoryEvent;
  ready: VdFlowchart;
}

export interface VdFlowchartOptions {
  element?: Element | string;
  /** Alias for `element`. */
  target?: Element | string;
  data?: Partial<FlowchartDocument> | string;
  readonly?: boolean;
  gridSize?: number;
  /** Fit to content once the canvas reports a measurable size. */
  autoFit?: boolean;
  /** Enable built-in undo/redo (default true). */
  history?: boolean;
  /** Maximum retained history entries (default 100). */
  historyLimit?: number;
}

export class VdFlowchart {
  constructor(options?: VdFlowchartOptions);

  readonly element: Element;
  readonly readonly: boolean;
  readonly gridSize: number;

  // Selection
  select(selection: { kind: 'node' | 'edge'; id: string } | null): void;
  selectNode(nodeId: string): this;
  selectEdge(edgeId: string): this;
  deselect(): this;

  // Events
  on<K extends keyof FlowchartEventMap>(
    event: K,
    callback: (payload: FlowchartEventMap[K]) => void,
  ): this;
  off<K extends keyof FlowchartEventMap>(
    event: K,
    callback: (payload: FlowchartEventMap[K]) => void,
  ): this;

  // Nodes & edges
  addNode(partialNode?: FlowchartNodeInput): FlowchartNode;
  addChildNode(
    parentId: string,
    options?: AddChildNodeOptions,
  ): { node: FlowchartNode; edge: FlowchartEdge | null } | null;
  updateNode(
    nodeId: string,
    patch?: Partial<FlowchartNodeInput>,
    options?: MutationOptions,
  ): FlowchartNode | null;
  removeNode(nodeId: string, options?: RemoveNodeOptions): boolean;
  addEdge(partialEdge?: FlowchartEdgeInput): FlowchartEdge | null;
  updateEdge(
    edgeId: string,
    patch?: FlowchartEdgeInput,
    options?: MutationOptions,
  ): FlowchartEdge | null;
  removeEdge(edgeId: string): boolean;
  deleteSelection(): boolean;

  // Layout
  layout(mode?: LayoutMode, options?: LayoutOptions): this;
  autoArrange(options?: LayoutOptions): this;

  // History
  undo(): this;
  redo(): this;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): this;

  // Viewport
  setViewport(viewport: Partial<FlowchartViewport>): this;
  zoomIn(): this;
  zoomOut(): this;
  resetView(): this;
  fitView(): this;

  // Document
  clear(): this;
  load(data: Partial<FlowchartDocument> | string, options?: LoadOptions): this;
  toJSON(): FlowchartDocument;

  // Text editing
  startTextEdit(nodeId: string): boolean;
  stopTextEdit(options?: { commit?: boolean }): void;

  // Lifecycle
  /** Update editor options without replacing the document, camera or selection. */
  updateOptions(
    options: Pick<
      VdFlowchartOptions,
      'readonly' | 'gridSize' | 'autoFit' | 'history' | 'historyLimit'
    >,
  ): this;
  destroy(): void;
}

/** Pure layout helper: computes node top-left positions without mutating input. */
export function computeLayout(
  documentData: Partial<FlowchartDocument>,
  mode?: LayoutMode,
  options?: LayoutOptions,
): Map<string, { x: number; y: number }>;

export const LAYOUT_MODES: readonly LayoutMode[];

export const VD_FLOWCHART_VERSION: string;
/** Schema version used by toJSON(), independent of the package release. */
export const FLOWCHART_DOCUMENT_VERSION: string;
export const FLOWCHART_NODE_TYPES: readonly FlowchartNodeType[];
export const FLOWCHART_PORTS: readonly FlowchartPort[];
export const FLOWCHART_EDGE_MARKERS: readonly FlowchartEdgeMarker[];
export const FLOWCHART_EDGE_ROUTES: readonly FlowchartEdgeRoute[];
