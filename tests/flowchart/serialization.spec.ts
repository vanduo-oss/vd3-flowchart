// @vitest-environment jsdom

// Serialization contract for the flowchart core (1.2.0 lineage). Runs in jsdom
// because VdFlowchart builds its editor shell into a real DOM element; only the
// document model (toJSON/load) is exercised here — real rendering is a
// Playwright concern. The `toJSON().version === '1.2.0'` pin is LOAD-BEARING:
// the string is serialized into every user document, so a regression here
// silently corrupts saved diagrams.

import { afterEach, describe, expect, it } from 'vitest';

import pkg from '../../package.json';
import fixtureDoc from '../fixtures/flowchart-doc-1.1.json';
import {
  VdFlowchart as VdFlowchartCore,
  VD_FLOWCHART_VERSION,
  FLOWCHART_DOCUMENT_VERSION,
  MAX_NODES,
  MAX_EDGES,
} from '../../src/core.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCore = VdFlowchartCore & Record<string, any>;

const cores: AnyCore[] = [];

function makeCore(options: Record<string, unknown> = {}): AnyCore {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const core = new VdFlowchartCore({ element, ...options }) as AnyCore;
  cores.push(core);
  return core;
}

afterEach(() => {
  while (cores.length) cores.pop()!.destroy();
  document.body.replaceChildren();
});

describe('flowchart serialization — VERSION manifest sync', () => {
  it('exposes VD_FLOWCHART_VERSION === "1.3.0"', () => {
    expect(VD_FLOWCHART_VERSION).toBe('1.3.0');
  });

  it('keeps FLOWCHART_DOCUMENT_VERSION at 1.2.0', () => {
    expect(FLOWCHART_DOCUMENT_VERSION).toBe('1.2.0');
  });

  it('mirrors package.json version', () => {
    expect(VD_FLOWCHART_VERSION).toBe(pkg.version);
  });
});

describe('flowchart serialization — toJSON()', () => {
  it('returns exactly { version, viewport, nodes, edges }', () => {
    const core = makeCore();
    const doc = core.toJSON();
    expect(Object.keys(doc).sort()).toEqual(['edges', 'nodes', 'version', 'viewport']);
  });

  it('emits the load-bearing 1.2.0 version string', () => {
    const core = makeCore();
    // LOAD-BEARING: this exact string is persisted into user documents.
    expect(core.toJSON().version).toBe('1.2.0');
  });

  it('serializes nodes and edges added through the model', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 10, y: 20, text: 'A' });
    const b = core.addNode({ type: 'rect', x: 300, y: 20, text: 'B' });
    const edge = core.addEdge({ from: a.id, to: b.id });

    const doc = core.toJSON();
    expect(doc.nodes.map((n: { id: string }) => n.id)).toEqual([a.id, b.id]);
    expect(doc.edges).toHaveLength(1);
    expect(doc.edges[0].id).toBe(edge.id);
    expect(doc.edges[0].from.nodeId).toBe(a.id);
    expect(doc.edges[0].to.nodeId).toBe(b.id);
  });

  it('returns a deep clone — mutating the result never touches editor state', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', x: 10, y: 20, text: 'Original' });

    const doc = core.toJSON();
    doc.version = 'HACKED';
    doc.nodes[0].text = 'mutated';
    doc.nodes[0].x = 9999;
    doc.viewport.scale = 42;
    doc.nodes.push({ id: 'ghost' });

    const fresh = core.toJSON();
    expect(fresh.version).toBe('1.2.0');
    expect(fresh.nodes).toHaveLength(1);
    expect(fresh.nodes[0].id).toBe(node.id);
    expect(fresh.nodes[0].text).toBe('Original');
    expect(fresh.nodes[0].x).toBe(10);
    expect(fresh.viewport.scale).toBe(1);
  });
});

describe('flowchart serialization — backward compatibility (frozen 1.x fixture)', () => {
  it('the checked-in fixture is the old-line 1.x shape', () => {
    // The fixture is never regenerated; this guards against an accidental edit.
    expect(fixtureDoc.version).toBe('1.1.0');
    expect(fixtureDoc.nodes).toHaveLength(3);
    expect(fixtureDoc.edges).toHaveLength(2);
  });

  it('loads every node losslessly (ids, positions, text, data intact)', () => {
    const core = makeCore();
    core.load(fixtureDoc);

    const doc = core.toJSON();
    expect(doc.nodes.map((n: { id: string }) => n.id)).toEqual(['start', 'process', 'decision']);

    const start = doc.nodes.find((n: { id: string }) => n.id === 'start');
    expect(start).toMatchObject({ type: 'circle', x: 80, y: 200, text: 'Start' });

    const process = doc.nodes.find((n: { id: string }) => n.id === 'process');
    expect(process).toMatchObject({ type: 'rect', x: 320, y: 216, text: 'Do the work' });
    expect(process.data).toEqual({ role: 'worker' });
  });

  it('loads every edge with connections intact', () => {
    const core = makeCore();
    core.load(fixtureDoc);
    const doc = core.toJSON();

    expect(doc.edges.map((e: { id: string }) => e.id)).toEqual([
      'e-start-process',
      'e-process-decision',
    ]);

    const first = doc.edges[0];
    expect(first.from).toEqual({ nodeId: 'start', port: 'right' });
    expect(first.to).toEqual({ nodeId: 'process', port: 'left' });
  });

  it('upgrades legacy `kind`-only edges to the marker model', () => {
    const core = makeCore();
    core.load(fixtureDoc);
    const doc = core.toJSON();

    // Legacy arrow edge → end marker derived, still an arrow.
    const arrow = doc.edges.find((e: { id: string }) => e.id === 'e-start-process');
    expect(arrow.kind).toBe('arrow');
    expect(arrow.endMarker).toBe('arrow');
    expect(arrow.startMarker).toBe('none');
    expect(arrow.route).toBe('curve');
    expect(typeof arrow.strokeWidth).toBe('number');

    // Legacy line edge (kind: 'line') → both markers 'none', stays a line.
    const line = doc.edges.find((e: { id: string }) => e.id === 'e-process-decision');
    expect(line.kind).toBe('line');
    expect(line.startMarker).toBe('none');
    expect(line.endMarker).toBe('none');
    expect(line.label).toBe('next');
  });

  it('re-serializes the loaded 1.x document as version 1.2.0', () => {
    const core = makeCore();
    core.load(fixtureDoc);
    // LOAD-BEARING: an old document round-trips forward, never backward.
    expect(core.toJSON().version).toBe('1.2.0');
  });

  it('never mutates the imported fixture object', () => {
    const before = JSON.stringify(fixtureDoc);
    const core = makeCore();
    core.load(fixtureDoc);
    core.addNode({ type: 'rect' });
    expect(JSON.stringify(fixtureDoc)).toBe(before);
  });
});

