// Pure geometry for keyboard-driven mind-map editing: spatial navigation and
// placement of new branch nodes. Inputs are never mutated.
//
// Directions are screen-space ('right' | 'left' | 'down' | 'up'), the same
// vocabulary as addNode({ relativeTo: { direction } }).

export const DIRECTION_PORTS = { right: 'right', left: 'left', down: 'bottom', up: 'top' };
export const PORT_DIRECTIONS = { right: 'right', left: 'left', bottom: 'down', top: 'up' };

const OPPOSITE_DIRECTIONS = { right: 'left', left: 'right', down: 'up', up: 'down' };
const DIRECTION_VECTORS = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
};

export const BRANCH_GAP = 72;
export const SIBLING_GAP = 24;
const COLLISION_GAP = 12;
const COLLISION_STEP = 12;
const MAX_COLLISION_STEPS = 400;
const BRANCH_RING_STEP = 48;
const MAX_BRANCH_RINGS = 8;
// Half-angle of the preferred navigation cone (60 degrees).
const NAVIGATION_CONE = Math.tan(Math.PI / 3);

function centerOf(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

export function oppositeDirection(direction) {
  return OPPOSITE_DIRECTIONS[direction] || 'left';
}

/** Dominant screen direction from one node's centre to another's. */
export function directionBetween(from, to) {
  const a = centerOf(from);
  const b = centerOf(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

/**
 * Nearest node in `direction` from `fromNode`. Candidates are scored by their
 * distance along the direction plus twice their perpendicular offset; nodes
 * inside a 60-degree half-cone win over the rest of the half-plane.
 */
export function findSpatialNeighbor(nodes, fromNode, direction) {
  const vector = DIRECTION_VECTORS[direction];
  if (!vector || !fromNode) return null;
  const origin = centerOf(fromNode);
  let bestCone = null;
  let bestPlane = null;
  nodes.forEach((node) => {
    if (node.id === fromNode.id) return;
    const center = centerOf(node);
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const along = dx * vector.x + dy * vector.y;
    if (along <= 0) return;
    const across = Math.abs(dx * vector.y - dy * vector.x);
    const score = along + across * 2;
    if (across <= along * NAVIGATION_CONE && (!bestCone || score < bestCone.score)) {
      bestCone = { node, score };
    }
    if (!bestPlane || score < bestPlane.score) bestPlane = { node, score };
  });
  return (bestCone || bestPlane)?.node ?? null;
}

/** Node whose centre is closest to `point`. */
export function findNearestNode(nodes, point) {
  let best = null;
  nodes.forEach((node) => {
    const center = centerOf(node);
    const distance = Math.hypot(center.x - point.x, center.y - point.y);
    if (!best || distance < best.distance) best = { node, distance };
  });
  return best?.node ?? null;
}

function overlapsAny(rect, nodes) {
  return nodes.some(
    (node) =>
      rect.x < node.x + node.width + COLLISION_GAP &&
      rect.x + rect.width + COLLISION_GAP > node.x &&
      rect.y < node.y + node.height + COLLISION_GAP &&
      rect.y + rect.height + COLLISION_GAP > node.y,
  );
}

/**
 * Top-left position for a new node of `size` on the `direction` side of
 * `parent`. With `anchor` (a sibling) the node goes right after it — or right
 * before it when `before` is set; otherwise it goes after the last sibling on
 * that side, or level with the parent when there is none, then moves to the
 * nearest spot that overlaps nothing in `nodes`.
 */
export function placeBranchNode({
  nodes,
  parent,
  siblings = [],
  direction,
  size,
  anchor = null,
  before = false,
}) {
  const horizontal = direction === 'right' || direction === 'left';
  const cross = horizontal ? 'y' : 'x';
  const crossSize = horizontal ? 'height' : 'width';
  const lastSibling = siblings.reduce(
    (last, node) =>
      !last || node[cross] + node[crossSize] > last[cross] + last[crossSize] ? node : last,
    null,
  );
  const reference = anchor || lastSibling;

  const rect = { x: 0, y: 0, width: size.width, height: size.height };
  if (reference) {
    if (direction === 'right') rect.x = reference.x;
    if (direction === 'left') rect.x = reference.x + reference.width - size.width;
    if (direction === 'down') rect.y = reference.y;
    if (direction === 'up') rect.y = reference.y + reference.height - size.height;
    rect[cross] = before
      ? reference[cross] - SIBLING_GAP - size[crossSize]
      : reference[cross] + reference[crossSize] + SIBLING_GAP;
  } else {
    if (direction === 'right') rect.x = parent.x + parent.width + BRANCH_GAP;
    if (direction === 'left') rect.x = parent.x - BRANCH_GAP - size.width;
    if (direction === 'down') rect.y = parent.y + parent.height + BRANCH_GAP;
    if (direction === 'up') rect.y = parent.y - BRANCH_GAP - size.height;
    rect[cross] = parent[cross] + parent[crossSize] / 2 - size[crossSize] / 2;
  }

  // A sibling keeps its order by sliding one way only; a first child may go
  // either way from level with its parent.
  const crossSign = reference ? (before ? -1 : 1) : 0;
  const result = nearestFreeSlot(
    rect,
    nodes,
    cross,
    horizontal ? 'x' : 'y',
    DIRECTION_VECTORS[direction],
    crossSign,
  );
  return { x: Math.round(result.x * 100) / 100, y: Math.round(result.y * 100) / 100 };
}

function crossOffsetAt(index, crossSign) {
  if (crossSign) return crossSign * COLLISION_STEP * index;
  return COLLISION_STEP * Math.ceil(index / 2) * (index % 2 ? 1 : -1);
}

// Free spot closest to the ideal position: slide along the sibling axis and,
// when that column is crowded, step further out along the branch.
function nearestFreeSlot(rect, nodes, cross, main, vector, crossSign) {
  const origin = { ...rect };
  const outward = vector.x + vector.y;
  let best = null;
  for (let ring = 0; ring <= MAX_BRANCH_RINGS; ring += 1) {
    const mainOffset = ring * BRANCH_RING_STEP;
    if (best && mainOffset >= best.cost) break;
    const candidate = { ...origin, [main]: origin[main] + outward * mainOffset };
    for (let index = 0; index <= MAX_COLLISION_STEPS; index += 1) {
      const crossOffset = crossOffsetAt(index, crossSign);
      const cost = Math.hypot(mainOffset, crossOffset);
      if (best && cost >= best.cost) break;
      candidate[cross] = origin[cross] + crossOffset;
      if (!overlapsAny(candidate, nodes)) {
        best = { rect: { ...candidate }, cost };
        break;
      }
    }
  }
  return best ? best.rect : origin;
}
