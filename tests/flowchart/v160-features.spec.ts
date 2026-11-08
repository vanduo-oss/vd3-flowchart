// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import {
  VdFlowchart,
  FLOWCHART_COLOR_PRESETS,
  FLOWCHART_EDGE_STROKE_STYLES,
  FLOWCHART_NODE_ALIGNMENTS,
  FLOWCHART_DISTRIBUTE_AXES,
} from '../../src/index.js';
import { VdFlowchart as VdFlowchartCore } from '../../src/core.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCore = VdFlowchartCore & Record<string, any>;

const instances: AnyCore[] = [];

function createEditor(options: Record<string, unknown> = {}): AnyCore {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new VdFlowchartCore({ element, ...options }) as AnyCore;
  instances.push(editor);
  return editor;
}

afterEach(() => {
  while (instances.length) {
    instances.pop()!.destroy();
  }
  document.body.replaceChildren();
});

function parseLastEndpoint(d: string): { x: number; y: number } {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return {
    x: numbers[numbers.length - 2],
    y: numbers[numbers.length - 1],
  };
}

describe('v1.6.0 — arrowhead endpoint retraction', () => {
  it('retracts curved arrow path endpoint before a diamond vertex so tip does not poke under the shape', () => {
    const editor = createEditor({
      data: {
        nodes: [
          { id: 'a', type: 'rounded-rect', x: 40, y: 120, width: 160, height: 84, text: 'Start' },
          { id: 'b', type: 'diamond', x: 320, y: 80, width: 156, height: 112, text: 'Decision' },
        ],
        edges: [
          {
            id: 'e-arrow',
            from: { nodeId: 'a', port: 'right' },
            to: { nodeId: 'b', port: 'left' },
            route: 'curve',
            endMarker: 'arrow',
          },
          {
            id: 'e-line',
            from: { nodeId: 'a', port: 'right' },
            to: { nodeId: 'b', port: 'left' },
            route: 'curve',
            startMarker: 'none',
            endMarker: 'none',
            kind: 'line',
          },
        ],
      },
    });

    const arrowPath = editor.element.querySelector(
      'path.vd-flowchart-edge-path[data-edge-id="e-arrow"]',
    ) as SVGPathElement;
    const linePath = editor.element.querySelector(
      'path.vd-flowchart-edge-path[data-edge-id="e-line"]',
    ) as SVGPathElement;

    const arrowEnd = parseLastEndpoint(arrowPath.getAttribute('d')!);
    const lineEnd = parseLastEndpoint(linePath.getAttribute('d')!);

    // Unmarked line reaches the port at x = 320; arrow path stops before x = 320
    // so the marker tip lands on the outer diamond border rather than inside the shape.
    expect(lineEnd.x).toBe(320);
    expect(arrowEnd.x).toBeLessThan(319);
  });
});

