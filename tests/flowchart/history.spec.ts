// @vitest-environment jsdom

// Undo/redo history for the flowchart core (1.2.0). Every committed document
// mutation funnels through emitChange() → recordHistory(), so we drive the
// public model API (addNode/updateNode/...) and assert canUndo/canRedo, that
// undo/redo restore document state exactly, that `{ history: false }` disables
// the stack, that `historyLimit` trims the oldest entries, and that
// clearHistory() reseeds. Runs in jsdom (the editor needs a DOM host); only the
// model + history are exercised.

import { afterEach, describe, expect, it } from 'vitest';

import { VdFlowchart as VdFlowchartCore } from '../../src/core.js';

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

describe('flowchart history — seed state', () => {
  it('starts with a single seeded entry and nothing to undo/redo', () => {
    const core = makeCore();
    expect(core.history).toHaveLength(1);
    expect(core.historyIndex).toBe(0);
    expect(core.canUndo()).toBe(false);
    expect(core.canRedo()).toBe(false);
  });
});

describe('flowchart history — undo / redo round trip', () => {
  it('canUndo flips after a committed mutation', () => {
    const core = makeCore();
    core.addNode({ type: 'rect', x: 100, y: 100, text: 'A' });
    expect(core.canUndo()).toBe(true);
    expect(core.canRedo()).toBe(false);
  });

  it('undo removes the node and enables redo; redo restores the exact document', () => {
    const core = makeCore();
    core.addNode({ type: 'rect', x: 100, y: 100, text: 'A' });
    const afterAdd = core.toJSON();
    expect(afterAdd.nodes).toHaveLength(1);

    core.undo();
    expect(core.toJSON().nodes).toHaveLength(0);
    expect(core.canUndo()).toBe(false);
    expect(core.canRedo()).toBe(true);

    core.redo();
    // redo restores the pre-undo document verbatim (viewport unchanged).
    expect(core.toJSON()).toEqual(afterAdd);
    expect(core.canUndo()).toBe(true);
    expect(core.canRedo()).toBe(false);
  });

  it('undo walks back through multiple committed steps in order', () => {
    const core = makeCore();
    const a = core.addNode({ type: 'rect', x: 0, y: 0, text: 'A' });
    core.addNode({ type: 'rect', x: 300, y: 0, text: 'B' });
    core.addNode({ type: 'rect', x: 600, y: 0, text: 'C' });
    expect(core.toJSON().nodes).toHaveLength(3);

    core.undo(); // undo C
    expect(core.toJSON().nodes.map((n: { text: string }) => n.text)).toEqual(['A', 'B']);
    core.undo(); // undo B
    expect(core.toJSON().nodes.map((n: { id: string }) => n.id)).toEqual([a.id]);
    core.undo(); // undo A
    expect(core.toJSON().nodes).toHaveLength(0);
    expect(core.canUndo()).toBe(false);
  });

  it('a fresh mutation after undo drops the orphaned redo branch', () => {
    const core = makeCore();
    core.addNode({ type: 'rect', text: 'A' });
    core.addNode({ type: 'rect', text: 'B' });
    core.undo(); // back to just A; B is now redoable
    expect(core.canRedo()).toBe(true);

    core.addNode({ type: 'rect', text: 'C' }); // diverge
    expect(core.canRedo()).toBe(false);
    expect(core.toJSON().nodes.map((n: { text: string }) => n.text)).toEqual(['A', 'C']);
  });

  it('undo/redo emit a history event carrying canUndo/canRedo', () => {
    const core = makeCore();
    const events: Array<{ reason: string; canUndo: boolean; canRedo: boolean }> = [];
    core.on('history', (payload: { reason: string; canUndo: boolean; canRedo: boolean }) =>
      events.push(payload),
    );

    core.addNode({ type: 'rect', text: 'A' });
    core.undo();

    expect(events.some((e) => e.reason === 'undo')).toBe(true);
    const undoEvent = events.find((e) => e.reason === 'undo')!;
    expect(undoEvent.canUndo).toBe(false);
    expect(undoEvent.canRedo).toBe(true);
  });
});

describe('flowchart history — disabled via { history: false }', () => {
  it('never records and reports nothing to undo/redo', () => {
    const core = makeCore({ history: false });
    expect(core.historyEnabled).toBe(false);
    expect(core.history).toHaveLength(0);

    core.addNode({ type: 'rect', text: 'A' });
    core.addNode({ type: 'rect', text: 'B' });

    expect(core.canUndo()).toBe(false);
    expect(core.canRedo()).toBe(false);
  });

  it('undo/redo are no-ops that leave the document untouched', () => {
    const core = makeCore({ history: false });
    core.addNode({ type: 'rect', text: 'A' });
    const doc = core.toJSON();

    core.undo();
    core.redo();

    expect(core.toJSON()).toEqual(doc);
  });
});

describe('flowchart history — historyLimit trimming', () => {
  it('caps the stack length and discards the oldest entries', () => {
    const core = makeCore({ historyLimit: 2 });
    expect(core.historyLimit).toBe(2);

    // Four discrete additions overflow a 2-deep stack; the oldest are shifted.
    core.addNode({ type: 'rect', text: 'A' });
    core.addNode({ type: 'rect', text: 'B' });
    core.addNode({ type: 'rect', text: 'C' });
    core.addNode({ type: 'rect', text: 'D' });

    expect(core.history).toHaveLength(2);

    // Only one undo remains — trimming removed the path back to the empty doc.
    expect(core.canUndo()).toBe(true);
    core.undo();
    expect(core.canUndo()).toBe(false);
    // The trimmed history can no longer reconstruct the empty document.
    expect(core.toJSON().nodes.length).toBeGreaterThan(0);
  });

  it('coerces a non-positive limit up to at least 1', () => {
    const core = makeCore({ historyLimit: 0 });
    expect(core.historyLimit).toBe(1);
  });
});

describe('flowchart history — clearHistory()', () => {
  it('reseeds the stack and disables undo/redo', () => {
    const core = makeCore();
    core.addNode({ type: 'rect', text: 'A' });
    core.addNode({ type: 'rect', text: 'B' });
    expect(core.canUndo()).toBe(true);

    const doc = core.toJSON();
    core.clearHistory();

    expect(core.canUndo()).toBe(false);
    expect(core.canRedo()).toBe(false);
    expect(core.history).toHaveLength(1);
    // The current document is preserved; only the history is reset.
    expect(core.toJSON()).toEqual(doc);
  });

  it('is chainable (returns the instance)', () => {
    const core = makeCore();
    expect(core.clearHistory()).toBe(core);
  });
});

describe('flowchart history — coalescing inspector edits', () => {
  it('folds a burst of node:update edits on one node into a single undo step', () => {
    const core = makeCore();
    const node = core.addNode({ type: 'rect', text: 'A' });
    const stepsAfterAdd = core.history.length;

    core.updateNode(node.id, { text: 'A1' });
    core.updateNode(node.id, { text: 'A2' });
    core.updateNode(node.id, { text: 'A3' });

    // node:update reasons coalesce → exactly one extra history entry.
    expect(core.history.length).toBe(stepsAfterAdd + 1);

    core.undo(); // undoes the whole edit burst at once
    expect(core.findNode(node.id).text).toBe('A');
  });
});
