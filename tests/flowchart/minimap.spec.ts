// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  minimapEl: HTMLElement;
  drawMinimap: () => void;
};

const editors: Editor[] = [];

function editor(options: Record<string, unknown> = {}, canvasWidth = 800) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: {
      viewport: { x: 0, y: 0, scale: 1 },
      nodes: [
        { id: 'a', type: 'rect', x: 0, y: 0, width: 100, height: 50 },
        { id: 'b', type: 'rect', x: 1000, y: 600, width: 100, height: 50 },
      ],
    },
    ...options,
  }) as Editor;
  Object.defineProperty(instance.canvasEl, 'clientWidth', { value: canvasWidth });
  Object.defineProperty(instance.canvasEl, 'clientHeight', { value: 400 });
  instance.minimapEl.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: 180, bottom: 120, width: 180, height: 120 }) as DOMRect;
  instance.drawMinimap();
  editors.push(instance);
  return { instance, element };
}

function minimapPointer(type: string, clientX: number, clientY: number) {
  return new PointerEvent(type, { bubbles: true, clientX, clientY, button: 0, pointerId: 7 });
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('minimap', () => {
  it('draws every node and the viewport frame', () => {
    const { instance } = editor();
    expect(instance.minimapEl.hidden).toBe(false);
    expect(instance.minimapEl.querySelectorAll('.vd-flowchart-minimap-node')).toHaveLength(2);
    expect(instance.minimapEl.querySelectorAll('.vd-flowchart-minimap-viewport')).toHaveLength(1);
  });

  it('centres the view on the clicked world point without changing the document', () => {
    const { instance } = editor();
    const before = JSON.stringify(instance.toJSON().nodes);
    const changes: string[] = [];
    instance.on('change', (event: { reason: string }) => changes.push(event.reason));
    // The far-right bottom corner of the map is near node b.
    instance.minimapEl.dispatchEvent(minimapPointer('pointerdown', 160, 100));
    instance.minimapEl.dispatchEvent(minimapPointer('pointerup', 160, 100));
    const viewport = instance.toJSON().viewport;
    expect(viewport.x).toBeLessThan(-500);
    expect(viewport.y).toBeLessThan(-200);
    expect(JSON.stringify(instance.toJSON().nodes)).toBe(before);
    expect(changes).toEqual(['viewport:pan']);
    expect(instance.canUndo()).toBe(false);
  });

  it('hides when disabled, toggled off, or on narrow canvases', () => {
    expect(editor({ minimap: false }).instance.minimapEl.hidden).toBe(true);
    expect(editor({}, 400).instance.minimapEl.hidden).toBe(true);
    const { instance, element } = editor();
    const button = element.querySelector<HTMLButtonElement>('[data-flowchart-action="minimap"]')!;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    expect(instance.minimapEl.hidden).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    instance.updateOptions({ minimap: true });
    expect(instance.minimapEl.hidden).toBe(false);
  });
});
