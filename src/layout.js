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

const DEFAULT_LEVEL_EDGE_GAP = 88;
const DEFAULT_SIBLING_EDGE_GAP = 64;

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

// Spanning forest with cycle-safe longest-path ranks so a shared child (e.g. a
// diamond join or End node) sits below all incoming forward branches instead of
// staying pinned to whichever short branch DFS visited first.
function spanningForest(allIds, roots, children) {
  const visited = new Set();
  const active = new Set();
  const forestRoots = [];
  const forwardParents = new Map(allIds.map((id) => [id, []]));

  const dfs = (id) => {
    visited.add(id);
    active.add(id);
    (children.get(id) || []).forEach((child) => {
      if (active.has(child)) return;
      const list = forwardParents.get(child);
      if (list && !list.includes(id)) list.push(id);
      if (!visited.has(child)) dfs(child);
    });
    active.delete(id);
  };

  roots.forEach((root) => {
    if (!visited.has(root)) {
      forestRoots.push(root);
      dfs(root);
    }
  });
  allIds.forEach((id) => {
    if (!visited.has(id)) {
      forestRoots.push(id);
      dfs(id);
    }
  });

  const depth = new Map(allIds.map((id) => [id, 0]));
  const limit = Math.max(1, allIds.length);
  for (let pass = 0; pass < limit; pass += 1) {
    let changed = false;
    for (const id of allIds) {
      const parents = forwardParents.get(id) || [];
      for (const parent of parents) {
        const nextDepth = Math.min(limit, (depth.get(parent) || 0) + 1);
        if (nextDepth > (depth.get(id) || 0)) {
          depth.set(id, nextDepth);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const tree = new Map(allIds.map((id) => [id, []]));
  const rootSet = new Set(forestRoots);
  const chosenParent = new Map();
  for (const id of allIds) {
    if (rootSet.has(id)) continue;
    const parents = forwardParents.get(id) || [];
    if (!parents.length) continue;
    let bestParent = parents[0];
    let bestDepth = depth.get(bestParent) ?? -1;
    for (let index = 1; index < parents.length; index += 1) {
      const candidate = parents[index];
      const candidateDepth = depth.get(candidate) ?? -1;
      if (candidateDepth > bestDepth) {
        bestDepth = candidateDepth;
        bestParent = candidate;
      }
    }
    chosenParent.set(id, bestParent);
  }
  const placedChild = new Set();
  for (const parentId of allIds) {
    const out = tree.get(parentId);
    for (const childId of children.get(parentId) || []) {
      if (chosenParent.get(childId) === parentId && !placedChild.has(childId)) {
        placedChild.add(childId);
        out.push(childId);
      }
    }
  }

  return { depth, tree, forestRoots };
}

function treeCenters(forestRoots, tree, depth, sizeOf, options) {
  const dir = DIRECTIONS[options.direction] || DIRECTIONS.right;
  const hasExplicitLevel = Number.isFinite(Number(options.levelGap));
  const hasExplicitSibling = Number.isFinite(Number(options.siblingGap));
  const explicitLevelGap = num(options.levelGap, 220);
  const explicitSiblingGap = num(options.siblingGap, 140);
  const edgeSiblingGap = hasExplicitSibling
    ? Math.max(16, explicitSiblingGap - 96)
    : DEFAULT_SIBLING_EDGE_GAP;

  const crossSpan = (id) => {
    const size = sizeOf(id);
    return dir.main === 'x' ? size.height : size.width;
  };
  const mainSpan = (id) => {
    const size = sizeOf(id);
    return dir.main === 'x' ? size.width : size.height;
  };

  const subtreeSpan = new Map();
  const subtreeCount = new Map();
  const measure = (id) => {
    const selfSpan = crossSpan(id);
    const kids = tree.get(id) || [];
    if (!kids.length) {
      subtreeSpan.set(id, selfSpan);
      subtreeCount.set(id, 1);
      return selfSpan;
    }
    let childTotal = 0;
    let totalCount = 1;
    kids.forEach((kid, index) => {
      if (index > 0) childTotal += edgeSiblingGap;
      childTotal += measure(kid);
      totalCount += subtreeCount.get(kid) || 1;
    });
    const span = Math.max(selfSpan, childTotal);
    subtreeSpan.set(id, span);
    subtreeCount.set(id, totalCount);
    return span;
  };
  forestRoots.forEach(measure);

  const crossOf = new Map();
  const place = (id, startCross) => {
    const span = subtreeSpan.get(id) || crossSpan(id);
    const kids = tree.get(id) || [];
    if (!kids.length) {
      const center = startCross + span / 2;
      crossOf.set(id, center);
      return center;
    }
    let childTotal = 0;
    const kidSpans = kids.map((kid, index) => {
      const kidSpan = subtreeSpan.get(kid) || crossSpan(kid);
      if (index > 0) childTotal += edgeSiblingGap;
      childTotal += kidSpan;
      return kidSpan;
    });
    let cursor = startCross + (span - childTotal) / 2;
    const childCenters = kids.map((kid, index) => {
      const kidSpan = kidSpans[index];
      const center = place(kid, cursor);
      cursor += kidSpan + edgeSiblingGap;
      return center;
    });
    if (kids.length >= 2) {
      const counts = kids.map((kid) => subtreeCount.get(kid) || 1);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      if (maxCount > minCount) {
        const primaryIndex = counts.indexOf(maxCount);
        const center = childCenters[primaryIndex];
        crossOf.set(id, center);
        return center;
      }
    }
    const center = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    crossOf.set(id, center);
    return center;
  };

  let rootCursor = 0;
  forestRoots.forEach((root, index) => {
    if (index > 0) rootCursor += edgeSiblingGap;
    const span = subtreeSpan.get(root) || crossSpan(root);
    place(root, rootCursor);
    rootCursor += span;
  });

  let maxDepth = 0;
  const maxMainAtDepth = new Map();
  crossOf.forEach((_cross, id) => {
    const d = depth.get(id) || 0;
    if (d > maxDepth) maxDepth = d;
    const current = maxMainAtDepth.get(d) || 0;
    const span = mainSpan(id);
    if (span > current) maxMainAtDepth.set(d, span);
  });

  const mainCenterAtDepth = new Map([[0, 0]]);
  for (let d = 1; d <= maxDepth; d += 1) {
    const prevCenter = mainCenterAtDepth.get(d - 1) || 0;
    const prevSpan = maxMainAtDepth.get(d - 1) || 160;
    const currSpan = maxMainAtDepth.get(d) || 160;
    const step = hasExplicitLevel
      ? Math.max(explicitLevelGap, (prevSpan + currSpan) / 2 + 24)
      : (prevSpan + currSpan) / 2 + DEFAULT_LEVEL_EDGE_GAP;
    mainCenterAtDepth.set(d, prevCenter + step * dir.sign);
  }

  const centers = new Map();
  crossOf.forEach((cross, id) => {
    const main = mainCenterAtDepth.get(depth.get(id) || 0) || 0;
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
