// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  guidesLayer: SVGGElement;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
};

const editors: Editor[] = [];

function editor(options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: {
      viewport: { x: 0, y: 0, scale: 1 },
      nodes: [
        { id: 'a', type: 'rect', x: 0, y: 0, width: 100, height: 50 },
        { id: 'b', type: 'rect', x: 300, y: 200, width: 100, height: 50 },
      ],
    },
    ...options,
  }) as Editor;
  instance.canvasEl.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 560, width: 800, height: 560 }) as DOMRect;
  editors.push(instance);
  return { instance, element };
}

function pointer(target: EventTarget, clientX: number, clientY: number, altKey = false) {
  return {
    button: 0,
    pointerId: 1,
    clientX,
    clientY,
    altKey,
    detail: 1,
    target,
    preventDefault() {},
  } as unknown as PointerEvent;
}

function drag(instance: Editor, element: HTMLElement, toX: number, toY: number, altKey = false) {
  const hitbox = element.querySelector('[data-node-id="b"] rect')!;
  instance.handlePointerDown(pointer(hitbox, 350, 225));
  instance.handlePointerMove(pointer(hitbox, toX, toY, altKey));
  const guides = instance.guidesLayer.querySelectorAll('.vd-flowchart-guide').length;
  instance.handlePointerUp(pointer(hitbox, toX, toY, altKey));
  return { guides, node: instance.toJSON().nodes.find((n) => n.id === 'b')! };
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('alignment guides', () => {
  it('snaps a near-aligned left edge and draws a guide while dragging', () => {
    const { instance, element } = editor();
    // Move b so its left edge lands 4px right of a's left edge (x = 4).
    const { guides, node } = drag(instance, element, 54, 125);
    expect(node.x).toBe(0);
    expect(node.y).toBe(100);
    expect(guides).toBeGreaterThan(0);
    expect(instance.guidesLayer.childNodes).toHaveLength(0);
  });

  it('snaps centres on the other axis', () => {
    const { instance, element } = editor();
    // b's vertical middle lands 3px below a's middle (y = 25).
    const { node } = drag(instance, element, 500, 28);
    expect(node.y).toBe(0);
  });

  it('does not snap beyond the threshold, with Alt, or when disabled', () => {
    const first = editor();
    expect(drag(first.instance, first.element, 60, 125).node.x).toBe(10);
    const second = editor();
    expect(drag(second.instance, second.element, 54, 125, true).node.x).toBe(4);
    const third = editor({ snapGuides: false });
    expect(drag(third.instance, third.element, 54, 125).node.x).toBe(4);
  });

  it('scales the threshold with zoom', () => {
    const { instance, element } = editor();
    instance.setViewport({ x: 0, y: 0, scale: 2 });
    // At 2x, 6 screen px is 3 world px: a 4 world px gap no longer snaps.
    const hitbox = element.querySelector('[data-node-id="b"] rect')!;
    instance.handlePointerDown(pointer(hitbox, 700, 450));
    instance.handlePointerMove(pointer(hitbox, 708, 250));
    instance.handlePointerUp(pointer(hitbox, 708, 250));
    expect(instance.toJSON().nodes.find((n) => n.id === 'b')!.x).toBe(304);
  });
});