describe('v1.6.0 — node & edge coloring', () => {
  it('exports color presets and applies theme-adaptive presets to nodes and edges', () => {
    expect(FLOWCHART_COLOR_PRESETS).toContain('primary');
    expect(FLOWCHART_COLOR_PRESETS).toContain('teal');
    expect(FLOWCHART_COLOR_PRESETS).not.toContain('emerald');

    const editor = createEditor({
      data: {
        nodes: [
          { id: 'n1', type: 'rounded-rect', x: 50, y: 50, text: 'One' },
          { id: 'n2', type: 'rounded-rect', x: 300, y: 50, text: 'Two' },
        ],
        edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      },
    });

    // Default nodes and edges omit color fields in toJSON()
    expect(editor.toJSON().nodes[0].color).toBeUndefined();
    expect(editor.toJSON().edges[0].color).toBeUndefined();

    editor.setNodeColor('n1', 'primary');
    expect(editor.toJSON().nodes[0].color).toBe('primary');
    const nodeEl = editor.element.querySelector('.vd-flowchart-node[data-node-id="n1"]');
    expect(nodeEl?.getAttribute('data-color')).toBe('primary');

    editor.setEdgeColor('e1', 'danger');
    expect(editor.toJSON().edges[0].color).toBe('danger');
    const edgeEl = editor.element.querySelector('.vd-flowchart-edge[data-edge-id="e1"]');
    expect(edgeEl?.getAttribute('data-color')).toBe('danger');

    // Marker fill uses the edge color variable
    const markerPaths = editor.element.querySelectorAll('defs marker path');
    expect(
      Array.from(markerPaths).some((p) =>
        (p.getAttribute('fill') || '').includes('--vd-flowchart-palette-danger-edge'),
      ),
    ).toBe(true);

    // Clearing color removes serialized key
    editor.setNodeColor('n1', 'default');
    expect(editor.toJSON().nodes[0].color).toBeUndefined();
  });

  it('supports custom CSS fill, stroke, and textColor overrides on nodes and custom color on edges', () => {
    const editor = createEditor({
      data: {
        nodes: [
          { id: 'n1', type: 'rect', x: 40, y: 40, text: 'Custom' },
          { id: 'n2', type: 'rect', x: 260, y: 40, text: 'Target' },
        ],
        edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      },
    });

    editor.setNodeColor('n1', {
      fill: '#fef3c7',
      stroke: '#d97706',
      textColor: '#78350f',
    });

    const nodeJson = editor.toJSON().nodes[0];
    expect(nodeJson.fill).toBe('#fef3c7');
    expect(nodeJson.stroke).toBe('#d97706');
    expect(nodeJson.textColor).toBe('#78350f');

    const shapeEl = editor.element.querySelector(
      '.vd-flowchart-node[data-node-id="n1"] .vd-flowchart-node-shape',
    ) as SVGElement;
    expect(shapeEl.style.fill).toBeTruthy();
    expect(shapeEl.style.stroke).toBeTruthy();

    editor.setEdgeColor('e1', '#9333ea');
    expect(editor.toJSON().edges[0].color).toBe('#9333ea');

    editor.selectNode('n1');
    editor.clearSelectionColor();
    const cleared = editor.toJSON().nodes[0];
    expect(cleared.fill).toBeUndefined();
    expect(cleared.stroke).toBeUndefined();
    expect(cleared.textColor).toBeUndefined();
  });

  it('batches multi-selection color changes into a single undo step and accepts data.* fallbacks', () => {
    const editor = createEditor({
      data: {
        nodes: [
          { id: 'n1', type: 'rect', x: 40, y: 40, data: { color: 'teal', fill: '#ccfbf1' } },
          { id: 'n2', type: 'rect', x: 240, y: 40 },
        ],
        edges: [],
      },
    });

    expect(editor.toJSON().nodes[0].color).toBe('teal');
    expect(editor.toJSON().nodes[0].fill).toBe('#ccfbf1');

    editor.selectNodes(['n1', 'n2']);
    editor.setSelectionColor('violet');
    expect(editor.toJSON().nodes.map((n: { color?: string }) => n.color)).toEqual([
      'violet',
      'violet',
    ]);

    editor.undo();
    expect(editor.toJSON().nodes[0].color).toBe('teal');
    expect(editor.toJSON().nodes[1].color).toBeUndefined();
  });
});

