// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  selection: { kind: string; id: string } | null;
  handleDoubleClick: (event: MouseEvent) => void;
};

const editors: Editor[] = [];
const box = { type: 'rect', width: 180, height: 96 };

function editor(options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: {
      nodes: [
        { id: 'a', text: 'A', x: 0, y: 0, ...box },
        { id: 'b', text: 'B', x: 400, y: -100, ...box },
        { id: 'c', text: 'C', x: 400, y: 200, ...box },
        { id: 'd', text: 'D', x: 0, y: 300, ...box },
      ],
      edges: [
        { id: 'ab', from: { nodeId: 'a', port: 'right' }, to: { nodeId: 'b', port: 'left' } },
        { id: 'ac', from: { nodeId: 'a', port: 'right' }, to: { nodeId: 'c', port: 'left' } },
        { id: 'da', from: { nodeId: 'd', port: 'top' }, to: { nodeId: 'a', port: 'bottom' } },
      ],
    },
    ...options,
  }) as Editor;
  editors.push(instance);
  const canvas = element.querySelector<HTMLElement>('.vd-flowchart-canvas')!;
  canvas.focus();
  return { instance, element, canvas };
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

const labelEditor = (element: HTMLElement) =>
  element.querySelector<HTMLTextAreaElement>('.vd-flowchart-text-editor--edge');

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('connection labels from the keyboard', () => {
  it('selects and cycles the connections on a side with Shift+Arrow', () => {
    const { instance, canvas } = editor();
    instance.selectNode('a');
    press(canvas, 'ArrowRight', { shiftKey: true });
    expect(instance.selection).toEqual({ kind: 'edge', id: 'ab' });
    press(canvas, 'ArrowRight', { shiftKey: true });
    expect(instance.selection).toEqual({ kind: 'edge', id: 'ac' });
    press(canvas, 'ArrowRight', { shiftKey: true });
    expect(instance.selection).toEqual({ kind: 'edge', id: 'ab' });
  });

  it('reaches incoming connections and ignores empty sides', () => {
    const { instance, canvas } = editor();
    instance.selectNode('a');
    press(canvas, 'ArrowDown', { shiftKey: true });
    expect(instance.selection).toEqual({ kind: 'edge', id: 'da' });
    instance.selectNode('a');
    expect(press(canvas, 'ArrowLeft', { shiftKey: true }).defaultPrevented).toBe(false);
    expect(instance.selection).toEqual({ kind: 'node', id: 'a' });
  });

  it('types a label, saves it with Enter, and undoes it in one step', () => {
    const { instance, element, canvas } = editor();
    instance.selectNode('a');
    press(canvas, 'ArrowRight', { shiftKey: true });
    press(canvas, 'y');
    const input = labelEditor(element)!;
    expect(input.value).toBe('y');
    input.value = 'yes';
    press(input, 'Enter');
    expect(labelEditor(element)).toBeNull();
    expect(document.activeElement).toBe(canvas);
    expect(instance.toJSON().edges[0].label).toBe('yes');
    instance.undo();
    expect(instance.toJSON().edges[0].label).toBe('');
  });

  it('opens with F2, cancels with Escape, and clears with an empty label', () => {
    const { instance, element, canvas } = editor();
    instance.updateEdge('ab', { label: 'old' });
    instance.selectEdge('ab');
    press(canvas, 'F2');
    const input = labelEditor(element)!;
    expect(input.value).toBe('old');
    input.value = 'changed';
    press(input, 'Escape');
    expect(instance.toJSON().edges[0].label).toBe('old');
    press(canvas, 'Enter');
    labelEditor(element)!.value = '  ';
    press(labelEditor(element)!, 'Enter');
    expect(instance.toJSON().edges[0].label).toBe('');
  });

  it('moves from a connection to the end node in the pressed direction', () => {
    const { instance, canvas } = editor();
    instance.selectEdge('ab');
    press(canvas, 'ArrowRight');
    expect(instance.selection).toEqual({ kind: 'node', id: 'b' });
    instance.selectEdge('ab');
    press(canvas, 'ArrowLeft');
    expect(instance.selection).toEqual({ kind: 'node', id: 'a' });
  });

  it('edits the label on double-click', () => {
    const { instance, element } = editor();
    const hit = element.querySelector('[data-edge-id="ac"] .vd-flowchart-edge-hit')!;
    instance.handleDoubleClick({
      target: hit,
      preventDefault() {},
      stopPropagation() {},
    } as unknown as MouseEvent);
    expect(labelEditor(element)?.getAttribute('data-edge-id')).toBe('ac');
  });

  it('keeps typing for node labels only in basic mode', () => {
    const { instance, element, canvas } = editor({ keyboardShortcuts: 'basic' });
    instance.selectEdge('ab');
    press(canvas, 'y');
    expect(labelEditor(element)).toBeNull();
    press(canvas, 'Enter');
    expect(labelEditor(element)).not.toBeNull();
  });
});
