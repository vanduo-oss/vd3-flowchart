/**
 * Vue 3 bindings for the flowchart component — the primary export surface.
 *
 *   import { VdFlowchart } from '@vanduo-oss/vd3-flowchart';
 *   <VdFlowchart :data="doc" :readonly="false" @change="onChange" @ready="onReady" />
 *
 * The core editor stays framework-agnostic in ./core.js. SSR-safe: the editor
 * is created on mount (client) into a plain container the server can
 * pre-render.
 */
import { defineComponent, h, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { VdFlowchart as VdFlowchartCore } from './core.js';

// `ready` is forwarded from the core editor (fires post-layout) like the rest.
const FORWARDED_EVENTS = ['change', 'select', 'viewport', 'connect', 'ready'];

export const VdFlowchart = defineComponent({
  name: 'VdFlowchart',
  props: {
    /** Flowchart document — `{ nodes, edges }`. */
    data: { type: Object, default: () => ({}) },
    /** Render as a non-editable viewer. */
    readonly: { type: Boolean, default: false },
    /** Background grid size in px. */
    gridSize: { type: Number, default: undefined },
    /** Keep the current selection across `data`-driven reloads when possible. */
    preserveSelection: { type: Boolean, default: false },
    /** Fit the view to content once the editor reports a measurable size. */
    autoFit: { type: Boolean, default: false },
    /** Enable the built-in undo/redo history (default true). */
    history: { type: Boolean, default: true },
    /** Maximum number of history entries to retain. */
    historyLimit: { type: Number, default: undefined },
  },
  emits: ['change', 'select', 'viewport', 'connect', 'ready'],
  setup(props, { emit, expose }) {
    const el = ref(null);
    let instance = null;

    const create = () => {
      instance = new VdFlowchartCore({
        element: el.value,
        data: props.data,
        readonly: props.readonly,
        gridSize: props.gridSize,
        autoFit: props.autoFit,
        history: props.history,
        historyLimit: props.historyLimit,
      });
      FORWARDED_EVENTS.forEach((name) => {
        instance.on(name, (payload) => emit(name, payload));
      });
    };

    onMounted(() => {
      if (typeof window === 'undefined' || !el.value) return;
      create();
    });

    // Data flows through load(); construct-time options recreate the editor.
    watch(
      () => props.data,
      (next) => {
        if (instance && typeof instance.load === 'function') {
          instance.load(next, { preserveSelection: props.preserveSelection });
        }
      },
      { deep: true },
    );
    watch(
      () => [props.readonly, props.gridSize, props.autoFit, props.history, props.historyLimit],
      () => {
        if (!instance) return;
        instance.destroy();
        create();
      },
    );

    onBeforeUnmount(() => {
      if (instance) {
        instance.destroy();
        instance = null;
      }
    });

    expose({
      getInstance: () => instance,
      undo: () => instance?.undo(),
      redo: () => instance?.redo(),
      canUndo: () => Boolean(instance?.canUndo()),
      canRedo: () => Boolean(instance?.canRedo()),
      layout: (mode, options) => instance?.layout(mode, options),
    });

    return () => h('div', { ref: el, class: 'vd-flowchart' });
  },
});