describe('v1.6.0 — layer order (bringToFront, bringForward, sendBackward, sendToBack)', () => {
  it('reorders nodes in documentData and SVG DOM order and supports undo', () => {
    const editor = createEditor({
      data: {
        nodes: [
          { id: 'a', type: 'rect', x: 40, y: 40, text: 'A' },
          { id: 'b', type: 'rect', x: 80, y: 60, text: 'B' },
          { id: 'c', type: 'rect', x: 120, y: 80, text: 'C' },
        ],
        edges: [],
      },
    });

    const domOrder = () =>
      Array.from(editor.element.querySelectorAll('.vd-flowchart-nodes > .vd-flowchart-node')).map(
        (el) => el.getAttribute('data-node-id'),
      );

    expect(domOrder()).toEqual(['a', 'b', 'c']);

    editor.bringForward('a');
    expect(editor.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual(['b', 'a', 'c']);
    expect(domOrder()).toEqual(['b', 'a', 'c']);

    editor.bringToFront('b');
    expect(editor.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual(['a', 'c', 'b']);
    expect(domOrder()).toEqual(['a', 'c', 'b']);

    editor.sendBackward('b');
    expect(editor.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual(['a', 'b', 'c']);

    editor.sendToBack('c');
    expect(editor.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual(['c', 'a', 'b']);

    editor.undo();
    expect(editor.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('v1.6.0 — align & distribute multi-selection', () => {
  it('aligns and distributes selected nodes', () => {
    expect(FLOWCHART_NODE_ALIGNMENTS).toEqual([
      'left',
      'center',
      'right',
      'top',
      'middle',
      'bottom',
    ]);
    expect(FLOWCHART_DISTRIBUTE_AXES).toEqual(['horizontal', 'vertical']);

    const editor = createEditor({
      data: {
        nodes: [
          { id: 'n1', type: 'rect', x: 20, y: 40, width: 100, height: 60 },
          { id: 'n2', type: 'rect', x: 90, y: 120, width: 100, height: 60 },
          { id: 'n3', type: 'rect', x: 320, y: 200, width: 100, height: 60 },
        ],
        edges: [],
      },
    });

    editor.selectNodes(['n1', 'n2', 'n3']);
    editor.alignNodes('top');
    expect(editor.toJSON().nodes.map((n: { y: number }) => n.y)).toEqual([40, 40, 40]);

    editor.distributeNodes('horizontal');
    // Span is 20 to 420 (400px), 3 nodes of 100px = 300px, total gap = 100px -> 50px gap each
    // n1 at 20, n2 at 170, n3 at 320
    expect(editor.toJSON().nodes.map((n: { x: number }) => n.x)).toEqual([20, 170, 320]);
  });
});

describe('v1.6.0 — edge stroke styles, node locking, clipboard, and SVG export', () => {
  it('supports dashed, dotted, and animated edge stroke styles', () => {
    expect(FLOWCHART_EDGE_STROKE_STYLES).toEqual(['solid', 'dashed', 'dotted', 'animated']);

    const editor = createEditor({
      data: {
        nodes: [
          { id: 'a', type: 'rect', x: 20, y: 20 },
          { id: 'b', type: 'rect', x: 240, y: 20 },
        ],
        edges: [{ id: 'e1', from: 'a', to: 'b', strokeStyle: 'animated' }],
      },
    });

    expect(editor.toJSON().edges[0].strokeStyle).toBe('animated');
    const edgeEl = editor.element.querySelector('.vd-flowchart-edge[data-edge-id="e1"]');
    expect(edgeEl?.classList.contains('is-stroke-animated')).toBe(true);

    editor.updateEdge('e1', { strokeStyle: 'solid' });
    expect(editor.toJSON().edges[0].strokeStyle).toBeUndefined();
  });

  it('locks nodes against nudge, inline edit, and deleteSelection while preserving style on duplicate/copy/paste', () => {
    const editor = createEditor({
      data: {
        nodes: [{ id: 'a', type: 'rect', x: 50, y: 50, text: 'Locked', color: 'success' }],
        edges: [],
      },
    });

    editor.setNodeLocked('a', true);
    expect(editor.toJSON().nodes[0].locked).toBe(true);
    expect(
      editor.element
        .querySelector('.vd-flowchart-node[data-node-id="a"]')
        ?.classList.contains('is-locked'),
    ).toBe(true);

    // Locked node ignores nudge, inline edit, and deleteSelection
    expect(editor.nudgeNode('a', 'right', 20)).toBeNull();
    expect(editor.startTextEdit('a')).toBe(false);
    editor.selectNode('a');
    expect(editor.deleteSelection()).toBe(false);
    expect(editor.toJSON().nodes).toHaveLength(1);

    // Copy & paste preserves color
    expect(editor.copySelection()).toBe(true);
    const pasted = editor.pasteSelection();
    expect(pasted?.color).toBe('success');
    expect(editor.toJSON().nodes).toHaveLength(2);

    // Unlock allows deletion
    editor.selectNode('a');
    editor.toggleNodeLocked('a');
    expect(editor.toJSON().nodes[0].locked).toBeUndefined();
    expect(editor.deleteSelection()).toBe(true);
  });

  it('exports a standalone cropped SVG string with inlined colors and no interactive handles', () => {
    const editor = createEditor({
      data: {
        nodes: [
          { id: 'a', type: 'rounded-rect', x: 40, y: 60, text: 'Alpha', color: 'primary' },
          { id: 'b', type: 'diamond', x: 280, y: 60, text: 'Beta', fill: '#dcfce7' },
        ],
        edges: [{ id: 'e1', from: 'a', to: 'b', color: 'primary', strokeStyle: 'dashed' }],
      },
    });

    editor.selectNode('a');
    const svg = editor.exportSvg({ padding: 20, background: 'theme' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="20 40');
    expect(svg).toContain('#dbeafe');
    expect(svg).toContain('#dcfce7');
    expect(svg).not.toContain('vd-flowchart-ports');
    expect(svg).not.toContain('vd-flowchart-resize-handles');
  });

  it('exposes VdFlowchart Vue component alongside VdFlowchartCore', () => {
    expect(VdFlowchart).toBeTruthy();
  });
});
