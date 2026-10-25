// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { VdFlowchart as VdFlowchartCore } from '../../src/core.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCore = VdFlowchartCore & Record<string, any>;

const WIDE = { minScale: 0.05, maxScale: 20, minNodeSize: 6, maxNodeSize: 4800 };
const cores: AnyCore[] = [];

function makeCore(options: Record<string, unknown> = {}): AnyCore {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const core = new VdFlowchartCore({ element, ...options }) as AnyCore;
  cores.push(core);
  return core;
}

function markerWidth(core: AnyCore): number {
  const marker = core.svg.querySelector('marker');
  return Number(marker?.getAttribute('markerWidth') || 0);
}

afterEach(() => {
  while (cores.length) cores.pop()!.destroy();
  document.body.replaceChildren();
});

describe('deep zoom camera bounds', () => {
  it('keeps the legacy camera when options are omitted or inverted', () => {
    const legacy = makeCore();
    legacy.zoomTo(0.05);
    expect(legacy.toJSON().viewport.scale).toBe(0.35);
    legacy.zoomTo(20);
    expect(legacy.toJSON().viewport.scale).toBe(3);
    legacy.load({ viewport: { scale: 0.05 }, nodes: [], edges: [] });
    expect(legacy.toJSON().viewport.scale).toBe(0.35);

    const inverted = makeCore({ minScale: 20, maxScale: 0.05 });
    expect(inverted.minScale).toBe(0.35);
    expect(inverted.maxScale).toBe(3);
    inverted.setViewport({ scale: 0.05 });
    expect(inverted.toJSON().viewport.scale).toBe(0.35);
  });

  it('reaches 5% and 2000% from every camera ingress', () => {
    const core = makeCore(WIDE);
    core.zoomTo(0.05);
    expect(core.toJSON().viewport.scale).toBe(0.05);
    core.zoomIn();
    const stepped = core.toJSON().viewport.scale;
    expect(stepped).toBeGreaterThan(0.05);
    expect(stepped).toBe(Number(stepped.toFixed(4)));
    core.zoomTo(0.05);
    core.canvasEl.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, clientX: 10, clientY: 10 }));
    expect(core.toJSON().viewport.scale).toBeGreaterThan(0.05);

    core.zoomTo(20);
    expect(core.toJSON().viewport.scale).toBe(20);
    core.zoomOut();
    expect(core.toJSON().viewport.scale).toBeLessThan(20);
    core.setViewport({ x: 4, y: 6, scale: 20 });
    expect(core.toJSON().viewport).toMatchObject({ x: 4, y: 6, scale: 20 });
    core.resetView();
    expect(core.toJSON().viewport.scale).toBe(1);

    core.addNode({ id: 'left', type: 'rect', x: 0, y: 0, width: 180, height: 96 });
    core.addNode({ id: 'right', type: 'rect', x: 20000, y: 0, width: 180, height: 96 });
    core.fitView();
    expect(core.toJSON().viewport.scale).toBe(0.05);
  });

  it('keeps a legal wide scale across undo', () => {
    const core = makeCore(WIDE);
    core.zoomTo(0.05);
    core.addNode({ type: 'rect', text: 'A' });
    core.undo();
    expect(core.toJSON().nodes).toHaveLength(0);
    expect(core.toJSON().viewport.scale).toBe(0.05);
  });

  it('clamps the current camera once when the bounds narrow', () => {
    const core = makeCore(WIDE);
    const node = core.addNode({ id: 'keep', type: 'rect', text: 'Keep' });
    core.zoomTo(10);
    const history = core.historyIndex;
    core.updateOptions({ minScale: 0.35, maxScale: 3 });
    expect(core.toJSON().viewport.scale).toBe(3);
    expect(core.selection).toEqual({ kind: 'node', id: node.id });
    expect(core.historyIndex).toBe(history);
    expect(core.findNode(node.id).width).toBe(node.width);
  });
});

