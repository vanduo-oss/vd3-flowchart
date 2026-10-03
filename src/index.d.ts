// Hand-written declarations for the @vanduo-oss/vd3-flowchart entry.
// The Vue wrapper VdFlowchart is the primary export; the framework-agnostic
// editor core is re-exported as VdFlowchartCore. Named exports only.

export {
  VdFlowchart,
  type VdFlowchartDocument,
  type VdFlowchartProps,
  type VdFlowchartEmits,
  type VdFlowchartExposed,
} from './vue';

export {
  VdFlowchart as VdFlowchartCore,
  computeLayout,
  LAYOUT_MODES,
  VD_FLOWCHART_VERSION,
  FLOWCHART_DOCUMENT_VERSION,
  FLOWCHART_NODE_TYPES,
  FLOWCHART_PORTS,
  FLOWCHART_EDGE_MARKERS,
  FLOWCHART_EDGE_ROUTES,
  FLOWCHART_KEYBOARD_SHORTCUTS,
} from './core';

export type {
  FlowchartNodeType,
  FlowchartPort,
  FlowchartEdgeMarker,
  FlowchartEdgeRoute,
  FlowchartEdgeKind,
  FlowchartDirection,
  LayoutMode,
  FlowchartKeyboardShortcuts,
  InsertBranchNodeOptions,
  InsertSiblingNodeOptions,
  StartTextEditOptions,
  FlowchartViewport,
  FlowchartNode,
  FlowchartEndpoint,
  FlowchartEdge,
  FlowchartDocument,
  FlowchartSelection,
  FlowchartRelativeTo,
  FlowchartNodeInput,
  FlowchartEndpointInput,
  FlowchartEdgeInput,
  AddChildNodeOptions,
  LayoutOptions,
  MutationOptions,
  LoadOptions,
  RemoveNodeOptions,
  FlowchartChangeEvent,
  FlowchartSelectEvent,
  FlowchartViewportEvent,
  FlowchartConnectEvent,
  FlowchartHistoryEvent,
  FlowchartEventMap,
  VdFlowchartOptions,
} from './core';