describe('flowchart serialization — bounded deserialization (untrusted document caps)', () => {
  it('truncates a document with more than MAX_NODES nodes without throwing', () => {
    const nodes = Array.from({ length: MAX_NODES + 200 }, (_, i) => ({
      id: `n${i}`,
      type: 'rect',
      x: (i % 100) * 12,
      y: Math.floor(i / 100) * 12,
      text: 'x',
    }));
    const core = makeCore();
    expect(() => core.load({ version: '1.2.0', nodes, edges: [] })).not.toThrow();

    const doc = core.toJSON();
    expect(doc.nodes).toHaveLength(MAX_NODES);
    // LOAD-BEARING: truncation must not disturb the serialized version.
    expect(doc.version).toBe('1.2.0');
  }, 60000);

  it('truncates edges beyond MAX_EDGES without throwing', () => {
    const nodes = [
      { id: 'a', type: 'rect', x: 0, y: 0 },
      { id: 'b', type: 'rect', x: 300, y: 0 },
    ];
    const edges = Array.from({ length: MAX_EDGES + 50 }, (_, i) => ({
      id: `e${i}`,
      from: { nodeId: 'a', port: 'right' },
      to: { nodeId: 'b', port: 'left' },
    }));
    const core = makeCore();
    expect(() => core.load({ version: '1.2.0', nodes, edges })).not.toThrow();

    const doc = core.toJSON();
    expect(doc.edges).toHaveLength(MAX_EDGES);
  }, 60000);

  it('leaves an in-range document unchanged (round-trips within the caps)', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 10, y: 20, text: 'A' });
    const b = core.addNode({ type: 'rect', x: 300, y: 20, text: 'B' });
    core.addEdge({ from: a.id, to: b.id });

    const reloaded = makeCore();
    reloaded.load(core.toJSON());
    const doc = reloaded.toJSON();

    expect(doc.nodes.map((n: { id: string }) => n.id)).toEqual([a.id, b.id]);
    expect(doc.edges).toHaveLength(1);
    expect(doc.version).toBe('1.2.0');
  });
});

describe('document validation preserves current work', () => {
  it.each([
    '{broken',
    'null',
    '[]',
    '{"nodes":{}}',
    '{"edges":42}',
    '{"version":"2.0.0"}',
    '{"version":"1.2.1"}',
    '{"version":"unknown"}',
  ])('rejects %s atomically', (input) => {
    const core = makeCore();
    core.addNode({ id: 'saved', text: 'Keep me' });
    core.selectNode('saved');
    const before = core.toJSON();
    const historyIndex = core.historyIndex;
    expect(() => core.load(input)).toThrow();
    expect(core.toJSON()).toEqual(before);
    expect(core.selection).toEqual({ kind: 'node', id: 'saved' });
    expect(core.historyIndex).toBe(historyIndex);
  });

  it('uses the schema constant for saved documents', () => {
    const core = makeCore();
    expect(core.toJSON().version).toBe(FLOWCHART_DOCUMENT_VERSION);
  });

  it.each(['1', '1.2', 1.2, '1.1.0'])('accepts legacy 1.x version %j', (version) => {
    const core = makeCore();
    expect(() =>
      core.load({
        version,
        nodes: [{ id: 'legacy', text: 'Old' }],
        edges: [],
      }),
    ).not.toThrow();
    expect(core.toJSON().nodes[0].id).toBe('legacy');
    expect(core.toJSON().version).toBe(FLOWCHART_DOCUMENT_VERSION);
  });

  it('reports invalid pasted JSON without clearing the graph', () => {
    const core = makeCore({ data: { nodes: [{ id: 'a' }] } });
    core.jsonTextarea.value = '{broken';
    core.loadJsonButton.click();
    expect(core.jsonStatus.textContent).toContain('Invalid flowchart JSON');
    expect(core.toJSON().nodes[0].id).toBe('a');
  });
});
