// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type AnyEditor = VdFlowchart & {
  canvasEl: HTMLElement;
  nodeElements: Map<string, Element>;
  edgeElements: Map<string, Element>;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
};

const editors: AnyEditor[] = [];

function editor() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    autoFit: false,
    data: {
      viewport: { x: 0, y: 0, scale: 1 },
      nodes: [
        { id: 'a', text: 'Start', type: 'rect', x: 40, y: 40, width: 160, height: 80 },
        { id: 'b', text: 'End', type: 'rect', x: 320, y: 40, width: 160, height: 80 },
        { id: 'c', text: 'Aside', type: 'rect', x: 40, y: 200, width: 160, height: 80 },
      ],
      edges: [
        {
          id: 'ab',
          from: { nodeId: 'a', port: 'right' },
          to: { nodeId: 'b', port: 'left' },
        },
        {
          id: 'bc',
          from: { nodeId: 'b', port: 'bottom' },
          to: { nodeId: 'c', port: 'top' },
        },
      ],
    },
  }) as AnyEditor;
  instance.canvasEl.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 560,
      width: 800,
      height: 560,
      toJSON() {
        return {};
      },
    }) as DOMRect;
  editors.push(instance);
  return { instance, element };
}

function pointer(target: EventTarget, clientX: number, clientY: number) {
  return {
    button: 0,
    pointerId: 1,
    clientX,
    clientY,
    detail: 1,
    target,
    preventDefault() {},
  } as unknown as PointerEvent;
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('drag-node incremental render', () => {
  it('moves one node, rebuilds only incident edges, and undoes the move', () => {
    const { instance, element } = editor();
    const hitbox = element.querySelector('[data-node-id="a"] rect')!;
    instance.handlePointerDown(pointer(hitbox, 60, 60));

    const dragged = instance.nodeElements.get('a')!;
    const unrelated = instance.nodeElements.get('c')!;
    const connected = instance.nodeElements.get('b')!;
    const incident = instance.edgeElements.get('ab')!;
    const nonIncident = instance.edgeElements.get('bc')!;
    const unrelatedPath = unrelated.outerHTML;
    const connectedPathBefore = incident.querySelector('path')?.getAttribute('d');

    instance.handlePointerMove(pointer(hitbox, 180, 110));

    expect(instance.nodeElements.get('a')).toBe(dragged);
    expect(instance.nodeElements.get('c')).toBe(unrelated);
    expect(instance.nodeElements.get('b')).toBe(connected);
    expect(instance.edgeElements.get('ab')).not.toBe(incident);
    expect(instance.edgeElements.get('bc')).toBe(nonIncident);
    expect(dragged.getAttribute('transform')).toBe('translate(160 90)');
    expect(dragged.classList.contains('is-dragging')).toBe(true);
    expect(unrelated.outerHTML).toBe(unrelatedPath);
    expect(element.querySelector('[data-node-id="c"]')?.textContent).toContain('Aside');
    expect(element.querySelector('[data-node-id="a"]')?.textContent).toContain('Start');
    expect(instance.edgeElements.get('ab')?.querySelector('path')?.getAttribute('d')).not.toBe(
      connectedPathBefore,
    );

    instance.handlePointerUp(pointer(instance.canvasEl, 180, 110));
    expect(instance.toJSON().nodes.find((n) => n.id === 'a')).toMatchObject({ x: 160, y: 90 });
    expect(instance.canUndo()).toBe(true);

    instance.undo();
    expect(instance.toJSON().nodes.find((n) => n.id === 'a')).toMatchObject({ x: 40, y: 40 });
    expect(element.querySelector('[data-node-id="a"]')?.textContent).toContain('Start');
    expect(element.querySelector('[data-node-id="c"]')?.textContent).toContain('Aside');
  });
});
