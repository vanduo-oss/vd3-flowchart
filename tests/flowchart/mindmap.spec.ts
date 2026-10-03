import { describe, expect, it } from 'vitest';
import {
  BRANCH_GAP,
  directionBetween,
  findSpatialNeighbor,
  placeBranchNode,
} from '../../src/mindmap.js';

const node = (id: string, x: number, y: number, width = 100, height = 50) => ({
  id,
  x,
  y,
  width,
  height,
});

describe('mind-map geometry', () => {
  it('reports the dominant direction between node centres', () => {
    expect(directionBetween(node('a', 0, 0), node('b', 300, 40))).toBe('right');
    expect(directionBetween(node('a', 0, 0), node('b', -40, -300))).toBe('up');
  });

  it('prefers a node inside the direction cone over a closer diagonal one', () => {
    const origin = node('o', 0, 0);
    const diagonal = node('diag', 30, 60);
    const ahead = node('ahead', 400, 0);
    expect(findSpatialNeighbor([origin, diagonal, ahead], origin, 'right')?.id).toBe('ahead');
    expect(findSpatialNeighbor([origin, ahead], origin, 'left')).toBeNull();
  });

  it('places a first child beside the parent and slides past occupied space', () => {
    const parent = node('p', 0, 0);
    const size = { width: 100, height: 50 };
    expect(placeBranchNode({ nodes: [parent], parent, direction: 'right', size })).toEqual({
      x: 100 + BRANCH_GAP,
      y: 0,
    });

    const blocker = node('b', 100 + BRANCH_GAP, 0);
    const placed = placeBranchNode({ nodes: [parent, blocker], parent, direction: 'right', size });
    expect(placed.x).toBe(100 + BRANCH_GAP);
    expect(placed.y).toBeGreaterThanOrEqual(50);
  });

  it('steps further out along the branch when the first column is crowded', () => {
    const parent = node('p', 0, 0);
    const column = node('column', 100 + BRANCH_GAP, -1000, 100, 2000);
    const placed = placeBranchNode({
      nodes: [parent, column],
      parent,
      direction: 'right',
      size: { width: 100, height: 50 },
    });
    expect(placed.y).toBe(0);
    expect(placed.x).toBeGreaterThan(column.x + column.width);
  });

  it('stacks before an anchor sibling when asked', () => {
    const parent = node('p', 0, 0);
    const sibling = node('s', 0, 200);
    const placed = placeBranchNode({
      nodes: [parent, sibling],
      parent,
      siblings: [sibling],
      direction: 'down',
      size: { width: 100, height: 50 },
      anchor: sibling,
      before: true,
    });
    expect(placed.y).toBe(200);
    expect(placed.x).toBeLessThan(-100);
  });
});
