// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VdFlowchart } from '../../src/core.js';

type Editor = VdFlowchart & {
  canvasEl: HTMLElement;
};

const editors: Editor[] = [];

function editor(nodes: Record<string, unknown>[]) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const instance = new VdFlowchart({
    element,
    data: { nodes, edges: [], viewport: { x: 0, y: 0, scale: 1 } },
  }) as Editor;
  editors.push(instance);
  return { instance, element };
}

afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy());
  document.body.replaceChildren();
});

describe('inline text edit silhouette', () => {
  it('keeps a circle SVG ellipse under a transparent --circle editor', () => {
    const { instance, element } = editor([
      { id: 'c', type: 'circle', x: 40, y: 40, width: 128, height: 128, text: 'Start' },
    ]);
    instance.startTextEdit('c');

    const node = element.querySelector('[data-node-id="c"]');
    expect(node?.classList.contains('is-editing')).toBe(true);
    expect(node?.querySelector('ellipse.vd-flowchart-node-shape')).not.toBeNull();

    const textarea = element.querySelector<HTMLTextAreaElement>('.vd-flowchart-text-editor');
    expect(textarea).not.toBeNull();
    expect(textarea?.classList.contains('vd-flowchart-text-editor--circle')).toBe(true);
    expect(getComputedStyle(textarea!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps a diamond polygon under a --diamond editor', () => {
    const { instance, element } = editor([
      { id: 'd', type: 'diamond', x: 40, y: 40, width: 184, height: 120, text: 'Decision' },
    ]);
    instance.startTextEdit('d');

    const node = element.querySelector('[data-node-id="d"]');
    expect(node?.querySelector('polygon.vd-flowchart-node-shape')).not.toBeNull();

    const textarea = element.querySelector<HTMLTextAreaElement>('.vd-flowchart-text-editor');
    expect(textarea?.classList.contains('vd-flowchart-text-editor--diamond')).toBe(true);
  });
});
