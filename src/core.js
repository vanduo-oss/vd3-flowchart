/* global queueMicrotask */
import { computeLayout, LAYOUT_MODES } from './layout.js';
import {
  DIRECTION_PORTS,
  PORT_DIRECTIONS,
  findNearestNode,
  findSpatialNeighbor,
  oppositeDirection,
  placeBranchNode,
} from './mindmap.js';

// Re-export the pure layout helper so consumers can compute positions without
// an editor instance.
export { computeLayout, LAYOUT_MODES } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Phosphor regular paths (MIT) — inlined like draw so the component stays
// self-contained. viewBox 0 0 256 256, fill currentColor.
const TOOLBAR_ICON_PATHS = {
  'zoom-out':
    'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm112-8H88a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Z',
  'zoom-in':
    'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Zm112,24H128v24a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h24V96a8,8,0,0,1,16,0v24h24a8,8,0,0,1,0,16Z',
  'reset-view':
    'M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16h28.69L187.31,70.63A80,80,0,1,0,208,128a8,8,0,0,1,16,0,96,96,0,1,1-27.22-66.91L224,85.8V56a8,8,0,0,1,16,0Z',
  'fit-view':
    'M216,48V88a8,8,0,0,1-16,0V67.31l-42.34,42.35a8,8,0,0,1-11.32-11.32L188.69,56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM98.34,146.34,56,188.69V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16H67.31l42.35-42.34a8,8,0,0,0-11.32-11.32Zm11.32-36.68L67.31,56H88a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V67.31l42.34,42.35a8,8,0,0,0,11.32-11.32ZM208,160a8,8,0,0,0-8,8v20.69l-42.34-42.35a8,8,0,0,0-11.32,11.32L188.69,200H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160Z',
  undo: 'M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z',
  redo: 'M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z',
  minimap:
    'M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM104,52.94l48,24V203.06l-48-24ZM40,62.25l48-12v127.5l-48,12Zm176,131.5-48,12V78.25l48-12Z',
  clear:
    'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z',
};

const TOOLBAR_ACTIONS = [
  { action: 'zoom-out', label: 'Zoom out', icon: 'zoom-out' },
  { action: 'zoom-in', label: 'Zoom in', icon: 'zoom-in' },
  { action: 'reset-view', label: 'Reset view', icon: 'reset-view' },
  { action: 'fit-view', label: 'Fit view', icon: 'fit-view' },
  { action: 'undo', label: 'Undo', icon: 'undo' },
  { action: 'redo', label: 'Redo', icon: 'redo' },
];

const LAYOUT_OPTIONS = [
  { value: 'tree', label: 'Tree' },
  { value: 'radial', label: 'Radial' },
  { value: 'grid', label: 'Grid' },
];

function createToolbarIcon(name) {
  const svg = svgEl('svg', {
    class: 'vd-flowchart-icon',
    viewBox: '0 0 256 256',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.setAttribute('fill', 'currentColor');
  svg.appendChild(svgEl('path', { d: TOOLBAR_ICON_PATHS[name] || '' }));
  return svg;
}

function createToolbarButton({ action, label, icon, disabled = false }) {
  const button = createElement('button', {
    className: 'vd-flowchart-btn vd-flowchart-icon-btn',
    title: label,
    disabled,
  });
  button.setAttribute('type', 'button');
  button.setAttribute('data-flowchart-action', action);
  button.setAttribute('aria-label', label);
  button.appendChild(createToolbarIcon(icon));
  return button;
}
const DEFAULT_GRID_SIZE = 24;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const MIN_NODE_SIZE = 56;
const MAX_NODE_SIZE = 420;
const WORLD_EXTENT = 12000;
// Bounded deserialization caps. An untrusted or corrupt document (e.g. a shared
// link with millions of nodes/edges) is TRUNCATED — never thrown — inside
// normalizeDocument, so `load()` cannot be turned into a client-side DoS: the
// O(n) normalization and the resulting render stay bounded. A normal diagram is
// far below these limits and is unaffected.
export const MAX_NODES = 10000;
export const MAX_EDGES = 10000;
const RESIZE_HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const DEFAULT_EDGE_STROKE_WIDTH = 2.25;
const MIN_EDGE_STROKE_WIDTH = 1.25;
const MAX_EDGE_STROKE_WIDTH = 6;
const CONNECTION_PORT_RADIUS = 6;
// The handle sits outside the boundary; a hit radius slightly larger than the
// offset overlaps the node edge so the pointer can slide from node to handle
// without losing hover.
const PORT_HANDLE_OFFSET = 12;
const CONNECTION_PORT_HIT_RADIUS = 14;
const PORT_CLICK_SLOP = 4;
const RESIZE_HANDLE_SIZE = 9;
const SELECTION_OUTSET = 4;
const GUIDE_SNAP_DISTANCE = 6;
const GUIDE_OVERHANG = 12;
// Beyond the connection handle (12px out, 14px hit radius) so both stay usable.
const COLLAPSE_TOGGLE_OFFSET = 36;
const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_MIN_CANVAS_WIDTH = 480;
// Shapes whose outline does not reach the corners of their bounds get a dashed
// selection box so the corner resize handles have something to sit on.
const SELECTION_BOX_TYPES = new Set(['circle', 'diamond', 'label']);
const RECONNECT_ENDPOINT_RADIUS = 7;
const RECONNECT_ENDPOINT_HIT_RADIUS = 12;
const EDGE_HIT_STROKE_MIN = 16;
const CONNECTION_SNAP_PADDING = 36;
const CONNECTION_HYSTERESIS = 16;
const CONNECTION_CENTER_LOCK_RADIUS = 18;
const RESIZE_PORT_GAP = 28;

const EDGE_STROKE_PRESETS = [
  { id: 'thin', label: 'Thin', width: 1.75 },
  { id: 'medium', label: 'Medium', width: DEFAULT_EDGE_STROKE_WIDTH },
  { id: 'bold', label: 'Bold', width: 3.5 },
];

export const VD_FLOWCHART_VERSION = '1.4.0';
/** Serialized schema version; change only when the document format changes. */
export const FLOWCHART_DOCUMENT_VERSION = '1.3.0';
export const FLOWCHART_NODE_TYPES = [
  'rounded-rect',
  'rect',
  'diamond',
  'circle',
  'textbox',
  'label',
  'junction',
];
export const FLOWCHART_PORTS = ['top', 'right', 'bottom', 'left'];
export const FLOWCHART_EDGE_MARKERS = ['none', 'arrow', 'dot'];
export const FLOWCHART_EDGE_ROUTES = ['curve', 'straight', 'orthogonal'];
export const FLOWCHART_KEYBOARD_SHORTCUTS = ['mindmap', 'basic'];

function normalizeKeyboardShortcuts(value) {
  return value === 'basic' ? 'basic' : 'mindmap';
}

const ARROW_DIRECTIONS = {
  ArrowRight: 'right',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowUp: 'up',
};

function getShortcutRows(mode, readonly) {
  const navigation = [
    ['Arrow keys', 'Select the nearest node in that direction'],
    ['Shift + Arrow', 'Select a connection on that side (repeat to cycle)'],
    ['Shift + click, Shift + drag', 'Add nodes to the selection, or select with a box'],
    ['Cmd/Ctrl + A', 'Select all nodes'],
  ];
  const view = [
    ['Cmd/Ctrl + = or -', 'Zoom in or out'],
    ['Cmd/Ctrl + 0', 'Zoom to 100%'],
    ['Shift + 1', 'Fit the diagram to the view'],
  ];
  const help = [['?', 'Show or hide this list']];
  if (readonly) {
    return [...navigation, ...view, ...help, ['Tab', 'Leave the canvas']];
  }
  const mindmap =
    mode === 'mindmap'
      ? [
          ['Tab', 'Add a child node'],
          ['Enter', 'Add a sibling below (Shift + Enter: above)'],
          ['F2, Space, or type', 'Edit the label'],
          ['Enter while editing', 'Save the label (Shift + Enter: new line)'],
          ['Tab while editing', 'Save and add a child'],
        ]
      : [
          ['Enter or F2', 'Edit the label'],
          ['Cmd/Ctrl + Enter', 'Save the label'],
        ];
  return [
    ...navigation,
    ...mindmap,
    [
      mode === 'mindmap' ? 'Enter, F2, or type on a connection' : 'Enter or F2 on a connection',
      'Edit the connection label',
    ],
    ['Cmd/Ctrl + /', 'Collapse or expand the branch'],
    ['Alt + Arrow', 'Nudge the node (add Shift for 1 px)'],
    ['Delete or Backspace', 'Delete the selection'],
    ['Cmd/Ctrl + D', 'Duplicate the node'],
    ['Cmd/Ctrl + Z, Shift + Cmd/Ctrl + Z', 'Undo, redo'],
    ['Cmd/Ctrl + C, X, V', 'Copy, cut, paste'],
    ...view,
    ['Esc', 'Cancel editing, then the tool, then deselect'],
    [
      mode === 'mindmap' ? 'Shift + Tab, or Esc then Tab' : 'Tab or Shift + Tab',
      'Leave the canvas',
    ],
    ...help,
  ];
}

// History entries for these reasons collapse into the previous entry when they
// target the same node/edge, so a burst of inspector keystrokes (one
// `node:update` each) is a single undo step. Discrete gestures are excluded.
const COALESCING_REASONS = new Set(['node:update', 'edge:update', 'node:nudge']);

const DEFAULT_EDGE_ROUTE = 'curve';
const ORTHOGONAL_STUB_LENGTH = 32;
const ORTHOGONAL_CORNER_RADIUS = 12;
const ORTHOGONAL_CLEARANCE = 16;
// Fraction of the endpoint distance used for each cubic control arm, plus the
// clamp that keeps very short edges graceful and very long ones from ballooning.
const EDGE_CURVATURE = 0.5;
const MIN_CURVE_ARM = 22;
const MAX_CURVE_ARM = 260;
const FLOWCHART_EDGE_ROUTE_LABELS = {
  curve: 'Curve',
  straight: 'Straight',
  orthogonal: 'Stepped orthogonal',
};

const DEFAULT_NODE_SPECS = {
  'rounded-rect': { width: 180, height: 96, text: 'Step' },
  rect: { width: 180, height: 96, text: 'Process' },
  diamond: { width: 184, height: 120, text: 'Decision' },
  circle: { width: 128, height: 128, text: 'Start' },
  textbox: { width: 240, height: 144, text: 'Notes' },
  label: { width: 180, height: 72, text: 'Label' },
  junction: {
    width: 28,
    height: 28,
    text: '',
    minWidth: 28,
    minHeight: 28,
    maxWidth: 28,
    maxHeight: 28,
    resizable: false,
    textEditable: false,
  },
};

const FLOWCHART_PALETTE_ITEMS = [
  { kind: 'tool', tool: 'arrow', label: 'Arrow' },
  { kind: 'node', type: 'rounded-rect', label: 'Rounded' },
  { kind: 'node', type: 'rect', label: 'Rect' },
  { kind: 'node', type: 'diamond', label: 'Diamond' },
  { kind: 'node', type: 'circle', label: 'Circle' },
  { kind: 'node', type: 'junction', label: 'Junction' },
  { kind: 'node', type: 'textbox', label: 'Textbox' },
  { kind: 'node', type: 'label', label: 'Label' },
];

let flowchartId = 0;

function nextId(prefix) {
  flowchartId += 1;
  return `${prefix}-${flowchartId}`;
}

function hasWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isElement(value) {
  return hasWindow() && value instanceof Element;
}

function isPlainObject(value) {
  return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatNumber(value) {
  return Number(value.toFixed(2));
}

function sanitizeId(value) {
  if (value == null) return '';
  return String(value).trim();
}

function resolveElement(target) {
  if (!hasWindow()) {
    throw new Error('Vanduo Flowchart requires a browser DOM target.');
  }
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (!el) throw new Error(`Flowchart target not found: ${target}`);
    return el;
  }
  if (isElement(target)) return target;
  throw new Error('Flowchart target must be an Element or selector string.');
}

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = String(options.text);
  if (options.type) element.type = options.type;
  if (options.value != null) element.value = String(options.value);
  if (options.placeholder != null) element.placeholder = String(options.placeholder);
  if (options.title != null) element.title = String(options.title);
  if (options.rows != null) element.rows = Number(options.rows);
  if (options.disabled) element.disabled = true;
  if (options.tabIndex != null) element.tabIndex = Number(options.tabIndex);
  return element;
}

function svgEl(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) {
      element.setAttribute(key, String(value));
    }
  });
  return element;
}

function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function ensureUniqueId(preferred, prefix, usedIds) {
  let candidate = sanitizeId(preferred) || nextId(prefix);
  while (usedIds.has(candidate)) {
    candidate = nextId(prefix);
  }
  usedIds.add(candidate);
  return candidate;
}

function normalizeNodeType(type) {
  return FLOWCHART_NODE_TYPES.includes(type) ? type : 'rounded-rect';
}

function getNodeSpec(type) {
  return DEFAULT_NODE_SPECS[normalizeNodeType(type)];
}

function getNodeSizeBounds(type) {
  const spec = getNodeSpec(type);
  return {
    minWidth: spec.minWidth ?? MIN_NODE_SIZE,
    minHeight: spec.minHeight ?? MIN_NODE_SIZE,
    maxWidth: spec.maxWidth ?? MAX_NODE_SIZE,
    maxHeight: spec.maxHeight ?? MAX_NODE_SIZE,
  };
}

function clampNodeWidth(type, width, fallback) {
  const bounds = getNodeSizeBounds(type);
  return clamp(toFiniteNumber(width, fallback), bounds.minWidth, bounds.maxWidth);
}

function clampNodeHeight(type, height, fallback) {
  const bounds = getNodeSizeBounds(type);
  return clamp(toFiniteNumber(height, fallback), bounds.minHeight, bounds.maxHeight);
}

function isNodeResizable(nodeOrType) {
  const spec =
    typeof nodeOrType === 'string' ? getNodeSpec(nodeOrType) : getNodeSpec(nodeOrType?.type);
  return spec.resizable !== false;
}

function isNodeTextEditable(nodeOrType) {
  const spec =
    typeof nodeOrType === 'string' ? getNodeSpec(nodeOrType) : getNodeSpec(nodeOrType?.type);
  return spec.textEditable !== false;
}

function normalizeEdgeStrokeWidth(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return DEFAULT_EDGE_STROKE_WIDTH;
  return formatNumber(clamp(next, MIN_EDGE_STROKE_WIDTH, MAX_EDGE_STROKE_WIDTH));
}

function getStrokePresetId(strokeWidth) {
  const match = EDGE_STROKE_PRESETS.find((preset) => Math.abs(preset.width - strokeWidth) < 0.01);
  return match?.id || 'medium';
}

function getStrokePresetWidth(presetId) {
  const preset = EDGE_STROKE_PRESETS.find((item) => item.id === presetId);
  return preset?.width ?? DEFAULT_EDGE_STROKE_WIDTH;
}

function normalizeViewport(viewport) {
  return {
    x: toFiniteNumber(viewport?.x, 0),
    y: toFiniteNumber(viewport?.y, 0),
    scale: clamp(toFiniteNumber(viewport?.scale, 1), MIN_SCALE, MAX_SCALE),
  };
}

function normalizeNode(rawNode, index, usedIds) {
  const type = normalizeNodeType(rawNode?.type);
  const spec = getNodeSpec(type);

  const node = {
    id: ensureUniqueId(rawNode?.id, 'node', usedIds),
    type,
    x: toFiniteNumber(rawNode?.x, index * 28),
    y: toFiniteNumber(rawNode?.y, index * 18),
    width: clampNodeWidth(type, rawNode?.width, spec.width),
    height: clampNodeHeight(type, rawNode?.height, spec.height),
    text: rawNode?.text == null ? spec.text : String(rawNode.text),
    data: isPlainObject(rawNode?.data) ? deepClone(rawNode.data) : {},
  };
  // Written only when true so expanded nodes serialize as in format 1.2.0.
  if (rawNode?.collapsed === true) node.collapsed = true;
  return node;
}

// Nodes hidden by collapsed branches. Every descendant of a collapsed node is
// a candidate (the collapsed node itself is not, so a loop back to it cannot
// hide it); a candidate stays visible when it is also reachable through an
// expanded node outside the candidates. Linear in nodes plus edges.
function computeHiddenNodeIds(nodes, edges) {
  const collapsed = new Set(nodes.filter((node) => node.collapsed).map((node) => node.id));
  if (!collapsed.size) return new Set();
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    if (edge.from.nodeId === edge.to.nodeId) return;
    outgoing.get(edge.from.nodeId)?.push(edge.to.nodeId);
  });

  const candidates = new Set();
  collapsed.forEach((rootId) => {
    const queue = [...(outgoing.get(rootId) || [])];
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      if (id === rootId || candidates.has(id)) continue;
      candidates.add(id);
      queue.push(...(outgoing.get(id) || []));
    }
  });

  const queue = nodes
    .filter((node) => !candidates.has(node.id) && !collapsed.has(node.id))
    .map((node) => node.id);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    (outgoing.get(id) || []).forEach((childId) => {
      if (!candidates.has(childId)) return;
      candidates.delete(childId);
      if (!collapsed.has(childId)) queue.push(childId);
    });
  }
  return candidates;
}

function normalizeEndpoint(rawEndpoint, fallbackPort) {
  return {
    nodeId: sanitizeId(rawEndpoint?.nodeId),
    port: FLOWCHART_PORTS.includes(rawEndpoint?.port) ? rawEndpoint.port : fallbackPort,
  };
}

function normalizeEdgeMarker(value) {
  return FLOWCHART_EDGE_MARKERS.includes(value) ? value : null;
}

function normalizeEdgeRoute(value) {
  return FLOWCHART_EDGE_ROUTES.includes(value) ? value : DEFAULT_EDGE_ROUTE;
}

function syncEdgeKind(edge) {
  edge.kind = edge.startMarker === 'none' && edge.endMarker === 'none' ? 'line' : 'arrow';
}

function normalizeEdge(rawEdge, index, nodeIds, usedIds) {
  const from = normalizeEndpoint(rawEdge?.from, 'right');
  const to = normalizeEndpoint(rawEdge?.to, 'left');
  if (!from.nodeId || !to.nodeId) return null;
  if (!nodeIds.has(from.nodeId) || !nodeIds.has(to.nodeId)) return null;
  if (!FLOWCHART_PORTS.includes(from.port) || !FLOWCHART_PORTS.includes(to.port)) return null;

  const legacyKind = rawEdge?.kind === 'line' ? 'line' : 'arrow';
  const startMarker =
    normalizeEdgeMarker(rawEdge?.startMarker) ?? (legacyKind === 'line' ? 'none' : 'none');
  const endMarker =
    normalizeEdgeMarker(rawEdge?.endMarker) ?? (legacyKind === 'line' ? 'none' : 'arrow');

  const edge = {
    id: ensureUniqueId(rawEdge?.id, 'edge', usedIds),
    from,
    to,
    kind: legacyKind,
    startMarker,
    endMarker,
    strokeWidth: normalizeEdgeStrokeWidth(rawEdge?.strokeWidth),
    route: normalizeEdgeRoute(rawEdge?.route),
    label: rawEdge?.label == null ? '' : String(rawEdge.label),
    data: isPlainObject(rawEdge?.data) ? deepClone(rawEdge.data) : {},
  };
  syncEdgeKind(edge);
  return edge;
}

function parseDocumentVersion(value) {
  const raw =
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : '';
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(raw);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function isSupportedDocumentVersion(value) {
  const parsed = parseDocumentVersion(value);
  const max = parseDocumentVersion(FLOWCHART_DOCUMENT_VERSION);
  if (!parsed || !max || parsed.major !== max.major) return false;
  if (parsed.minor > max.minor) return false;
  if (parsed.minor === max.minor && parsed.patch > max.patch) return false;
  return true;
}

function normalizeDocument(input) {
  let source = input;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      throw new TypeError('Invalid flowchart JSON. The current document was not changed.');
    }
  }

  if (!isPlainObject(source)) {
    throw new TypeError('A flowchart document must be an object.');
  }
  if (source.version !== undefined && !isSupportedDocumentVersion(source.version)) {
    throw new RangeError(
      `Unsupported flowchart document version: ${String(source.version)}. Supported through ${FLOWCHART_DOCUMENT_VERSION}.`,
    );
  }
  for (const key of ['nodes', 'edges']) {
    if (source[key] !== undefined && !Array.isArray(source[key])) {
      throw new TypeError(`Flowchart ${key} must be an array.`);
    }
  }

  const usedNodeIds = new Set();
  // Bounded deserialization: truncate an untrusted document to MAX_NODES /
  // MAX_EDGES so a hostile doc loads bounded instead of freezing the tab.
  const nodes = (Array.isArray(source.nodes) ? source.nodes : [])
    .slice(0, MAX_NODES)
    .map((node, index) => normalizeNode(node, index, usedNodeIds));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const usedEdgeIds = new Set();
  const edges = (Array.isArray(source.edges) ? source.edges : [])
    .slice(0, MAX_EDGES)
    .map((edge, index) => normalizeEdge(edge, index, nodeIds, usedEdgeIds))
    .filter(Boolean);

  return {
    version: FLOWCHART_DOCUMENT_VERSION,
    viewport: normalizeViewport(source.viewport),
    nodes,
    edges,
  };
}

function splitLongToken(token, maxChars) {
  const result = [];
  let index = 0;
  while (index < token.length) {
    result.push(token.slice(index, index + maxChars));
    index += maxChars;
  }
  return result;
}

function wrapText(text, maxChars) {
  const safeMaxChars = Math.max(6, maxChars);
  const lines = [];

  String(text || '')
    .split(/\r?\n/)
    .forEach((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        lines.push('');
        return;
      }

      let current = '';
      trimmed.split(/\s+/).forEach((word) => {
        if (word.length > safeMaxChars) {
          if (current) {
            lines.push(current);
            current = '';
          }
          splitLongToken(word, safeMaxChars).forEach((chunk) => lines.push(chunk));
          return;
        }

        const next = current ? `${current} ${word}` : word;
        if (next.length <= safeMaxChars) {
          current = next;
          return;
        }

        if (current) lines.push(current);
        current = word;
      });

      if (current) lines.push(current);
    });

  if (!lines.length) return [''];
  if (lines.length <= 6) return lines;

  const clipped = lines.slice(0, 6);
  clipped[5] =
    clipped[5].length > safeMaxChars - 3
      ? `${clipped[5].slice(0, safeMaxChars - 3)}...`
      : `${clipped[5]}...`;
  return clipped;
}

function estimateChars(width) {
  return Math.max(8, Math.floor((width - 24) / 7));
}

function getPortPosition(node, port) {
  switch (port) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left':
    default:
      return { x: node.x, y: node.y + node.height / 2 };
  }
}

function getPortHandlePosition(node, port, scale = 1) {
  const point = getPortPosition(node, port);
  const normal = getPortNormal(port);
  const offset = PORT_HANDLE_OFFSET / scale;
  return {
    x: formatNumber(point.x + normal.x * offset),
    y: formatNumber(point.y + normal.y * offset),
  };
}

function getNearestPort(node, point) {
  return FLOWCHART_PORTS.reduce((best, port) => {
    const portPoint = getPortPosition(node, port);
    const distance = Math.hypot(point.x - portPoint.x, point.y - portPoint.y);
    if (!best || distance < best.distance) {
      return { port, point: portPoint, distance };
    }
    return best;
  }, null);
}

function getPortNormal(port) {
  switch (port) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
    default:
      return { x: -1, y: 0 };
  }
}

