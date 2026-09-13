import type { DefineComponent } from 'vue';
import type {
  FlowchartDocument,
  FlowchartChangeEvent,
  FlowchartSelectEvent,
  FlowchartViewportEvent,
  FlowchartConnectEvent,
  VdFlowchart as VdFlowchartCore,
  LayoutMode,
  LayoutOptions,
} from './core';

/** Loosely-typed document accepted by the `data` prop. */
export interface VdFlowchartDocument extends Partial<FlowchartDocument> {
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface VdFlowchartProps {
  /** Flowchart document ({ nodes, edges }). */
  data?: VdFlowchartDocument;
  /** Render as a non-editable viewer. */
  readonly?: boolean;
  /** Background grid size in px. */
  gridSize?: number;
  /** Keep the current selection across data-driven reloads when possible. */
  preserveSelection?: boolean;
  /** Fit the view to content once the editor reports a measurable size. */
  autoFit?: boolean;
  /** Enable the built-in undo/redo history (default true). */
  history?: boolean;
  /** Maximum number of history entries to retain. */
  historyLimit?: number;
}

export interface VdFlowchartEmits {
  (event: 'change', payload: FlowchartChangeEvent): void;
  (event: 'select', payload: FlowchartSelectEvent): void;
  (event: 'viewport', payload: FlowchartViewportEvent): void;
  (event: 'connect', payload: FlowchartConnectEvent): void;
  (event: 'ready', instance: VdFlowchartCore): void;
}

/** Methods exposed via a template ref. */
export interface VdFlowchartExposed {
  getInstance(): VdFlowchartCore | null;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  layout(mode?: LayoutMode, options?: LayoutOptions): void;
}

/* eslint-disable @typescript-eslint/no-empty-object-type -- DefineComponent filler params */
export declare const VdFlowchart: DefineComponent<
  VdFlowchartProps,
  VdFlowchartExposed,
  {},
  {},
  {},
  {},
  {},
  VdFlowchartEmits
>;
/* eslint-enable @typescript-eslint/no-empty-object-type */