describe('deep zoom node bounds and rendering', () => {
  it('does not resize existing nodes when the size bounds change', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', width: 180, height: 96, text: 'Stay' });
    core.updateOptions({ minNodeSize: 6, maxNodeSize: 4800 });
    expect(core.findNode(node.id).width).toBe(180);
    expect(core.findNode(node.id).height).toBe(96);
    const grown = core.updateNode(node.id, { width: 4800, height: 4800 });
    expect(grown.width).toBe(4800);
    expect(grown.height).toBe(4800);
  });

  it('scales markers and labels for micro nodes but not for oversized nodes', () => {
    const core = makeCore(WIDE);
    const a = core.addNode({
      id: 'a',
      type: 'rect',
      x: 0,
      y: 0,
      width: 180,
      height: 96,
      text: 'A',
    });
    const b = core.addNode({
      id: 'b',
      type: 'rect',
      x: 400,
      y: 0,
      width: 180,
      height: 96,
      text: 'B',
    });
    core.addEdge({ from: a.id, to: b.id, label: 'yes' });
    const normal = markerWidth(core);

    const smallA = core.addNode({
      id: 'sa',
      type: 'rect',
      x: 0,
      y: 300,
      width: 6,
      height: 6,
      text: 'Tiny label',
    });
    const smallB = core.addNode({
      id: 'sb',
      type: 'rect',
      x: 40,
      y: 300,
      width: 6,
      height: 6,
      text: 'Tiny label',
    });
    core.addEdge({ from: smallA.id, to: smallB.id, label: 'yes' });
    const markers = [...core.svg.querySelectorAll('marker')].map((marker) =>
      Number(marker.getAttribute('markerWidth')),
    );
    expect(Math.min(...markers)).toBeLessThan(normal);
    expect(Math.min(...markers)).toBeLessThan(2);
    const smallText = core.svg.querySelector(
      '[data-node-id="sa"] .vd-flowchart-node-text',
    ) as SVGElement;
    expect(Number.parseFloat(smallText.style.fontSize)).toBeLessThan(14);
    const microEdge = core.documentData.edges.find(
      (edge: { from: { nodeId: string }; to: { nodeId: string } }) =>
        edge.from.nodeId === 'sa' && edge.to.nodeId === 'sb',
    );
    const smallLabel = core.svg.querySelector(
      `.vd-flowchart-edge-label[data-edge-id="${microEdge.id}"]`,
    ) as SVGElement;
    expect(Number.parseFloat(smallLabel.style.fontSize)).toBeLessThan(12);

    const largeA = core.addNode({
      id: 'la',
      type: 'rect',
      x: 0,
      y: 800,
      width: 4800,
      height: 2400,
      text: 'Large',
    });
    const largeB = core.addNode({
      id: 'lb',
      type: 'rect',
      x: 5200,
      y: 800,
      width: 4800,
      height: 2400,
      text: 'Large',
    });
    core.addEdge({ from: largeA.id, to: largeB.id });
    const after = [...core.svg.querySelectorAll('marker')].map((marker) =>
      Number(marker.getAttribute('markerWidth')),
    );
    expect(Math.max(...after)).toBe(normal);
  });

  it('replaces markers while a node is resized instead of accumulating them', () => {
    const core = makeCore(WIDE);
    const a = core.addNode({ id: 'a', type: 'rect', x: 0, y: 0, width: 180, height: 96 });
    const b = core.addNode({ id: 'b', type: 'rect', x: 400, y: 0, width: 180, height: 96 });
    core.addEdge({ from: a.id, to: b.id });
    for (let width = 180; width >= 56; width -= 1) {
      core.updateNode(a.id, { width });
    }
    expect(core.svg.querySelectorAll('marker').length).toBeLessThanOrEqual(4);
  });

  it('uses the legacy grid unless the camera range is wider', () => {
    const legacy = makeCore({ gridSize: 24 });
    const legacyRect = legacy.svg.querySelector('.vd-flowchart-grid');
    expect(legacyRect?.getAttribute('width')).toBe('12000');
    expect(legacy.svg.querySelector('pattern')?.getAttribute('width')).toBe('24');
    expect(legacy.svg.querySelector('pattern path')?.hasAttribute('vector-effect')).toBe(false);

    const wide = makeCore(WIDE);
    wide.zoomTo(0.05);
    const rect = wide.svg.querySelector('.vd-flowchart-grid');
    const path = wide.svg.querySelector('pattern path');
    expect(Number(rect?.getAttribute('width'))).toBeGreaterThanOrEqual(240000);
    expect(path?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(Number(path?.getAttribute('stroke-width'))).toBeGreaterThan(0);
    wide.zoomTo(20);
    expect(wide.svg.querySelector('pattern path')?.getAttribute('vector-effect')).toBe(
      'non-scaling-stroke',
    );
  });
});

describe('fitNode', () => {
  it('frames a visible node and ignores a hidden one', () => {
    const core = makeCore(WIDE);
    Object.defineProperty(core.canvasEl, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(core.canvasEl, 'clientHeight', { configurable: true, value: 600 });
    const parent = core.addNode({ id: 'parent', type: 'rect', x: 0, y: 0, width: 100, height: 50 });
    const child = core.addNode({
      id: 'child',
      type: 'rect',
      x: 400,
      y: 400,
      width: 100,
      height: 50,
    });
    core.addEdge({ from: parent.id, to: child.id });
    core.setCollapsed(parent.id, true);
    const before = core.toJSON().viewport;
    expect(core.fitNode(child.id)).toBe(core);
    expect(core.toJSON().viewport).toEqual(before);
    expect(core.fitNode('missing').toJSON().viewport).toEqual(before);

    core.setCollapsed(parent.id, false);
    const reasons: string[] = [];
    core.on('viewport', (payload: { reason: string }) => reasons.push(payload.reason));
    core.fitNode(parent.id, 48);
    const viewport = core.toJSON().viewport;
    expect(reasons).toContain('viewport:fit-node');
    expect(viewport.scale).toBeGreaterThan(1);
    expect(viewport.scale).toBeLessThanOrEqual(20);
    const centerX = (400 - viewport.x) / viewport.scale;
    const centerY = (300 - viewport.y) / viewport.scale;
    expect(centerX).toBeCloseTo(parent.x + parent.width / 2, 0);
    expect(centerY).toBeCloseTo(parent.y + parent.height / 2, 0);
  });
});
