// @vitest-environment jsdom

// Vue wrapper mount spec for <VdFlowchart>. Runs in jsdom against the shared
// stubs (tests/setup.ts). We assert the wrapper: builds the editor core into
// its own container on mount, threads props through as core options, forwards
// the core's events (change / connect / ready) as Vue emits, drives `data`
// changes through load() without recreating, updates options in place, and
// destroys the core (removing its window listeners) on unmount. The core's
// `ready` fires only once the canvas reports a non-zero size, so those tests
// stub clientWidth/clientHeight — jsdom lays nothing out.

import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VdFlowchart } from '../../src/index.js';
import { VdFlowchart as VdFlowchartCore } from '../../src/core.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCore = VdFlowchartCore & Record<string, any>;

const wrappers: VueWrapper[] = [];

function mountFlow(props: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapper = mount(VdFlowchart as any, { props });
  wrappers.push(wrapper);
  return wrapper;
}

/** The core instance the wrapper created (exposed via `getInstance`). */
function coreOf(wrapper: VueWrapper): AnyCore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wrapper.vm as any).getInstance() as AnyCore;
}

// jsdom never lays out, so clientWidth/clientHeight are always 0 and the core's
// `ready` gate never opens. Force a non-zero size for the ready-path tests.
let sizeStubbed = false;
function stubClientSize(px = 800) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return px;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return px;
    },
  });
  sizeStubbed = true;
}
function restoreClientSize() {
  if (!sizeStubbed) return;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
  sizeStubbed = false;
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  restoreClientSize();
});

describe('VdFlowchart wrapper — mount', () => {
  it('renders its own container and builds the editor shell inside it', () => {
    const wrapper = mountFlow();
    expect(wrapper.find('div.vd-flowchart').exists()).toBe(true);
    expect(wrapper.find('.vd-flowchart-shell').exists()).toBe(true);
    expect(coreOf(wrapper)).toBeInstanceOf(VdFlowchartCore);
  });

  it('threads props through as core options', () => {
    const core = coreOf(
      mountFlow({
        data: { nodes: [{ id: 'n1', type: 'rect', x: 0, y: 0 }], edges: [] },
        readonly: true,
        gridSize: 32,
        autoFit: true,
        history: false,
        historyLimit: 50,
      }),
    );
    expect(core.readonly).toBe(true);
    expect(core.gridSize).toBe(32);
    expect(core.autoFit).toBe(true);
    expect(core.historyEnabled).toBe(false);
    expect(core.historyLimit).toBe(50);
    expect(core.documentData.nodes).toHaveLength(1);
    expect(core.documentData.nodes[0].id).toBe('n1');
  });

  it('uses component defaults when props are omitted', () => {
    const core = coreOf(mountFlow());
    expect(core.readonly).toBe(false);
    expect(core.gridSize).toBe(24);
    expect(core.autoFit).toBe(false);
    expect(core.historyEnabled).toBe(true);
    expect(core.historyLimit).toBe(100);
    expect(core.documentData.nodes).toHaveLength(0);
  });
});

describe('VdFlowchart wrapper — data prop drives load() (no recreate)', () => {
  it('reloads the document in place when `data` changes', async () => {
    const wrapper = mountFlow({
      data: { nodes: [{ id: 'a', type: 'rect', x: 0, y: 0 }], edges: [] },
    });
    const core = coreOf(wrapper);
    expect(core.documentData.nodes).toHaveLength(1);

    await wrapper.setProps({
      data: {
        nodes: [
          { id: 'a', type: 'rect', x: 0, y: 0 },
          { id: 'b', type: 'rect', x: 300, y: 0 },
        ],
        edges: [],
      },
    });

    // Same instance — data flows through load(), not a rebuild.
    expect(coreOf(wrapper)).toBe(core);
    expect(core.destroyed).toBe(false);
    expect(core.documentData.nodes).toHaveLength(2);
  });
});

