// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

const editors: VdFlowchart[] = [];
const box = { type: 'rect', width: 100, height: 50 };

function editor(options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: {
      nodes: [
        { id: 'root', x: 0, y: 0, ...box },
        { id: 'k1', x: 300, y: -200, ...box },
        { id: 'k2', x: 300, y: 300, ...box },
      ],
      edges: [
        { id: 'r-k1', from: { nodeId: 'root', port: 'right' }, to: { nodeId: 'k1', port: 'left' } },
        { id: 'r-k2', from: { nodeId: 'root', port: 'right' }, to: { nodeId: 'k2', port: 'left' } },
      ],
    },
    ...options,
  });
  editors.push(instance);
  return instance;
}

const byId = (instance: VdFlowchart, id: string) =>
  instance.toJSON().nodes.find((node) => node.id === id)!;

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('sibling order of inserted connections', () => {
  it('splices a sibling connection after its anchor, or before it with Shift', () => {
    const instance = editor();
    const after = instance.insertSiblingNode('k1')!;
    expect(instance.toJSON().edges.map((edge) => edge.id)).toEqual([
      'r-k1',
      after.edge!.id,
      'r-k2',
    ]);
    const before = instance.insertSiblingNode('k2', { before: true })!;
    expect(instance.toJSON().edges.map((edge) => edge.id)).toEqual([
      'r-k1',
      after.edge!.id,
      before.edge!.id,
      'r-k2',
    ]);
  });

  it('leaves other nodes in place when autoLayout is off', () => {
    const instance = editor();
    instance.insertSiblingNode('k1');
    expect(byId(instance, 'k1')).toMatchObject({ x: 300, y: -200 });
    expect(byId(instance, 'k2')).toMatchObject({ x: 300, y: 300 });
  });
});

describe('autoLayout', () => {
  it('re-runs the tree layout with the new sibling between its neighbours, in one undo step', () => {
    const instance = editor({ autoLayout: true });
    const { node } = instance.insertSiblingNode('k1')!;
    const k1 = byId(instance, 'k1');
    const added = byId(instance, node.id);
    const k2 = byId(instance, 'k2');
    expect(added.x).toBe(k1.x);
    expect(k2.x).toBe(k1.x);
    expect(k1.y).toBeLessThan(added.y);
    expect(added.y).toBeLessThan(k2.y);

    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(3);
    expect(byId(instance, 'k1')).toMatchObject({ x: 300, y: -200 });
    expect(byId(instance, 'k2')).toMatchObject({ x: 300, y: 300 });
  });

  it('follows the current radial mode and skips grid', () => {
    const radial = editor({ autoLayout: true });
    radial.layout('radial');
    const before = byId(radial, 'k1');
    radial.insertBranchNode('root');
    expect(byId(radial, 'k1')).not.toEqual(before);

    const grid = editor({ autoLayout: true });
    grid.layout('grid');
    const gridBefore = byId(grid, 'k2');
    grid.insertBranchNode('root');
    expect(byId(grid, 'k2')).toEqual(gridBefore);
  });

  it('can be switched on in place', () => {
    const instance = editor();
    instance.updateOptions({ autoLayout: true });
    instance.insertSiblingNode('k1');
    expect(byId(instance, 'k1').y).not.toBe(-200);
  });
});
