// @vitest-environment jsdom

// Node/edge model mutations + destroy() teardown for the flowchart core. The
// public model API (addNode/addEdge/updateNode/updateEdge/removeNode/
// removeEdge) is the surface the Vue wrapper and consumers drive; each mutation
// funnels through emitChange() with a reason. Runs in jsdom (the editor builds
// a DOM shell); rendering itself is a Playwright concern.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { VdFlowchart as VdFlowchartCore, FLOWCHART_PORTS } from '../../src/core.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCore = VdFlowchartCore & Record<string, any>;

const cores: AnyCore[] = [];

function makeCore(options: Record<string, unknown> = {}): AnyCore {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const core = new VdFlowchartCore({ element, ...options }) as AnyCore;
  cores.push(core);
  return core;
}

/** Collect the `reason` of every emitted `change`. */
function trackChanges(core: AnyCore): string[] {
  const reasons: string[] = [];
  core.on('change', (payload: { reason: string }) => reasons.push(payload.reason));
  return reasons;
}

afterEach(() => {
  while (cores.length) cores.pop()!.destroy();
  document.body.replaceChildren();
});

describe('flowchart model — addNode', () => {
  it('appends a normalized node and selects it', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', x: 40, y: 60, text: 'Hello' });

    expect(core.documentData.nodes).toHaveLength(1);
    expect(node).toMatchObject({ type: 'rect', x: 40, y: 60, text: 'Hello' });
    expect(typeof node.id).toBe('string');
    expect(core.selection).toEqual({ kind: 'node', id: node.id });
  });

  it('returns a deep clone (mutating the return value never leaks back)', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', text: 'X' });
    node.text = 'mutated';
    node.data.injected = true;
    expect(core.findNode(node.id).text).toBe('X');
    expect(core.findNode(node.id).data).toEqual({});
  });

  it('normalizes an unknown type to rounded-rect and clamps out-of-range size', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'nonsense', width: 5, height: 99999 });
    expect(node.type).toBe('rounded-rect');
    expect(node.width).toBeGreaterThanOrEqual(56); // MIN_NODE_SIZE
    expect(node.height).toBeLessThanOrEqual(420); // MAX_NODE_SIZE
  });

  it('emits change with reason "node:add"', () => {
    const core = makeCore();
    const reasons = trackChanges(core);
    core.addNode({ type: 'rect' });
    expect(reasons).toContain('node:add');
  });
});

describe('flowchart model — addEdge', () => {
  function twoNodes(core: AnyCore) {
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 400, y: 0 });
    return { a, b };
  }

  it('connects two nodes with a default arrow edge', () => {
    const core = makeCore();
    const { a, b } = twoNodes(core);
    const edge = core.addEdge({ from: a.id, to: b.id });

    expect(core.documentData.edges).toHaveLength(1);
    expect(edge.from.nodeId).toBe(a.id);
    expect(edge.to.nodeId).toBe(b.id);
    expect(edge.kind).toBe('arrow');
    expect(edge.endMarker).toBe('arrow');
    expect(FLOWCHART_PORTS).toContain(edge.from.port);
    expect(FLOWCHART_PORTS).toContain(edge.to.port);
    expect(core.selection).toEqual({ kind: 'edge', id: edge.id });
  });

  it('auto-picks facing ports with { autoPort: true }', () => {
    const core = makeCore();
    const { a, b } = twoNodes(core); // b is to the right of a
    const edge = core.addEdge({ from: a.id, to: b.id, autoPort: true });
    expect(edge.from.port).toBe('right');
    expect(edge.to.port).toBe('left');
  });

  it('emits both connect and change (reason "edge:add")', () => {
    const core = makeCore();
    const { a, b } = twoNodes(core);
    const reasons = trackChanges(core);
    const connects: unknown[] = [];
    core.on('connect', (p: unknown) => connects.push(p));

    core.addEdge({ from: a.id, to: b.id });

    expect(reasons).toContain('edge:add');
    expect(connects).toHaveLength(1);
  });

  it('rejects an edge referencing a missing node (returns null)', () => {
    const core = makeCore();
    const { a } = twoNodes(core);
    expect(core.addEdge({ from: a.id, to: 'ghost' })).toBeNull();
    expect(core.documentData.edges).toHaveLength(0);
  });

  it('rejects a self-loop on the same port', () => {
    const core = makeCore();
    const { a } = twoNodes(core);
    expect(
      core.addEdge({ from: { nodeId: a.id, port: 'top' }, to: { nodeId: a.id, port: 'top' } }),
    ).toBeNull();
  });
});

