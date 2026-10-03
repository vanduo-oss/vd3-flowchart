// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import fixture13 from '../fixtures/flowchart-doc-1.3.json';
import fixture11 from '../fixtures/flowchart-doc-1.1.json';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  selection: { kind: string; id: string } | null;
  handlePointerDown: (event: PointerEvent) => void;
};

const editors: Editor[] = [];
const box = { type: 'rect', width: 100, height: 50 };

function editor(data: Record<string, unknown>, options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({ element, data, ...options }) as Editor;
  editors.push(instance);
  const canvas = element.querySelector<HTMLElement>('.vd-flowchart-canvas')!;
  canvas.focus();
  return { instance, element, canvas };
}

const edge = (id: string, from: string, to: string) => ({
  id,
  from: { nodeId: from, port: 'right' },
  to: { nodeId: to, port: 'left' },
});

// root -> a -> a1 -> a2, root -> b, b -> shared, a -> shared
const tree = {
  nodes: [
    { id: 'root', x: 0, y: 0, ...box },
    { id: 'a', x: 200, y: 0, ...box },
    { id: 'a1', x: 400, y: 0, ...box },
    { id: 'a2', x: 600, y: 0, ...box },
    { id: 'b', x: 200, y: 200, ...box },
    { id: 'shared', x: 400, y: 200, ...box },
  ],
  edges: [
    edge('r-a', 'root', 'a'),
    edge('a-a1', 'a', 'a1'),
    edge('a1-a2', 'a1', 'a2'),
    edge('r-b', 'root', 'b'),
    edge('b-s', 'b', 'shared'),
    edge('a-s', 'a', 'shared'),
  ],
};

const renderedNodeIds = (element: HTMLElement) =>
  [...element.querySelectorAll('g.vd-flowchart-node')].map((g) => g.getAttribute('data-node-id'));

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('collapsible branches', () => {
  it('hides descendants and their connections and shows a +N badge', () => {
    const { instance, element } = editor(tree);
    expect(instance.setCollapsed('a', true)).toBe(true);
    expect(renderedNodeIds(element)).toEqual(['root', 'a', 'b', 'shared']);
    expect(element.querySelectorAll('g.vd-flowchart-edge[data-edge-id="a-a1"]')).toHaveLength(0);
    expect(element.querySelectorAll('g.vd-flowchart-edge[data-edge-id="a-s"]')).toHaveLength(1);
    const badge = element.querySelector('[data-collapse-toggle="a"]')!;
    expect(badge.textContent).toContain('+2');
    expect(instance.toJSON().nodes.filter((node) => 'collapsed' in node)).toEqual([
      expect.objectContaining({ id: 'a', collapsed: true }),
    ]);
  });

  it('keeps a shared child visible while another parent is expanded', () => {
    const { instance } = editor(tree);
    instance.setCollapsed('b', true);
    expect(instance.isNodeHidden('shared')).toBe(false);
    instance.setCollapsed('a', true);
    expect(instance.isNodeHidden('shared')).toBe(true);
  });

  it('cannot hide a collapsed node through a loop back to it', () => {
    const { instance } = editor({
      nodes: [
        { id: 'x', ...box },
        { id: 'y', ...box },
      ],
      edges: [edge('x-y', 'x', 'y'), edge('y-x', 'y', 'x')],
    });
    instance.setCollapsed('x', true);
    expect(instance.isNodeHidden('x')).toBe(false);
    expect(instance.isNodeHidden('y')).toBe(true);
  });

  it('toggles with the badge and Cmd/Ctrl+/, undoably', () => {
    const { instance, element, canvas } = editor(tree);
    instance.selectNode('a');
    canvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(instance.isNodeHidden('a1')).toBe(true);
    const badge = element.querySelector('[data-collapse-toggle="a"] circle')!;
    instance.handlePointerDown({
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      target: badge,
      preventDefault() {},
    } as unknown as PointerEvent);
    expect(instance.isNodeHidden('a1')).toBe(false);
    instance.undo();
    expect(instance.isNodeHidden('a1')).toBe(true);
    instance.undo();
    expect(instance.isNodeHidden('a1')).toBe(false);
  });

  it('moves the selection off hidden nodes and skips them in navigation and select-all', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('a2');
    instance.setCollapsed('a', true);
    expect(instance.selection).toEqual({ kind: 'node', id: 'a' });
    canvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(instance.selection?.id).not.toBe('a1');
    canvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(instance.getSelectedNodeIds().sort()).toEqual(['a', 'b', 'root', 'shared']);
  });

  it('expands a collapsed parent when a child is inserted', () => {
    const { instance } = editor(tree);
    instance.setCollapsed('a', true);
    instance.insertBranchNode('a');
    expect(instance.toJSON().nodes.find((node) => node.id === 'a')).not.toHaveProperty('collapsed');
    expect(instance.isNodeHidden('a1')).toBe(false);
    instance.undo();
    expect(instance.isNodeHidden('a1')).toBe(true);
  });

  it('refuses to collapse a leaf and is a no-op in read-only mode', () => {
    const { instance } = editor(tree);
    expect(instance.setCollapsed('a2', true)).toBe(false);
    instance.updateOptions({ readonly: true });
    expect(instance.setCollapsed('a', true)).toBe(false);
  });
});

describe('document format 1.3.0', () => {
  it('loads a 1.3.0 document with its collapsed branch and round-trips it', () => {
    const { instance, element } = editor({});
    instance.load(fixture13);
    expect(renderedNodeIds(element)).toEqual(['root', 'ideas', 'notes']);
    const doc = instance.toJSON();
    expect(doc.version).toBe('1.3.0');
    expect(doc.nodes.find((node) => node.id === 'ideas')).toMatchObject({ collapsed: true });
    expect(doc.nodes.filter((node) => 'collapsed' in node)).toHaveLength(1);
  });

  it('loads older documents fully expanded', () => {
    const { instance } = editor({});
    instance.load(fixture11);
    expect(instance.getVisibleNodes()).toHaveLength(instance.toJSON().nodes.length);
    expect(instance.toJSON().nodes.some((node) => 'collapsed' in node)).toBe(false);
  });

  it('ignores non-boolean collapsed values', () => {
    const { instance } = editor({
      nodes: [{ id: 'p', collapsed: 'yes' }, { id: 'c' }],
      edges: [edge('p-c', 'p', 'c')],
    });
    expect(instance.isNodeHidden('c')).toBe(false);
  });
});
