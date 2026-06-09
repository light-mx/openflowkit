/**
 * Canonical document → draw.io / diagrams.net mxGraphModel XML.
 *
 * The output can be pasted into draw.io via "Extras → Edit Diagram…", or
 * imported through the draw.io / diagrams.net Confluence app. This gives a
 * fully editable diagram in environments that standardise on draw.io rather
 * than Mermaid.
 */

import {
  type DiagramDoc,
  type DiagramNode,
  type NodeShape,
} from './schema.js';

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 60;
const COL_GAP = 220;
const ROW_GAP = 120;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function vertexStyle(node: DiagramNode): string {
  const base = 'whiteSpace=wrap;html=1;';
  const shape: NodeShape | undefined = node.shape;
  if (node.isContainer) {
    return 'rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;container=1;collapsible=0;';
  }
  switch (shape) {
    case 'rounded':
    case 'stadium':
      return `${base}rounded=1;arcSize=40;`;
    case 'cylinder':
      return `${base}shape=cylinder3;`;
    case 'hexagon':
      return `${base}shape=hexagon;`;
    case 'circle':
      return `${base}ellipse;aspect=fixed;`;
    case 'diamond':
      return `${base}rhombus;`;
    case 'actor':
      return `${base}shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;`;
    case 'rectangle':
    default:
      return `${base}rounded=0;`;
  }
}

function edgeStyle(kind: string | undefined): string {
  const base = 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;';
  switch (kind) {
    case 'async':
    case 'retry':
      return `${base}dashed=1;`;
    case 'error':
      return `${base}dashed=1;strokeColor=#D32F2F;`;
    default:
      return base;
  }
}

/**
 * Fallback grid layout for nodes that have no authored position. Containers and
 * their children are skipped here (children inherit a position relative to the
 * container if one is supplied); this keeps the output usable without a layout
 * engine while honouring any positions the source already provides.
 */
function positionFor(node: DiagramNode, index: number): { x: number; y: number } {
  if (node.position) {
    return node.position;
  }
  const perRow = 4;
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  return { x: 40 + col * COL_GAP, y: 40 + row * ROW_GAP };
}

/** Serialize a canonical document to mxGraphModel XML. */
export function toDrawioXml(doc: DiagramDoc): string {
  const cells: string[] = [
    '<mxCell id="0" />',
    '<mxCell id="1" parent="0" />',
  ];

  doc.nodes.forEach((node, index) => {
    const { x, y } = positionFor(node, index);
    const width = node.size?.width ?? (node.isContainer ? 320 : DEFAULT_WIDTH);
    const height = node.size?.height ?? (node.isContainer ? 200 : DEFAULT_HEIGHT);
    const parent = node.parentId ?? '1';
    cells.push(
      `<mxCell id="${escapeXml(node.id)}" value="${escapeXml(node.label)}" ` +
        `style="${vertexStyle(node)}" vertex="1" parent="${escapeXml(parent)}">` +
        `<mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />` +
        `</mxCell>`
    );
  });

  for (const edge of doc.edges) {
    cells.push(
      `<mxCell id="${escapeXml(edge.id)}" value="${escapeXml(edge.label ?? '')}" ` +
        `style="${edgeStyle(edge.kind)}" edge="1" parent="1" ` +
        `source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">` +
        `<mxGeometry relative="1" as="geometry" />` +
        `</mxCell>`
    );
  }

  const indent = '        ';
  const body = cells.map((c) => indent + c).join('\n');
  return (
    `<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" ` +
    `tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" ` +
    `math="0" shadow="0">\n` +
    `  <root>\n${body}\n  </root>\n` +
    `</mxGraphModel>`
  );
}
