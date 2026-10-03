// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handlePointerUp: (event: PointerEvent) => void;
};

const editors: Editor[] = [];

function editor(nodes: Array<Record<string, unknown>>, options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: { viewport: { x: 0, y: 0, scale: 1 }, nodes },
    ...options,
  }) as Editor;
  instance.canvasEl.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 560, width: 800, height: 560 }) as DOMRect;
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

const num = (element: Element, name: string) => Number(element.getAttribute(name));

function circleHitsRect(circle: Element, rect: Element) {
  const cx = num(circle, 'cx');
  const cy = num(circle, 'cy');
  const r = num(circle, 'r');
  const x = num(rect, 'x');
  const y = num(rect, 'y');
  const nearestX = Math.max(x, Math.min(cx, x + num(rect, 'width')));
  const nearestY = Math.max(y, Math.min(cy, y + num(rect, 'height')));
  return Math.hypot(cx - nearestX, cy - nearestY) < r;
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('connection and resize handles', () => {
  it('draws corner resize squares only and puts connection handles outside the node', () => {
    const { instance, element } = editor([
      { id: 'a', type: 'rect', x: 40, y: 40, width: 180, height: 96 },
    ]);
    instance.selectNode('a');
    const node = element.querySelector('g.vd-flowchart-node[data-node-id="a"]')!;

    const handles = [...node.querySelectorAll('.vd-flowchart-resize-handle')];
    expect(handles.map((h) => h.getAttribute('data-resize-handle')).sort()).toEqual([
      'ne',
      'nw',
      'se',
      'sw',
    ]);

    const ports = [...node.querySelectorAll('.vd-flowchart-port')];
    expect(ports).toHaveLength(4);
    ports.forEach((port) => {
      const cx = num(port, 'cx');
      const cy = num(port, 'cy');
      expect(cx < 0 || cx > 180 || cy < 0 || cy > 96).toBe(true);
    });

    const cornerZones = [...node.querySelectorAll('.vd-flowchart-resize-zone')].filter(
      (zone) => (zone.getAttribute('data-resize-handle') || '').length === 2,
    );
    expect(cornerZones).toHaveLength(4);
    node.querySelectorAll('.vd-flowchart-port-hit').forEach((hit) => {
      cornerZones.forEach((zone) => expect(circleHitsRect(hit, zone)).toBe(false));
    });
  });

  it('frames non-rectangular selections and renders no handles when read-only', () => {
    const { instance, element } = editor([
      { id: 'c', type: 'circle', x: 0, y: 0, width: 128, height: 128 },
      { id: 'r', type: 'rect', x: 300, y: 0 },
    ]);
    instance.selectNode('c');
    expect(element.querySelectorAll('[data-node-id="c"] .vd-flowchart-selection-box')).toHaveLength(
      1,
    );
    instance.selectNode('r');
    expect(element.querySelectorAll('.vd-flowchart-selection-box')).toHaveLength(0);

    instance.updateOptions({ readonly: true });
    expect(element.querySelectorAll('.vd-flowchart-port-group')).toHaveLength(0);
  });

  it('adds a connected node when a handle is clicked without dragging', () => {
    const { instance, element } = editor([
      { id: 'a', type: 'rect', x: 40, y: 40, width: 180, height: 96, text: 'Start' },
    ]);
    instance.selectNode('a');
    const hit = element.querySelector(
      '[data-node-id="a"][data-port="bottom"] .vd-flowchart-port-hit',
    )!;
    instance.handlePointerDown(pointer(hit, 130, 148));
    instance.handlePointerMove(pointer(hit, 131, 149));
    instance.handlePointerUp(pointer(hit, 131, 149));

    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(2);
    expect(doc.nodes[1].y).toBeGreaterThan(136);
    expect(doc.edges[0]).toMatchObject({
      from: { nodeId: 'a', port: 'bottom' },
      to: { nodeId: doc.nodes[1].id, port: 'top' },
    });
    expect(element.querySelector('.vd-flowchart-text-editor')).not.toBeNull();

    instance.stopTextEdit({ commit: false });
    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(1);
    expect(instance.toJSON().edges).toHaveLength(0);
  });

  it('connects instead of adding when the handle is dragged to another node', () => {
    const { instance, element } = editor([
      { id: 'a', type: 'rect', x: 40, y: 40, width: 180, height: 96 },
      { id: 'b', type: 'rect', x: 400, y: 40, width: 180, height: 96 },
    ]);
    instance.selectNode('a');
    const hit = element.querySelector(
      '[data-node-id="a"][data-port="right"] .vd-flowchart-port-hit',
    )!;
    instance.handlePointerDown(pointer(hit, 232, 88));
    instance.handlePointerMove(pointer(hit, 300, 88));
    instance.handlePointerMove(pointer(hit, 410, 88));
    instance.handlePointerUp(pointer(hit, 410, 88));

    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(2);
    expect(doc.edges[0]).toMatchObject({
      from: { nodeId: 'a', port: 'right' },
      to: { nodeId: 'b', port: 'left' },
    });
  });
});
