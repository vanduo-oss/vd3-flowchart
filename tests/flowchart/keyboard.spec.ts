// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';
const editors: VdFlowchart[] = [];
function editor() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: {
      nodes: [
        { id: 'a', text: 'Start' },
        { id: 'b', text: 'End' },
      ],
    },
  });
  editors.push(instance);
  return { instance, element };
}
afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('keyboard graph access', () => {
  it('selects nodes with arrow keys while editable and read-only', () => {
    const { instance, element } = editor();
    const canvas = element.querySelector<HTMLElement>('.vd-flowchart-canvas')!;
    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Start');
    instance.updateOptions({ readonly: true });
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(element.querySelector('[role="status"]')?.textContent).toContain('End');
    expect(document.activeElement).toBe(canvas);
  });

  it('exposes relationships and connects nodes with native controls', () => {
    const { instance, element } = editor();
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
    const { instance, element } = editor();
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
