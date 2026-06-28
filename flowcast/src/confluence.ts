/**
 * Confluence publishing helper.
 *
 * Confluence environments vary enormously: some have a Mermaid marketplace app,
 * some standardise on the draw.io app, and the most locked-down ones allow only
 * page attachments and the built-in code macro. This helper produces *all three
 * publishing modes* from a single canonical document plus a ready-to-paste
 * Confluence storage-format page, so a diagram is always publishable in at least
 * one documentation-safe mode regardless of which apps are installed.
 *
 * The three modes (PRD functional requirement #5):
 *   1. Mermaid macro content      — for spaces with a Mermaid app.
 *   2. draw.io insertion XML       — for spaces standardised on draw.io.
 *   3. Static media embedding      — the always-available, locked-down-safe path.
 */

import { toDrawioXml } from './drawio.js';
import { toMermaid } from './mermaid.js';
import { type DiagramDoc, isMermaidExpressible } from './schema.js';

// --- Storage-format helpers -------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Wrap text in a CDATA section, neutralising any embedded `]]>`. */
function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

// --- Mode 1: Mermaid --------------------------------------------------------

export interface ConfluenceMermaidOutput {
  /** Raw Mermaid text — paste into any Mermaid macro/app input. */
  mermaid: string;
  /** Markdown fenced block, for Confluence's "Insert > Markdown" import. */
  markdownFenced: string;
  /**
   * Storage-format code macro. Renders nothing fancy on its own but is the
   * universal, app-free fallback: the diagram source is always visible and is
   * picked up automatically by several Mermaid apps that scan code macros.
   */
  codeMacroStorageFormat: string;
  /**
   * Storage-format Mermaid macro. Macro names differ between marketplace apps
   * (e.g. `mermaid`, `mermaid-cloud`); `macroName` is configurable.
   */
  mermaidMacroStorageFormat: string;
}

export interface MermaidOptions {
  /** Storage-format macro name for the installed Mermaid app. */
  macroName?: string;
}

export function toConfluenceMermaid(
  doc: DiagramDoc,
  options: MermaidOptions = {}
): ConfluenceMermaidOutput | null {
  if (!isMermaidExpressible(doc.meta.diagramType)) {
    return null;
  }
  const mermaid = toMermaid(doc);
  const macroName = options.macroName ?? 'mermaid';

  const codeMacroStorageFormat =
    `<ac:structured-macro ac:name="code">` +
    `<ac:parameter ac:name="language">text</ac:parameter>` +
    `<ac:parameter ac:name="title">${escapeXml(doc.meta.title)} (Mermaid)</ac:parameter>` +
    `<ac:plain-text-body>${cdata(mermaid)}</ac:plain-text-body>` +
    `</ac:structured-macro>`;

  const mermaidMacroStorageFormat =
    `<ac:structured-macro ac:name="${escapeXml(macroName)}">` +
    `<ac:plain-text-body>${cdata(mermaid)}</ac:plain-text-body>` +
    `</ac:structured-macro>`;

  return {
    mermaid,
    markdownFenced: '```mermaid\n' + mermaid + '\n```',
    codeMacroStorageFormat,
    mermaidMacroStorageFormat,
  };
}

// --- Mode 2: draw.io --------------------------------------------------------

export interface ConfluenceDrawioOutput {
  /** mxGraphModel XML for "Extras → Edit Diagram…" or the draw.io app import. */
  mxGraphXml: string;
  instructions: string;
}

export function toConfluenceDrawio(doc: DiagramDoc): ConfluenceDrawioOutput {
  return {
    mxGraphXml: toDrawioXml(doc),
    instructions:
      'Insert a draw.io/diagrams.net diagram on the Confluence page, then in the ' +
      'editor choose Extras → Edit Diagram…, replace the XML with the contents ' +
      'of mxGraphXml, and click OK. The diagram becomes fully editable in-place.',
  };
}

// --- Mode 3: Static media ---------------------------------------------------

export type MediaKind = 'image' | 'video';

export interface ConfluenceMediaEmbed {
  filename: string;
  kind: MediaKind;
  /** Storage-format markup referencing the file as a page attachment. */
  storageFormat: string;
}

const IMAGE_EXT = new Set(['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v']);

function mediaKind(filename: string): MediaKind | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  return null;
}

/**
 * Build a static-media embed referencing a file that will be uploaded as a
 * page attachment. This is the locked-down-safe mode: it needs no marketplace
 * app, only the ability to attach a file to a page. Returns null for unknown
 * file types.
 */
export function toConfluenceMediaEmbed(
  filename: string
): ConfluenceMediaEmbed | null {
  const kind = mediaKind(filename);
  if (!kind) {
    return null;
  }
  const safe = escapeXml(filename);
  const storageFormat =
    kind === 'image'
      ? `<ac:image ac:align="center"><ri:attachment ri:filename="${safe}" /></ac:image>`
      : `<ac:structured-macro ac:name="multimedia">` +
        `<ac:parameter ac:name="name"><ri:attachment ri:filename="${safe}" /></ac:parameter>` +
        `<ac:parameter ac:name="autoplay">false</ac:parameter>` +
        `</ac:structured-macro>`;
  return { filename, kind, storageFormat };
}

// --- Bundle: everything, assembled & graceful -------------------------------