function isPointInsideNode(node, point) {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
}

function getPortByDirection(node, point) {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  const deltaX = point.x - centerX;
  const deltaY = point.y - centerY;
  const port =
    Math.abs(deltaX) > Math.abs(deltaY)
      ? deltaX > 0
        ? 'right'
        : 'left'
      : deltaY > 0
        ? 'bottom'
        : 'top';
  const portPoint = getPortPosition(node, port);
  return {
    port,
    point: portPoint,
    distance: Math.hypot(point.x - portPoint.x, point.y - portPoint.y),
  };
}

function pickPortForNode(node, point, referencePoint = null) {
  if (isPointInsideNode(node, point)) {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    const distanceFromCenter = Math.hypot(point.x - centerX, point.y - centerY);
    if (referencePoint && distanceFromCenter <= CONNECTION_CENTER_LOCK_RADIUS) {
      return getPortByDirection(node, referencePoint);
    }
    return getPortByDirection(node, point);
  }
  return getNearestPort(node, point);
}

function getDistanceToNodeBounds(node, point) {
  const left = node.x;
  const right = node.x + node.width;
  const top = node.y;
  const bottom = node.y + node.height;
  const dx = point.x < left ? left - point.x : point.x > right ? point.x - right : 0;
  const dy = point.y < top ? top - point.y : point.y > bottom ? point.y - bottom : 0;
  return Math.hypot(dx, dy);
}

function offsetPoint(point, normal, distance) {
  return {
    x: point.x + normal.x * distance,
    y: point.y + normal.y * distance,
  };
}

function isHorizontalPort(port) {
  return port === 'left' || port === 'right';
}

function addDistinctPoint(points, point) {
  const previous = points[points.length - 1];
  if (!previous || previous.x !== point.x || previous.y !== point.y) {
    points.push(point);
  }
}

function buildPathFromPoints(points) {
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${formatNumber(point.x)} ${formatNumber(point.y)}`;
    })
    .join(' ');
}

// Render an orthogonal polyline with rounded corners. Each interior vertex is
// replaced by `L <approach> Q <corner> <departure>`, where approach/departure
// are pulled back from the corner by a radius clamped to half of each adjacent
// segment so short segments never overshoot. Endpoints (first M, final L) stay
// exact. Quadratic Q joins keep the output free of cubic `C` commands.
function buildRoundedPath(points, radius) {
  if (points.length < 3 || radius <= 0) {
    return buildPathFromPoints(points);
  }

  let d = `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const lenIn = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const lenOut = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);

    if (!(r > 0)) {
      d += ` L ${formatNumber(corner.x)} ${formatNumber(corner.y)}`;
      continue;
    }

    const approach = {
      x: corner.x - ((corner.x - prev.x) / lenIn) * r,
      y: corner.y - ((corner.y - prev.y) / lenIn) * r,
    };
    const departure = {
      x: corner.x + ((next.x - corner.x) / lenOut) * r,
      y: corner.y + ((next.y - corner.y) / lenOut) * r,
    };
    d += ` L ${formatNumber(approach.x)} ${formatNumber(approach.y)}`;
    d += ` Q ${formatNumber(corner.x)} ${formatNumber(corner.y)} ${formatNumber(departure.x)} ${formatNumber(departure.y)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${formatNumber(last.x)} ${formatNumber(last.y)}`;
  return d;
}

function getPolylineLabelPoint(points) {
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalLength += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }

  if (!totalLength) {
    const first = points[0] || { x: 0, y: 0 };
    return { x: formatNumber(first.x), y: formatNumber(first.y) };
  }

  const halfway = totalLength / 2;
  let covered = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (!segmentLength) continue;
    if (covered + segmentLength >= halfway) {
      const ratio = (halfway - covered) / segmentLength;
      return {
        x: formatNumber(start.x + (end.x - start.x) * ratio),
        y: formatNumber(start.y + (end.y - start.y) * ratio),
      };
    }
    covered += segmentLength;
  }

  const last = points[points.length - 1] || { x: 0, y: 0 };
  return { x: formatNumber(last.x), y: formatNumber(last.y) };
}

// Cubic-bezier control point for one endpoint. The control arm always extends
// straight out along the port's outward normal (so the curve leaves/enters the
// arrow perpendicular to the node edge), and its LENGTH is a fraction of the
// straight-line distance between the endpoints — not of a single axis. The old
// per-axis model (React Flow's) gave one endpoint a huge arm and the other a
// tiny one whenever the ports were perpendicular, producing the long-straight-
// then-sharp-kink-at-the-arrow look. Scaling by total distance keeps both arms
// balanced, so radial/mind-map edges read as smooth arcs.
//
// `align` is how much the target lies in the port's outward direction
// (1 = dead ahead, 0 = sideways, -1 = behind). Easing the arm by alignment
// shortens it when the target sits behind the port, avoiding a ballooned loop,
// while giving aligned endpoints a long, graceful tangent into the arrowhead.
function curveControlPoint(point, port, target, curvature) {
  const normal = getPortNormal(port);
  const dx = target.x - point.x;
  const dy = target.y - point.y;
  const distance = Math.hypot(dx, dy) || 1;
  const align = (normal.x * dx + normal.y * dy) / distance;
  const ease = 0.55 + 0.45 * align;
  const arm = clamp(distance * curvature * ease, MIN_CURVE_ARM, MAX_CURVE_ARM);
  return { x: point.x + normal.x * arm, y: point.y + normal.y * arm };
}

function buildCurvePath(fromPoint, toPoint, fromPort = 'right', toPort = 'left') {
  const controlA = curveControlPoint(fromPoint, fromPort, toPoint, EDGE_CURVATURE);
  const controlB = curveControlPoint(toPoint, toPort, fromPoint, EDGE_CURVATURE);

  // Cubic bezier value at t = 0.5 for an accurate on-curve label anchor.
  const labelX = 0.125 * fromPoint.x + 0.375 * controlA.x + 0.375 * controlB.x + 0.125 * toPoint.x;
  const labelY = 0.125 * fromPoint.y + 0.375 * controlA.y + 0.375 * controlB.y + 0.125 * toPoint.y;

  return {
    d: `M ${formatNumber(fromPoint.x)} ${formatNumber(fromPoint.y)} C ${formatNumber(controlA.x)} ${formatNumber(controlA.y)} ${formatNumber(controlB.x)} ${formatNumber(controlB.y)} ${formatNumber(toPoint.x)} ${formatNumber(toPoint.y)}`,
    labelX: formatNumber(labelX),
    labelY: formatNumber(labelY),
  };
}

function buildStraightPath(fromPoint, toPoint) {
  return {
    d: buildPathFromPoints([fromPoint, toPoint]),
    labelX: formatNumber((fromPoint.x + toPoint.x) / 2),
    labelY: formatNumber((fromPoint.y + toPoint.y) / 2),
  };
}

function getNodeRectBounds(node, pad = 0) {
  if (!node) return null;
  return {
    left: node.x - pad,
    top: node.y - pad,
    right: node.x + node.width + pad,
    bottom: node.y + node.height + pad,
  };
}

// Does an axis-aligned segment pass through a rect's interior? Edge contact
// (e.g. a stub running along a node border or a port sitting on the boundary)
// is not a hit — only strict interior overlap counts.
function segmentIntersectsRect(a, b, rect) {
  if (!rect) return false;
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return minX < rect.right && maxX > rect.left && minY < rect.bottom && maxY > rect.top;
}

// Pick a perpendicular "channel" coordinate that sits clear of both node
// rectangles when the connector has to loop around them. `low` is the edge
// before both nodes (top / left), `high` is after both (bottom / right);
// we route on whichever side is cheaper, biased toward the target on a tie.
function pickOrthogonalChannel(from, to, low, high) {
  const costLow = Math.abs(low - from) + Math.abs(low - to);
  const costHigh = Math.abs(high - from) + Math.abs(high - to);
  if (costLow < costHigh) return low;
  if (costHigh < costLow) return high;
  return to >= from ? high : low;
}

// Node-blind fallback used for the live connection preview, where one endpoint
// is a free pointer with no rectangle to route around.
function getOrthogonalMidpoints(fromStub, toStub, fromPort, toPort) {
  const sourceHorizontal = isHorizontalPort(fromPort);
  const targetHorizontal = isHorizontalPort(toPort);

  if (sourceHorizontal && targetHorizontal) {
    const midX = (fromStub.x + toStub.x) / 2;
    return [
      { x: midX, y: fromStub.y },
      { x: midX, y: toStub.y },
    ];
  }

  if (!sourceHorizontal && !targetHorizontal) {
    const midY = (fromStub.y + toStub.y) / 2;
    return [
      { x: fromStub.x, y: midY },
      { x: toStub.x, y: midY },
    ];
  }

  if (sourceHorizontal) {
    return [{ x: toStub.x, y: fromStub.y }];
  }

  return [{ x: fromStub.x, y: toStub.y }];
}

// Node-aware orthogonal routing. Each endpoint extends a stub beyond its port,
// then the two stubs are bridged: directly when the ports face each other with
// room in between, otherwise through a channel routed clear of both node rects
// so the connector never cuts through a box (draw.io-style "around" routing).
function getOrthogonalPoints(fromPoint, toPoint, fromPort, toPort, fromRect, toRect) {
  const fromNormal = getPortNormal(fromPort);
  const toNormal = getPortNormal(toPort);
  const fromStub = offsetPoint(fromPoint, fromNormal, ORTHOGONAL_STUB_LENGTH);
  const toStub = offsetPoint(toPoint, toNormal, ORTHOGONAL_STUB_LENGTH);
  const sourceHorizontal = isHorizontalPort(fromPort);
  const targetHorizontal = isHorizontalPort(toPort);
  const mids = [];

  if (sourceHorizontal && targetHorizontal) {
    // A straight vertical bridge only works when the ports face each other AND
    // the stubs leave room between them. Otherwise (facing-but-overlapping, or
    // same-direction ports) `facing && hasRoom` is false and we always detour
    // through a clear horizontal channel — the channel handles every such case.
    const facing = fromNormal.x === -toNormal.x;
    const hasRoom = fromNormal.x > 0 ? fromStub.x <= toStub.x : fromStub.x >= toStub.x;
    if (facing && hasRoom) {
      const midX = (fromStub.x + toStub.x) / 2;
      mids.push({ x: midX, y: fromStub.y }, { x: midX, y: toStub.y });
    } else {
      const top = Math.min(fromRect.top, toRect.top);
      const bottom = Math.max(fromRect.bottom, toRect.bottom);
      const yChannel = pickOrthogonalChannel(fromStub.y, toStub.y, top, bottom);
      mids.push({ x: fromStub.x, y: yChannel }, { x: toStub.x, y: yChannel });
    }
  } else if (!sourceHorizontal && !targetHorizontal) {
    // Mirror of the both-horizontal case; see the comment above.
    const facing = fromNormal.y === -toNormal.y;
    const hasRoom = fromNormal.y > 0 ? fromStub.y <= toStub.y : fromStub.y >= toStub.y;
    if (facing && hasRoom) {
      const midY = (fromStub.y + toStub.y) / 2;
      mids.push({ x: fromStub.x, y: midY }, { x: toStub.x, y: midY });
    } else {
      const left = Math.min(fromRect.left, toRect.left);
      const right = Math.max(fromRect.right, toRect.right);
      const xChannel = pickOrthogonalChannel(fromStub.x, toStub.x, left, right);
      mids.push({ x: xChannel, y: fromStub.y }, { x: xChannel, y: toStub.y });
    }
  } else {
    // Perpendicular ports form an L with a single corner. Two corners respect
    // the exit/entry directions: the "clean" one continues the source stub's
    // axis, the alternate continues the target stub's axis. Prefer the clean
    // corner, but fall back to the alternate when the clean L's legs would cut
    // through either node (e.g. target tucked beside/under the source).
    const cleanCorner = sourceHorizontal
      ? { x: toStub.x, y: fromStub.y }
      : { x: fromStub.x, y: toStub.y };
    const altCorner = sourceHorizontal
      ? { x: fromStub.x, y: toStub.y }
      : { x: toStub.x, y: fromStub.y };
    const legsClear = (corner) =>
      !segmentIntersectsRect(fromStub, corner, fromRect) &&
      !segmentIntersectsRect(fromStub, corner, toRect) &&
      !segmentIntersectsRect(corner, toStub, fromRect) &&
      !segmentIntersectsRect(corner, toStub, toRect);
    mids.push(legsClear(cleanCorner) || !legsClear(altCorner) ? cleanCorner : altCorner);
  }

  const points = [];
  [fromPoint, fromStub, ...mids, toStub, toPoint].forEach((point) =>
    addDistinctPoint(points, point),
  );
  return points;
}

function buildOrthogonalPath(
  fromPoint,
  toPoint,
  fromPort = 'right',
  toPort = 'left',
  fromRect = null,
  toRect = null,
) {
  let points;
  if (fromRect && toRect) {
    points = getOrthogonalPoints(fromPoint, toPoint, fromPort, toPort, fromRect, toRect);
  } else {
    const fromStub = offsetPoint(fromPoint, getPortNormal(fromPort), ORTHOGONAL_STUB_LENGTH);
    const toStub = offsetPoint(toPoint, getPortNormal(toPort), ORTHOGONAL_STUB_LENGTH);
    points = [];
    [
      fromPoint,
      fromStub,
      ...getOrthogonalMidpoints(fromStub, toStub, fromPort, toPort),
      toStub,
      toPoint,
    ].forEach((point) => addDistinctPoint(points, point));
  }

  const label = getPolylineLabelPoint(points);
  return {
    d: buildRoundedPath(points, ORTHOGONAL_CORNER_RADIUS),
    labelX: label.x,
    labelY: label.y,
  };
}

function buildEdgePath(edge, fromNode = null, toNode = null) {
  const fromPort = edge?.from?.port || edge?.fromPort || 'right';
  const toPort = edge?.to?.port || edge?.toPort || 'left';
  const fromPoint = edge?.fromPoint || (fromNode ? getPortPosition(fromNode, fromPort) : null);
  const toPoint = edge?.toPoint || (toNode ? getPortPosition(toNode, toPort) : null);
  const route = normalizeEdgeRoute(edge?.route);

  if (!fromPoint || !toPoint) {
    return { d: '', labelX: 0, labelY: 0 };
  }

  if (route === 'straight') {
    return buildStraightPath(fromPoint, toPoint);
  }

  if (route === 'orthogonal') {
    const fromRect =
      !edge?.fromPoint && fromNode ? getNodeRectBounds(fromNode, ORTHOGONAL_CLEARANCE) : null;
    const toRect =
      !edge?.toPoint && toNode ? getNodeRectBounds(toNode, ORTHOGONAL_CLEARANCE) : null;
    return buildOrthogonalPath(fromPoint, toPoint, fromPort, toPort, fromRect, toRect);
  }

  return buildCurvePath(fromPoint, toPoint, fromPort, toPort);
}

function createArrowMarker(id, strokeWidth, reversed = false) {
  const size = formatNumber(Math.max(9, strokeWidth * 4.4));
  const refInset = formatNumber(Math.max(1.5, strokeWidth * 0.85));
  const marker = svgEl('marker', {
    id,
    markerWidth: size,
    markerHeight: size,
    refX: reversed ? refInset : formatNumber(size - refInset),
    refY: formatNumber(size / 2),
    orient: 'auto',
    markerUnits: 'userSpaceOnUse',
  });
  marker.appendChild(
    svgEl('path', {
      d: reversed
        ? `M ${formatNumber(size)} 0 L 0 ${formatNumber(size / 2)} L ${formatNumber(size)} ${formatNumber(size)} z`
        : `M 0 0 L ${formatNumber(size)} ${formatNumber(size / 2)} L 0 ${formatNumber(size)} z`,
      fill: 'var(--vd-flowchart-accent)',
    }),
  );
  return marker;
}

function createDotMarker(id, strokeWidth) {
  const size = formatNumber(Math.max(8, strokeWidth * 3.3));
  const radius = formatNumber(Math.max(2.75, strokeWidth * 1.45));
  const marker = svgEl('marker', {
    id,
    markerWidth: size,
    markerHeight: size,
    refX: formatNumber(size / 2),
    refY: formatNumber(size / 2),
    orient: 'auto',
    markerUnits: 'userSpaceOnUse',
  });
  marker.appendChild(
    svgEl('circle', {
      cx: formatNumber(size / 2),
      cy: formatNumber(size / 2),
      r: radius,
      fill: 'var(--vd-flowchart-accent)',
    }),
  );
  return marker;
}

function getNodeFontMetrics(node) {
  if (node.type === 'label') {
    return { fontSize: 18, lineHeight: 20 };
  }
  if (node.type === 'textbox') {
    return { fontSize: 13, lineHeight: 18 };
  }
  return { fontSize: 14, lineHeight: 18 };
}

function getResizeHandlePosition(node, handle) {
  const middleX = node.width / 2;
  const middleY = node.height / 2;
  const x = handle.includes('w') ? 0 : handle.includes('e') ? node.width : middleX;
  const y = handle.includes('n') ? 0 : handle.includes('s') ? node.height : middleY;
  return { x, y };
}

function getResizeCursor(handle) {
  if (handle === 'n' || handle === 's') return 'ns-resize';
  if (handle === 'e' || handle === 'w') return 'ew-resize';
  if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}

// Alignment lines of `nodes`: left/centre/right on x and top/middle/bottom on
// y, each with the node's extent on the other axis, sorted by value.
function collectGuideLines(nodes) {
  const x = [];
  const y = [];
  nodes.forEach((node) => {
    const right = node.x + node.width;
    const bottom = node.y + node.height;
    [node.x, node.x + node.width / 2, right].forEach((value) =>
      x.push({ value, start: node.y, end: bottom }),
    );
    [node.y, node.y + node.height / 2, bottom].forEach((value) =>
      y.push({ value, start: node.x, end: right }),
    );
  });
  const byValue = (a, b) => a.value - b.value;
  return { x: x.sort(byValue), y: y.sort(byValue) };
}

