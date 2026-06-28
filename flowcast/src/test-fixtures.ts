import { type DiagramDoc } from './schema.js';

/** A small architecture doc: one container, two nodes, sync + async edges. */
export function architectureDoc(): DiagramDoc {
  return {
    version: 1,
    meta: {
      id: 'demo',
      title: 'Demo Flow',
      description: 'A tiny demo.',
      diagramType: 'architecture',
      direction: 'LR',
    },
    nodes: [
      { id: 'client', label: 'Client "App"', type: 'actor', shape: 'actor' },
      { id: 'core', label: 'Core', isContainer: true },
      { id: 'api', label: 'API Gateway', shape: 'hexagon', parentId: 'core' },
      { id: 'db', label: 'Orders DB', shape: 'cylinder', parentId: 'core' },
    ],
    edges: [
      { id: 'e1', source: 'client', target: 'api', label: 'POST /x', kind: 'sync' },
      { id: 'e2', source: 'api', target: 'db', label: 'write', kind: 'async' },
    ],
  };
}

/** A sequence doc with two participants and one message. */
export function sequenceDoc(): DiagramDoc {
  return {
    version: 1,
    meta: { id: 'seq', title: 'Seq', diagramType: 'sequence' },
    nodes: [
      { id: 'a', label: 'Client', type: 'actor' },
      { id: 'b', label: 'Server' },
    ],
    edges: [{ id: 'm1', source: 'a', target: 'b', label: 'hello', kind: 'sync' }],
  };
}

/** A deployment doc — intentionally NOT Mermaid-expressible. */
export function deploymentDoc(): DiagramDoc {
  return {
    version: 1,
    meta: { id: 'dep', title: 'Topology', diagramType: 'deployment' },
    nodes: [{ id: 'n1', label: 'Region A' }],
    edges: [],
  };
}
