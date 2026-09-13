// Pure, framework-free graph layout for the vd3-flowchart component.
//
//   computeLayout(documentData, mode, options) -> Map<nodeId, { x, y }>
//
// Positions are top-left in world coordinates. The input is never mutated, so
// the function is trivially unit-testable and reusable outside the editor. The
// editor's `layout()` method applies the result in place.
//
// Modes:
//   'tree'   layered hierarchy from directed edges (from -> to), one axis per
//            depth level, siblings centered under their parent.
//   'radial' root at the center, descendants on concentric rings (mind maps).
//   'grid'   edge-agnostic row/col snap of every node (autoArrange).

const DIRECTIONS = {
  right: { main: 'x', sign: 1 },
  left: { main: 'x', sign: -1 },
  down: { main: 'y', sign: 1 },
  up: { main: 'y', sign: -1 },
};

function num(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function buildGraph(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map(nodes.map((node) => [node.id, []]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    const from = edge?.from?.nodeId;
    const to = edge?.to?.nodeId;
    if (from === to || !byId.has(from) || !byId.has(to)) return;
    children.get(from).push(to);
    indegree.set(to, indegree.get(to) + 1);
  });
  return { byId, children, indegree };
}

function pickRoots(nodes, indegree, optRoot) {
  if (optRoot && indegree.has(optRoot)) return [optRoot];
  const roots = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  return roots.length ? roots : nodes.length ? [nodes[0].id] : [];
}

// Spanning forest (first visit wins) so a shared child or a cycle is placed
// exactly once. Every node is reached: any node left unvisited after the real
// roots becomes its own root. Returns DFS depth + per-node spanning children.
function spanningForest(allIds, roots, children) {
  const visited = new Set();
  const depth = new Map();
  const tree = new Map();
  const forestRoots = [];

  const walk = (id, d) => {
    visited.add(id);
    depth.set(id, d);
    const kids = [];
    (children.get(id) || []).forEach((child) => {
      if (!visited.has(child)) {
        kids.push(child);
        walk(child, d + 1);
      }
    });
    tree.set(id, kids);
  };

  roots.forEach((root) => {
    if (!visited.has(root)) {
      forestRoots.push(root);
      walk(root, 0);
    }
  });
  allIds.forEach((id) => {
    if (!visited.has(id)) {
      forestRoots.push(id);
      walk(id, 0);
    }
  });

  return { depth, tree, forestRoots };
}

function treeCenters(forestRoots, tree, depth, sizeOf, options) {
  const dir = DIRECTIONS[options.direction] || DIRECTIONS.right;
  const levelGap = num(options.levelGap, 220);
  const siblingGap = num(options.siblingGap, 140);
  const crossOf = new Map();
  let cursor = 0;

  const place = (id) => {
    const kids = tree.get(id) || [];
    if (!kids.length) {
      crossOf.set(id, cursor);
      cursor += siblingGap;
      return crossOf.get(id);
    }
    const childCenters = kids.map(place);
    const center = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    crossOf.set(id, center);
    return center;
  };
  forestRoots.forEach((root) => {
    place(root);
    cursor += siblingGap;
  });

  const centers = new Map();
  crossOf.forEach((cross, id) => {
    const main = (depth.get(id) || 0) * levelGap * dir.sign;
    centers.set(
      id,
      dir.main === 'x' ? { centerX: main, centerY: cross } : { centerX: cross, centerY: main },
    );
  });
  return centers;
}

function radialCenters(forestRoots, tree, depth, options) {
  const ringGap = num(options.radius, 220);
  const leaves = [];
  const collect = (id) => {
    const kids = tree.get(id) || [];
    if (!kids.length) leaves.push(id);
    else kids.forEach(collect);
  };
  forestRoots.forEach(collect);

  const total = Math.max(1, leaves.length);
  const leafAngle = new Map(leaves.map((id, index) => [id, ((index + 0.5) / total) * Math.PI * 2]));

  const angleOf = new Map();
  const resolveAngle = (id) => {
    const kids = tree.get(id) || [];
    if (!kids.length) {
      angleOf.set(id, leafAngle.get(id));
      return angleOf.get(id);
    }
    const childAngles = kids.map(resolveAngle);
    const mean = childAngles.reduce((sum, value) => sum + value, 0) / childAngles.length;
    angleOf.set(id, mean);
    return mean;
  };
  forestRoots.forEach(resolveAngle);

  const centers = new Map();
  angleOf.forEach((angle, id) => {
    const radius = (depth.get(id) || 0) * ringGap;
    centers.set(id, { centerX: Math.cos(angle) * radius, centerY: Math.sin(angle) * radius });
  });
  return centers;
}

function gridCenters(nodes, sizeOf, options) {
  const gap = num(options.gap, 48);
  const columns = Math.max(
    1,
    Math.floor(num(options.columns, Math.ceil(Math.sqrt(nodes.length || 1)))),
  );
  let cellW = 0;
  let cellH = 0;
  nodes.forEach((node) => {
    const size = sizeOf(node.id);
    cellW = Math.max(cellW, size.width);
    cellH = Math.max(cellH, size.height);
  });
  cellW += gap;
  cellH += gap;

  const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  const centers = new Map();
  sorted.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    centers.set(node.id, { centerX: col * cellW, centerY: row * cellH });
  });
  return centers;
}

export function computeLayout(documentData, mode = 'tree', options = {}) {
  const nodes = Array.isArray(documentData?.nodes) ? documentData.nodes : [];
  const edges = Array.isArray(documentData?.edges) ? documentData.edges : [];
  if (!nodes.length) return new Map();

  const { byId, children, indegree } = buildGraph(nodes, edges);
  const sizeOf = (id) => {
    const node = byId.get(id);
    return { width: num(node?.width, 160), height: num(node?.height, 96) };
  };
  const allIds = nodes.map((node) => node.id);

  let centers;
  let anchorId = nodes[0].id;
  if (mode === 'grid') {
    centers = gridCenters(nodes, sizeOf, options);
  } else {
    const rootOpt = options.root == null ? null : String(options.root).trim();
    const roots = pickRoots(nodes, indegree, rootOpt);
    anchorId = roots[0] || anchorId;
    const { depth, tree, forestRoots } = spanningForest(allIds, roots, children);
    centers =
      mode === 'radial'
        ? radialCenters(forestRoots, tree, depth, options)
        : treeCenters(forestRoots, tree, depth, sizeOf, options);
  }

  // Translate so the anchor node keeps its previous center — re-layout nudges
  // the structure into shape without teleporting the whole diagram.
  const anchorNode = byId.get(anchorId);
  const anchorCenter = centers.get(anchorId) || { centerX: 0, centerY: 0 };
  const dx = anchorNode ? anchorNode.x + anchorNode.width / 2 - anchorCenter.centerX : 0;
  const dy = anchorNode ? anchorNode.y + anchorNode.height / 2 - anchorCenter.centerY : 0;

  const result = new Map();
  centers.forEach((center, id) => {
    const size = sizeOf(id);
    result.set(id, {
      x: Math.round((center.centerX + dx - size.width / 2) * 100) / 100,
      y: Math.round((center.centerY + dy - size.height / 2) * 100) / 100,
    });
  });
  return result;
}

export const LAYOUT_MODES = ['tree', 'radial', 'grid'];
