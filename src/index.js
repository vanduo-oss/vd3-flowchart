// Entry for @vanduo-oss/vd3-flowchart.
//
// The Vue 3 wrapper is the primary export; the framework-agnostic editor core
// (1.2.0 lineage) is re-exported alongside as VdFlowchartCore. Named exports
// only — no default.

export { VdFlowchart } from './vue.js';
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
} from './core.js';