describe('VdFlowchart wrapper — state ownership', () => {
  it('preserves edits, camera, selection and undo across option changes', async () => {
    const wrapper = mountFlow({ data: { nodes: [{ id: 'a', text: 'Initial' }] } });
    const core = coreOf(wrapper);
    core.addNode({ id: 'b', text: 'Edited' });
    core.addEdge({ id: 'ab', from: 'a', to: 'b' });
    core.selectNode('b');
    core.setViewport({ x: 120, y: 90, scale: 0.8 });
    const before = core.toJSON();
    await wrapper.setProps({ readonly: true, gridSize: 32, autoFit: true });
    expect(coreOf(wrapper)).toBe(core);
    expect(core.destroyed).toBe(false);
    expect(core.toJSON()).toEqual(before);
    expect(core.selection).toEqual({ kind: 'node', id: 'b' });
    expect(core.root.classList.contains('vd-flowchart-readonly')).toBe(true);
    expect(core.svg.querySelector('pattern').getAttribute('width')).toBe('32');
    await wrapper.setProps({ readonly: false });
    core.undo();
    expect(core.toJSON().nodes).toHaveLength(2);
    expect(core.toJSON().edges).toHaveLength(0);
    expect(core.toJSON().viewport).toEqual(before.viewport);
  });

  it('accepts a parent change echo once without a load event or extra history', async () => {
    const data = ref({ nodes: [{ id: 'a', text: 'Initial' }] });
    let changes = 0;
    const parent = mount(
      defineComponent({
        setup: () => () =>
          h(VdFlowchart, {
            data: data.value,
            onChange: (event: { document: typeof data.value }) => {
              changes += 1;
              if (changes < 5) data.value = event.document;
            },
          }),
      }),
    );
    wrappers.push(parent);
    const core = coreOf(parent.findComponent(VdFlowchart));
    core.addNode({ id: 'b' });
    core.selectNode('b');
    await flushPromises();
    expect(changes).toBe(1);
    expect(core.selection).toEqual({ kind: 'node', id: 'b' });
    core.undo();
    await flushPromises();
    expect(changes).toBe(2);
    expect(core.toJSON().nodes.map((node) => node.id)).toEqual(['a']);
    expect(core.canUndo()).toBe(false);
  });

  it('replaces external data silently and keeps the replacement undoable', async () => {
    const wrapper = mountFlow({ data: { nodes: [{ id: 'a' }] } });
    const core = coreOf(wrapper);
    await wrapper.setProps({ data: { nodes: [{ id: 'b' }] } });
    expect(wrapper.emitted('change')).toBeUndefined();
    core.undo();
    expect(core.toJSON().nodes[0].id).toBe('a');
  });

  it('seeds fresh history after disabled edits and bounds history around the current entry', async () => {
    const wrapper = mountFlow();
    const core = coreOf(wrapper);
    core.addNode({ id: 'a' });
    await wrapper.setProps({ history: false });
    core.addNode({ id: 'b' });
    await wrapper.setProps({ history: true });
    expect(core.canUndo()).toBe(false);
    core.addNode({ id: 'c' });
    core.addNode({ id: 'd' });
    core.undo();
    await wrapper.setProps({ historyLimit: 2 });
    expect(core.toJSON().nodes).toHaveLength(3);
    core.undo();
    expect(core.toJSON().nodes).toHaveLength(2);
  });
});

describe('VdFlowchart wrapper — event forwarding', () => {
  it('forwards the core `change` event with its reason', async () => {
    const wrapper = mountFlow();
    coreOf(wrapper).addNode({ type: 'rect' });
    await wrapper.vm.$nextTick();

    const changes = wrapper.emitted('change');
    expect(changes).toBeTruthy();
    const last = changes![changes!.length - 1][0] as { reason: string };
    expect(last.reason).toBe('node:add');
  });

  it('forwards the core `connect` event when an edge is added', async () => {
    const wrapper = mountFlow();
    const core = coreOf(wrapper);
    const a = core.addNode({ type: 'rect', x: 0, y: 0 });
    const b = core.addNode({ type: 'rect', x: 300, y: 0 });
    core.addEdge({ from: a.id, to: b.id });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('connect')).toHaveLength(1);
  });

  it('forwards the core `ready` event (carrying the instance) once measurable', async () => {
    stubClientSize(800);
    const wrapper = mountFlow();
    await flushPromises();

    const ready = wrapper.emitted('ready');
    expect(ready).toBeTruthy();
    expect(ready![0][0]).toBe(coreOf(wrapper));
  });
});

describe('VdFlowchart wrapper — unmount', () => {
  it('destroys the core and removes its window listeners', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountFlow();
    const core = coreOf(wrapper);
    expect(core.destroyed).toBe(false);

    wrapper.unmount();

    expect(core.destroyed).toBe(true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    removeSpy.mockRestore();
  });
});
