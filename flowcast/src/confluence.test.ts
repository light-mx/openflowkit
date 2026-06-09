import { describe, expect, it } from 'vitest';
import {
  buildConfluencePublishBundle,
  toConfluenceMediaEmbed,
  toConfluenceMermaid,
} from './confluence.js';
import { architectureDoc, deploymentDoc, sequenceDoc } from './test-fixtures.js';

describe('toConfluenceMermaid', () => {
  it('returns all variants for a Mermaid-expressible diagram', () => {
    const out = toConfluenceMermaid(architectureDoc());
    expect(out).not.toBeNull();
    expect(out?.markdownFenced).toMatch(/^```mermaid\n/);
    expect(out?.markdownFenced.trimEnd().endsWith('```')).toBe(true);
    expect(out?.codeMacroStorageFormat).toContain('ac:name="code"');
    expect(out?.codeMacroStorageFormat).toContain('<![CDATA[');
    expect(out?.mermaidMacroStorageFormat).toContain('ac:name="mermaid"');
  });

  it('honours a custom mermaid macro name', () => {
    const out = toConfluenceMermaid(sequenceDoc(), { macroName: 'mermaid-cloud' });
    expect(out?.mermaidMacroStorageFormat).toContain('ac:name="mermaid-cloud"');
  });

  it('returns null for a non-Mermaid-expressible diagram', () => {
    expect(toConfluenceMermaid(deploymentDoc())).toBeNull();
  });
});

describe('toConfluenceMediaEmbed', () => {
  it('embeds images via ac:image', () => {
    const embed = toConfluenceMediaEmbed('diagram.svg');
    expect(embed?.kind).toBe('image');
    expect(embed?.storageFormat).toContain('<ac:image');
    expect(embed?.storageFormat).toContain('ri:filename="diagram.svg"');
  });

  it('embeds video via the multimedia macro', () => {
    const embed = toConfluenceMediaEmbed('walkthrough.mp4');
    expect(embed?.kind).toBe('video');
    expect(embed?.storageFormat).toContain('ac:name="multimedia"');
    expect(embed?.storageFormat).toContain('ri:filename="walkthrough.mp4"');
  });

  it('returns null for unsupported file types', () => {
    expect(toConfluenceMediaEmbed('notes.txt')).toBeNull();
  });
});

describe('buildConfluencePublishBundle — Mermaid-expressible', () => {
  const bundle = buildConfluencePublishBundle(architectureDoc(), {
    mediaFiles: ['demo.svg', 'demo.mp4', 'ignore.txt'],
    now: new Date('2026-01-01T00:00:00Z'),
  });

  it('uses a deterministic timestamp when provided', () => {
    expect(bundle.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('includes only recognised media files', () => {
    expect(bundle.media.map((m) => m.filename)).toEqual(['demo.svg', 'demo.mp4']);
  });

  it('leads the page with the Mermaid macro and offers fallbacks', () => {
    const page = bundle.storageFormatPage;
    expect(page).toContain('<h2>Demo Flow</h2>');
    const mermaidIdx = page.indexOf('ac:name="mermaid"');
    const expandIdx = page.indexOf('ac:name="expand"');
    expect(mermaidIdx).toBeGreaterThan(-1);
    // primary mermaid macro comes before the fallback expand sections
    expect(mermaidIdx).toBeLessThan(expandIdx);
    expect(page).toContain('Fallback — diagram source (no app required)');
    expect(page).toContain('Fallback — static image / video (locked-down safe)');
  });

  it('always provides an editable draw.io export', () => {
    expect(bundle.drawio.mxGraphXml).toContain('<mxGraphModel');
  });
});

describe('buildConfluencePublishBundle — non-Mermaid type', () => {
  it('leads with static media when Mermaid is unavailable', () => {
    const bundle = buildConfluencePublishBundle(deploymentDoc(), {
      mediaFiles: ['topology.png'],
    });
    expect(bundle.mermaid).toBeNull();
    expect(bundle.storageFormatPage).toContain('ri:filename="topology.png"');
    expect(bundle.notes.join(' ')).toContain('locked-down-safe');
  });

  it('still yields a draw.io fallback when nothing else is available', () => {
    const bundle = buildConfluencePublishBundle(deploymentDoc());
    expect(bundle.media).toHaveLength(0);
    expect(bundle.drawio.mxGraphXml).toContain('<mxGraphModel');
    expect(bundle.storageFormatPage).toContain('draw.io fallback');
  });
});