describe('flowchart model — updateNode / updateEdge', () => {
  it('patches node fields and returns the updated node', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', x: 0, y: 0, text: 'A' });
    const reasons = trackChanges(core);

    const updated = core.updateNode(node.id, { x: 120, y: 80, text: 'B' });
    expect(updated).toMatchObject({ x: 120, y: 80, text: 'B' });
    expect(core.findNode(node.id).text).toBe('B');
    expect(reasons).toContain('node:update');
  });

  it('returns null for an unknown node id', () => {
    const core = makeCore();
    expect(core.updateNode('missing', { text: 'x' })).toBeNull();
  });

  it('patches an edge label/route and returns the updated edge', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 400, y: 0 });
    const edge = core.addEdge({ from: a.id, to: b.id });

    const updated = core.updateEdge(edge.id, { label: 'yes', route: 'orthogonal' });
    expect(updated.label).toBe('yes');
    expect(updated.route).toBe('orthogonal');
  });
});

describe('flowchart model — removeNode / removeEdge', () => {
  it('removes a node and every edge that touched it', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 400, y: 0 });
    core.addEdge({ from: a.id, to: b.id });
    const reasons = trackChanges(core);

    expect(core.removeNode(a.id)).toBe(true);
    expect(core.documentData.nodes.map((n: { id: string }) => n.id)).toEqual([b.id]);
    expect(core.documentData.edges).toHaveLength(0); // dangling edge pruned
    expect(reasons).toContain('node:remove');
  });

  it('returns false when the node id does not exist', () => {
    const core = makeCore();
    expect(core.removeNode('ghost')).toBe(false);
  });

  it('cascade removal drops downstream descendants', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 300, y: 0 });
    const c = core.addNode({ type: 'rect', x: 600, y: 0 });
    core.addEdge({ from: a.id, to: b.id });
    core.addEdge({ from: b.id, to: c.id });

    core.removeNode(a.id, { cascade: true });
    expect(core.documentData.nodes).toHaveLength(0);
  });

  it('removeEdge deletes only the edge, leaving nodes intact', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 400, y: 0 });
    const edge = core.addEdge({ from: a.id, to: b.id });

    expect(core.removeEdge(edge.id)).toBe(true);
    expect(core.documentData.edges).toHaveLength(0);
    expect(core.documentData.nodes).toHaveLength(2);
    expect(core.removeEdge('ghost')).toBe(false);
  });
});

describe('flowchart model — clear', () => {
  it('empties nodes and edges and emits reason "clear"', () => {
    const core = makeCore();
    core.addNode({ type: 'rect' });
    core.addNode({ type: 'rect' });
    const reasons = trackChanges(core);

    core.clear();
    expect(core.documentData.nodes).toHaveLength(0);
    expect(core.documentData.edges).toHaveLength(0);
    expect(reasons).toContain('clear');
  });
});

describe('flowchart core — destroy() teardown', () => {
  it('flags destroyed, empties the host, and removes its window listeners', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const core = makeCore();
    const host = core.element as HTMLElement;
    expect(host.children.length).toBeGreaterThan(0);
    expect(host.classList.contains('vd-flowchart-host')).toBe(true);

    core.destroy();

    expect(core.destroyed).toBe(true);
    expect(host.innerHTML).toBe('');
    expect(host.classList.contains('vd-flowchart-host')).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('is idempotent — a second destroy() is a no-op', () => {
    const core = makeCore();
    core.destroy();
    expect(() => core.destroy()).not.toThrow();
    expect(core.destroyed).toBe(true);
  });
});
