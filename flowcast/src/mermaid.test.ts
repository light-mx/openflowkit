import { describe, expect, it } from 'vitest';
import { toMermaid } from './mermaid.js';
import { architectureDoc, sequenceDoc } from './test-fixtures.js';

describe('toMermaid — flowchart', () => {
  const out = toMermaid(architectureDoc());

  it('opens with the directional flowchart header', () => {
    expect(out.startsWith('flowchart LR')).toBe(true);
  });

  it('emits containers as subgraphs with their children nested', () => {
    expect(out).toContain('subgraph core["Core"]');
    expect(out).toContain('end');
    // child nodes appear between subgraph and end
    const sub = out.indexOf('subgraph core');
    const end = out.indexOf('end', sub);
    expect(out.slice(sub, end)).toContain('api{{"API Gateway"}}');
    expect(out.slice(sub, end)).toContain('db[("Orders DB")]');
  });

  it('escapes quotes in labels', () => {
    expect(out).toContain('client');
    expect(out).toContain('Client &quot;App&quot;');
  });

  it('uses a solid arrow with pipe label for sync edges', () => {
    expect(out).toContain('client -->|"POST /x"| api');
  });

  it('uses a dotted arrow for async edges', () => {
    expect(out).toContain('api -. "write" .-> db');
  });
});

describe('toMermaid — sequence', () => {
  const out = toMermaid(sequenceDoc());

  it('opens with sequenceDiagram', () => {
    expect(out.startsWith('sequenceDiagram')).toBe(true);
  });

  it('declares actor and participant lines', () => {
    expect(out).toContain('actor a as Client');
    expect(out).toContain('participant b as Server');
  });

  it('emits the message with a sync arrow', () => {
    expect(out).toContain('a->>b: hello');
  });
});
