// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  selection: { kind: string; id: string } | null;
  guidesLayer: SVGGElement;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
};

const editors: Editor[] = [];
const box = { type: 'rect', width: 100, height: 50 };

function editor() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    snapGuides: false,
    data: {
      viewport: { x: 0, y: 0, scale: 1 },
      nodes: [
        { id: 'a', text: 'A', x: 0, y: 0, ...box },
        { id: 'b', text: 'B', x: 200, y: 0, ...box },
        { id: 'c', text: 'C', x: 600, y: 400, ...box },
      ],
      edges: [
        { id: 'ab', from: { nodeId: 'a', port: 'right' }, to: { nodeId: 'b', port: 'left' } },
        { id: 'bc', from: { nodeId: 'b', port: 'right' }, to: { nodeId: 'c', port: 'left' } },
      ],
    },
  }) as Editor;
  instance.canvasEl.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 560, width: 800, height: 560 }) as DOMRect;
  editors.push(instance);
  const canvas = element.querySelector<HTMLElement>('.vd-flowchart-canvas')!;
  canvas.focus();
  return { instance, element, canvas };
}

function pointer(target: EventTarget, clientX: number, clientY: number, shiftKey = false) {
  return {
    button: 0,
    pointerId: 1,
    clientX,
    clientY,
    shiftKey,
    detail: 1,
    target,
    preventDefault() {},
  } as unknown as PointerEvent;
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

const hitbox = (element: HTMLElement, id: string) =>
  element.querySelector(`[data-node-id="${id}"] rect`)!;

function marquee(instance: Editor, element: HTMLElement) {
  const empty = element.querySelector('.vd-flowchart-grid')!;
  instance.handlePointerDown(pointer(empty, -20, -20, true));
  instance.handlePointerMove(pointer(empty, 320, 80, true));
  instance.handlePointerUp(pointer(empty, 320, 80, true));
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('multi-select', () => {
  it('toggles nodes with Shift+click and reports every id on select', () => {
    const { instance, element } = editor();
    const events: Array<{ selection: { id: string } | null; nodeIds: string[] }> = [];
    instance.on('select', (event) => events.push(event as never));
    instance.handlePointerDown(pointer(hitbox(element, 'a'), 10, 10));
    instance.handlePointerUp(pointer(hitbox(element, 'a'), 10, 10));
    instance.handlePointerDown(pointer(hitbox(element, 'c'), 610, 410, true));
    expect(instance.getSelectedNodeIds().sort()).toEqual(['a', 'c']);
    expect(events.at(-1)).toMatchObject({ selection: { id: 'c' }, nodeIds: ['a', 'c'] });
    expect(element.querySelectorAll('.vd-flowchart-node.is-selected')).toHaveLength(2);
    expect(element.querySelectorAll('.vd-flowchart-resize-handle')).toHaveLength(0);
    expect(element.textContent).toContain('2 nodes selected');
    instance.handlePointerDown(pointer(hitbox(element, 'c'), 610, 410, true));
    expect(instance.getSelectedNodeIds()).toEqual(['a']);
  });

  it('selects with a Shift+drag marquee and drags the group as one undo step', () => {
    const { instance, element } = editor();
    marquee(instance, element);
    expect(instance.getSelectedNodeIds().sort()).toEqual(['a', 'b']);
    expect(instance.guidesLayer.childNodes).toHaveLength(0);

    instance.handlePointerDown(pointer(hitbox(element, 'a'), 10, 10));
    instance.handlePointerMove(pointer(hitbox(element, 'a'), 60, 110));
    instance.handlePointerUp(pointer(hitbox(element, 'a'), 60, 110));
    const moved = instance.toJSON().nodes;
    expect(moved.find((n) => n.id === 'a')).toMatchObject({ x: 50, y: 100 });
    expect(moved.find((n) => n.id === 'b')).toMatchObject({ x: 250, y: 100 });
    expect(moved.find((n) => n.id === 'c')).toMatchObject({ x: 600, y: 400 });
    expect(instance.getSelectedNodeIds().sort()).toEqual(['a', 'b']);

    instance.undo();
    const restored = instance.toJSON().nodes;
    expect(restored.find((n) => n.id === 'a')).toMatchObject({ x: 0, y: 0 });
    expect(restored.find((n) => n.id === 'b')).toMatchObject({ x: 200, y: 0 });
  });

  it('selects all with Cmd/Ctrl+A and clears with Escape', () => {
    const { instance, canvas } = editor();
    press(canvas, 'a', { metaKey: true });
    expect(instance.getSelectedNodeIds()).toHaveLength(3);
    press(canvas, 'Escape');
    expect(instance.getSelectedNodeIds()).toHaveLength(0);
    expect(instance.selection).toBeNull();
  });

  it('nudges, duplicates, and deletes the group', () => {
    const { instance, canvas } = editor();
    instance.selectNodes(['a', 'b']);
    press(canvas, 'ArrowDown', { altKey: true });
    expect(
      instance
        .toJSON()
        .nodes.slice(0, 2)
        .map((n) => n.y),
    ).toEqual([24, 24]);

    press(canvas, 'd', { ctrlKey: true });
    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(5);
    expect(doc.edges).toHaveLength(3);
    const copies = instance.getSelectedNodeIds();
    expect(copies).toHaveLength(2);
    expect(doc.edges[2].from.nodeId).toBe(copies[0]);
    expect(doc.edges[2].to.nodeId).toBe(copies[1]);

    press(canvas, 'Delete');
    expect(instance.toJSON().nodes).toHaveLength(3);
    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(5);
  });

  it('copies and pastes a group with its internal connections', () => {
    const { instance, canvas } = editor();
    instance.selectNodes(['b', 'c']);
    press(canvas, 'c', { metaKey: true });
    press(canvas, 'v', { metaKey: true });
    press(canvas, 'v', { metaKey: true });
    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(7);
    expect(doc.edges).toHaveLength(4);
    expect(doc.nodes.at(-1)).toMatchObject({ text: 'C', x: 648, y: 448 });
  });

  it('turns off single-node keys for a group', () => {
    const { instance, element, canvas } = editor();
    instance.selectNodes(['a', 'b']);
    expect(press(canvas, 'Tab').defaultPrevented).toBe(false);
    press(canvas, 'x');
    expect(element.querySelector('.vd-flowchart-text-editor')).toBeNull();
    expect(instance.toJSON().nodes).toHaveLength(3);
  });
});
