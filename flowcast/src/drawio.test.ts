import { describe, expect, it } from 'vitest';
import { toDrawioXml } from './drawio.js';
import { architectureDoc } from './test-fixtures.js';

describe('toDrawioXml', () => {
  const xml = toDrawioXml(architectureDoc());

  it('produces an mxGraphModel with the required root cells', () => {
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('<mxCell id="0" />');
    expect(xml).toContain('<mxCell id="1" parent="0" />');
    expect(xml.trimEnd().endsWith('</mxGraphModel>')).toBe(true);
  });

  it('renders nodes as vertices with geometry', () => {
    expect(xml).toContain('id="api"');
    expect(xml).toContain('vertex="1"');
    expect(xml).toContain('as="geometry"');
  });

  it('parents child nodes to their container', () => {
    expect(xml).toMatch(/id="api"[^>]*parent="core"/);
  });

  it('renders edges with source and target', () => {
    expect(xml).toMatch(/id="e1"[^>]*edge="1"[^>]*source="client"[^>]*target="api"/);
  });

  it('escapes special characters in labels', () => {
    expect(xml).toContain('value="Client &quot;App&quot;"');
  });

  it('styles async edges as dashed', () => {
    expect(xml).toMatch(/id="e2"[^>]*dashed=1/);
  });
});
