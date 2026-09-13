// computeLayout is a pure, framework-free function (no DOM), so this suite runs
// in the default `node` environment — proving the layout math is
// runtime-agnostic. It maps a document + mode to Map<nodeId, {x, y}> without
// mutating its input; the editor's layout() method applies the result in place.

import { describe, expect, it } from 'vitest';

import { computeLayout, LAYOUT_MODES } from '../../src/layout.js';

type Doc = {
  nodes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  edges: Array<{ from: { nodeId: string }; to: { nodeId: string } }>;
};

function node(id: string, x: number, y: number, width = 160, height = 96) {
  return { id, x, y, width, height };
}

function edge(from: string, to: string) {
  return { from: { nodeId: from }, to: { nodeId: to } };
}

function centerOf(
  result: Map<string, { x: number; y: number }>,
  doc: Doc,
  id: string,
): { x: number; y: number } {
  const pos = result.get(id)!;
  const n = doc.nodes.find((entry) => entry.id === id)!;
  return { x: pos.x + n.width / 2, y: pos.y + n.height / 2 };
}

describe('LAYOUT_MODES', () => {
  it('is exactly the three supported modes', () => {
    expect(LAYOUT_MODES).toEqual(['tree', 'radial', 'grid']);
  });
});

describe('computeLayout — invariants across every mode', () => {
  const doc: Doc = {
    nodes: [node('a', 0, 0), node('b', 300, 0), node('c', 600, 200)],
    edges: [edge('a', 'b'), edge('b', 'c')],
  };

  it.each(LAYOUT_MODES)('mode "%s" positions every node with finite coords', (mode) => {
    const result = computeLayout(doc, mode);
    expect(result.size).toBe(doc.nodes.length);
    for (const id of ['a', 'b', 'c']) {
      const pos = result.get(id)!;
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  it.each(LAYOUT_MODES)('mode "%s" never mutates the input document', (mode) => {
    const snapshot = JSON.stringify(doc);
    computeLayout(doc, mode);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it('returns an empty map for a node-less document', () => {
    expect(computeLayout({ nodes: [], edges: [] }, 'tree').size).toBe(0);
  });

  it('tolerates a missing/undefined document', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(computeLayout(undefined as any, 'tree').size).toBe(0);
  });

  it('falls back to tree for an unknown mode', () => {
    const unknown = computeLayout(doc, 'spiral' as never);
    const tree = computeLayout(doc, 'tree');
    expect([...unknown.entries()]).toEqual([...tree.entries()]);
  });
});

describe('computeLayout — tree', () => {
  it('keeps the root anchored and lays descendants out along the main axis', () => {
    const doc: Doc = {
      nodes: [node('root', 100, 100), node('child', 500, 400), node('grand', 900, 50)],
      edges: [edge('root', 'child'), edge('child', 'grand')],
    };
    const result = computeLayout(doc, 'tree');

    // The anchor (root, indegree 0) keeps its original center.
    const rootCenter = centerOf(result, doc, 'root');
    expect(rootCenter.x).toBeCloseTo(100 + 160 / 2, 5);
    expect(rootCenter.y).toBeCloseTo(100 + 96 / 2, 5);

    // Default direction is 'right': deeper nodes move further along +x.
    const childCenter = centerOf(result, doc, 'child');
    const grandCenter = centerOf(result, doc, 'grand');
    expect(childCenter.x).toBeGreaterThan(rootCenter.x);
    expect(grandCenter.x).toBeGreaterThan(childCenter.x);
    // A straight chain lines up on the cross axis.
    expect(childCenter.y).toBeCloseTo(rootCenter.y, 5);
    expect(grandCenter.y).toBeCloseTo(rootCenter.y, 5);
  });

  it('honors a downward direction (deeper nodes move along +y)', () => {
    const doc: Doc = {
      nodes: [node('root', 0, 0), node('child', 0, 0)],
      edges: [edge('root', 'child')],
    };
    const result = computeLayout(doc, 'tree', { direction: 'down' });
    expect(centerOf(result, doc, 'child').y).toBeGreaterThan(centerOf(result, doc, 'root').y);
  });
});

describe('computeLayout — grid', () => {
  it('snaps nodes into the requested number of columns', () => {
    const doc: Doc = {
      nodes: [node('a', 0, 0), node('b', 10, 0), node('c', 20, 0), node('d', 30, 0)],
      edges: [],
    };
    const result = computeLayout(doc, 'grid', { columns: 2 });

    const xs = new Set([...result.values()].map((p) => Math.round(p.x)));
    const ys = new Set([...result.values()].map((p) => Math.round(p.y)));
    // 4 nodes over 2 columns → a 2×2 grid: two distinct columns, two rows.
    expect(xs.size).toBe(2);
    expect(ys.size).toBe(2);
  });
});

describe('computeLayout — radial', () => {
  it('anchors the root at the center and rings children at the radius', () => {
    const doc: Doc = {
      nodes: [node('root', 200, 200), node('c1', 0, 0), node('c2', 0, 0)],
      edges: [edge('root', 'c1'), edge('root', 'c2')],
    };
    const result = computeLayout(doc, 'radial', { radius: 220 });

    const rootCenter = centerOf(result, doc, 'root');
    expect(rootCenter.x).toBeCloseTo(200 + 160 / 2, 5);
    expect(rootCenter.y).toBeCloseTo(200 + 96 / 2, 5);

    // Depth-1 children sit one ring (radius) out from the root center.
    for (const id of ['c1', 'c2']) {
      const c = centerOf(result, doc, id);
      const dist = Math.hypot(c.x - rootCenter.x, c.y - rootCenter.y);
      expect(dist).toBeCloseTo(220, 3);
    }
  });
});
