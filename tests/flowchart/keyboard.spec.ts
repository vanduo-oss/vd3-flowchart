// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
  selection: { kind: string; id: string } | null;
  shortcutsHelp: HTMLElement;
};

const editors: Editor[] = [];

function editor(data: Record<string, unknown>, options: Record<string, unknown> = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({ element, data, ...options }) as Editor;
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

function textEditor(element: HTMLElement) {
  return element.querySelector<HTMLTextAreaElement>('.vd-flowchart-text-editor');
}

const box = { type: 'rect', width: 180, height: 96 };
const cross = {
  nodes: [
    { id: 'c', text: 'Centre', x: 300, y: 300, ...box },
    { id: 'r', text: 'Right', x: 600, y: 320, ...box },
    { id: 'l', text: 'Left', x: 0, y: 280, ...box },
    { id: 'd', text: 'Down', x: 280, y: 600, ...box },
    { id: 'u', text: 'Up', x: 320, y: 0, ...box },
  ],
};
const tree = {
  nodes: [
    { id: 'root', text: 'Root', x: 0, y: 0, ...box },
    { id: 'kid', text: 'Kid', x: 300, y: 0, ...box },
  ],
  edges: [
    {
      id: 'e1',
      from: { nodeId: 'root', port: 'right' },
      to: { nodeId: 'kid', port: 'left' },
      route: 'orthogonal',
      strokeWidth: 3.5,
    },
  ],
};

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('keyboard graph access', () => {
  it('moves the selection spatially with arrow keys while editable and read-only', () => {
    const { instance, canvas } = editor(cross);
    instance.selectNode('c');
    press(canvas, 'ArrowRight');
    expect(instance.selection?.id).toBe('r');
    press(canvas, 'ArrowLeft');
    expect(instance.selection?.id).toBe('c');
    press(canvas, 'ArrowDown');
    expect(instance.selection?.id).toBe('d');
    instance.updateOptions({ readonly: true });
    press(canvas, 'ArrowUp');
    expect(instance.selection?.id).toBe('c');
    press(canvas, 'ArrowUp');
    expect(instance.selection?.id).toBe('u');
    expect(document.activeElement).toBe(canvas);
  });

  it('starts from the node nearest the view centre when nothing is selected', () => {
    const { instance, canvas } = editor({ ...cross, viewport: { x: -10, y: -40, scale: 1 } });
    press(canvas, 'ArrowRight');
    expect(instance.selection?.id).toBe('c');
  });

  it('exposes relationships and connects nodes with native controls', () => {
    const { instance, element } = editor({
      nodes: [
        { id: 'a', text: 'Start' },
        { id: 'b', text: 'End' },
      ],
    });
    const outline = element.querySelector('details')!;
    outline.open = true;
    outline.dispatchEvent(new Event('toggle'));
    const source = element.querySelector<HTMLSelectElement>('[aria-label="Selected node"]')!;
    const target = element.querySelector<HTMLSelectElement>('[aria-label="Connection target"]')!;
    source.value = 'a';
    source.dispatchEvent(new Event('change'));
    target.value = 'b';
    target.dispatchEvent(new Event('change'));
    [...outline.querySelectorAll('button')].find((b) => b.textContent === 'Connect nodes')!.click();
    expect(instance.toJSON().edges).toHaveLength(1);
    expect(outline.textContent).toContain('Start. Connects to End.');
    expect(outline.textContent).toContain('Connected from Start.');
    expect(target.value).toBe('b');
    instance.undo();
    expect(instance.toJSON().edges).toHaveLength(0);
  });

  it('associates outline labels with their controls and refuses self-connection', () => {
    const { instance, element } = editor({
      nodes: [
        { id: 'a', text: 'Start' },
        { id: 'b', text: 'End' },
      ],
    });
    const outline = element.querySelector('details')!;
    outline.open = true;
    outline.dispatchEvent(new Event('toggle'));
    const source = element.querySelector<HTMLSelectElement>('[aria-label="Selected node"]')!;
    const target = element.querySelector<HTMLSelectElement>('[aria-label="Connection target"]')!;
    const connect = [...outline.querySelectorAll('button')].find(
      (b) => b.textContent === 'Connect nodes',
    )!;
    const sourceLabel = element.querySelector(`label[for="${source.id}"]`);
    const targetLabel = element.querySelector(`label[for="${target.id}"]`);
    expect(sourceLabel?.textContent).toBe('Selected node');
    expect(targetLabel?.textContent).toBe('Connection target');
    source.value = 'a';
    source.dispatchEvent(new Event('change'));
    target.value = 'a';
    target.dispatchEvent(new Event('change'));
    expect(connect.disabled).toBe(true);
    connect.click();
    expect(instance.toJSON().edges).toHaveLength(0);
  });
});

describe('mind-map keyboard model', () => {
  it('adds a connected child with Tab, opens it for editing, and undoes in one step', () => {
    const { instance, element, canvas } = editor({ nodes: [tree.nodes[0]] });
    instance.selectNode('root');
    const event = press(canvas, 'Tab');
    expect(event.defaultPrevented).toBe(true);

    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(2);
    const child = doc.nodes[1];
    expect(child.x).toBeGreaterThan(180);
    expect(doc.edges[0]).toMatchObject({
      from: { nodeId: 'root', port: 'right' },
      to: { nodeId: child.id, port: 'left' },
    });
    expect(textEditor(element)).not.toBeNull();
    expect(document.activeElement).toBe(textEditor(element));

    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(1);
    expect(instance.toJSON().edges).toHaveLength(0);
  });

  it('builds a map with Tab, typing, Enter, and Enter', () => {
    const { instance, element, canvas } = editor({ nodes: [tree.nodes[0]] });
    instance.selectNode('root');
    press(canvas, 'Tab');
    const first = textEditor(element)!;
    first.value = 'Alpha';
    press(first, 'Enter');
    expect(textEditor(element)).toBeNull();
    expect(document.activeElement).toBe(canvas);
    const alpha = instance.toJSON().nodes[1];
    expect(alpha.text).toBe('Alpha');

    press(canvas, 'Enter');
    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(3);
    const beta = doc.nodes[2];
    expect(beta.x).toBe(alpha.x);
    expect(beta.y).toBeGreaterThan(alpha.y + alpha.height);
    expect(doc.edges.map((edge) => edge.from.nodeId)).toEqual(['root', 'root']);
    expect(textEditor(element)).not.toBeNull();

    instance.stopTextEdit({ commit: false });
    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(2);
    instance.undo();
    expect(instance.toJSON().nodes).toHaveLength(1);
  });

  it('adds a sibling above with Shift+Enter and copies the sibling edge style', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, 'Enter', { shiftKey: true });
    const doc = instance.toJSON();
    const added = doc.nodes[2];
    expect(added.y).toBeLessThan(0);
    expect(doc.edges[1]).toMatchObject({ route: 'orthogonal', strokeWidth: 3.5 });
  });

  it('reads branch sides from edge ports, not diagonal geometry', () => {
    const { instance, canvas } = editor({
      nodes: [
        { id: 'root', x: 0, y: 0, ...box },
        { id: 'diag', x: 200, y: 96, ...box },
      ],
      edges: [
        { id: 'e', from: { nodeId: 'root', port: 'bottom' }, to: { nodeId: 'diag', port: 'top' } },
      ],
    });
    instance.selectNode('root');
    press(canvas, 'Tab');
    const added = instance.toJSON().nodes[2];
    expect(instance.toJSON().edges[1].from.port).toBe('right');
    expect(added.x).toBeGreaterThan(180);
    expect(Math.abs(added.y)).toBeLessThan(200);
  });

  it('commits a label and adds a child with Tab inside the editor', () => {
    const { instance, element, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, 'F2');
    const input = textEditor(element)!;
    expect(input.value).toBe('Kid');
    input.value = 'Renamed';
    press(input, 'Tab');
    const doc = instance.toJSON();
    expect(doc.nodes.find((node) => node.id === 'kid')?.text).toBe('Renamed');
    expect(doc.nodes).toHaveLength(3);
    expect(doc.edges[1].from.nodeId).toBe('kid');
    expect(doc.nodes[2].x).toBeGreaterThan(480);
  });

  it('starts editing with Space or by typing a character', () => {
    const { instance, element, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, ' ');
    expect(textEditor(element)?.value).toBe('Kid');
    instance.stopTextEdit({ commit: false });
    canvas.focus();
    press(canvas, 'Q');
    expect(textEditor(element)?.value).toBe('Q');
  });

  it('keeps Shift+Tab and Tab without a selection for focus movement', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    expect(press(canvas, 'Tab', { shiftKey: true }).defaultPrevented).toBe(false);
    expect(press(canvas, 'Escape').defaultPrevented).toBe(true);
    expect(instance.selection).toBeNull();
    expect(press(canvas, 'Tab').defaultPrevented).toBe(false);
    expect(press(canvas, 'Escape').defaultPrevented).toBe(false);
    expect(instance.toJSON().nodes).toHaveLength(2);
  });

  it('nudges with Alt+Arrow and undoes a burst in one step', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, 'ArrowRight', { altKey: true });
    press(canvas, 'ArrowDown', { altKey: true, shiftKey: true });
    expect(instance.toJSON().nodes[1]).toMatchObject({ x: 324, y: 1 });
    instance.undo();
    expect(instance.toJSON().nodes[1]).toMatchObject({ x: 300, y: 0 });
  });

  it('deletes a node and selects its parent', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, 'Delete');
    expect(instance.toJSON().nodes).toHaveLength(1);
    expect(instance.selection?.id).toBe('root');
  });

  it('duplicates with Cmd/Ctrl+D', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    expect(press(canvas, 'd', { ctrlKey: true }).defaultPrevented).toBe(true);
    const doc = instance.toJSON();
    expect(doc.nodes).toHaveLength(3);
    expect(doc.nodes[2]).toMatchObject({ text: 'Kid', x: 324, y: 24 });
  });

  it('zooms with Cmd/Ctrl + = and returns to 100% with Cmd/Ctrl+0', () => {
    const { instance, canvas } = editor(tree);
    press(canvas, '=', { metaKey: true });
    expect(instance.toJSON().viewport.scale).toBeGreaterThan(1);
    press(canvas, '0', { metaKey: true });
    expect(instance.toJSON().viewport.scale).toBe(1);
  });

  it('toggles the shortcuts overlay with ? and closes it with Escape', () => {
    const { instance, canvas } = editor(tree);
    instance.selectNode('kid');
    press(canvas, '?');
    expect(instance.shortcutsHelp.hidden).toBe(false);
    expect(instance.shortcutsHelp.textContent).toContain('Add a child node');
    press(canvas, 'Escape');
    expect(instance.shortcutsHelp.hidden).toBe(true);
    expect(instance.selection?.id).toBe('kid');
  });

  it('turns the mind-map keys off in basic mode', () => {
    const { instance, element, canvas } = editor(tree, { keyboardShortcuts: 'basic' });
    instance.selectNode('kid');
    expect(press(canvas, 'Tab').defaultPrevented).toBe(false);
    press(canvas, 'x');
    expect(textEditor(element)).toBeNull();
    press(canvas, 'Enter');
    const input = textEditor(element)!;
    expect(input.value).toBe('Kid');
    expect(press(input, 'Enter').defaultPrevented).toBe(false);
    expect(textEditor(element)).not.toBeNull();
    press(input, 'Enter', { metaKey: true });
    expect(textEditor(element)).toBeNull();
    expect(instance.toJSON().nodes).toHaveLength(2);
    expect(instance.shortcutsHelp.textContent).toBe('');
    instance.toggleShortcutsHelp(true);
    expect(instance.shortcutsHelp.textContent).not.toContain('Add a child node');
  });

  it('switches keyboard models in place', () => {
    const { instance, canvas } = editor(tree, { keyboardShortcuts: 'basic' });
    instance.updateOptions({ keyboardShortcuts: 'mindmap' });
    instance.selectNode('kid');
    expect(press(canvas, 'Tab').defaultPrevented).toBe(true);
    expect(canvas.getAttribute('aria-label')).toContain('Tab adds a child');
  });
});
