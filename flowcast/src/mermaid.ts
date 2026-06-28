/**
 * Canonical document → Mermaid text.
 *
 * Mermaid is the interoperability layer, never the canonical model: we generate
 * the cleanest Mermaid we can for the supported diagram types and accept that
 * some animation/metadata semantics are intentionally dropped on the way out.
 */

import {
  type DiagramDoc,
  type DiagramEdge,
  type DiagramNode,
  type EdgeKind,
  type NodeShape,
  childNodes,
  rootNodes,
} from './schema.js';

/** Mermaid node ids must be simple tokens; map canonical ids to safe ones. */
function safeId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

/** Escape a label for use inside a quoted Mermaid node/edge string. */
function escapeLabel(label: string): string {
  return label
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>')
    .replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;'));
}

function shapeWrap(shape: NodeShape | undefined, label: string): string {
  const text = `"${escapeLabel(label)}"`;
  switch (shape) {
    case 'rounded':
      return `(${text})`;
    case 'stadium':
      return `([${text}])`;
    case 'cylinder':
      return `[(${text})]`;
    case 'hexagon':
      return `{{${text}}}`;
    case 'circle':
      return `((${text}))`;
    case 'diamond':
      return `{${text}}`;
    case 'rectangle':
    case 'actor':
    default:
      return `[${text}]`;
  }
}

/** Link operator + optional label for an edge kind. */
function linkFor(edge: DiagramEdge): string {
  const kind: EdgeKind = edge.kind ?? 'sync';
  const dotted = kind === 'async' || kind === 'retry' || kind === 'error';
  const arrow = dotted ? '-.->' : '-->';
  if (!edge.label) {
    return arrow;
  }
  const label = escapeLabel(edge.label);
  // Mermaid label-on-link syntax differs for solid vs dotted links.
  return dotted ? `-. "${label}" .->` : `-->|"${label}"|`;
}

function emitNode(node: DiagramNode, indent: string, lines: string[]): void {
  lines.push(`${indent}${safeId(node.id)}${shapeWrap(node.shape, node.label)}`);
}

function emitContainer(
  doc: DiagramDoc,
  container: DiagramNode,
  indent: string,
  lines: string[]
): void {
  lines.push(`${indent}subgraph ${safeId(container.id)}["${escapeLabel(container.label)}"]`);
  for (const child of childNodes(doc, container.id)) {
    if (child.isContainer) {
      emitContainer(doc, child, `${indent}  `, lines);
    } else {
      emitNode(child, `${indent}  `, lines);
    }
  }
  lines.push(`${indent}end`);
}

function toFlowchart(doc: DiagramDoc): string {
  const direction = doc.meta.direction ?? 'TB';
  const lines: string[] = [`flowchart ${direction}`];

  for (const node of rootNodes(doc)) {
    if (node.isContainer) {
      emitContainer(doc, node, '  ', lines);
    } else {
      emitNode(node, '  ', lines);
    }
  }

  for (const edge of doc.edges) {
    lines.push(`  ${safeId(edge.source)} ${linkFor(edge)} ${safeId(edge.target)}`);
  }

  return lines.join('\n');
}

function toSequence(doc: DiagramDoc): string {
  const lines: string[] = ['sequenceDiagram'];

  // Participants in document order (containers/actors included as participants).
  for (const node of doc.nodes) {
    if (node.isContainer) {
      continue;
    }
    const keyword = node.shape === 'actor' || node.type === 'actor' ? 'actor' : 'participant';
    lines.push(`  ${keyword} ${safeId(node.id)} as ${escapeLabel(node.label)}`);
  }

  for (const edge of doc.edges) {
    const kind = edge.kind ?? 'sync';
    // async/return-style hops use the open dashed arrow.
    const arrow = kind === 'async' || kind === 'error' ? '-->>' : '->>';
    const label = edge.label ? escapeLabel(edge.label) : '';
    lines.push(`  ${safeId(edge.source)}${arrow}${safeId(edge.target)}: ${label}`);
  }

  return lines.join('\n');
}

/**
 * Render a canonical document to Mermaid text. Sequence diagrams emit
 * `sequenceDiagram`; everything else emits a `flowchart`.
 */
export function toMermaid(doc: DiagramDoc): string {
  if (doc.meta.diagramType === 'sequence') {
    return toSequence(doc);
  }
  return toFlowchart(doc);
}