function lowerBound(lines, value) {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (lines[middle].value < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

// Smallest offset that puts one of `candidates` on a guide line within
// `threshold`, plus every line at the snapped position.
function snapToGuides(lines, candidates, threshold) {
  let best = null;
  candidates.forEach((candidate) => {
    const index = lowerBound(lines, candidate);
    [lines[index - 1], lines[index]].forEach((line) => {
      if (!line) return;
      const offset = line.value - candidate;
      if (Math.abs(offset) <= threshold && (!best || Math.abs(offset) < Math.abs(best.offset))) {
        best = { offset };
      }
    });
  });
  if (!best) return null;
  const positions = candidates.map((candidate) => candidate + best.offset);
  best.lines = lines.filter((line) =>
    positions.some((position) => Math.abs(line.value - position) < 0.5),
  );
  return best;
}

// Guide segments spanning the snapped box and every node sharing the line.
function guideSegments(axis, lines, box) {
  const byValue = new Map();
  lines.forEach((line) => {
    const current = byValue.get(line.value);
    byValue.set(line.value, {
      start: Math.min(current?.start ?? Infinity, line.start),
      end: Math.max(current?.end ?? -Infinity, line.end),
    });
  });
  const boxStart = axis === 'x' ? box.top : box.left;
  const boxEnd = boxStart + (axis === 'x' ? box.height : box.width);
  return [...byValue].map(([value, extent]) => {
    const start = Math.min(extent.start, boxStart) - GUIDE_OVERHANG;
    const end = Math.max(extent.end, boxEnd) + GUIDE_OVERHANG;
    return axis === 'x'
      ? { x1: value, y1: start, x2: value, y2: end }
      : { x1: start, y1: value, x2: end, y2: value };
  });
}

function getBounds(nodes) {
  if (!nodes.length) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  return nodes.reduce(
    (accumulator, node) => ({
      left: Math.min(accumulator.left, node.x),
      top: Math.min(accumulator.top, node.y),
      right: Math.max(accumulator.right, node.x + node.width),
      bottom: Math.max(accumulator.bottom, node.y + node.height),
    }),
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  );
}

function createField(labelText, control) {
  const wrapper = createElement('div', { className: 'vd-flowchart-field' });
  const label = createElement('label', { text: labelText });
  control.id ||= nextId('flowchart-field');
  label.htmlFor = control.id;
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  return wrapper;
}

function createPalettePreview(type) {
  const preview = svgEl('svg', {
    class: `vd-flowchart-palette-preview vd-flowchart-palette-preview--${type}`,
    viewBox: '0 0 72 44',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const baseClass = `vd-flowchart-palette-shape vd-flowchart-palette-shape--${type}`;

  if (type === 'arrow') {
    preview.appendChild(
      svgEl('path', {
        class: 'vd-flowchart-palette-arrow',
        d: 'M 12 30 C 28 10 44 10 60 22',
      }),
    );
    preview.appendChild(
      svgEl('path', {
        class: 'vd-flowchart-palette-arrowhead',
        d: 'M 53 16 L 64 22 L 52 27 z',
      }),
    );
    return preview;
  }

  if (type === 'rounded-rect') {
    preview.appendChild(
      svgEl('rect', {
        class: baseClass,
        x: 10,
        y: 10,
        width: 52,
        height: 24,
        rx: 8,
        ry: 8,
      }),
    );
    return preview;
  }

  if (type === 'rect') {
    preview.appendChild(
      svgEl('rect', {
        class: baseClass,
        x: 10,
        y: 10,
        width: 52,
        height: 24,
        rx: 1,
        ry: 1,
      }),
    );
    return preview;
  }

  if (type === 'diamond') {
    preview.appendChild(
      svgEl('polygon', {
        class: baseClass,
        points: '36,6 64,22 36,38 8,22',
      }),
    );
    return preview;
  }

  if (type === 'circle') {
    preview.appendChild(
      svgEl('ellipse', {
        class: baseClass,
        cx: 36,
        cy: 22,
        rx: 18,
        ry: 18,
      }),
    );
    return preview;
  }

  if (type === 'junction') {
    preview.appendChild(
      svgEl('path', {
        class: 'vd-flowchart-palette-junction-lines',
        d: 'M 12 22 H 27 M 45 22 H 60 M 36 8 V 14 M 36 30 V 36',
      }),
    );
    preview.appendChild(
      svgEl('circle', {
        class: baseClass,
        cx: 36,
        cy: 22,
        r: 8,
      }),
    );
    return preview;
  }

  if (type === 'textbox') {
    preview.appendChild(
      svgEl('rect', {
        class: baseClass,
        x: 10,
        y: 8,
        width: 52,
        height: 28,
        rx: 6,
        ry: 6,
      }),
    );
    preview.appendChild(
      svgEl('path', {
        class: 'vd-flowchart-palette-lines',
        d: 'M 20 18 H 52 M 20 25 H 46',
      }),
    );
    return preview;
  }

  const label = svgEl('text', {
    class: 'vd-flowchart-palette-label-mark',
    x: 36,
    y: 24,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
  });
  label.textContent = 'Aa';
  preview.appendChild(label);
  return preview;
}

export class VdFlowchart {
  constructor(options = {}) {
    this.element = resolveElement(options.element || options.target);
    this.readonly = Boolean(options.readonly);
    this.gridSize = clamp(toFiniteNumber(options.gridSize, DEFAULT_GRID_SIZE), 12, 64);
    this.documentData = normalizeDocument(options.data || {});
    this.listeners = {};
    this.selection = null;
    this.selectedNodeIds = new Set();
    this.interaction = null;
    this.activeTool = null;
    this.layoutMode = 'tree';
    this.paletteSerial = 0;
    this.destroyed = false;
    this.lastNodePointer = null;
    this.reconnectEdgeId = null;
    this.edgeCycleAnchor = null;
    this.clipboard = null;
    this.gridPatternId = nextId('flowchart-grid');
    this.markerIds = new Map();
    this.textEditor = null;

    this.historyEnabled = options.history !== false;
    this.historyLimit = Math.max(1, Math.floor(toFiniteNumber(options.historyLimit, 100)));
    this.history = [];
    this.historyIndex = -1;
    this.isApplyingHistory = false;
    this.historyBatchDepth = 0;
    this.historyBatchDirty = false;
    this.coalesceInsertedText = false;
    this.keyboardShortcuts = normalizeKeyboardShortcuts(options.keyboardShortcuts);
    this.snapGuides = options.snapGuides !== false;
    this.minimapEnabled = options.minimap !== false;
    this.minimapFrame = 0;
    this.minimapDrag = null;
    this.shortcutsHelpOpen = false;
    this.autoFit = Boolean(options.autoFit);
    this.readyEmitted = false;
    this.resizeObserver = null;

    this.handleToolbarClick = this.handleToolbarClick.bind(this);
    this.handleArrangeChange = this.handleArrangeChange.bind(this);
    this.handlePaletteClick = this.handlePaletteClick.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleSelectionFieldInput = this.handleSelectionFieldInput.bind(this);
    this.handleSelectionFieldChange = this.handleSelectionFieldChange.bind(this);
    this.handleJsonActionClick = this.handleJsonActionClick.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.buildShell();
    this.bindEvents();
    this.render();
    this.seedHistory();
    this.updateHistoryButtons();
    this.scheduleReady();
  }

  // --- Readiness -----------------------------------------------------------
  // The editor builds synchronously, but fitView() needs real canvas
  // dimensions, which only exist after the host is laid out. Emit `ready` once
  // the canvas reports a non-zero size (the old code fell back to an 800x560
  // guess); consumers can then fitView() without nextTick/setTimeout. The emit
  // is always deferred at least a microtask so a listener attached right after
  // construction — e.g. `new VdFlowchart(...).on('ready', ...)` or the Vue
  // wrapper — is registered before it fires.
  scheduleReady() {
    if (this.readyEmitted || this.destroyed || !hasWindow()) return;

    const tryEmit = () => {
      if (this.readyEmitted || this.destroyed) return true;
      const ready = this.canvasEl.clientWidth > 0 && this.canvasEl.clientHeight > 0;
      if (!ready) return false;
      this.readyEmitted = true;
      if (this.autoFit) this.fitView();
      else this.scheduleMinimap();
      this.emit('ready', this);
      return true;
    };

    const startObserving = () => {
      if (this.readyEmitted || this.destroyed || tryEmit()) return;

      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => {
          if (tryEmit()) {
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
          }
        });
        this.resizeObserver.observe(this.canvasEl);
      }

      // Fallback for environments without ResizeObserver (or a host that is
      // measurable on the next frame). If the host never gets a size, ready
      // simply never fires — which is correct.
      const raf =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb) => setTimeout(cb, 16);
      raf(() => tryEmit());
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(startObserving);
    } else {
      Promise.resolve().then(startObserving);
    }
  }

  buildShell() {
    this.element.innerHTML = '';
    this.element.classList.add('vd-flowchart-host');

    this.root = createElement('div', {
      className: `vd-flowchart-shell${this.readonly ? ' vd-flowchart-readonly' : ''}`,
    });

    this.toolbar = createElement('div', { className: 'vd-flowchart-toolbar' });
    this.toolbar.setAttribute('role', 'toolbar');
    this.toolbar.setAttribute('aria-label', 'Flowchart tools');
    const toolbarLeft = createElement('div', { className: 'vd-flowchart-toolbar-group' });
    const toolbarRight = createElement('div', { className: 'vd-flowchart-toolbar-group' });

    TOOLBAR_ACTIONS.forEach((item) => {
      const button = createToolbarButton(item);
      if (item.action === 'undo') this.undoButton = button;
      if (item.action === 'redo') this.redoButton = button;
      if (item.action === 'zoom-out') this.zoomOutButton = button;
      if (item.action === 'zoom-in') this.zoomInButton = button;
      if (item.action === 'reset-view') this.resetViewButton = button;
      if (item.action === 'fit-view') this.fitViewButton = button;
      toolbarLeft.appendChild(button);
    });
    this.undoButton.disabled = true;
    this.redoButton.disabled = true;

    this.arrangeSelect = createElement('select', {
      className: 'vd-flowchart-btn vd-flowchart-arrange',
      disabled: this.readonly,
      title: 'Auto-arrange layout',
    });
    this.arrangeSelect.setAttribute('aria-label', 'Layout mode');
    this.arrangeSelect.setAttribute('data-flowchart-arrange', '');
    LAYOUT_OPTIONS.forEach((item) => {
      const option = createElement('option', { value: item.value, text: item.label });
      option.value = item.value;
      this.arrangeSelect.appendChild(option);
    });
    this.arrangeSelect.value = this.layoutMode;

    this.clearButton = createToolbarButton({
      action: 'clear',
      label: 'Clear canvas',
      icon: 'clear',
      disabled: this.readonly,
    });

    this.zoomLabel = createElement('span', {
      className: 'vd-flowchart-toolbar-label',
      text: '100%',
    });

    this.shortcutsButton = createElement('button', {
      className: 'vd-flowchart-btn vd-flowchart-icon-btn vd-flowchart-shortcuts-btn',
      title: 'Keyboard shortcuts (?)',
      text: '?',
    });
    this.shortcutsButton.setAttribute('type', 'button');
    this.shortcutsButton.setAttribute('data-flowchart-action', 'shortcuts');
    this.shortcutsButton.setAttribute('aria-label', 'Keyboard shortcuts');
    this.shortcutsButton.setAttribute('aria-expanded', 'false');

    this.minimapButton = createToolbarButton({
      action: 'minimap',
      label: 'Toggle minimap',
      icon: 'minimap',
    });
    this.minimapButton.setAttribute('aria-pressed', this.minimapEnabled ? 'true' : 'false');

    toolbarLeft.appendChild(this.arrangeSelect);
    toolbarLeft.appendChild(this.clearButton);
    toolbarRight.appendChild(this.minimapButton);
    toolbarRight.appendChild(this.shortcutsButton);
    toolbarRight.appendChild(this.zoomLabel);
    this.toolbar.appendChild(toolbarLeft);
    this.toolbar.appendChild(toolbarRight);

    this.body = createElement('div', { className: 'vd-flowchart-body' });

    this.palettePanel = createElement('aside', {
      className: 'vd-flowchart-panel vd-flowchart-panel--palette',
    });
    this.palettePanel.appendChild(
      createElement('h4', { className: 'vd-flowchart-panel-title', text: 'Shapes' }),
    );
    this.paletteGrid = createElement('div', {
      className: 'vd-flowchart-palette',
      role: 'toolbar',
    });
    this.paletteGrid.setAttribute('aria-label', 'Shapes and tools');
    FLOWCHART_PALETTE_ITEMS.forEach((item) => {
      const button = createElement('button', {
        className: 'vd-flowchart-palette-btn',
        title: item.label,
      });
      button.setAttribute('type', 'button');
      if (item.kind === 'tool') {
        button.setAttribute('data-tool', item.tool);
        button.setAttribute('aria-label', item.label);
        button.setAttribute('aria-pressed', 'false');
      } else {
        button.setAttribute('data-node-type', item.type);
        button.setAttribute('aria-label', `Add ${item.label}`);
      }
      button.appendChild(createPalettePreview(item.tool || item.type));
      button.appendChild(
        createElement('span', {
          className: 'vd-flowchart-palette-label',
          text: item.label,
        }),
      );
      this.paletteGrid.appendChild(button);
    });
    this.palettePanel.appendChild(this.paletteGrid);

    this.canvasEl = createElement('div', { className: 'vd-flowchart-canvas', tabIndex: 0 });
    this.svg = svgEl('svg', {
      class: 'vd-flowchart-svg',
      role: 'img',
      'aria-label': 'Vanduo Flowchart editor',
    });

    const defs = svgEl('defs');
    this.markerDefs = svgEl('g');
    defs.appendChild(this.markerDefs);

    const pattern = svgEl('pattern', {
      id: this.gridPatternId,
      width: this.gridSize,
      height: this.gridSize,
      patternUnits: 'userSpaceOnUse',
    });
    pattern.appendChild(
      svgEl('path', {
        d: `M ${this.gridSize} 0 L 0 0 0 ${this.gridSize}`,
        fill: 'none',
        stroke: 'var(--vd-flowchart-border)',
        'stroke-opacity': 0.55,
        'stroke-width': 1,
      }),
    );

    defs.appendChild(pattern);
    this.svg.appendChild(defs);

    this.world = svgEl('g', { class: 'vd-flowchart-world' });
    this.gridRect = svgEl('rect', {
      class: 'vd-flowchart-grid',
      x: -WORLD_EXTENT / 2,
      y: -WORLD_EXTENT / 2,
      width: WORLD_EXTENT,
      height: WORLD_EXTENT,
      fill: `url(#${this.gridPatternId})`,
    });
    this.edgesLayer = svgEl('g', { class: 'vd-flowchart-edges' });
    this.previewLayer = svgEl('g', { class: 'vd-flowchart-preview' });
    this.nodesLayer = svgEl('g', { class: 'vd-flowchart-nodes' });
    this.overlayLayer = svgEl('g', { class: 'vd-flowchart-overlay' });
    this.guidesLayer = svgEl('g', { class: 'vd-flowchart-guides' });

    this.world.appendChild(this.gridRect);
    this.world.appendChild(this.edgesLayer);
    this.world.appendChild(this.previewLayer);
    this.world.appendChild(this.nodesLayer);
    this.world.appendChild(this.overlayLayer);
    this.world.appendChild(this.guidesLayer);
    this.svg.appendChild(this.world);
    this.canvasEl.appendChild(this.svg);

    this.shortcutsHelp = createElement('div', { className: 'vd-flowchart-shortcuts' });
    this.shortcutsHelp.id = nextId('flowchart-shortcuts');
    this.shortcutsHelp.setAttribute('role', 'dialog');
    this.shortcutsHelp.setAttribute('aria-label', 'Keyboard shortcuts');
    this.shortcutsHelp.hidden = true;
    this.shortcutsHelp.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.shortcutsHelp.addEventListener('wheel', (event) => event.stopPropagation());
    this.shortcutsButton.setAttribute('aria-controls', this.shortcutsHelp.id);
    this.canvasEl.appendChild(this.shortcutsHelp);

    // Pointer-only overview: keyboard users already have arrows and zoom keys.
    this.minimapEl = createElement('div', { className: 'vd-flowchart-minimap' });
    this.minimapEl.setAttribute('aria-hidden', 'true');
    this.minimapEl.hidden = true;
    this.minimapSvg = svgEl('svg', {
      class: 'vd-flowchart-minimap-svg',
      width: MINIMAP_WIDTH,
      height: MINIMAP_HEIGHT,
      viewBox: `0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`,
    });
    this.minimapEl.appendChild(this.minimapSvg);
    this.minimapEl.addEventListener('pointerdown', (event) => this.handleMinimapPointer(event));
    this.minimapEl.addEventListener('pointermove', (event) => this.handleMinimapPointer(event));
    this.minimapEl.addEventListener('pointerup', (event) => this.endMinimapDrag(event));
    this.minimapEl.addEventListener('pointercancel', (event) => this.endMinimapDrag(event));
    this.minimapEl.addEventListener('wheel', (event) => event.stopPropagation());
    this.canvasEl.appendChild(this.minimapEl);

    this.inspectorPanel = createElement('aside', {
      className: 'vd-flowchart-panel vd-flowchart-panel--inspector',
    });
    this.inspectorPanel.appendChild(
      createElement('h4', { className: 'vd-flowchart-panel-title', text: 'Inspector' }),
    );
    this.selectionMeta = createElement('div', { className: 'vd-flowchart-selection-meta' });
    this.selectionFields = createElement('div', { className: 'vd-flowchart-fields' });
    this.deleteButton = createElement('button', {
      className: 'vd-flowchart-btn vd-flowchart-delete',
      text: 'Delete',
      disabled: true,
    });
    this.deleteButton.setAttribute('type', 'button');
    this.inspectorPanel.appendChild(this.selectionMeta);
    this.inspectorPanel.appendChild(this.selectionFields);
    this.inspectorPanel.appendChild(this.deleteButton);

    this.inspectorPanel.appendChild(
      createElement('h4', { className: 'vd-flowchart-panel-title', text: 'JSON' }),
    );
    this.jsonPanel = createElement('div', { className: 'vd-flowchart-json' });
    this.jsonTextarea = createElement('textarea', { rows: 18 });
    this.jsonActions = createElement('div', { className: 'vd-flowchart-json-actions' });
    this.refreshJsonButton = createElement('button', {
      className: 'vd-flowchart-json-btn',
      text: 'Refresh',
    });
    this.refreshJsonButton.setAttribute('type', 'button');
    this.refreshJsonButton.setAttribute('data-json-action', 'refresh');
    this.loadJsonButton = createElement('button', {
      className: 'vd-flowchart-json-btn',
      text: 'Load',
      disabled: this.readonly,
    });
    this.loadJsonButton.setAttribute('type', 'button');
    this.loadJsonButton.setAttribute('data-json-action', 'load');
    this.jsonActions.appendChild(this.refreshJsonButton);
    this.jsonActions.appendChild(this.loadJsonButton);
    this.jsonPanel.appendChild(this.jsonTextarea);
    this.jsonPanel.appendChild(this.jsonActions);
    this.jsonStatus = createElement('p', { className: 'vd-flowchart-json-status' });
    this.jsonStatus.setAttribute('role', 'status');
    this.jsonPanel.appendChild(this.jsonStatus);
    this.inspectorPanel.appendChild(this.jsonPanel);

    this.body.appendChild(this.palettePanel);
    this.body.appendChild(this.canvasEl);
    this.body.appendChild(this.inspectorPanel);

    this.root.appendChild(this.toolbar);
    this.root.appendChild(this.body);
    this.buildGraphOutline();
    this.element.appendChild(this.root);
  }

  buildGraphOutline() {
    this.graphOutline = createElement('details', { className: 'vd-flowchart-outline' });
    this.graphOutline.appendChild(createElement('summary', { text: 'Graph outline' }));
    this.graphOutline.addEventListener('toggle', () => {
      if (this.graphOutline.open) this.renderGraphOutline();
    });
    this.graphStatus = createElement('p', { className: 'vd-flowchart-sr-only' });
    this.graphStatus.setAttribute('role', 'status');
    this.canvasEl.appendChild(this.graphStatus);
    this.graphControls = createElement('div', { className: 'vd-flowchart-outline-controls' });
    this.graphNodeSelect = createElement('select');
    this.graphNodeSelect.setAttribute('aria-label', 'Selected node');
    this.graphNodeSelect.addEventListener('change', () =>
      this.selectNode(this.graphNodeSelect.value),
    );
    this.graphTargetSelect = createElement('select');
    this.graphTargetSelect.setAttribute('aria-label', 'Connection target');
    this.graphTargetSelect.addEventListener('change', () => this.renderGraphOutline());
    this.graphConnectButton = createElement('button', {
      text: 'Connect nodes',
      type: 'button',
      className: 'vd-flowchart-btn',
    });
    this.graphConnectButton.addEventListener('click', () => {
      if (this.readonly || this.graphNodeSelect.value === this.graphTargetSelect.value) {
        return;
      }
      this.addEdge({
        from: this.graphNodeSelect.value,
        to: this.graphTargetSelect.value,
        autoPort: true,
      });
    });
    this.graphEditButton = createElement('button', {
      text: 'Edit selected label',
      type: 'button',
      className: 'vd-flowchart-btn',
    });
    this.graphEditButton.addEventListener('click', () =>
      this.startTextEdit(this.graphNodeSelect.value),
    );
    this.graphControls.append(
      createField('Selected node', this.graphNodeSelect),
      createField('Connection target', this.graphTargetSelect),
      this.graphConnectButton,
      this.graphEditButton,
    );
    this.graphOutline.appendChild(this.graphControls);
    this.graphList = createElement('ul');
    this.graphList.setAttribute('aria-label', 'Nodes and connections');
    this.graphOutline.appendChild(this.graphList);
    this.root.appendChild(this.graphOutline);
    this.canvasEl.setAttribute('role', 'group');
    this.syncCanvasLabel();
    this.jsonTextarea.setAttribute('aria-label', 'Flowchart JSON');
  }

  syncCanvasLabel() {
    const keys =
      this.readonly || this.keyboardShortcuts === 'basic'
        ? 'Arrow keys select nodes; Enter or F2 edits a label.'
        : 'Arrow keys select nodes; Tab adds a child, Enter adds a sibling, F2 edits a label.';
    this.canvasEl.setAttribute(
      'aria-label',
      `Diagram canvas. ${keys} Press ? for all shortcuts. Graph outline provides connections.`,
    );
  }

  renderGraphOutline() {
    if (!this.graphOutline) return;
    const nodes = this.documentData.nodes;
    const edges = this.documentData.edges;
    const labels = new Map(nodes.map((node) => [node.id, node.text || node.id]));
    const selected = this.selection?.kind === 'node' ? this.selection.id : null;
    this.graphStatus.textContent = selected
      ? `Selected: ${labels.get(selected)}. ${nodes.length} nodes, ${edges.length} connections.`
      : `${nodes.length} nodes, ${edges.length} connections.`;
    if (!this.graphOutline.open) return;
    const hidden = this.getHiddenNodeIds();
    const signature = JSON.stringify([
      nodes.map((node) => [node.id, node.text, Boolean(node.collapsed), hidden.has(node.id)]),
      edges.map((edge) => [edge.id, edge.from.nodeId, edge.to.nodeId, edge.label]),
    ]);
    if (signature !== this.graphSignature) {
      this.graphSignature = signature;
      for (const select of [this.graphNodeSelect, this.graphTargetSelect]) {
        const previous = select.value;
        select.replaceChildren();
        for (const node of nodes)
          select.appendChild(
            createElement('option', { value: node.id, text: labels.get(node.id) }),
          );
        if (labels.has(previous)) select.value = previous;
      }
      this.graphList.replaceChildren();
      const outgoing = new Map(nodes.map((node) => [node.id, []]));
      const incoming = new Map(nodes.map((node) => [node.id, []]));
      for (const edge of edges) {
        outgoing
          .get(edge.from.nodeId)
          ?.push(`${labels.get(edge.to.nodeId)}${edge.label ? ` (${edge.label})` : ''}`);
        incoming.get(edge.to.nodeId)?.push(labels.get(edge.from.nodeId));
      }
      for (const node of nodes) {
        const to = outgoing.get(node.id);
        const from = incoming.get(node.id);
        const relationships = [
          to.length ? `Connects to ${to.join(', ')}.` : 'No outgoing connections.',
          from.length ? `Connected from ${from.join(', ')}.` : '',
          node.collapsed ? 'Branch collapsed.' : '',
          hidden.has(node.id) ? 'Hidden in a collapsed branch.' : '',
        ].filter(Boolean);
        this.graphList.appendChild(
          createElement('li', { text: `${labels.get(node.id)}. ${relationships.join(' ')}` }),
        );
      }
    }
    if (selected) this.graphNodeSelect.value = selected;
    this.graphNodeSelect.disabled = nodes.length === 0;
    this.graphTargetSelect.disabled = this.readonly || nodes.length < 2;
    this.graphConnectButton.disabled =
      this.readonly ||
      nodes.length < 2 ||
      this.graphNodeSelect.value === this.graphTargetSelect.value;
    this.graphEditButton.disabled = this.readonly || nodes.length === 0;
  }

  bindEvents() {
    this.toolbar.addEventListener('click', this.handleToolbarClick);
    this.arrangeSelect.addEventListener('change', this.handleArrangeChange);
    this.paletteGrid.addEventListener('click', this.handlePaletteClick);
    this.deleteButton.addEventListener('click', () => this.deleteSelection());
    this.selectionFields.addEventListener('input', this.handleSelectionFieldInput);
    this.selectionFields.addEventListener('change', this.handleSelectionFieldChange);
    this.jsonActions.addEventListener('click', this.handleJsonActionClick);
    this.canvasEl.addEventListener('pointerdown', this.handlePointerDown);
    this.canvasEl.addEventListener('pointermove', this.handlePointerMove);
    this.canvasEl.addEventListener('pointerup', this.handlePointerUp);
    this.canvasEl.addEventListener('pointercancel', this.handlePointerUp);
    this.canvasEl.addEventListener('click', this.handleClick);
    this.canvasEl.addEventListener('dblclick', this.handleDoubleClick);
    this.canvasEl.addEventListener('wheel', this.handleWheel, { passive: false });
    this.root.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('resize', this.handleResize);
  }

  unbindEvents() {
    this.toolbar.removeEventListener('click', this.handleToolbarClick);
    this.arrangeSelect.removeEventListener('change', this.handleArrangeChange);
    this.paletteGrid.removeEventListener('click', this.handlePaletteClick);
    this.selectionFields.removeEventListener('input', this.handleSelectionFieldInput);
    this.selectionFields.removeEventListener('change', this.handleSelectionFieldChange);
    this.jsonActions.removeEventListener('click', this.handleJsonActionClick);
    this.canvasEl.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvasEl.removeEventListener('pointermove', this.handlePointerMove);
    this.canvasEl.removeEventListener('pointerup', this.handlePointerUp);
    this.canvasEl.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvasEl.removeEventListener('click', this.handleClick);
    this.canvasEl.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvasEl.removeEventListener('wheel', this.handleWheel);
    this.root.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    if (this.destroyed) return;
    this.render({ inspector: false, json: false });
  }

  updatePaletteState() {
    const arrowArmed = this.activeTool === 'arrow';
    this.paletteGrid.querySelectorAll('.vd-flowchart-palette-btn').forEach((button) => {
      const tool = button.getAttribute('data-tool');
      const active = Boolean(tool) && tool === this.activeTool;
      button.classList.toggle('is-active', active);
      if (tool) button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    this.canvasEl.classList.toggle('is-arrow-tool', arrowArmed);
  }

  syncArrangeSelect() {
    if (!this.arrangeSelect) return;
    const mode = LAYOUT_OPTIONS.some((item) => item.value === this.layoutMode)
      ? this.layoutMode
      : 'tree';
    this.layoutMode = mode;
    this.arrangeSelect.value = mode;
  }

  setActiveTool(tool) {
    this.activeTool = tool || null;
    this.updatePaletteState();
    this.render({ scene: true, inspector: false, json: false });
  }

  handleToolbarClick(event) {
    const actionButton = event.target.closest('[data-flowchart-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-flowchart-action');
    if (action === 'zoom-in') this.zoomIn();
    if (action === 'zoom-out') this.zoomOut();
    if (action === 'reset-view') this.resetView();
    if (action === 'fit-view') this.fitView();
    if (action === 'undo') this.undo();
    if (action === 'redo') this.redo();
    if (action === 'clear' && !this.readonly) this.clear();
    if (action === 'shortcuts') this.toggleShortcutsHelp();
    if (action === 'minimap') this.setMinimapEnabled(!this.minimapEnabled);
  }

  setMinimapEnabled(enabled) {
    this.minimapEnabled = Boolean(enabled);
    this.minimapButton.setAttribute('aria-pressed', this.minimapEnabled ? 'true' : 'false');
    this.drawMinimap();
    return this;
  }

  scheduleMinimap() {
    if (this.minimapFrame || !hasWindow()) return;
    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback) => setTimeout(callback, 16);
    this.minimapFrame = raf(() => {
      this.minimapFrame = 0;
      this.drawMinimap();
    });
  }

  // World-to-minimap mapping covering every visible node and the viewport.
  getMinimapTransform() {
    const viewport = this.documentData.viewport;
    const width = this.canvasEl.clientWidth;
    const height = this.canvasEl.clientHeight;
    const view = {
      left: -viewport.x / viewport.scale,
      top: -viewport.y / viewport.scale,
      right: (width - viewport.x) / viewport.scale,
      bottom: (height - viewport.y) / viewport.scale,
    };
    const content = getBounds(this.getVisibleNodes());
    const left = Math.min(content.left, view.left);
    const top = Math.min(content.top, view.top);
    const spanX = Math.max(1, Math.max(content.right, view.right) - left);
    const spanY = Math.max(1, Math.max(content.bottom, view.bottom) - top);
    const padding = 8;
    const scale = Math.min(
      (MINIMAP_WIDTH - padding * 2) / spanX,
      (MINIMAP_HEIGHT - padding * 2) / spanY,
    );
    return {
      scale,
      offsetX: (MINIMAP_WIDTH - spanX * scale) / 2 - left * scale,
      offsetY: (MINIMAP_HEIGHT - spanY * scale) / 2 - top * scale,
      view,
    };
  }

  drawMinimap() {
    if (this.destroyed || !this.minimapEl) return;
    const nodes = this.getVisibleNodes();
    const visible =
      this.minimapEnabled &&
      nodes.length > 0 &&
      this.canvasEl.clientWidth >= MINIMAP_MIN_CANVAS_WIDTH;
    this.minimapEl.hidden = !visible;
    if (!visible) return;

    const transform = this.minimapDrag?.transform || this.getMinimapTransform();
    const view = this.getMinimapTransform().view;
    const map = (x, y) => ({
      x: formatNumber(x * transform.scale + transform.offsetX),
      y: formatNumber(y * transform.scale + transform.offsetY),
    });
    clearChildren(this.minimapSvg);
    nodes.forEach((node) => {
      const point = map(node.x, node.y);
      const selected = this.selection?.kind === 'node' && this.selection.id === node.id;
      this.minimapSvg.appendChild(
        svgEl('rect', {
          class: `vd-flowchart-minimap-node${selected ? ' is-selected' : ''}`,
          x: point.x,
          y: point.y,
          width: formatNumber(Math.max(1.5, node.width * transform.scale)),
          height: formatNumber(Math.max(1.5, node.height * transform.scale)),
          rx: 1.5,
        }),
      );
    });
    const corner = map(view.left, view.top);
    this.minimapSvg.appendChild(
      svgEl('rect', {
        class: 'vd-flowchart-minimap-viewport',
        x: corner.x,
        y: corner.y,
        width: formatNumber((view.right - view.left) * transform.scale),
        height: formatNumber((view.bottom - view.top) * transform.scale),
      }),
    );
  }

  // Centre the main view on the world point under the minimap pointer. The
  // mapping is frozen for the whole drag so the map does not shift under it.
  handleMinimapPointer(event) {
    event.stopPropagation();
    if (event.type === 'pointerdown') {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      this.minimapDrag = { pointerId: event.pointerId, transform: this.getMinimapTransform() };
      try {
        this.minimapEl.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (!this.minimapDrag || this.minimapDrag.pointerId !== event.pointerId) return;
    const rect = this.minimapEl.getBoundingClientRect();
    const { transform } = this.minimapDrag;
    this.centerViewOn(
      (event.clientX - rect.left - transform.offsetX) / transform.scale,
      (event.clientY - rect.top - transform.offsetY) / transform.scale,
    );
  }

  endMinimapDrag(event) {
    event.stopPropagation();
    if (!this.minimapDrag || this.minimapDrag.pointerId !== event.pointerId) return;
    this.minimapDrag = null;
    this.syncJsonTextarea();
    this.emitViewportChange('viewport:pan');
    this.drawMinimap();
  }

  centerViewOn(worldX, worldY) {
    const viewport = this.documentData.viewport;
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    viewport.x = formatNumber(width / 2 - worldX * viewport.scale);
    viewport.y = formatNumber(height / 2 - worldY * viewport.scale);
    this.render({ inspector: false, json: false });
    return this;
  }

  toggleShortcutsHelp(force) {
    const open = typeof force === 'boolean' ? force : !this.shortcutsHelpOpen;
    this.shortcutsHelpOpen = open;
    this.shortcutsButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) this.renderShortcutsHelp();
    this.shortcutsHelp.hidden = !open;
    if (!open && this.shortcutsHelp.contains(document.activeElement)) this.canvasEl.focus();
    return this;
  }

  renderShortcutsHelp() {
    clearChildren(this.shortcutsHelp);
    const header = createElement('div', { className: 'vd-flowchart-shortcuts-header' });
    header.appendChild(
      createElement('h4', { className: 'vd-flowchart-panel-title', text: 'Keyboard shortcuts' }),
    );
    const close = createElement('button', {
      className: 'vd-flowchart-btn vd-flowchart-icon-btn',
      text: '×',
    });
    close.setAttribute('type', 'button');
    close.setAttribute('aria-label', 'Close keyboard shortcuts');
    close.addEventListener('click', () => this.toggleShortcutsHelp(false));
    header.appendChild(close);
    this.shortcutsHelp.appendChild(header);

    const list = createElement('dl', { className: 'vd-flowchart-shortcuts-list' });
    getShortcutRows(this.keyboardShortcuts, this.readonly).forEach(([keys, action]) => {
      list.appendChild(createElement('dt', { text: keys }));
      list.appendChild(createElement('dd', { text: action }));
    });
    this.shortcutsHelp.appendChild(list);
  }

  handleArrangeChange(event) {
    if (this.readonly) return;
    const mode = event.target.value;
    if (!LAYOUT_OPTIONS.some((item) => item.value === mode)) {
      this.syncArrangeSelect();
      return;
    }
    this.layoutMode = mode;
    this.layout(mode);
  }

  handlePaletteClick(event) {
    if (this.readonly) return;
    const toolButton = event.target.closest('[data-tool]');
    if (toolButton) {
      const tool = toolButton.getAttribute('data-tool');
      this.setActiveTool(this.activeTool === tool ? null : tool);
      return;
    }
    const button = event.target.closest('[data-node-type]');
    if (!button) return;
    this.setActiveTool(null);
    this.addNode({ type: button.getAttribute('data-node-type') });
  }

  handleJsonActionClick(event) {
    const button = event.target.closest('[data-json-action]');
    if (!button) return;

    const action = button.getAttribute('data-json-action');
    if (action === 'refresh') {
      this.syncJsonTextarea(true);
      return;
    }

    if (action === 'load' && !this.readonly) {
      try {
        this.load(this.jsonTextarea.value);
        this.jsonStatus.textContent = '';
      } catch (error) {
        this.jsonStatus.textContent = error.message;
      }
    }
  }

  handleSelectionFieldInput(event) {
    const field = event.target.getAttribute('data-field');
    if (!field) return;

    if (field === 'node-text') {
      this.updateNode(
        this.selection?.id,
        { text: event.target.value },
        { inspector: false, reason: 'node:update' },
      );
      return;
    }

    if (field === 'edge-label') {
      this.updateEdge(
        this.selection?.id,
        { label: event.target.value },
        { inspector: false, reason: 'edge:update' },
      );
      return;
    }

    if (field === 'node-width' || field === 'node-height') {
      const patch =
        field === 'node-width'
          ? { width: toFiniteNumber(event.target.value, undefined) }
          : { height: toFiniteNumber(event.target.value, undefined) };
      this.updateNode(this.selection?.id, patch, { inspector: false, reason: 'node:update' });
    }
  }

  handleSelectionFieldChange(event) {
    const field = event.target.getAttribute('data-field');
    if (!field) return;

    if (field === 'node-type') {
      this.updateNode(
        this.selection?.id,
        { type: event.target.value },
        { inspector: true, reason: 'node:update' },
      );
      return;
    }

    if (field === 'edge-start-marker') {
      this.updateEdge(
        this.selection?.id,
        { startMarker: event.target.value },
        { inspector: true, reason: 'edge:update' },
      );
      return;
    }

    if (field === 'edge-end-marker') {
      this.updateEdge(
        this.selection?.id,
        { endMarker: event.target.value },
        { inspector: true, reason: 'edge:update' },
      );
      return;
    }

    if (field === 'edge-route') {
      this.updateEdge(
        this.selection?.id,
        { route: event.target.value },
        { inspector: true, reason: 'edge:update' },
      );
      return;
    }

    if (field === 'edge-stroke-preset') {
      this.updateEdge(
        this.selection?.id,
        { strokeWidth: getStrokePresetWidth(event.target.value) },
        { inspector: true, reason: 'edge:update' },
      );
    }
  }

  handleKeyDown(event) {
    const target = event.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (event.isComposing) return;

    const key = event.key;
    const modKey = event.metaKey || event.ctrlKey;

    if (key === 'Escape' && this.shortcutsHelpOpen) {
      event.preventDefault();
      this.toggleShortcutsHelp(false);
      return;
    }

    if (target === this.canvasEl && this.handleCanvasKeyDown(event)) {
      event.preventDefault();
      return;
    }
    if (this.readonly) return;

    if (key === 'Escape') {
      // Step back one level: tool, then edge reconnect mode, then selection.
      if (this.activeTool) this.setActiveTool(null);
      else if (this.reconnectEdgeId) {
        this.reconnectEdgeId = null;
        this.render({ inspector: false, json: false });
      } else if (this.selection) this.select(null);
      else return;
      event.preventDefault();
      return;
    }

    if (modKey && (key === 'd' || key === 'D')) {
      if (this.selection?.kind === 'node') {
        event.preventDefault();
        this.duplicateSelection();
      }
      return;
    }
    if (modKey && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }
    if (modKey && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      this.redo();
      return;
    }
    if (modKey && event.key === 'c') {
      if (this.selection) {
        event.preventDefault();
        this.copySelection();
      }
      return;
    }
    if (modKey && event.key === 'v') {
      if (this.clipboard) {
        event.preventDefault();
        this.pasteClipboard();
      }
      return;
    }
    if (modKey && event.key === 'x') {
      if (this.selection) {
        event.preventDefault();
        this.cutSelection();
      }
      return;
    }

    if (!this.selection) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (this.selection.kind === 'node' && !this.hasMultiSelection()) {
        const removedId = this.selection.id;
        const parent = this.getParentNode(removedId);
        const sibling = parent
          ? this.getChildNodes(parent.id).find((node) => node.id !== removedId)
          : null;
        if (this.deleteSelection()) {
          const next = (parent && this.findNode(parent.id)) || sibling;
          if (next) this.select({ kind: 'node', id: next.id });
        }
        return;
      }
      this.deleteSelection();
    }
  }

  // Keys that only apply while the canvas itself has focus. Returns true when
  // the key was handled (the caller prevents the default action).
  handleCanvasKeyDown(event) {
    const key = event.key;
    const modKey = event.metaKey || event.ctrlKey;
    const mindmap = this.keyboardShortcuts === 'mindmap';
    const selectedNode = this.selection?.kind === 'node' ? this.findNode(this.selection.id) : null;
    const selectedEdge = this.selection?.kind === 'edge' ? this.findEdge(this.selection.id) : null;
    const movable = !this.readonly && Boolean(selectedNode);
    // Insertion and label keys act on one node; a group only moves or deletes.
    const editable = movable && !this.hasMultiSelection();

    if (key === '?' && !modKey && !event.altKey) {
      this.toggleShortcutsHelp();
      return true;
    }

    if (modKey && !event.altKey) {
      if (key === '=' || key === '+') return Boolean(this.zoomIn());
      if (key === '-' || key === '_') return Boolean(this.zoomOut());
      if (key === '0') return Boolean(this.zoomTo(1));
      if (key === 'a' || key === 'A') {
        this.selectNodes(this.getVisibleNodes().map((node) => node.id));
        return true;
      }
      if (key === '/' && selectedNode && !this.hasMultiSelection()) {
        this.toggleCollapsed(selectedNode.id);
        return true;
      }
      return false;
    }
    if (event.shiftKey && !event.altKey && (key === '!' || event.code === 'Digit1')) {
      return Boolean(this.fitView());
    }

    const direction = ARROW_DIRECTIONS[key];
    if (direction) {
      if (event.altKey) {
        if (movable) {
          this.nudgeNodes(this.getSelectedNodeIds(), direction, event.shiftKey ? 1 : this.gridSize);
        }
        return true;
      }
      if (event.shiftKey) {
        const anchorId = selectedNode?.id ?? (selectedEdge ? this.edgeCycleAnchor : null);
        return anchorId ? this.selectSideEdge(anchorId, direction) : false;
      }
      this.navigateSelection(direction);
      return true;
    }

    const nodes = this.getVisibleNodes();
    if ((key === 'Home' || key === 'End') && nodes.length) {
      this.selectNode(nodes[key === 'Home' ? 0 : nodes.length - 1].id);
      return true;
    }

    if (selectedEdge && !this.readonly && !event.altKey) {
      if (key === 'F2' || key === 'Enter' || (key === ' ' && mindmap)) {
        return this.startEdgeLabelEdit(selectedEdge.id);
      }
      if (mindmap && key.length === 1 && key !== ' ') {
        return this.startEdgeLabelEdit(selectedEdge.id, { initialText: key });
      }
      return false;
    }

    if (!editable || event.altKey) return false;

    if (key === 'F2' || (key === 'Enter' && !mindmap) || (key === ' ' && mindmap)) {
      this.startTextEdit(selectedNode.id);
      return true;
    }
    if (!mindmap) return false;

    if (key === 'Tab' && !event.shiftKey) {
      this.insertBranchNode(selectedNode.id, { edit: true });
      return true;
    }
    if (key === 'Enter') {
      this.insertSiblingNode(selectedNode.id, { before: event.shiftKey, edit: true });
      return true;
    }
    if (key.length === 1 && key !== ' ' && isNodeTextEditable(selectedNode)) {
      this.startTextEdit(selectedNode.id, { initialText: key });
      return true;
    }
    return false;
  }

  // Move the selection to the nearest node in `direction`; with nothing (or an
  // edge) selected, start from the node closest to the centre of the view.
  navigateSelection(direction) {
    const nodes = this.getVisibleNodes();
    if (!nodes.length) return false;
    const current = this.selection?.kind === 'node' ? this.findNode(this.selection.id) : null;
    const edge = this.selection?.kind === 'edge' ? this.findEdge(this.selection.id) : null;
    const next = current
      ? findSpatialNeighbor(nodes, current, direction)
      : edge
        ? this.getEdgeEndInDirection(edge, direction)
        : findNearestNode(nodes, this.getViewportCenter());
    if (!next) return false;
    this.selectNode(next.id);
    this.revealNode(next.id);
    return true;
  }

  // The end of `edge` that best matches `direction`, measured from the label
  // anchor so either end can be reached from a selected connection.
  getEdgeEndInDirection(edge, direction) {
    const fromNode = this.findNode(edge.from.nodeId);
    const toNode = this.findNode(edge.to.nodeId);
    if (!fromNode || !toNode) return fromNode || toNode;
    const { labelX, labelY } = buildEdgePath(edge, fromNode, toNode);
    const vector = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }[direction];
    const score = (node) =>
      (node.x + node.width / 2 - labelX) * vector[0] +
      (node.y + node.height / 2 - labelY) * vector[1];
    return score(toNode) >= score(fromNode) ? toNode : fromNode;
  }

  // Connections attached to `nodeId` on the `direction` side, outgoing or
  // incoming, in document order.
  getSideEdges(nodeId, direction) {
    const port = DIRECTION_PORTS[direction];
    return this.documentData.edges.filter(
      (edge) =>
        (edge.from.nodeId === nodeId && edge.from.port === port) ||
        (edge.to.nodeId === nodeId && edge.to.port === port),
    );
  }

  // Select a connection on one side of a node; repeating cycles through them.
  selectSideEdge(nodeId, direction) {
    const edges = this.getSideEdges(nodeId, direction);
    if (!edges.length) return false;
    const currentIndex =
      this.selection?.kind === 'edge'
        ? edges.findIndex((edge) => edge.id === this.selection.id)
        : -1;
    const next = edges[(currentIndex + 1) % edges.length];
    this.select({ kind: 'edge', id: next.id });
    this.edgeCycleAnchor = nodeId;
    return true;
  }

  nudgeNode(nodeId, direction, distance) {
    const [node] = this.nudgeNodes([nodeId], direction, distance);
    return node || null;
  }

  // Move nodes together; repeated nudges of the same selection coalesce into
  // one undo step.
  nudgeNodes(nodeIds, direction, distance) {
    const step = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }[direction];
    if (this.readonly || !step) return [];
    const nodes = nodeIds.map((id) => this.findNode(id)).filter(Boolean);
    if (!nodes.length) return [];
    nodes.forEach((node) => {
      node.x = formatNumber(node.x + step[0] * distance);
      node.y = formatNumber(node.y + step[1] * distance);
    });
    this.render({ inspector: true, json: true });
    this.emitChange(
      'node:nudge',
      nodes.length > 1 ? { nodeIds: nodes.map((node) => node.id) } : { node: deepClone(nodes[0]) },
    );
    return nodes.map((node) => deepClone(node));
  }

  zoomTo(scale) {
    const viewport = this.documentData.viewport;
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    this.scaleAround(
      clamp(scale, MIN_SCALE, MAX_SCALE) / viewport.scale,
      width / 2,
      height / 2,
      'viewport:zoom',
    );
    return this;
  }

  duplicateSelection() {
    if (this.readonly || this.selection?.kind !== 'node') return null;
    if (this.hasMultiSelection()) return this.pasteNodeGroup(this.captureNodeGroup());
    const node = this.findNode(this.selection.id);
    return node ? this.pasteNodeData(node) : null;
  }

  // Selected nodes plus the connections that run between them.
  captureNodeGroup() {
    const ids = new Set(this.getSelectedNodeIds());
    return {
      nodes: deepClone(this.documentData.nodes.filter((node) => ids.has(node.id))),
      edges: deepClone(
        this.documentData.edges.filter(
          (edge) => ids.has(edge.from.nodeId) && ids.has(edge.to.nodeId),
        ),
      ),
    };
  }

  // Paste a captured group offset by one step, remapping ids so internal
  // connections follow their copies. One change, one undo step.
  pasteNodeGroup(group) {
    if (this.readonly || !group?.nodes?.length) return [];
    const usedNodeIds = new Set(this.documentData.nodes.map((node) => node.id));
    const idMap = new Map();
    const nodes = group.nodes.map((data, index) => {
      const node = normalizeNode(
        { ...data, id: undefined, x: data.x + 24, y: data.y + 24 },
        this.documentData.nodes.length + index,
        usedNodeIds,
      );
      idMap.set(data.id, node.id);
      return node;
    });
    this.documentData.nodes.push(...nodes);
    const nodeIds = new Set(this.documentData.nodes.map((node) => node.id));
    const usedEdgeIds = new Set(this.documentData.edges.map((edge) => edge.id));
    group.edges.forEach((data, index) => {
      const edge = normalizeEdge(
        {
          ...data,
          id: undefined,
          from: { ...data.from, nodeId: idMap.get(data.from.nodeId) },
          to: { ...data.to, nodeId: idMap.get(data.to.nodeId) },
        },
        this.documentData.edges.length + index,
        nodeIds,
        usedEdgeIds,
      );
      if (edge) this.documentData.edges.push(edge);
    });
    const ids = nodes.map((node) => node.id);
    this.selectNodes(ids);
    this.emitChange('nodes:add', { nodeIds: ids });
    return nodes.map((node) => deepClone(node));
  }

  pasteNodeData(data) {
    const usedIds = new Set(this.documentData.nodes.map((node) => node.id));
    // A lone copy has no children, so it cannot stay collapsed.
    const node = normalizeNode(
      { ...data, id: undefined, collapsed: undefined, x: data.x + 24, y: data.y + 24 },
      this.documentData.nodes.length,
      usedIds,
    );
    this.documentData.nodes.push(node);
    this.select({ kind: 'node', id: node.id });
    this.emitChange('node:add', { node: deepClone(node) });
    return deepClone(node);
  }

  copySelection() {
    if (!this.selection) return false;
    if (this.hasMultiSelection()) {
      this.clipboard = { kind: 'nodes', data: this.captureNodeGroup() };
      return true;
    }
    if (this.selection.kind === 'node') {
      const node = this.findNode(this.selection.id);
      if (!node) return false;
      this.clipboard = { kind: 'node', data: deepClone(node) };
      return true;
    }
    const edge = this.findEdge(this.selection.id);
    if (!edge) return false;
    this.clipboard = { kind: 'edge', data: deepClone(edge) };
    return true;
  }

  pasteClipboard() {
    if (!this.clipboard || this.readonly) return false;

    if (this.clipboard.kind === 'node') {
      this.pasteNodeData(this.clipboard.data);
      return true;
    }
    if (this.clipboard.kind === 'nodes') {
      const pasted = this.pasteNodeGroup(this.clipboard.data);
      // Repeated pastes keep stepping instead of stacking on one spot.
      this.clipboard = { kind: 'nodes', data: this.captureNodeGroup() };
      return pasted.length > 0;
    }

    const usedIds = new Set(this.documentData.edges.map((edge) => edge.id));
    const nodeIds = new Set(this.documentData.nodes.map((node) => node.id));
    const edge = normalizeEdge(
      {
        ...this.clipboard.data,
        id: undefined,
      },
      this.documentData.edges.length,
      nodeIds,
      usedIds,
    );
    if (!edge) return false;

    this.documentData.edges.push(edge);
    this.select({ kind: 'edge', id: edge.id });
    this.emitChange('edge:add', { edge: deepClone(edge) });
    return true;
  }

  cutSelection() {
    if (!this.copySelection()) return false;
    return this.deleteSelection();
  }

  handleDoubleClick(event) {
    if (this.readonly) return;

    const edgeTarget = event.target.closest('[data-edge-id]');
    if (edgeTarget && !event.target.closest('[data-edge-endpoint]')) {
      const edgeId = edgeTarget.getAttribute('data-edge-id');
      if (edgeId && this.startEdgeLabelEdit(edgeId)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }

    const nodeTarget = event.target.closest('[data-node-id]');
    if (
      !nodeTarget ||
      event.target.closest('[data-edge-id]') ||
      event.target.closest('[data-collapse-toggle]')
    ) {
      return;
    }
    const nodeId = nodeTarget.getAttribute('data-node-id');
    if (this.startTextEdit(nodeId)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleClick(event) {
    if (this.readonly || event.detail < 2) return;
    const nodeTarget = event.target.closest('[data-node-id]');
    if (
      !nodeTarget ||
      event.target.closest('[data-port]') ||
      event.target.closest('[data-resize-handle]') ||
      event.target.closest('[data-collapse-toggle]')
    )
      return;
    if (this.startTextEdit(nodeTarget.getAttribute('data-node-id'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handlePointerDown(event) {
    if (this.destroyed || (event.button != null && event.button !== 0)) return;

    if (this.textEditor && !event.target.closest('.vd-flowchart-text-editor')) {
      this.stopTextEdit({ commit: true });
    }

    this.canvasEl.focus();
    const collapseTarget = event.target.closest('[data-collapse-toggle]');
    if (collapseTarget) {
      this.lastNodePointer = null;
      this.toggleCollapsed(collapseTarget.getAttribute('data-collapse-toggle'));
      event.preventDefault();
      return;
    }
    const nodeTarget = event.target.closest('[data-node-id]');
    const portTarget = event.target.closest('[data-port]');
    const resizeTarget = event.target.closest('[data-resize-handle]');
    const edgeTarget = event.target.closest('[data-edge-id]');
    const endpointTarget = event.target.closest('[data-edge-endpoint]');

    if (endpointTarget && !this.readonly) {
      const edgeId = endpointTarget.getAttribute('data-edge-id');
      const endpoint = endpointTarget.getAttribute('data-edge-endpoint');
      const edge = this.findEdge(edgeId);
      if (!edge || (endpoint !== 'from' && endpoint !== 'to')) return;

      const fromNode = this.findNode(edge.from.nodeId);
      const toNode = this.findNode(edge.to.nodeId);
      if (!fromNode || !toNode) return;

      this.reconnectEdgeId = edgeId;
      this.select({ kind: 'edge', id: edgeId });
      this.interaction = {
        kind: 'reconnect',
        pointerId: event.pointerId,
        edgeId,
        endpoint,
        target: null,
        previousSnap: null,
        fromPoint: getPortPosition(fromNode, edge.from.port),
        toPoint: getPortPosition(toNode, edge.to.port),
        fromPort: edge.from.port,
        toPort: edge.to.port,
        route: edge.route,
        strokeWidth: edge.strokeWidth,
      };
      this.capturePointer(event.pointerId);
      this.syncConnectingState();
      this.render({ inspector: false, json: false });
      event.preventDefault();
      return;
    }

    if (nodeTarget && !portTarget && !resizeTarget && !edgeTarget && event.shiftKey) {
      this.reconnectEdgeId = null;
      this.lastNodePointer = null;
      this.toggleNodeSelection(nodeTarget.getAttribute('data-node-id'));
      event.preventDefault();
      return;
    }

    if (nodeTarget && !portTarget && !resizeTarget && !edgeTarget && !this.readonly) {
      if (this.activeTool === 'arrow') {
        this.select({ kind: 'node', id: nodeTarget.getAttribute('data-node-id') });
        event.preventDefault();
        return;
      }
      const nodeId = nodeTarget.getAttribute('data-node-id');
      const now = Date.now();
      const repeatedNodeClick =
        this.lastNodePointer &&
        this.lastNodePointer.nodeId === nodeId &&
        now - this.lastNodePointer.time <= 420;
      this.lastNodePointer = { nodeId, time: now };
      if ((event.detail >= 2 || repeatedNodeClick) && this.startTextEdit(nodeId)) {
        event.preventDefault();
        return;
      }
    } else {
      this.lastNodePointer = null;
    }

    if (portTarget && !this.readonly) {
      const nodeId = portTarget.getAttribute('data-node-id');
      const port = portTarget.getAttribute('data-port');
      const node = this.findNode(nodeId);
      if (!node) return;

      const sourcePoint = getPortPosition(node, port);
      this.interaction = {
        kind: 'connect',
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
        source: { nodeId, port },
        target: null,
        previousSnap: null,
        fromPoint: sourcePoint,
        toPoint: sourcePoint,
        fromPort: port,
        toPort: 'left',
        route: DEFAULT_EDGE_ROUTE,
        strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
      };
      this.select({ kind: 'node', id: nodeId });
      this.capturePointer(event.pointerId);
      this.syncConnectingState();
      this.render({ inspector: false, json: false });
      event.preventDefault();
      return;
    }

    if (resizeTarget && !this.readonly) {
      const nodeId = resizeTarget.getAttribute('data-node-id');
      const handle = resizeTarget.getAttribute('data-resize-handle');
      const node = this.findNode(nodeId);
      if (!node || !RESIZE_HANDLES.includes(handle)) return;

      this.select({ kind: 'node', id: nodeId });
      this.interaction = {
        kind: 'resize-node',
        pointerId: event.pointerId,
        nodeId,
        handle,
        startWorld: this.clientToWorld(event.clientX, event.clientY),
        original: deepClone(node),
        moved: false,
      };
      this.capturePointer(event.pointerId);
      event.preventDefault();
      return;
    }

    if (edgeTarget) {
      const edgeId = edgeTarget.getAttribute('data-edge-id');
      if (!this.readonly) {
        this.reconnectEdgeId = edgeId;
      } else if (this.reconnectEdgeId && this.reconnectEdgeId !== edgeId) {
        this.reconnectEdgeId = null;
      }
      this.select({ kind: 'edge', id: edgeId });
      event.preventDefault();
      return;
    }

    if (nodeTarget) {
      this.reconnectEdgeId = null;
      const nodeId = nodeTarget.getAttribute('data-node-id');
      // Pressing a node that is part of a group keeps the group and drags it.
      const groupIds =
        this.hasMultiSelection() && this.isNodeSelected(nodeId)
          ? this.getSelectedNodeIds()
          : [nodeId];
      if (groupIds.length > 1) this.selectNodes(groupIds, { primary: nodeId });
      else this.select({ kind: 'node', id: nodeId });

      if (!this.readonly) {
        this.interaction = this.createDragInteraction(event, nodeId, groupIds);
        this.capturePointer(event.pointerId);
      }

      return;
    }

    if (event.shiftKey) {
      const startWorld = this.clientToWorld(event.clientX, event.clientY);
      this.interaction = {
        kind: 'marquee',
        pointerId: event.pointerId,
        startWorld,
        baseIds: this.selection?.kind === 'node' ? this.getSelectedNodeIds() : [],
      };
      this.capturePointer(event.pointerId);
      event.preventDefault();
      return;
    }

    this.select(null);
    this.reconnectEdgeId = null;
    this.interaction = {
      kind: 'pan',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewportX: this.documentData.viewport.x,
      startViewportY: this.documentData.viewport.y,
      moved: false,
    };
    this.capturePointer(event.pointerId);
    event.preventDefault();
  }

  createDragInteraction(event, nodeId, nodeIds) {
    const nodes = nodeIds.map((id) => this.findNode(id)).filter(Boolean);
    const moving = new Set(nodes.map((node) => node.id));
    return {
      kind: 'drag-node',
      pointerId: event.pointerId,
      nodeId,
      nodeIds: nodes.map((node) => node.id),
      startWorld: this.clientToWorld(event.clientX, event.clientY),
      origins: new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
      bounds: getBounds(nodes),
      guideLines: this.snapGuides
        ? collectGuideLines(this.getVisibleNodes().filter((node) => !moving.has(node.id)))
        : null,
      snapDisabled: false,
      moved: false,
    };
  }

  // Translate every dragged node by the pointer delta, snapping the group's
  // bounds to the nearest alignment guide on each axis. Alt turns snapping
  // off for the rest of the gesture.
  moveDraggedNodes(event) {
    const interaction = this.interaction;
    const world = this.clientToWorld(event.clientX, event.clientY);
    let dx = world.x - interaction.startWorld.x;
    let dy = world.y - interaction.startWorld.y;
    if (event.altKey) interaction.snapDisabled = true;

    let guides = [];
    if (interaction.guideLines && !interaction.snapDisabled) {
      const box = interaction.bounds;
      const threshold = GUIDE_SNAP_DISTANCE / this.documentData.viewport.scale;
      const left = box.left + dx;
      const top = box.top + dy;
      const width = box.right - box.left;
      const height = box.bottom - box.top;
      const snapX = snapToGuides(
        interaction.guideLines.x,
        [left, left + width / 2, left + width],
        threshold,
      );
      const snapY = snapToGuides(
        interaction.guideLines.y,
        [top, top + height / 2, top + height],
        threshold,
      );
      if (snapX) dx += snapX.offset;
      if (snapY) dy += snapY.offset;
      const snapped = { left: box.left + dx, top: box.top + dy, width, height };
      if (snapX) guides = guides.concat(guideSegments('x', snapX.lines, snapped));
      if (snapY) guides = guides.concat(guideSegments('y', snapY.lines, snapped));
    }

    let changed = false;
    interaction.nodeIds.forEach((id) => {
      const node = this.findNode(id);
      const origin = interaction.origins.get(id);
      if (!node || !origin) return;
      const nextX = formatNumber(origin.x + dx);
      const nextY = formatNumber(origin.y + dy);
      if (nextX === node.x && nextY === node.y) return;
      node.x = nextX;
      node.y = nextY;
      changed = true;
      this.renderDraggedNode(node);
    });
    if (changed) interaction.moved = true;
    this.renderGuides(guides);
  }

  // Live marquee: select every visible node the box touches, added to the
  // selection the gesture started from.
  updateMarquee(event) {
    const interaction = this.interaction;
    const world = this.clientToWorld(event.clientX, event.clientY);
    const box = {
      left: Math.min(interaction.startWorld.x, world.x),
      top: Math.min(interaction.startWorld.y, world.y),
      right: Math.max(interaction.startWorld.x, world.x),
      bottom: Math.max(interaction.startWorld.y, world.y),
    };
    clearChildren(this.guidesLayer);
    this.guidesLayer.appendChild(
      svgEl('rect', {
        class: 'vd-flowchart-marquee',
        x: formatNumber(box.left),
        y: formatNumber(box.top),
        width: formatNumber(box.right - box.left),
        height: formatNumber(box.bottom - box.top),
      }),
    );
    const hits = this.getVisibleNodes()
      .filter(
        (node) =>
          node.x <= box.right &&
          node.x + node.width >= box.left &&
          node.y <= box.bottom &&
          node.y + node.height >= box.top,
      )
      .map((node) => node.id);
    const ids = [...new Set([...interaction.baseIds, ...hits])];
    const key = ids.join(',');
    if (key === interaction.lastKey) return;
    interaction.lastKey = key;
    this.selectNodes(ids, { primary: hits[hits.length - 1] });
  }

  renderGuides(guides) {
    clearChildren(this.guidesLayer);
    guides.forEach((guide) => {
      this.guidesLayer.appendChild(
        svgEl('line', {
          class: 'vd-flowchart-guide',
          x1: guide.x1,
          y1: guide.y1,
          x2: guide.x2,
          y2: guide.y2,
        }),
      );
    });
  }

  handlePointerMove(event) {
    if (!this.interaction || this.interaction.pointerId !== event.pointerId) return;

    if (this.interaction.kind === 'drag-node') {
      this.moveDraggedNodes(event);
      return;
    }

    if (this.interaction.kind === 'marquee') {
      this.updateMarquee(event);
      return;
    }

    if (this.interaction.kind === 'resize-node') {
      const node = this.findNode(this.interaction.nodeId);
      if (!node) return;
      const world = this.clientToWorld(event.clientX, event.clientY);
      const deltaX = world.x - this.interaction.startWorld.x;
      const deltaY = world.y - this.interaction.startWorld.y;
      const next = this.getResizedNodeBounds(
        this.interaction.original,
        this.interaction.handle,
        deltaX,
        deltaY,
      );

      if (
        next.x !== node.x ||
        next.y !== node.y ||
        next.width !== node.width ||
        next.height !== node.height
      ) {
        node.x = next.x;
        node.y = next.y;
        node.width = next.width;
        node.height = next.height;
        this.interaction.moved = true;
        this.render({ inspector: false, json: false });
      }
      return;
    }

    if (this.interaction.kind === 'pan') {
      const deltaX = event.clientX - this.interaction.startClientX;
      const deltaY = event.clientY - this.interaction.startClientY;
      this.documentData.viewport.x = formatNumber(this.interaction.startViewportX + deltaX);
      this.documentData.viewport.y = formatNumber(this.interaction.startViewportY + deltaY);
      this.interaction.moved = true;
      this.render({ inspector: false, json: false });
      return;
    }

    if (this.interaction.kind === 'connect') {
      if (!this.interaction.moved) {
        const travel = Math.hypot(
          event.clientX - this.interaction.startClientX,
          event.clientY - this.interaction.startClientY,
        );
        if (!(travel > PORT_CLICK_SLOP)) return;
        this.interaction.moved = true;
      }
      const world = this.clientToWorld(event.clientX, event.clientY);
      const snapTarget = this.findConnectionTarget(
        world,
        this.interaction.source.nodeId,
        this.interaction.previousSnap,
        this.interaction.fromPoint,
      );
      if (snapTarget) {
        this.interaction.target = { nodeId: snapTarget.node.id, port: snapTarget.port };
        this.interaction.toPoint = snapTarget.point;
        this.interaction.toPort = snapTarget.port;
        this.interaction.previousSnap = { nodeId: snapTarget.node.id, port: snapTarget.port };
        this.render({ inspector: false, json: false });
        return;
      }

      this.interaction.target = null;
      this.interaction.toPoint = world;
      this.interaction.toPort = this.interaction.toPort || 'left';
      this.interaction.previousSnap = null;
      this.render({ inspector: false, json: false });
      return;
    }

    if (this.interaction.kind === 'reconnect') {
      const edge = this.findEdge(this.interaction.edgeId);
      if (!edge) return;

      const world = this.clientToWorld(event.clientX, event.clientY);
      const snapTarget = this.findConnectionTarget(
        world,
        null,
        this.interaction.previousSnap,
        this.interaction.endpoint === 'from'
          ? this.interaction.toPoint
          : this.interaction.fromPoint,
      );

      if (this.interaction.endpoint === 'from') {
        const toNode = this.findNode(edge.to.nodeId);
        if (!toNode) return;
        this.interaction.toPoint = getPortPosition(toNode, edge.to.port);
        this.interaction.toPort = edge.to.port;
        if (snapTarget) {
          this.interaction.target = { nodeId: snapTarget.node.id, port: snapTarget.port };
          this.interaction.fromPoint = snapTarget.point;
          this.interaction.fromPort = snapTarget.port;
          this.interaction.previousSnap = { nodeId: snapTarget.node.id, port: snapTarget.port };
        } else {
          this.interaction.target = null;
          this.interaction.fromPoint = world;
          this.interaction.fromPort = this.interaction.fromPort || edge.from.port;
          this.interaction.previousSnap = null;
        }
      } else {
        const fromNode = this.findNode(edge.from.nodeId);
        if (!fromNode) return;
        this.interaction.fromPoint = getPortPosition(fromNode, edge.from.port);
        this.interaction.fromPort = edge.from.port;
        if (snapTarget) {
          this.interaction.target = { nodeId: snapTarget.node.id, port: snapTarget.port };
          this.interaction.toPoint = snapTarget.point;
          this.interaction.toPort = snapTarget.port;
          this.interaction.previousSnap = { nodeId: snapTarget.node.id, port: snapTarget.port };
        } else {
          this.interaction.target = null;
          this.interaction.toPoint = world;
          this.interaction.toPort = this.interaction.toPort || edge.to.port;
          this.interaction.previousSnap = null;
        }
      }

      this.render({ inspector: false, json: false });
    }
  }

  handlePointerUp(event) {
    if (
      !this.interaction ||
      (event.pointerId != null && this.interaction.pointerId !== event.pointerId)
    ) {
      return;
    }

    const interaction = this.interaction;
    this.interaction = null;
    this.releasePointerCapture(interaction.pointerId);
    this.syncConnectingState();

    if (interaction.kind === 'resize-node') {
      if (interaction.moved) {
        const node = this.findNode(interaction.nodeId);
        this.render({ inspector: true, json: true });
        this.emitChange('node:resize', { node: deepClone(node) });
      } else {
        this.render({ inspector: false, json: false });
      }
      return;
    }

    if (interaction.kind === 'marquee') {
      clearChildren(this.guidesLayer);
      return;
    }

    if (interaction.kind === 'drag-node') {
      clearChildren(this.guidesLayer);
      if (interaction.moved) {
        this.render({ inspector: true, json: true });
        if (interaction.nodeIds.length > 1) {
          this.emitChange('nodes:move', { nodeIds: [...interaction.nodeIds] });
        } else {
          this.emitChange('node:move', { node: deepClone(this.findNode(interaction.nodeId)) });
        }
      } else {
        this.render({ inspector: false, json: false });
      }
      return;
    }

    if (interaction.kind === 'pan') {
      if (interaction.moved) {
        this.render({ inspector: false, json: true });
        this.emitViewportChange('viewport:pan');
      } else {
        this.render({ inspector: false, json: false });
      }
      return;
    }

    if (interaction.kind === 'connect') {
      if (!interaction.moved && this.activeTool !== 'arrow') {
        this.render({ inspector: false, json: false });
        this.insertBranchNode(interaction.source.nodeId, {
          direction: PORT_DIRECTIONS[interaction.source.port],
          edit: true,
        });
        return;
      }
      const world = this.clientToWorld(event.clientX || 0, event.clientY || 0);
      const snapTarget = interaction.target
        ? { node: this.findNode(interaction.target.nodeId), port: interaction.target.port }
        : this.findConnectionTarget(
            world,
            interaction.source.nodeId,
            interaction.previousSnap,
            interaction.fromPoint,
          );
      if (snapTarget && snapTarget.node) {
        const edge = this.addEdge({
          from: interaction.source,
          to: {
            nodeId: snapTarget.node.id,
            port: snapTarget.port,
          },
          strokeWidth: interaction.strokeWidth,
          endMarker: 'arrow',
        });
        if (edge) {
          if (this.activeTool === 'arrow') this.setActiveTool(null);
          this.syncConnectingState();
          return;
        }
      }

      if (this.activeTool === 'arrow') this.setActiveTool(null);
      this.syncConnectingState();
      this.render({ inspector: false, json: false });
      return;
    }

    if (interaction.kind === 'reconnect') {
      const edge = this.findEdge(interaction.edgeId);
      if (edge && interaction.target) {
        const patch =
          interaction.endpoint === 'from'
            ? { from: { nodeId: interaction.target.nodeId, port: interaction.target.port } }
            : { to: { nodeId: interaction.target.nodeId, port: interaction.target.port } };
        const nextFrom = patch.from || edge.from;
        const nextTo = patch.to || edge.to;
        if (!(nextFrom.nodeId === nextTo.nodeId && nextFrom.port === nextTo.port)) {
          this.updateEdge(interaction.edgeId, patch, { inspector: true, reason: 'edge:reconnect' });
        } else {
          this.render({ inspector: false, json: false });
        }
      } else {
        this.render({ inspector: false, json: false });
      }
      this.reconnectEdgeId = interaction.edgeId;
      this.syncConnectingState();
      return;
    }
  }

  handleWheel(event) {
    event.preventDefault();
    const local = this.clientToLocal(event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 1 / 1.12 : 1.12;
    this.scaleAround(factor, local.x, local.y, 'viewport:zoom');
  }

  capturePointer(pointerId) {
    if (typeof this.canvasEl.setPointerCapture !== 'function') return;
    try {
      this.canvasEl.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }

  releasePointerCapture(pointerId) {
    if (typeof this.canvasEl.releasePointerCapture !== 'function') return;
    try {
      this.canvasEl.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }

  syncConnectingState() {
    const connecting =
      this.interaction?.kind === 'connect' || this.interaction?.kind === 'reconnect';
    this.canvasEl.classList.toggle('is-connecting', connecting);
  }

  shouldShowNodePorts(node) {
    if (this.readonly) return false;
    if (this.interaction?.kind === 'connect' || this.interaction?.kind === 'reconnect') return true;
    if (this.activeTool === 'arrow') return true;
    return (
      this.selection?.kind === 'node' && this.selection.id === node.id && !this.hasMultiSelection()
    );
  }

  getMarkerId(markerType, position, strokeWidth) {
    const width = normalizeEdgeStrokeWidth(strokeWidth);
    const key = `${markerType}:${position}:${width}`;
    if (this.markerIds.has(key)) {
      return this.markerIds.get(key);
    }

    const markerId = nextId(`flowchart-${markerType}-${position}`);
    const marker =
      markerType === 'dot'
        ? createDotMarker(markerId, width)
        : createArrowMarker(markerId, width, position === 'start');
    this.markerDefs.appendChild(marker);
    this.markerIds.set(key, markerId);
    return markerId;
  }

  getEdgeStrokeWidth(edge) {
    return normalizeEdgeStrokeWidth(edge?.strokeWidth);
  }

  getEdgeHitStrokeWidth(edge) {
    return formatNumber(Math.max(EDGE_HIT_STROKE_MIN, this.getEdgeStrokeWidth(edge) + 12));
  }

  findConnectionTarget(worldPoint, excludeNodeId, previousSnap = null, referencePoint = null) {
    const snapPadding = CONNECTION_SNAP_PADDING / this.documentData.viewport.scale;
    const hysteresisMargin = CONNECTION_HYSTERESIS / this.documentData.viewport.scale;

    const best = this.getVisibleNodes().reduce((candidate, node) => {
      if (node.id === excludeNodeId) return candidate;
      const distanceToBounds = getDistanceToNodeBounds(node, worldPoint);
      if (distanceToBounds > snapPadding) return candidate;
      const nearest = pickPortForNode(node, worldPoint, referencePoint);
      if (!nearest) return candidate;
      const score = distanceToBounds * 1000 + nearest.distance;
      if (!candidate || score < candidate.score) {
        return {
          node,
          port: nearest.port,
          point: nearest.point,
          score,
        };
      }
      return candidate;
    }, null);

    if (!previousSnap || !best) return best;

    const previousNode = this.findNode(previousSnap.nodeId);
    if (!previousNode || previousNode.id === excludeNodeId) return best;

    const distanceToBounds = getDistanceToNodeBounds(previousNode, worldPoint);
    if (distanceToBounds > snapPadding) return best;

    if (best.node.id === previousSnap.nodeId && best.port === previousSnap.port) {
      return best;
    }

    const previousPoint = getPortPosition(previousNode, previousSnap.port);
    const previousScore =
      distanceToBounds * 1000 +
      Math.hypot(worldPoint.x - previousPoint.x, worldPoint.y - previousPoint.y);
    if (best.score + hysteresisMargin >= previousScore) {
      return {
        node: previousNode,
        port: previousSnap.port,
        point: previousPoint,
        score: previousScore,
      };
    }

    return best;
  }

  getResizedNodeBounds(original, handle, deltaX, deltaY) {
    const nextType = original.type;
    if (!isNodeResizable(nextType)) {
      return {
        x: formatNumber(original.x),
        y: formatNumber(original.y),
        width: formatNumber(original.width),
        height: formatNumber(original.height),
      };
    }

    let x = original.x;
    let y = original.y;
    let width = original.width;
    let height = original.height;

    if (handle.includes('e')) {
      width = clampNodeWidth(nextType, original.width + deltaX, original.width);
    }
    if (handle.includes('s')) {
      height = clampNodeHeight(nextType, original.height + deltaY, original.height);
    }
    if (handle.includes('w')) {
      width = clampNodeWidth(nextType, original.width - deltaX, original.width);
      x = original.x + original.width - width;
    }
    if (handle.includes('n')) {
      height = clampNodeHeight(nextType, original.height - deltaY, original.height);
      y = original.y + original.height - height;
    }

    return {
      x: formatNumber(x),
      y: formatNumber(y),
      width: formatNumber(width),
      height: formatNumber(height),
    };
  }

  clientToLocal(clientX, clientY) {
    const rect = this.canvasEl.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  localToWorld(localX, localY) {
    const viewport = this.documentData.viewport;
    return {
      x: (localX - viewport.x) / viewport.scale,
      y: (localY - viewport.y) / viewport.scale,
    };
  }

  clientToWorld(clientX, clientY) {
    const local = this.clientToLocal(clientX, clientY);
    return this.localToWorld(local.x, local.y);
  }

  getViewportCenter() {
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    return this.localToWorld(width / 2, height / 2);
  }

  scaleAround(factor, localX, localY, reason) {
    const viewport = this.documentData.viewport;
    const anchor = this.localToWorld(localX, localY);
    const nextScale = clamp(formatNumber(viewport.scale * factor), MIN_SCALE, MAX_SCALE);
    if (nextScale === viewport.scale) return;

    viewport.scale = nextScale;
    viewport.x = formatNumber(localX - anchor.x * nextScale);
    viewport.y = formatNumber(localY - anchor.y * nextScale);

    this.render({ inspector: false, json: true });
    this.emitViewportChange(reason);
  }

  updateToolbarLabel() {
    this.zoomLabel.textContent = `${Math.round(this.documentData.viewport.scale * 100)}%`;
  }

  // Options: `initialText` replaces the label with typed text (type-to-edit);
  // `inserted` marks a node created by a keyboard/handle insertion so naming it
  // shares the insertion's undo step.
  startTextEdit(nodeId, options = {}) {
    if (this.readonly) return false;
    const node = this.findNode(nodeId);
    if (!node || !isNodeTextEditable(node)) return false;

    if (this.textEditor?.nodeId === node.id) {
      this.positionTextEditor();
      this.textEditor.textarea.focus();
      this.textEditor.textarea.select();
      return true;
    }

    this.stopTextEdit({ commit: true });
    this.select({ kind: 'node', id: node.id });

    const replacing = typeof options.initialText === 'string';
    const textarea = createElement('textarea', {
      className: `vd-flowchart-text-editor vd-flowchart-text-editor--${node.type}`,
      value: replacing ? options.initialText : node.text,
      rows: 1,
    });
    textarea.setAttribute('data-node-id', node.id);
    textarea.setAttribute('aria-label', 'Edit node text');
    textarea.spellcheck = false;

    textarea.addEventListener('input', () => this.positionTextEditor());
    textarea.addEventListener('pointerdown', (event) => event.stopPropagation());
    textarea.addEventListener('dblclick', (event) => event.stopPropagation());
    textarea.addEventListener('keydown', (event) => this.handleTextEditorKeyDown(event, node));
    textarea.addEventListener('blur', () => {
      if (this.textEditor?.textarea === textarea) {
        this.stopTextEdit({ commit: true });
      }
    });

    this.textEditor = {
      nodeId: node.id,
      previousText: node.text,
      inserted: Boolean(options.inserted),
      textarea,
    };
    this.canvasEl.appendChild(textarea);
    this.render({ inspector: true, json: false });

    const focusEditor = () => {
      if (this.textEditor?.textarea !== textarea) return;
      textarea.focus();
      if (replacing) {
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      } else {
        textarea.select();
      }
    };
    // Typed characters must land in the editor, so focus it synchronously;
    // the frame callback only restores focus if the browser moved it, so it
    // never re-selects text the user has already started typing.
    focusEditor();
    window.requestAnimationFrame(() => {
      if (document.activeElement !== textarea) focusEditor();
    });

    return true;
  }

  // Inline label editor for a connection, placed on the label anchor
  // (curve midpoint). Labels render on one line, so Enter always saves.
  startEdgeLabelEdit(edgeId, options = {}) {
    if (this.readonly) return false;
    const edge = this.findEdge(sanitizeId(edgeId));
    if (!edge) return false;
    this.stopTextEdit({ commit: true });
    this.select({ kind: 'edge', id: edge.id });

    const replacing = typeof options.initialText === 'string';
    const textarea = createElement('textarea', {
      className: 'vd-flowchart-text-editor vd-flowchart-text-editor--edge',
      value: replacing ? options.initialText : edge.label,
      rows: 1,
    });
    textarea.setAttribute('data-edge-id', edge.id);
    textarea.setAttribute('aria-label', 'Edit connection label');
    textarea.spellcheck = false;
    textarea.addEventListener('input', () => this.positionTextEditor());
    textarea.addEventListener('pointerdown', (event) => event.stopPropagation());
    textarea.addEventListener('dblclick', (event) => event.stopPropagation());
    textarea.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        this.stopTextEdit({ commit: event.key === 'Enter' });
        this.canvasEl.focus();
      }
    });
    textarea.addEventListener('blur', () => {
      if (this.textEditor?.textarea === textarea) this.stopTextEdit({ commit: true });
    });

    this.textEditor = { nodeId: null, edgeId: edge.id, previousText: edge.label, textarea };
    this.canvasEl.appendChild(textarea);
    this.render({ inspector: true, json: false });

    const focusEditor = () => {
      if (this.textEditor?.textarea !== textarea) return;
      textarea.focus();
      if (replacing) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      else textarea.select();
    };
    focusEditor();
    window.requestAnimationFrame(() => {
      if (document.activeElement !== textarea) focusEditor();
    });
    return true;
  }

  handleTextEditorKeyDown(event, node) {
    if (event.isComposing) return;
    const mindmap = this.keyboardShortcuts === 'mindmap';
    if (event.key === 'Escape') {
      event.preventDefault();
      this.stopTextEdit({ commit: false });
      this.canvasEl.focus();
      return;
    }
    if (event.key === 'Enter') {
      const modKey = event.ctrlKey || event.metaKey;
      const commits = modKey || (mindmap && node.type !== 'textbox' && !event.shiftKey);
      if (!commits) return;
      event.preventDefault();
      this.stopTextEdit({ commit: true });
      this.canvasEl.focus();
      return;
    }
    if (event.key === 'Tab' && mindmap && !event.shiftKey && !event.altKey && !event.ctrlKey) {
      event.preventDefault();
      this.stopTextEdit({ commit: true });
      this.canvasEl.focus();
      this.insertBranchNode(node.id, { edit: true });
    }
  }

  stopTextEdit(options = {}) {
    if (!this.textEditor) return false;
    const commit = options.commit !== false;
    const editor = this.textEditor;
    const nextText = editor.textarea.value;
    this.textEditor = null;
    editor.textarea.remove();

    if (editor.edgeId) {
      const label = nextText.replace(/\s*\n\s*/g, ' ').trim();
      if (commit && !this.readonly && label !== editor.previousText) {
        this.updateEdge(editor.edgeId, { label }, { inspector: true, reason: 'edge:update' });
      } else {
        this.render({ scene: true, inspector: false, json: false });
      }
      return true;
    }

    if (commit && !this.readonly && nextText !== editor.previousText) {
      this.coalesceInsertedText = editor.inserted;
      try {
        this.updateNode(
          editor.nodeId,
          { text: nextText },
          { inspector: true, reason: 'node:update' },
        );
      } finally {
        this.coalesceInsertedText = false;
      }
    } else {
      this.render({ scene: true, inspector: false, json: false });
    }

    return true;
  }

  positionTextEditor() {
    if (!this.textEditor) return;
    if (this.textEditor.edgeId) {
      this.positionEdgeLabelEditor();
      return;
    }
    const node = this.findNode(this.textEditor.nodeId);
    if (!node) {
      this.stopTextEdit({ commit: false });
      return;
    }

    const viewport = this.documentData.viewport;
    const scale = viewport.scale;
    const textarea = this.textEditor.textarea;
    const width = node.width * scale;
    const height = node.height * scale;
    const metrics = getNodeFontMetrics(node);
    const lineHeight = metrics.lineHeight * scale;
    const lineCount = Math.max(1, textarea.value.split(/\r?\n/).length);
    const horizontalPadding = (node.type === 'textbox' ? 16 : 12) * scale;
    const verticalPadding =
      node.type === 'textbox' ? 12 * scale : Math.max(4, (height - lineCount * lineHeight) / 2);

    textarea.style.left = `${formatNumber(viewport.x + node.x * scale)}px`;
    textarea.style.top = `${formatNumber(viewport.y + node.y * scale)}px`;
    textarea.style.width = `${formatNumber(width)}px`;
    textarea.style.height = `${formatNumber(height)}px`;
    textarea.style.fontSize = `${formatNumber(metrics.fontSize * scale)}px`;
    textarea.style.lineHeight = `${formatNumber(lineHeight)}px`;
    textarea.style.padding = `${formatNumber(verticalPadding)}px ${formatNumber(horizontalPadding)}px`;
  }

  positionEdgeLabelEditor() {
    const edge = this.findEdge(this.textEditor.edgeId);
    const fromNode = edge && this.findNode(edge.from.nodeId);
    const toNode = edge && this.findNode(edge.to.nodeId);
    if (!edge || !fromNode || !toNode) {
      this.stopTextEdit({ commit: false });
      return;
    }
    const { labelX, labelY } = buildEdgePath(edge, fromNode, toNode);
    const viewport = this.documentData.viewport;
    const textarea = this.textEditor.textarea;
    const fontSize = Math.max(11, 13 * viewport.scale);
    const width = clamp(textarea.value.length * fontSize * 0.62 + 28, 96, 280);
    const height = fontSize * 1.4 + 12;
    textarea.style.left = `${formatNumber(viewport.x + labelX * viewport.scale - width / 2)}px`;
    textarea.style.top = `${formatNumber(viewport.y + (labelY - 8) * viewport.scale - height / 2)}px`;
    textarea.style.width = `${formatNumber(width)}px`;
    textarea.style.height = `${formatNumber(height)}px`;
    textarea.style.fontSize = `${formatNumber(fontSize)}px`;
    textarea.style.lineHeight = `${formatNumber(fontSize * 1.4)}px`;
    textarea.style.padding = '6px 10px';
  }

  render(options = {}) {
    if (this.destroyed) return;

    const shouldRenderScene = options.scene !== false;
    const shouldRenderInspector = options.inspector !== false;
    const shouldRenderJson = options.json !== false;

    if (shouldRenderScene) this.renderScene();
    if (shouldRenderInspector) this.renderSelectionPanel();
    if (shouldRenderJson) this.syncJsonTextarea();
    if (shouldRenderInspector) this.renderGraphOutline();
    this.updateToolbarLabel();
    this.updatePaletteState();
    this.positionTextEditor();
    this.scheduleMinimap();
  }

  renderScene() {
    this.syncSelectedNodeIds();
    const viewport = this.documentData.viewport;
    this.world.setAttribute(
      'transform',
      `matrix(${viewport.scale} 0 0 ${viewport.scale} ${viewport.x} ${viewport.y})`,
    );

    clearChildren(this.edgesLayer);
    clearChildren(this.previewLayer);
    clearChildren(this.nodesLayer);
    clearChildren(this.overlayLayer);

    const hidden = this.getHiddenNodeIds();
    this.sceneHidden = hidden;
    this.sceneOutgoing = this.getOutgoingMap();
    const nodeMap = new Map(
      this.documentData.nodes.filter((node) => !hidden.has(node.id)).map((node) => [node.id, node]),
    );
    this.sceneNodeMap = nodeMap;
    this.nodeElements = new Map();
    this.edgeElements = new Map();
    this.incidentEdges = new Map();

    this.documentData.edges.forEach((edge) => {
      const edgeElement = this.renderEdge(edge, nodeMap);
      if (edgeElement) {
        this.edgesLayer.appendChild(edgeElement);
        this.edgeElements.set(edge.id, edgeElement);
        for (const id of new Set([edge.from.nodeId, edge.to.nodeId])) {
          if (!this.incidentEdges.has(id)) this.incidentEdges.set(id, []);
          this.incidentEdges.get(id).push(edge);
        }
      }
    });

    if (this.interaction?.kind === 'connect' || this.interaction?.kind === 'reconnect') {
      this.previewLayer.appendChild(this.renderPreviewEdge(this.interaction));
    }

    this.documentData.nodes.forEach((node) => {
      if (hidden.has(node.id)) return;
      const element = this.renderNode(node);
      this.nodesLayer.appendChild(element);
      this.nodeElements.set(node.id, element);
    });

    if (this.reconnectEdgeId && !this.readonly) {
      const reconnectEdge = this.findEdge(this.reconnectEdgeId);
      if (reconnectEdge) {
        const fromNode = nodeMap.get(reconnectEdge.from.nodeId);
        const toNode = nodeMap.get(reconnectEdge.to.nodeId);
        if (fromNode && toNode) {
          this.overlayLayer.appendChild(
            this.renderReconnectEndpoints(reconnectEdge, fromNode, toNode),
          );
        }
      }
    }

    this.syncConnectingState();
  }

  // Drag frames change one translation and its connected paths. Keep unrelated
  // SVG elements intact; the release event still refreshes inspector/history.
  renderDraggedNode(node) {
    const element = this.nodeElements?.get(node.id);
    if (!element) {
      this.render({ inspector: false, json: false });
      return;
    }
    element.setAttribute('transform', `translate(${formatNumber(node.x)} ${formatNumber(node.y)})`);
    element.classList.add('is-dragging');
    for (const edge of this.incidentEdges.get(node.id) || []) {
      const previous = this.edgeElements.get(edge.id);
      const next = this.renderEdge(edge, this.sceneNodeMap);
      if (previous && next) {
        previous.replaceWith(next);
        this.edgeElements.set(edge.id, next);
      }
    }
  }

  applyEdgeMarkers(pathElement, edge) {
    if (edge.startMarker && edge.startMarker !== 'none') {
      pathElement.setAttribute(
        'marker-start',
        `url(#${this.getMarkerId(edge.startMarker, 'start', this.getEdgeStrokeWidth(edge))})`,
      );
    }
    if (edge.endMarker && edge.endMarker !== 'none') {
      pathElement.setAttribute(
        'marker-end',
        `url(#${this.getMarkerId(edge.endMarker, 'end', this.getEdgeStrokeWidth(edge))})`,
      );
    }
  }

  renderEdge(edge, nodeMap) {
    const fromNode = nodeMap.get(edge.from.nodeId);
    const toNode = nodeMap.get(edge.to.nodeId);
    if (!fromNode || !toNode) return null;

    const edgePath = buildEdgePath(edge, fromNode, toNode);
    const selected = this.selection?.kind === 'edge' && this.selection.id === edge.id;
    const inReconnectMode = this.reconnectEdgeId === edge.id;

    const group = svgEl('g', {
      class: `vd-flowchart-edge${selected ? ' is-selected' : ''}${inReconnectMode ? ' is-reconnecting' : ''}`,
      'data-edge-id': edge.id,
    });
    const strokeWidth = this.getEdgeStrokeWidth(edge);

    if (selected) {
      group.appendChild(
        svgEl('path', {
          class: 'vd-flowchart-edge-selection',
          d: edgePath.d,
          'stroke-width': formatNumber(strokeWidth + 7),
        }),
      );
    }

    const visiblePath = svgEl('path', {
      class: 'vd-flowchart-edge-path',
      d: edgePath.d,
      'stroke-width': strokeWidth,
      'data-edge-id': edge.id,
    });
    this.applyEdgeMarkers(visiblePath, edge);

    const hitPath = svgEl('path', {
      class: 'vd-flowchart-edge-hit',
      d: edgePath.d,
      'stroke-width': this.getEdgeHitStrokeWidth(edge),
      'data-edge-id': edge.id,
    });

    group.appendChild(visiblePath);
    group.appendChild(hitPath);

    if (edge.label && this.textEditor?.edgeId !== edge.id) {
      const label = svgEl('text', {
        class: 'vd-flowchart-edge-label',
        x: edgePath.labelX,
        y: edgePath.labelY - 8,
        'text-anchor': 'middle',
        'data-edge-id': edge.id,
      });
      label.textContent = edge.label;
      group.appendChild(label);
    }

    return group;
  }

  renderReconnectEndpoints(edge, fromNode, toNode) {
    const scale = this.documentData.viewport.scale || 1;
    const group = svgEl('g', { class: 'vd-flowchart-edge-endpoints' });
    [
      { endpoint: 'from', point: getPortPosition(fromNode, edge.from.port) },
      { endpoint: 'to', point: getPortPosition(toNode, edge.to.port) },
    ].forEach(({ endpoint, point }) => {
      group.appendChild(
        svgEl('circle', {
          class: 'vd-flowchart-edge-endpoint-hit',
          cx: point.x,
          cy: point.y,
          r: RECONNECT_ENDPOINT_HIT_RADIUS / scale,
          'data-edge-id': edge.id,
          'data-edge-endpoint': endpoint,
        }),
      );
      group.appendChild(
        svgEl('circle', {
          class: 'vd-flowchart-edge-endpoint',
          cx: point.x,
          cy: point.y,
          r: RECONNECT_ENDPOINT_RADIUS / scale,
          'data-edge-id': edge.id,
          'data-edge-endpoint': endpoint,
        }),
      );
    });
    return group;
  }

  renderPreviewEdge(interaction) {
    const fromPort = interaction.fromPort || interaction.source?.port || 'right';
    const toPort = interaction.toPort || interaction.target?.port || 'left';
    const edgePath = buildEdgePath({
      strokeWidth: interaction.strokeWidth,
      route: interaction.route,
      fromPoint: interaction.fromPoint,
      toPoint: interaction.toPoint,
      from: { port: fromPort },
      to: { port: toPort },
    });
    return svgEl('path', {
      class: 'vd-flowchart-preview-path',
      d: edgePath.d,
      'stroke-width': this.getEdgeStrokeWidth(interaction),
    });
  }

  renderNode(node) {
    const selected = this.isNodeSelected(node.id);
    // Frames and handles describe one node; a group shows only the outline.
    const soloSelected = selected && !this.hasMultiSelection();
    const dragging =
      this.interaction?.kind === 'drag-node' && this.interaction.nodeIds.includes(node.id);
    const resizing =
      this.interaction?.kind === 'resize-node' && this.interaction.nodeId === node.id;
    const editing = this.textEditor?.nodeId === node.id;
    const group = svgEl('g', {
      class: `vd-flowchart-node${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${resizing ? ' is-resizing' : ''}${editing ? ' is-editing' : ''}`,
      transform: `translate(${formatNumber(node.x)} ${formatNumber(node.y)})`,
      'data-node-id': node.id,
    });
    const portsVisible = this.shouldShowNodePorts(node);

    const hitbox = svgEl('rect', {
      x: 0,
      y: 0,
      width: node.width,
      height: node.height,
      rx:
        node.type === 'rounded-rect' || node.type === 'textbox'
          ? 16
          : node.type === 'junction'
            ? node.width / 2
            : 6,
      fill: 'transparent',
      'data-node-id': node.id,
    });
    group.appendChild(hitbox);
    group.appendChild(this.renderNodeShape(node));
    group.appendChild(this.renderNodeText(node));

    const scale = this.documentData.viewport.scale || 1;
    if (soloSelected && !this.readonly && SELECTION_BOX_TYPES.has(node.type)) {
      const outset = SELECTION_OUTSET / scale;
      group.appendChild(
        svgEl('rect', {
          class: 'vd-flowchart-selection-box',
          x: -outset,
          y: -outset,
          width: node.width + outset * 2,
          height: node.height + outset * 2,
        }),
      );
    }

    if (soloSelected && !this.readonly && isNodeResizable(node)) {
      group.appendChild(this.renderResizeControls(node));
    }

    const collapseToggle = this.renderCollapseToggle(node, soloSelected);
    if (this.readonly) {
      if (collapseToggle) group.appendChild(collapseToggle);
      return group;
    }

    FLOWCHART_PORTS.forEach((port) => {
      const position = getPortHandlePosition({ ...node, x: 0, y: 0 }, port, scale);
      const portGroup = svgEl('g', {
        class: `vd-flowchart-port-group${portsVisible ? ' is-visible' : ''}`,
        'data-node-id': node.id,
        'data-port': port,
      });
      portGroup.appendChild(
        svgEl('circle', {
          class: 'vd-flowchart-port-hit',
          cx: position.x,
          cy: position.y,
          r: CONNECTION_PORT_HIT_RADIUS / scale,
        }),
      );
      portGroup.appendChild(
        svgEl('circle', {
          class: 'vd-flowchart-port',
          cx: position.x,
          cy: position.y,
          r: CONNECTION_PORT_RADIUS / scale,
        }),
      );
      const arm = (CONNECTION_PORT_RADIUS - 2.5) / scale;
      portGroup.appendChild(
        svgEl('path', {
          class: 'vd-flowchart-port-plus',
          d: `M ${formatNumber(position.x - arm)} ${formatNumber(position.y)} H ${formatNumber(position.x + arm)} M ${formatNumber(position.x)} ${formatNumber(position.y - arm)} V ${formatNumber(position.y + arm)}`,
        }),
      );
      group.appendChild(portGroup);
    });
    if (collapseToggle) group.appendChild(collapseToggle);

    return group;
  }

  // "+N" on a collapsed node, or "−" on a single selected node with children,
  // placed beyond the connection handle on the side its branch leaves from.
  renderCollapseToggle(node, soloSelected) {
    const outgoing = this.sceneOutgoing || this.getOutgoingMap();
    const childIds = (outgoing.get(node.id) || []).filter((id) => id !== node.id);
    if (!childIds.length) return null;
    const count = node.collapsed
      ? this.countCollapsedDescendants(
          node.id,
          this.sceneHidden || this.getHiddenNodeIds(),
          outgoing,
        )
      : 0;
    if (!node.collapsed && !(soloSelected && !this.readonly)) return null;

    const sides = new Map();
    this.documentData.edges.forEach((edge) => {
      if (edge.from.nodeId !== node.id || edge.to.nodeId === node.id) return;
      sides.set(edge.from.port, (sides.get(edge.from.port) || 0) + 1);
    });
    const port =
      [...sides].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      DIRECTION_PORTS[this.getGrowthDirection(node)];
    const scale = this.documentData.viewport.scale || 1;
    const anchor = getPortPosition({ ...node, x: 0, y: 0 }, port);
    const normal = getPortNormal(port);
    const offset = COLLAPSE_TOGGLE_OFFSET / scale;
    const cx = formatNumber(anchor.x + normal.x * offset);
    const cy = formatNumber(anchor.y + normal.y * offset);
    const label = node.collapsed ? `+${count}` : '−';
    const radius = (node.collapsed && label.length > 2 ? 12 : 9) / scale;

    const group = svgEl('g', {
      class: `vd-flowchart-collapse-toggle${node.collapsed ? ' is-collapsed' : ''}`,
      'data-collapse-toggle': node.id,
    });
    const title = svgEl('title');
    title.textContent = node.collapsed ? `Expand ${count} hidden nodes` : 'Collapse branch';
    group.appendChild(title);
    group.appendChild(svgEl('circle', { cx, cy, r: formatNumber(radius) }));
    const text = svgEl('text', {
      x: cx,
      y: cy,
      'font-size': formatNumber(10 / scale),
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    text.textContent = label;
    group.appendChild(text);
    return group;
  }

  renderResizeControls(node) {
    const scale = this.documentData.viewport.scale || 1;
    const zone = 14 / scale;
    const cornerZone = 22 / scale;
    const handleSize = RESIZE_HANDLE_SIZE / scale;
    const gap = RESIZE_PORT_GAP / scale;
    const group = svgEl('g', { class: 'vd-flowchart-resize-controls' });

    const zones = {
      n: { x: 0, y: -zone / 2, width: node.width, height: zone },
      e: { x: node.width - zone / 2, y: 0, width: zone, height: node.height },
      s: { x: 0, y: node.height - zone / 2, width: node.width, height: zone },
      w: { x: -zone / 2, y: 0, width: zone, height: node.height },
      ne: {
        x: node.width - cornerZone / 2,
        y: -cornerZone / 2,
        width: cornerZone,
        height: cornerZone,
      },
      se: {
        x: node.width - cornerZone / 2,
        y: node.height - cornerZone / 2,
        width: cornerZone,
        height: cornerZone,
      },
      sw: {
        x: -cornerZone / 2,
        y: node.height - cornerZone / 2,
        width: cornerZone,
        height: cornerZone,
      },
      nw: { x: -cornerZone / 2, y: -cornerZone / 2, width: cornerZone, height: cornerZone },
    };

    RESIZE_HANDLES.forEach((handle) => {
      const zoneRect = zones[handle];
      const cursor = getResizeCursor(handle);
      const zoneSegments = [];
      if (handle === 'e' || handle === 'w') {
        const upperHeight = Math.max(0, node.height / 2 - gap / 2);
        const lowerY = node.height / 2 + gap / 2;
        const lowerHeight = Math.max(0, node.height - lowerY);
        zoneSegments.push(
          { x: zoneRect.x, y: zoneRect.y, width: zoneRect.width, height: upperHeight },
          { x: zoneRect.x, y: lowerY, width: zoneRect.width, height: lowerHeight },
        );
      } else if (handle === 'n' || handle === 's') {
        const leftWidth = Math.max(0, node.width / 2 - gap / 2);
        const rightX = node.width / 2 + gap / 2;
        const rightWidth = Math.max(0, node.width - rightX);
        zoneSegments.push(
          { x: zoneRect.x, y: zoneRect.y, width: leftWidth, height: zoneRect.height },
          { x: rightX, y: zoneRect.y, width: rightWidth, height: zoneRect.height },
        );
      } else {
        zoneSegments.push(zoneRect);
      }
      zoneSegments
        .filter((segment) => segment.width > 0 && segment.height > 0)
        .forEach((segment) => {
          const hit = svgEl('rect', {
            class: 'vd-flowchart-resize-zone',
            x: segment.x,
            y: segment.y,
            width: segment.width,
            height: segment.height,
            'data-node-id': node.id,
            'data-resize-handle': handle,
            style: `cursor: ${cursor}`,
          });
          group.appendChild(hit);
        });
      // Sides resize through the invisible strips only; a visible dot there
      // would sit on the same axis as the connection handle.
      if (handle.length === 1) return;
      const position = getResizeHandlePosition(node, handle);
      const outset = SELECTION_OUTSET / scale;
      position.x += handle.includes('e') ? outset : -outset;
      position.y += handle.includes('s') ? outset : -outset;
      const dot = svgEl('rect', {
        class: 'vd-flowchart-resize-handle',
        x: position.x - handleSize / 2,
        y: position.y - handleSize / 2,
        width: handleSize,
        height: handleSize,
        rx: handleSize / 5,
        ry: handleSize / 5,
        'data-node-id': node.id,
        'data-resize-handle': handle,
        style: `cursor: ${cursor}`,
      });
      group.appendChild(dot);
    });

    return group;
  }

  renderNodeShape(node) {
    const baseClass = `vd-flowchart-node-shape vd-flowchart-node-shape--${node.type}`;

    if (node.type === 'rounded-rect') {
      return svgEl('rect', {
        class: baseClass,
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: 18,
        ry: 18,
      });
    }

    if (node.type === 'rect') {
      return svgEl('rect', {
        class: baseClass,
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: 2,
        ry: 2,
      });
    }

    if (node.type === 'diamond') {
      return svgEl('polygon', {
        class: baseClass,
        points: `${node.width / 2},0 ${node.width},${node.height / 2} ${node.width / 2},${node.height} 0,${node.height / 2}`,
      });
    }

    if (node.type === 'circle') {
      return svgEl('ellipse', {
        class: baseClass,
        cx: node.width / 2,
        cy: node.height / 2,
        rx: node.width / 2,
        ry: node.height / 2,
      });
    }

    if (node.type === 'junction') {
      return svgEl('circle', {
        class: baseClass,
        cx: node.width / 2,
        cy: node.height / 2,
        r: Math.min(node.width, node.height) / 2,
      });
    }

    if (node.type === 'textbox') {
      return svgEl('rect', {
        class: baseClass,
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: 14,
        ry: 14,
      });
    }

    return svgEl('rect', {
      class: baseClass,
      x: 0,
      y: 0,
      width: node.width,
      height: node.height,
      rx: 0,
      ry: 0,
    });
  }

  renderNodeText(node) {
    const textElement = svgEl('text', {
      class: `vd-flowchart-node-text vd-flowchart-node-text--${node.type}`,
      'data-node-id': node.id,
    });

    if (node.type === 'junction' || !node.text) {
      return textElement;
    }

    if (node.type === 'textbox') {
      const lines = wrapText(node.text, estimateChars(node.width - 32));
      const { lineHeight } = getNodeFontMetrics(node);
      lines.forEach((line, index) => {
        const span = svgEl('tspan', {
          x: 16,
          y: 28 + index * lineHeight,
        });
        span.textContent = line;
        textElement.appendChild(span);
      });
      return textElement;
    }

    const lines = wrapText(node.text, estimateChars(node.width));
    const { lineHeight } = getNodeFontMetrics(node);
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = node.height / 2 - totalHeight / 2;
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('dominant-baseline', 'middle');
    lines.forEach((line, index) => {
      const span = svgEl('tspan', {
        x: node.width / 2,
        y: startY + index * lineHeight,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      span.textContent = line;
      textElement.appendChild(span);
    });

    return textElement;
  }

  renderSelectionPanel() {
    clearChildren(this.selectionFields);
    this.deleteButton.disabled = this.readonly || !this.selection;

    if (!this.selection) {
      this.selectionMeta.textContent = 'Nothing selected';
      this.selectionFields.appendChild(
        createElement('p', {
          className: 'vd-flowchart-selection-empty',
          text: 'Select a node or edge to edit it.',
        }),
      );
      return;
    }

    if (this.hasMultiSelection()) {
      this.selectionMeta.textContent = `${this.selectedNodeIds.size} nodes selected`;
      this.selectionFields.appendChild(
        createElement('p', {
          className: 'vd-flowchart-selection-empty',
          text: 'Drag, nudge with Alt+Arrow, copy, duplicate, or delete them together.',
        }),
      );
      return;
    }

    if (this.selection.kind === 'node') {
      const node = this.findNode(this.selection.id);
      if (!node) {
        this.selection = null;
        this.renderSelectionPanel();
        return;
      }

      this.selectionMeta.textContent = `Node ${node.id} · ${node.type} · ${Math.round(node.x)}, ${Math.round(node.y)}`;
      const typeSelect = createElement('select');
      typeSelect.setAttribute('data-field', 'node-type');
      FLOWCHART_NODE_TYPES.forEach((type) => {
        const option = createElement('option', { value: type, text: type.replace('-', ' ') });
        option.value = type;
        option.selected = type === node.type;
        typeSelect.appendChild(option);
      });

      const textArea = createElement('textarea', { value: node.text, rows: 5 });
      textArea.setAttribute('data-field', 'node-text');

      const widthInput = createElement('input', { value: node.width, type: 'number' });
      widthInput.setAttribute('data-field', 'node-width');
      widthInput.setAttribute('min', String(MIN_NODE_SIZE));
      widthInput.setAttribute('max', String(MAX_NODE_SIZE));

      const heightInput = createElement('input', { value: node.height, type: 'number' });
      heightInput.setAttribute('data-field', 'node-height');
      heightInput.setAttribute('min', String(MIN_NODE_SIZE));
      heightInput.setAttribute('max', String(MAX_NODE_SIZE));

      this.selectionFields.appendChild(createField('Type', typeSelect));
      if (isNodeTextEditable(node)) {
        this.selectionFields.appendChild(createField('Text', textArea));
      }

      if (isNodeResizable(node)) {
        const sizeGrid = createElement('div', { className: 'vd-flowchart-field-grid' });
        sizeGrid.appendChild(createField('Width', widthInput));
        sizeGrid.appendChild(createField('Height', heightInput));
        this.selectionFields.appendChild(sizeGrid);
      } else {
        this.selectionFields.appendChild(
          createElement('p', {
            className: 'vd-flowchart-selection-empty',
            text: 'Junctions stay fixed-size and do not carry inline text.',
          }),
        );
      }
      return;
    }

    const edge = this.findEdge(this.selection.id);
    if (!edge) {
      this.selection = null;
      this.renderSelectionPanel();
      return;
    }

    this.selectionMeta.textContent = `Edge ${edge.id} · ${edge.route} · ${formatNumber(edge.strokeWidth)}px · ${edge.startMarker} → ${edge.endMarker}`;

    const routeSelect = createElement('select');
    routeSelect.setAttribute('data-field', 'edge-route');
    FLOWCHART_EDGE_ROUTES.forEach((route) => {
      const option = createElement('option', {
        value: route,
        text: FLOWCHART_EDGE_ROUTE_LABELS[route],
      });
      option.value = route;
      option.selected = route === edge.route;
      routeSelect.appendChild(option);
    });

    const startSelect = createElement('select');
    startSelect.setAttribute('data-field', 'edge-start-marker');
    FLOWCHART_EDGE_MARKERS.forEach((marker) => {
      const option = createElement('option', { value: marker, text: marker });
      option.value = marker;
      option.selected = marker === edge.startMarker;
      startSelect.appendChild(option);
    });

    const endSelect = createElement('select');
    endSelect.setAttribute('data-field', 'edge-end-marker');
    FLOWCHART_EDGE_MARKERS.forEach((marker) => {
      const option = createElement('option', { value: marker, text: marker });
      option.value = marker;
      option.selected = marker === edge.endMarker;
      endSelect.appendChild(option);
    });

    const widthSelect = createElement('select');
    widthSelect.setAttribute('data-field', 'edge-stroke-preset');
    EDGE_STROKE_PRESETS.forEach((preset) => {
      const option = createElement('option', { value: preset.id, text: preset.label });
      option.value = preset.id;
      option.selected = preset.id === getStrokePresetId(edge.strokeWidth);
      widthSelect.appendChild(option);
    });

    const labelInput = createElement('textarea', { value: edge.label, rows: 4 });
    labelInput.setAttribute('data-field', 'edge-label');

    const markerGrid = createElement('div', { className: 'vd-flowchart-field-grid' });
    markerGrid.appendChild(createField('Route', routeSelect));
    markerGrid.appendChild(createField('Weight', widthSelect));
    markerGrid.appendChild(createField('Start', startSelect));
    markerGrid.appendChild(createField('End', endSelect));
    this.selectionFields.appendChild(markerGrid);
    this.selectionFields.appendChild(createField('Label', labelInput));
  }

  syncJsonTextarea(force = false) {
    if (!force && document.activeElement === this.jsonTextarea) {
      return;
    }
    this.jsonTextarea.value = JSON.stringify(this.toJSON(), null, 2);
  }

  getSelectionSnapshot() {
    if (!this.selection) return null;
    if (this.selection.kind === 'node') {
      const node = this.findNode(this.selection.id);
      return node ? { kind: 'node', id: node.id, node: deepClone(node) } : null;
    }
    const edge = this.findEdge(this.selection.id);
    return edge ? { kind: 'edge', id: edge.id, edge: deepClone(edge) } : null;
  }

  select(selection) {
    const next =
      selection && selection.id && selection.kind
        ? { kind: selection.kind, id: selection.id }
        : null;
    this.applySelection(next, next?.kind === 'node' ? [next.id] : []);
  }

  // Single funnel for selection changes: `selection` is the primary item and
  // `selectedNodeIds` every selected node (the primary one included).
  applySelection(primary, nodeIds) {
    const previousKey = this.getSelectionKey();
    this.selection = primary;
    this.selectedNodeIds = new Set(nodeIds);
    if (primary?.kind === 'node') this.selectedNodeIds.add(primary.id);
    if (previousKey !== this.getSelectionKey()) {
      this.edgeCycleAnchor = null;
      this.render({ scene: true, inspector: true, json: false });
      this.emit('select', {
        selection: this.getSelectionSnapshot(),
        nodeIds: this.getSelectedNodeIds(),
      });
      return;
    }

    this.render({ scene: true, inspector: false, json: false });
  }

  getSelectionKey() {
    const primary = this.selection ? `${this.selection.kind}:${this.selection.id}` : '';
    return `${primary}|${[...(this.selectedNodeIds || [])].sort().join(',')}`;
  }

  // Keep the set valid after mutations that bypass applySelection (undo,
  // load, removal): drop missing nodes and keep the primary node in the set.
  syncSelectedNodeIds() {
    if (this.selection?.kind !== 'node') {
      this.selectedNodeIds = new Set();
      return;
    }
    const existing = new Set(this.documentData.nodes.map((node) => node.id));
    const hidden = this.getHiddenNodeIds();
    this.selectedNodeIds = new Set(
      [...(this.selectedNodeIds || [])].filter((id) => existing.has(id) && !hidden.has(id)),
    );
    this.selectedNodeIds.add(this.selection.id);
  }

  getSelectedNodeIds() {
    return [...(this.selectedNodeIds || [])];
  }

  isNodeSelected(nodeId) {
    return Boolean(this.selectedNodeIds?.has(nodeId));
  }

  hasMultiSelection() {
    return (this.selectedNodeIds?.size || 0) > 1;
  }

  /** Select several nodes; `primary` (default: the last id) drives single-node UI. */
  selectNodes(nodeIds, options = {}) {
    const existing = new Set(this.documentData.nodes.map((node) => node.id));
    const ids = [...new Set((nodeIds || []).map(sanitizeId))].filter((id) => existing.has(id));
    const primaryId = ids.includes(options.primary) ? options.primary : ids[ids.length - 1];
    this.applySelection(primaryId ? { kind: 'node', id: primaryId } : null, ids);
    return this;
  }

  toggleNodeSelection(nodeId) {
    const ids = this.selection?.kind === 'node' ? this.getSelectedNodeIds() : [];
    if (ids.includes(nodeId)) {
      const rest = ids.filter((id) => id !== nodeId);
      return this.selectNodes(rest, { primary: rest[rest.length - 1] });
    }
    return this.selectNodes([...ids, nodeId], { primary: nodeId });
  }

  selectNode(nodeId) {
    this.select({ kind: 'node', id: sanitizeId(nodeId) });
    return this;
  }

  selectEdge(edgeId) {
    this.select({ kind: 'edge', id: sanitizeId(edgeId) });
    return this;
  }

  deselect() {
    this.select(null);
    return this;
  }

  resolvePreservedSelection(previousSelection, preserve) {
    if (!preserve || !previousSelection) return null;
    const exists =
      previousSelection.kind === 'node'
        ? Boolean(this.findNode(previousSelection.id))
        : Boolean(this.findEdge(previousSelection.id));
    return exists ? { kind: previousSelection.kind, id: previousSelection.id } : null;
  }

  findNode(nodeId) {
    return this.documentData.nodes.find((node) => node.id === nodeId) || null;
  }

  getHiddenNodeIds() {
    return computeHiddenNodeIds(this.documentData.nodes, this.documentData.edges);
  }

  getVisibleNodes() {
    const hidden = this.getHiddenNodeIds();
    return hidden.size
      ? this.documentData.nodes.filter((node) => !hidden.has(node.id))
      : this.documentData.nodes;
  }

  isNodeHidden(nodeId) {
    return this.getHiddenNodeIds().has(nodeId);
  }

  getOutgoingMap() {
    const outgoing = new Map();
    this.documentData.edges.forEach((edge) => {
      if (!outgoing.has(edge.from.nodeId)) outgoing.set(edge.from.nodeId, []);
      outgoing.get(edge.from.nodeId).push(edge.to.nodeId);
    });
    return outgoing;
  }

  // Hidden nodes under one collapsed node (its "+N" count).
  countCollapsedDescendants(
    nodeId,
    hidden = this.getHiddenNodeIds(),
    outgoing = this.getOutgoingMap(),
  ) {
    const seen = new Set();
    const queue = [nodeId];
    for (let index = 0; index < queue.length; index += 1) {
      (outgoing.get(queue[index]) || []).forEach((childId) => {
        if (seen.has(childId) || !hidden.has(childId)) return;
        seen.add(childId);
        queue.push(childId);
      });
    }
    return seen.size;
  }

  setCollapsed(nodeId, collapsed) {
    if (this.readonly) return false;
    const node = this.findNode(sanitizeId(nodeId));
    if (!node) return false;
    const next = Boolean(collapsed);
    if (Boolean(node.collapsed) === next) return false;
    if (next && !this.getChildNodes(node.id).length) return false;
    if (next) node.collapsed = true;
    else delete node.collapsed;

    // Keep the selection on something visible.
    if (this.selection?.kind === 'node') {
      const hidden = this.getHiddenNodeIds();
      const visibleIds = this.getSelectedNodeIds().filter((id) => !hidden.has(id));
      if (hidden.has(this.selection.id)) {
        this.select({ kind: 'node', id: node.id });
      } else if (visibleIds.length !== this.selectedNodeIds.size) {
        this.selectNodes(visibleIds, { primary: this.selection.id });
      }
    } else if (this.selection?.kind === 'edge') {
      const edge = this.findEdge(this.selection.id);
      const hidden = this.getHiddenNodeIds();
      if (edge && (hidden.has(edge.from.nodeId) || hidden.has(edge.to.nodeId))) {
        this.select({ kind: 'node', id: node.id });
      }
    }

    this.render({ inspector: true, json: true });
    this.emitChange('node:collapse', { node: deepClone(node) });
    return true;
  }

  toggleCollapsed(nodeId) {
    const node = this.findNode(sanitizeId(nodeId));
    return node ? this.setCollapsed(node.id, !node.collapsed) : false;
  }

  findEdge(edgeId) {
    return this.documentData.edges.find((edge) => edge.id === edgeId) || null;
  }

  emit(eventName, payload) {
    const listeners = this.listeners[eventName];
    if (!listeners || !listeners.size) return;
    listeners.forEach((listener) => listener(payload));
  }

  emitChange(reason, extra = {}) {
    if (this.historyEnabled && !this.isApplyingHistory) {
      if (this.historyBatchDepth > 0) this.historyBatchDirty = true;
      else this.recordHistory(reason);
    }
    this.syncJsonTextarea();
    this.emit('change', {
      reason,
      document: this.toJSON(),
      ...extra,
    });
  }

  emitViewportChange(reason) {
    const payload = {
      reason,
      viewport: deepClone(this.documentData.viewport),
      document: this.toJSON(),
    };
    this.syncJsonTextarea();
    this.emit('viewport', payload);
    this.emit('change', payload);
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = new Set();
    }
    this.listeners[eventName].add(callback);
    return this;
  }

  off(eventName, callback) {
    this.listeners[eventName]?.delete(callback);
    return this;
  }

  // --- History (undo / redo) ----------------------------------------------
  // Every document mutation funnels through emitChange(), so recording there
  // captures all of them with exactly one entry per committed gesture (live
  // drag/resize only render()). Viewport pan/zoom go through emitViewportChange
  // and are intentionally not recorded — undo is for content, not the camera.
  seedHistory() {
    if (!this.historyEnabled) return;
    this.history = [{ reason: 'init', targetKey: '', snapshot: this.toJSON() }];
    this.historyIndex = 0;
  }

  recordHistory(reason) {
    const snapshot = this.toJSON();
    const targetKey = this.selection ? `${this.selection.kind}:${this.selection.id}` : '';
    const top = this.history[this.historyIndex];
    const atTip = Boolean(top) && this.historyIndex === this.history.length - 1;
    // Naming a node right after inserting it is part of the same gesture.
    const namesInsertedNode =
      this.coalesceInsertedText && top?.reason === 'node:insert' && reason === 'node:update';
    const canCoalesce =
      atTip &&
      top.targetKey === targetKey &&
      (namesInsertedNode || (COALESCING_REASONS.has(reason) && top.reason === reason));

    if (canCoalesce) {
      top.snapshot = snapshot;
      return;
    }

    if (this.historyIndex < this.history.length - 1) {
      this.history.length = this.historyIndex + 1;
    }
    this.history.push({ reason, targetKey, snapshot });
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.emitHistoryState(reason);
  }

  applyHistorySnapshot(snapshot, reason) {
    this.isApplyingHistory = true;
    this.stopTextEdit({ commit: false });
    this.activeTool = null;
    this.reconnectEdgeId = null;
    // Preserve the current camera so undo/redo never makes the view jump.
    const currentViewport = deepClone(this.documentData.viewport);
    const previousSelection = this.selection;
    this.documentData = normalizeDocument(snapshot);
    this.documentData.viewport = normalizeViewport(currentViewport);
    this.selection = this.resolvePreservedSelection(previousSelection, true);
    this.render();
    this.emitChange(reason);
    this.isApplyingHistory = false;
    this.emitHistoryState(reason);
  }

  emitHistoryState(reason) {
    this.updateHistoryButtons();
    this.emit('history', { reason, canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  canUndo() {
    return this.historyEnabled && this.historyIndex > 0;
  }

  canRedo() {
    return this.historyEnabled && this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return this;
    this.historyIndex -= 1;
    this.applyHistorySnapshot(this.history[this.historyIndex].snapshot, 'undo');
    return this;
  }

  redo() {
    if (!this.canRedo()) return this;
    this.historyIndex += 1;
    this.applyHistorySnapshot(this.history[this.historyIndex].snapshot, 'redo');
    return this;
  }

  clearHistory() {
    this.seedHistory();
    this.emitHistoryState('history:clear');
    return this;
  }

  updateHistoryButtons() {
    if (this.undoButton) this.undoButton.disabled = this.readonly || !this.canUndo();
    if (this.redoButton) this.redoButton.disabled = this.readonly || !this.canRedo();
  }

  // Resolve a `relativeTo` anchor into a top-left position for a new node of the
  // given spec. Accepts a bare node id or `{ node, direction, distance, angle }`;
  // `direction` (right/down/left/up) is sugar for an angle in screen space
  // (y-down). Returns null when the anchor node can't be found.
  resolveRelativePosition(relativeTo, spec) {
    const ref = typeof relativeTo === 'string' ? { node: relativeTo } : relativeTo || {};
    const anchor = this.findNode(sanitizeId(ref.node ?? ref.nodeId ?? ref.id));
    if (!anchor) return null;

    const directionAngles = { right: 0, down: 90, left: 180, up: -90 };
    const angleDeg =
      ref.angle != null ? toFiniteNumber(ref.angle, 0) : (directionAngles[ref.direction] ?? 0);
    const distance = Math.max(0, toFiniteNumber(ref.distance, 220));
    const radians = (angleDeg * Math.PI) / 180;

    const centerX = anchor.x + anchor.width / 2 + Math.cos(radians) * distance;
    const centerY = anchor.y + anchor.height / 2 + Math.sin(radians) * distance;
    return {
      x: formatNumber(centerX - spec.width / 2),
      y: formatNumber(centerY - spec.height / 2),
    };
  }

  addNode(partialNode = {}) {
    const type = normalizeNodeType(partialNode.type);
    const spec = DEFAULT_NODE_SPECS[type];
    const relative =
      partialNode.relativeTo != null
        ? this.resolveRelativePosition(partialNode.relativeTo, spec)
        : null;
    const center = this.getViewportCenter();
    const offset = (this.paletteSerial % 6) * 26;
    this.paletteSerial += 1;

    const fallbackX = relative ? relative.x : formatNumber(center.x - spec.width / 2 + offset);
    const fallbackY = relative ? relative.y : formatNumber(center.y - spec.height / 2 + offset);

    const rest = { ...partialNode };
    delete rest.relativeTo;
    const usedIds = new Set(this.documentData.nodes.map((node) => node.id));
    const node = normalizeNode(
      {
        ...rest,
        type,
        x: partialNode.x == null ? fallbackX : partialNode.x,
        y: partialNode.y == null ? fallbackY : partialNode.y,
      },
      this.documentData.nodes.length,
      usedIds,
    );

    this.documentData.nodes.push(node);
    this.select({ kind: 'node', id: node.id });
    this.syncJsonTextarea();
    this.emitChange('node:add', { node: deepClone(node) });
    return deepClone(node);
  }

  // Convenience: place a child node relative to a parent and connect them with
  // an auto-ported arrow in one call. Returns { node, edge } (edge may be null
  // if the connection is rejected). The new child is left selected.
  addChildNode(parentId, options = {}) {
    if (this.readonly) return null;
    const parent = this.findNode(sanitizeId(parentId));
    if (!parent) return null;

    const { direction = 'right', distance, angle, edge: edgeOptions, ...nodeOptions } = options;
    return this.batchHistory('node:add-child', () => {
      const node = this.addNode({
        ...nodeOptions,
        relativeTo: { node: parent.id, direction, distance, angle },
      });

      const edge = this.addEdge({
        from: parent.id,
        to: node.id,
        autoPort: true,
        endMarker: 'arrow',
        ...(isPlainObject(edgeOptions) ? edgeOptions : {}),
      });

      this.select({ kind: 'node', id: node.id });
      return { node, edge };
    });
  }

  // Run `fn` with history recording suspended, then record a single entry for
  // everything it changed (change events still fire for each mutation).
  batchHistory(reason, fn) {
    this.historyBatchDepth += 1;
    let result;
    try {
      result = fn();
    } finally {
      this.historyBatchDepth -= 1;
    }
    if (this.historyBatchDepth === 0 && this.historyBatchDirty) {
      this.historyBatchDirty = false;
      if (this.historyEnabled && !this.isApplyingHistory) this.recordHistory(reason);
    }
    return result;
  }

  // Mind-map structure: a node's parent is the source of its first incoming
  // edge; its children are the targets of its outgoing edges. The side a
  // branch is on is the port its edge leaves the parent from, which is what
  // the user sees (centre geometry is ambiguous for diagonal nodes).
  getParentEdge(nodeId) {
    return (
      this.documentData.edges.find(
        (edge) => edge.to.nodeId === nodeId && edge.from.nodeId !== nodeId,
      ) || null
    );
  }

  getParentNode(nodeId) {
    const edge = this.getParentEdge(nodeId);
    return edge ? this.findNode(edge.from.nodeId) : null;
  }

  getChildNodes(nodeId, direction = null) {
    const port = direction ? DIRECTION_PORTS[direction] : null;
    const ids = new Set();
    this.documentData.edges.forEach((edge) => {
      if (edge.from.nodeId !== nodeId || edge.to.nodeId === nodeId) return;
      if (!port || edge.from.port === port) ids.add(edge.to.nodeId);
    });
    return this.documentData.nodes.filter((node) => ids.has(node.id));
  }

  // Direction a branch grows from `node`: the side its parent edge leaves
  // from, or the emptier horizontal side for a root.
  getGrowthDirection(node) {
    const parentEdge = this.getParentEdge(node.id);
    if (parentEdge) return PORT_DIRECTIONS[parentEdge.from.port] || 'right';
    const right = this.getChildNodes(node.id, 'right').length;
    const left = this.getChildNodes(node.id, 'left').length;
    return left < right ? 'left' : 'right';
  }

  // Shape for a new branch node: copy a sibling when there is one, otherwise
  // the parent's box shape, falling back to a rounded step.
  getBranchTemplate(parent, sibling) {
    const source =
      sibling ||
      (['rounded-rect', 'rect', 'textbox'].includes(parent.type) ? parent : null) ||
      null;
    if (source) return { type: source.type, width: source.width, height: source.height };
    const spec = DEFAULT_NODE_SPECS['rounded-rect'];
    return { type: 'rounded-rect', width: spec.width, height: spec.height };
  }

  /**
   * Add a node connected from `parentId` on the `direction` side (default: the
   * branch's growth direction), stacked after `anchorId` or the last sibling on
   * that side. The node and its edge are one undo step; the new edge copies a
   * sibling's (or the parent's incoming) edge style. With `edit: true` the
   * label editor opens with the text selected.
   */
  insertBranchNode(parentId, options = {}) {
    if (this.readonly) return null;
    const parent = this.findNode(sanitizeId(parentId));
    if (!parent) return null;

    const direction = DIRECTION_PORTS[options.direction]
      ? options.direction
      : this.getGrowthDirection(parent);
    const siblings = this.getChildNodes(parent.id, direction);
    const anchor = options.anchorId ? this.findNode(sanitizeId(options.anchorId)) : null;
    const lastSibling = siblings[siblings.length - 1] || null;
    const template = this.getBranchTemplate(parent, anchor || lastSibling);
    const position = placeBranchNode({
      nodes: this.documentData.nodes,
      parent,
      siblings,
      direction,
      size: template,
      anchor,
      before: Boolean(options.before),
    });

    const styleSource =
      this.documentData.edges.find(
        (edge) => edge.from.nodeId === parent.id && edge.to.nodeId === (anchor || lastSibling)?.id,
      ) || this.documentData.edges.find((edge) => edge.to.nodeId === parent.id);
    const edgeStyle = styleSource
      ? {
          route: styleSource.route,
          strokeWidth: styleSource.strokeWidth,
          startMarker: styleSource.startMarker,
          endMarker: styleSource.endMarker,
        }
      : { endMarker: 'arrow' };

    const result = this.batchHistory('node:insert', () => {
      // A new child must be visible, so its branch opens in the same step.
      if (parent.collapsed) delete parent.collapsed;
      const node = this.addNode({ ...template, x: position.x, y: position.y });
      const edge = this.addEdge({
        from: { nodeId: parent.id, port: DIRECTION_PORTS[direction] },
        to: { nodeId: node.id, port: DIRECTION_PORTS[oppositeDirection(direction)] },
        ...edgeStyle,
      });
      this.select({ kind: 'node', id: node.id });
      return { node, edge };
    });

    this.revealNode(result.node.id);
    if (options.edit) this.startTextEdit(result.node.id, { inserted: true });
    return result;
  }

  // Insert a sibling after (or before) `nodeId`; a node without a parent gets a
  // child instead, which is what Enter on a mind-map root means.
  insertSiblingNode(nodeId, options = {}) {
    if (this.readonly) return null;
    const node = this.findNode(sanitizeId(nodeId));
    if (!node) return null;
    const parentEdge = this.getParentEdge(node.id);
    const parent = parentEdge ? this.findNode(parentEdge.from.nodeId) : null;
    if (!parent) return this.insertBranchNode(node.id, { edit: options.edit });
    return this.insertBranchNode(parent.id, {
      direction: PORT_DIRECTIONS[parentEdge.from.port],
      anchorId: node.id,
      before: Boolean(options.before),
      edit: options.edit,
    });
  }

  // Pan just enough to bring a node fully into view (with a small margin).
  revealNode(nodeId) {
    const node = this.findNode(nodeId);
    const width = this.canvasEl.clientWidth;
    const height = this.canvasEl.clientHeight;
    if (!node || !width || !height) return;
    const viewport = this.documentData.viewport;
    const margin = 32;
    const left = viewport.x + node.x * viewport.scale;
    const top = viewport.y + node.y * viewport.scale;
    const right = left + node.width * viewport.scale;
    const bottom = top + node.height * viewport.scale;
    let dx = 0;
    let dy = 0;
    if (right > width - margin) dx = width - margin - right;
    if (left + dx < margin) dx = margin - left;
    if (bottom > height - margin) dy = height - margin - bottom;
    if (top + dy < margin) dy = margin - top;
    if (!dx && !dy) return;
    viewport.x = formatNumber(viewport.x + dx);
    viewport.y = formatNumber(viewport.y + dy);
    this.render({ inspector: false, json: true });
    this.emitViewportChange('viewport:pan');
  }

  // Arrange nodes with a built-in layout. Positions are computed by the pure
  // computeLayout() module, then applied in place (NOT via load(), which would
  // wipe selection/viewport) so the result is one undoable, change-emitting step.
  layout(mode = 'tree', options = {}) {
    if (this.readonly) return this;
    const resolvedMode = LAYOUT_MODES.includes(mode) ? mode : 'tree';
    this.layoutMode = resolvedMode;
    this.syncArrangeSelect();
    const positions = computeLayout(this.documentData, resolvedMode, options);
    if (!positions.size) return this;

    let changed = false;
    this.documentData.nodes.forEach((node) => {
      const next = positions.get(node.id);
      if (!next) return;
      const x = formatNumber(next.x);
      const y = formatNumber(next.y);
      if (x !== node.x || y !== node.y) {
        node.x = x;
        node.y = y;
        changed = true;
      }
    });

    const rerouted = options.reroutePorts === false ? false : this.rerouteEdgePorts();
    if (!changed && !rerouted) return this;

    this.render();
    this.emitChange('layout', { mode: resolvedMode });
    if (options.fit) this.fitView();
    return this;
  }

  autoArrange(options = {}) {
    return this.layout('grid', options);
  }

  // Re-pick each edge's from/to port from the nodes' current centers, so a
  // freshly laid-out graph attaches connectors on sensible sides. Returns
  // whether any port actually changed.
  rerouteEdgePorts() {
    let changed = false;
    this.documentData.edges.forEach((edge) => {
      const fromNode = this.findNode(edge.from.nodeId);
      const toNode = this.findNode(edge.to.nodeId);
      if (!fromNode || !toNode) return;
      const fromCenter = {
        x: fromNode.x + fromNode.width / 2,
        y: fromNode.y + fromNode.height / 2,
      };
      const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };
      const nextFrom = getPortByDirection(fromNode, toCenter).port;
      const nextTo = getPortByDirection(toNode, fromCenter).port;
      if (nextFrom !== edge.from.port || nextTo !== edge.to.port) {
        edge.from.port = nextFrom;
        edge.to.port = nextTo;
        changed = true;
      }
    });
    return changed;
  }

  applyNodePatch(node, patch = {}) {
    const nextType = normalizeNodeType(patch.type ?? node.type);
    node.type = nextType;
    node.x = patch.x == null ? node.x : formatNumber(toFiniteNumber(patch.x, node.x));
    node.y = patch.y == null ? node.y : formatNumber(toFiniteNumber(patch.y, node.y));
    node.text = isNodeTextEditable(nextType)
      ? patch.text == null
        ? node.text
        : String(patch.text)
      : getNodeSpec(nextType).text;

    node.width = clampNodeWidth(nextType, patch.width, node.width);
    node.height = clampNodeHeight(nextType, patch.height, node.height);

    if (isPlainObject(patch.data)) {
      node.data = deepClone(patch.data);
    }
  }

  updateNode(nodeId, patch = {}, options = {}) {
    const node = this.findNode(nodeId);
    if (!node) return null;

    const previousType = node.type;
    const previousSpec = DEFAULT_NODE_SPECS[previousType];
    this.applyNodePatch(node, patch);
    if (patch.type && previousType !== node.type) {
      const nextSpec = DEFAULT_NODE_SPECS[node.type];
      if (patch.width == null && node.width === previousSpec.width) {
        node.width = nextSpec.width;
      }
      if (patch.height == null && node.height === previousSpec.height) {
        node.height = nextSpec.height;
      }
      if (node.text === DEFAULT_NODE_SPECS[previousType].text) {
        node.text = nextSpec.text;
      }
    }

    this.render({
      scene: true,
      inspector: options.inspector !== false,
      json: true,
    });
    this.emitChange(options.reason || 'node:update', { node: deepClone(node) });
    return deepClone(node);
  }

  // Walk outgoing edges (from.nodeId -> to.nodeId) breadth-first to collect a
  // node and every descendant reachable through the directed graph. The visited
  // Set doubles as a cycle guard, so a diamond or loop is safe (each node once).
  collectDescendants(rootId) {
    const visited = new Set([rootId]);
    const queue = [rootId];
    while (queue.length) {
      const current = queue.shift();
      this.documentData.edges.forEach((edge) => {
        if (edge.from.nodeId === current && !visited.has(edge.to.nodeId)) {
          visited.add(edge.to.nodeId);
          queue.push(edge.to.nodeId);
        }
      });
    }
    return visited;
  }

  removeNode(nodeId, options = {}) {
    const id = sanitizeId(nodeId);
    if (!this.findNode(id)) return false;

    const ids = options.cascade ? this.collectDescendants(id) : new Set([id]);
    return this.removeNodeIds(ids, options.reason || 'node:remove', id);
  }

  removeNodeIds(ids, reason = 'node:remove', primaryId = null) {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    const removed = this.documentData.nodes
      .filter((node) => idSet.has(node.id))
      .map((node) => node.id);
    if (!removed.length) return false;

    if (this.textEditor && idSet.has(this.textEditor.nodeId)) {
      this.stopTextEdit({ commit: false });
    }

    this.documentData.nodes = this.documentData.nodes.filter((node) => !idSet.has(node.id));
    this.documentData.edges = this.documentData.edges.filter(
      (edge) => !idSet.has(edge.from.nodeId) && !idSet.has(edge.to.nodeId),
    );

    if (this.selection?.kind === 'node' && idSet.has(this.selection.id)) {
      this.selection = null;
    }

    this.render();
    this.emitChange(reason, { nodeId: primaryId ?? removed[0], nodeIds: removed });
    return true;
  }

  updateEdge(edgeId, patch = {}, options = {}) {
    const edge = this.findEdge(edgeId);
    if (!edge) return null;

    const nodeIds = new Set(this.documentData.nodes.map((node) => node.id));
    const nextFrom = patch.from ? normalizeEndpoint(patch.from, edge.from.port) : edge.from;
    const nextTo = patch.to ? normalizeEndpoint(patch.to, edge.to.port) : edge.to;

    if (patch.from != null || patch.to != null) {
      if (!nodeIds.has(nextFrom.nodeId) || !nodeIds.has(nextTo.nodeId)) return null;
      if (!FLOWCHART_PORTS.includes(nextFrom.port) || !FLOWCHART_PORTS.includes(nextTo.port))
        return null;
      if (nextFrom.nodeId === nextTo.nodeId && nextFrom.port === nextTo.port) return null;
      edge.from = nextFrom;
      edge.to = nextTo;
    }

    if (patch.kind != null) {
      edge.kind = patch.kind === 'line' ? 'line' : 'arrow';
      if (patch.startMarker == null && patch.endMarker == null) {
        if (edge.kind === 'line') {
          edge.startMarker = 'none';
          edge.endMarker = 'none';
        } else if (edge.endMarker === 'none' && edge.startMarker === 'none') {
          edge.endMarker = 'arrow';
        }
      }
    }
    if (patch.startMarker != null) {
      edge.startMarker = normalizeEdgeMarker(patch.startMarker) || 'none';
    }
    if (patch.endMarker != null) {
      edge.endMarker = normalizeEdgeMarker(patch.endMarker) || 'none';
    }
    if (patch.route != null) {
      edge.route = normalizeEdgeRoute(patch.route);
    }
    if (patch.strokeWidth != null) {
      edge.strokeWidth = normalizeEdgeStrokeWidth(patch.strokeWidth);
    }
    if (patch.label != null) {
      edge.label = String(patch.label);
    }
    if (isPlainObject(patch.data)) {
      edge.data = deepClone(patch.data);
    }

    syncEdgeKind(edge);

    this.render({
      scene: true,
      inspector: options.inspector !== false,
      json: true,
    });
    this.emitChange(options.reason || 'edge:update', { edge: deepClone(edge) });
    return deepClone(edge);
  }

  // Accept `from`/`to` as a bare node id or `{ nodeId, port }`. When `autoPort`
  // is set, fill any omitted port by aiming each endpoint at the other node's
  // center via getPortByDirection — the same geometry the live connect tool
  // uses, so a programmatic edge picks the same side a dragged one would.
  resolveEdgeEndpoints(partialEdge) {
    const toEndpoint = (value) => {
      if (typeof value === 'string') return { nodeId: value };
      if (isPlainObject(value)) return { ...value };
      return {};
    };
    const from = toEndpoint(partialEdge.from);
    const to = toEndpoint(partialEdge.to);

    if (partialEdge.autoPort) {
      const fromNode = this.findNode(sanitizeId(from.nodeId));
      const toNode = this.findNode(sanitizeId(to.nodeId));
      if (fromNode && toNode) {
        const fromCenter = {
          x: fromNode.x + fromNode.width / 2,
          y: fromNode.y + fromNode.height / 2,
        };
        const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };
        if (!FLOWCHART_PORTS.includes(from.port))
          from.port = getPortByDirection(fromNode, toCenter).port;
        if (!FLOWCHART_PORTS.includes(to.port))
          to.port = getPortByDirection(toNode, fromCenter).port;
      }
    }

    const rest = { ...partialEdge };
    delete rest.autoPort;
    return { ...rest, from, to };
  }

  addEdge(partialEdge = {}) {
    if (this.readonly) return null;

    const input = this.resolveEdgeEndpoints(partialEdge);
    const nodeIds = new Set(this.documentData.nodes.map((node) => node.id));
    const usedIds = new Set(this.documentData.edges.map((edge) => edge.id));
    const edge = normalizeEdge(input, this.documentData.edges.length, nodeIds, usedIds);

    if (!edge) return null;
    if (edge.from.nodeId === edge.to.nodeId && edge.from.port === edge.to.port) return null;

    this.documentData.edges.push(edge);
    this.select({ kind: 'edge', id: edge.id });
    this.syncJsonTextarea();
    this.emit('connect', { edge: deepClone(edge) });
    this.emitChange('edge:add', { edge: deepClone(edge) });
    return deepClone(edge);
  }

  removeEdge(edgeId) {
    const edgeIndex = this.documentData.edges.findIndex((edge) => edge.id === edgeId);
    if (edgeIndex === -1) return false;

    this.documentData.edges.splice(edgeIndex, 1);
    if (this.selection?.kind === 'edge' && this.selection.id === edgeId) {
      this.selection = null;
    }

    this.render();
    this.emitChange('edge:remove', { edgeId });
    return true;
  }

  deleteSelection() {
    if (!this.selection || this.readonly) return false;
    if (this.hasMultiSelection()) {
      return this.removeNodeIds(new Set(this.getSelectedNodeIds()), 'node:remove');
    }
    if (this.selection.kind === 'node') return this.removeNode(this.selection.id);
    return this.removeEdge(this.selection.id);
  }

  setViewport(viewport) {
    this.documentData.viewport = normalizeViewport(viewport);
    this.render({ inspector: false, json: true });
    this.emitViewportChange('viewport:set');
    return this;
  }

  zoomIn() {
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    this.scaleAround(1.12, width / 2, height / 2, 'viewport:zoom');
    return this;
  }

  zoomOut() {
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    this.scaleAround(1 / 1.12, width / 2, height / 2, 'viewport:zoom');
    return this;
  }

  resetView() {
    this.documentData.viewport = normalizeViewport({ x: 0, y: 0, scale: 1 });
    this.render({ inspector: false, json: true });
    this.emitViewportChange('viewport:reset');
    return this;
  }

  fitView() {
    const nodes = this.getVisibleNodes();
    if (!nodes.length) {
      return this.resetView();
    }

    const bounds = getBounds(nodes);
    const width = this.canvasEl.clientWidth || 800;
    const height = this.canvasEl.clientHeight || 560;
    const padding = 80;
    const contentWidth = Math.max(1, bounds.right - bounds.left);
    const contentHeight = Math.max(1, bounds.bottom - bounds.top);
    const scale = clamp(
      Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight),
      MIN_SCALE,
      MAX_SCALE,
    );

    this.documentData.viewport = {
      x: formatNumber(width / 2 - ((bounds.left + bounds.right) / 2) * scale),
      y: formatNumber(height / 2 - ((bounds.top + bounds.bottom) / 2) * scale),
      scale: formatNumber(scale),
    };

    this.render({ inspector: false, json: true });
    this.emitViewportChange('viewport:fit');
    return this;
  }

  clear() {
    this.stopTextEdit({ commit: false });
    this.activeTool = null;
    this.reconnectEdgeId = null;
    this.clipboard = null;
    this.documentData = normalizeDocument({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, scale: 1 },
    });
    this.selection = null;
    this.render();
    this.emitChange('clear');
    return this;
  }

  updateOptions(options = {}) {
    if (this.destroyed) return this;
    if ('readonly' in options) {
      if (options.readonly && !this.readonly) {
        this.stopTextEdit({ commit: true });
        this.interaction = null;
        this.activeTool = null;
        this.reconnectEdgeId = null;
      }
      this.readonly = Boolean(options.readonly);
      this.root.classList.toggle('vd-flowchart-readonly', this.readonly);
      this.arrangeSelect.disabled = this.readonly;
      this.clearButton.disabled = this.readonly;
      this.loadJsonButton.disabled = this.readonly;
    }
    if ('gridSize' in options) {
      this.gridSize = clamp(toFiniteNumber(options.gridSize, DEFAULT_GRID_SIZE), 12, 64);
      const pattern = this.svg.querySelector('pattern');
      pattern.setAttribute('width', this.gridSize);
      pattern.setAttribute('height', this.gridSize);
      pattern
        .querySelector('path')
        .setAttribute('d', `M ${this.gridSize} 0 L 0 0 0 ${this.gridSize}`);
    }
    // autoFit is a readiness preference, not a request to reset the camera.
    if ('autoFit' in options) this.autoFit = Boolean(options.autoFit);
    if ('keyboardShortcuts' in options) {
      this.keyboardShortcuts = normalizeKeyboardShortcuts(options.keyboardShortcuts);
    }
    if ('snapGuides' in options) this.snapGuides = options.snapGuides !== false;
    if ('minimap' in options) this.setMinimapEnabled(options.minimap !== false);
    this.syncCanvasLabel();
    if (this.shortcutsHelpOpen) this.renderShortcutsHelp();
    if ('history' in options && (options.history !== false) !== this.historyEnabled) {
      this.historyEnabled = options.history !== false;
      this.history = [];
      this.historyIndex = -1;
      this.seedHistory();
    }
    if ('historyLimit' in options) {
      this.historyLimit = Math.max(1, Math.floor(toFiniteNumber(options.historyLimit, 100)));
      if (this.history.length > this.historyLimit) {
        const start = Math.max(0, this.historyIndex - this.historyLimit + 1);
        this.history = this.history.slice(start, start + this.historyLimit);
        this.historyIndex -= start;
      }
    }
    this.render();
    this.updateHistoryButtons();
    return this;
  }

  load(data, options = {}) {
    const documentData = normalizeDocument(data);
    if (options.silent && JSON.stringify(documentData) === JSON.stringify(this.documentData)) {
      return this;
    }
    this.stopTextEdit({ commit: false });
    this.activeTool = null;
    this.reconnectEdgeId = null;
    const previousSelection = this.selection;
    this.documentData = documentData;
    this.selection = this.resolvePreservedSelection(previousSelection, options.preserveSelection);
    this.render();
    if (options.silent) {
      if (this.historyEnabled) this.recordHistory('load');
    } else {
      this.emitChange('load');
    }
    return this;
  }

  toJSON() {
    return deepClone({
      version: FLOWCHART_DOCUMENT_VERSION,
      viewport: this.documentData.viewport,
      nodes: this.documentData.nodes,
      edges: this.documentData.edges,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.minimapFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.minimapFrame);
    }
    this.minimapFrame = 0;
    this.activeTool = null;
    this.stopTextEdit({ commit: false });
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.unbindEvents();
    this.sceneNodeMap?.clear();
    this.nodeElements?.clear();
    this.edgeElements?.clear();
    this.incidentEdges?.clear();
    this.element.innerHTML = '';
    this.element.classList.remove('vd-flowchart-host');
  }
}
