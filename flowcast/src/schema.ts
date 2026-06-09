/**
 * Canonical diagram document — the single source of truth.
 *
 * Per the product's "source first" principle, every authored diagram lives in
 * this structured, portable JSON shape. Editors render from it, animation runs
 * from it, and every export adapter (Mermaid, draw.io, Confluence, SVG/PNG/MP4)
 * is derived from it so the published artifact never drifts from the source.
 */

export type DiagramType =
  | 'architecture'
  | 'flow'
  | 'sequence'
  | 'state'
  | 'deployment';

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

/**
 * The kind of relationship an edge represents. This drives both styling and the
 * animation semantics (e.g. async hops animate as detached tokens, error paths
 * highlight in red), and maps onto Mermaid/draw.io link styles on export.
 */
export type EdgeKind =
  | 'sync' // request/response call
  | 'async' // fire-and-forget, queue, event
  | 'retry' // retried call
  | 'error' // failure / fallback branch
  | 'data' // data flow
  | 'control'; // control / orchestration signal

export type NodeShape =
  | 'rectangle'
  | 'rounded'
  | 'stadium'
  | 'cylinder'
  | 'hexagon'
  | 'circle'
  | 'diamond'
  | 'actor';

/**
 * Architecture-storytelling metadata. All optional; arbitrary string keys are
 * allowed so teams can extend without a schema change.
 */
export interface NodeMetadata {
  /** Owning team / system of record. */
  systemOwner?: string;
  /** Transport or interface protocol (HTTP, gRPC, AMQP, …). */
  protocol?: string;
  /** Environment the element lives in (prod, staging, dmz, …). */
  environment?: string;
  /** Trust / security boundary the element belongs to. */
  trustBoundary?: string;
  /** Operational lifecycle state (active, deprecated, planned, …). */
  lifecycleState?: string;
  [key: string]: string | undefined;
}

export interface DiagramNode {
  id: string;
  label: string;
  /** Logical role: service, queue, database, gateway, external, actor, … */
  type?: string;
  /** Parent container/swimlane id, for grouping and trust boundaries. */
  parentId?: string;
  /** True when this node is a container/swimlane that holds other nodes. */
  isContainer?: boolean;
  shape?: NodeShape;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  metadata?: NodeMetadata;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: EdgeKind;
  metadata?: Record<string, string>;
}

/**
 * One step of the animation timeline. Steps reveal and/or highlight elements;
 * the player walks them in order with play/pause/scrub/step controls.
 */
export interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  revealNodeIds?: string[];
  revealEdgeIds?: string[];
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  /** Optional branch annotation (alternate / failure path). */
  branch?: { condition?: string };
}

export interface Timeline {
  steps: TimelineStep[];
}

export interface DiagramMeta {
  id: string;
  title: string;
  description?: string;
  diagramType: DiagramType;
  direction?: LayoutDirection;
}

export interface DiagramDoc {
  version: 1;
  meta: DiagramMeta;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  timeline?: Timeline;
}

/** Diagram types that can be faithfully expressed in Mermaid syntax. */
export function isMermaidExpressible(type: DiagramType): boolean {
  return (
    type === 'architecture' ||
    type === 'flow' ||
    type === 'sequence' ||
    type === 'state'
  );
}

/** Top-level (non-container) nodes, preserving document order. */
export function rootNodes(doc: DiagramDoc): DiagramNode[] {
  return doc.nodes.filter((n) => !n.parentId);
}

/** Direct children of a container node, preserving document order. */
export function childNodes(doc: DiagramDoc, parentId: string): DiagramNode[] {
  return doc.nodes.filter((n) => n.parentId === parentId);
}

/** Look up a node by id (undefined if missing). */
export function nodeById(doc: DiagramDoc, id: string): DiagramNode | undefined {
  return doc.nodes.find((n) => n.id === id);
}