export interface PublishBundleOptions {
  /**
   * Filenames of already-exported assets (SVG/PNG/MP4) that will be uploaded as
   * page attachments. Used to build the static-media embeds and the fallback
   * section of the assembled page.
   */
  mediaFiles?: string[];
  /** Storage-format macro name for the installed Mermaid app, if any. */
  mermaidMacroName?: string;
  /** Override the generated-at timestamp (mainly for deterministic tests). */
  now?: Date;
}

export interface ConfluencePublishBundle {
  title: string;
  generatedAt: string;
  /** Null when the diagram type cannot be expressed in Mermaid. */
  mermaid: ConfluenceMermaidOutput | null;
  drawio: ConfluenceDrawioOutput;
  media: ConfluenceMediaEmbed[];
  /** A complete, ready-to-paste Confluence storage-format page. */
  storageFormatPage: string;
  /** Human-readable guidance, including graceful-degradation notes. */
  notes: string[];
}

function expandSection(title: string, innerStorageFormat: string): string {
  return (
    `<ac:structured-macro ac:name="expand">` +
    `<ac:parameter ac:name="title">${escapeXml(title)}</ac:parameter>` +
    `<ac:rich-text-body>${innerStorageFormat}</ac:rich-text-body>` +
    `</ac:structured-macro>`
  );
}

/**
 * Assemble all three modes into a single bundle plus a ready-to-paste page.
 *
 * Primary-mode selection follows graceful degradation:
 *   - Mermaid-expressible diagrams lead with the Mermaid macro, and keep the
 *     draw.io XML, the app-free code macro, and any static media as fallbacks.
 *   - Otherwise the page leads with static media (the always-safe path) and
 *     keeps draw.io as the editable fallback.
 */
export function buildConfluencePublishBundle(
  doc: DiagramDoc,
  options: PublishBundleOptions = {}
): ConfluencePublishBundle {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const mermaid = toConfluenceMermaid(doc, { macroName: options.mermaidMacroName });
  const drawio = toConfluenceDrawio(doc);

  const media: ConfluenceMediaEmbed[] = [];
  for (const file of options.mediaFiles ?? []) {
    const embed = toConfluenceMediaEmbed(file);
    if (embed) {
      media.push(embed);
    }
  }

  const notes: string[] = [];
  const parts: string[] = [];

  parts.push(`<h2>${escapeXml(doc.meta.title)}</h2>`);
  if (doc.meta.description) {
    parts.push(`<p>${escapeXml(doc.meta.description)}</p>`);
  }

  const mediaBlock = media.map((m) => m.storageFormat).join('\n');
  const mediaCaption =
    media.length > 0
      ? `<p><em>Upload these files as attachments on this page: ` +
        `${media.map((m) => escapeXml(m.filename)).join(', ')}.</em></p>`
      : '';

  if (mermaid) {
    // Primary: Mermaid macro.
    parts.push(mermaid.mermaidMacroStorageFormat);
    notes.push(
      'Primary mode: Mermaid macro. Works in spaces with a Mermaid marketplace ' +
        'app installed. The macro name varies by app (mermaid, mermaid-cloud, …); ' +
        'set mermaidMacroName to match yours.'
    );

    // Fallbacks for spaces without the Mermaid app.
    parts.push(
      expandSection(
        'Fallback — diagram source (no app required)',
        mermaid.codeMacroStorageFormat
      )
    );
    if (media.length > 0) {
      parts.push(
        expandSection(
          'Fallback — static image / video (locked-down safe)',
          mediaBlock + mediaCaption
        )
      );
      notes.push(
        'Locked-down-safe mode: static SVG/PNG/MP4 attachments. Needs no app — ' +
          'only the ability to attach files to the page.'
      );
    } else {
      notes.push(
        'No media files supplied. For locked-down spaces, export SVG/PNG/MP4 and ' +
          'pass the filenames as mediaFiles to embed them as the always-safe mode.'
      );
    }
    notes.push(
      'Editable fallback: import drawio.mxGraphXml via the draw.io app or ' +
        'Extras → Edit Diagram… for spaces standardised on draw.io.'
    );
  } else {
    // No Mermaid path — lead with the always-safe static media.
    if (media.length > 0) {
      parts.push(mediaBlock);
      parts.push(mediaCaption);
      notes.push(
        `Diagram type "${doc.meta.diagramType}" is not Mermaid-expressible; leading ` +
          'with static media (the locked-down-safe mode).'
      );
    } else {
      parts.push(
        `<p><em>No Mermaid representation for diagram type ` +
          `"${escapeXml(doc.meta.diagramType)}". Export SVG/PNG/MP4 and pass them ` +
          `as mediaFiles, or use the draw.io fallback below.</em></p>`
      );
      notes.push(
        'No Mermaid path and no media supplied — only the draw.io editable export ' +
          'is available. Export static media for a documentation-safe artifact.'
      );
    }
    notes.push(
      'Editable fallback: import drawio.mxGraphXml via the draw.io app or ' +
        'Extras → Edit Diagram….'
    );
  }

  return {
    title: doc.meta.title,
    generatedAt,
    mermaid,
    drawio,
    media,
    storageFormatPage: parts.filter(Boolean).join('\n'),
    notes,
  };
}
