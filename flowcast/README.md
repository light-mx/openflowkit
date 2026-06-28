# FlowCast — `@flowcast/confluence`

Interactive, animated architecture diagrams that **publish cleanly into
documentation ecosystems** — Confluence first.

This package is the foundation of FlowCast (a customized fork in the spirit of
OpenFlowKit): a **canonical diagram schema** plus the **Confluence publishing
helper** built on top of it. It is framework-agnostic and dependency-free at
runtime, so the editor UI, animation runtime, and export pipeline can all be
layered on the same source-of-truth model without drift.

## Why this exists

Static architecture diagrams don't explain timing, causality, or failure paths
well, and most teams documenting in **Confluence** hit a wall: their space may
or may not have a Mermaid app, a draw.io app, or any app at all. FlowCast solves
the publishing half of that problem first — turning one canonical diagram into
**every Confluence-compatible output**, with graceful degradation to a
locked-down-safe static mode.

## What's in this first slice

| Piece                         | File                  | Role                                                    |
| ----------------------------- | --------------------- | ------------------------------------------------------- |
| **Canonical schema**          | `src/schema.ts`       | The single source of truth (`DiagramDoc`).              |
| **Mermaid adapter**           | `src/mermaid.ts`      | `DiagramDoc` → Mermaid flowchart / sequence.            |
| **draw.io adapter**           | `src/drawio.ts`       | `DiagramDoc` → editable mxGraphModel XML.               |
| **Confluence helper**         | `src/confluence.ts`   | Three publishing modes + assembled, graceful page.      |
| **Light CLI**                 | `src/cli.ts`          | `flowcast-confluence <doc.json>` → Confluence output.   |
| **Publishing guide**          | `CONFLUENCE.md`       | How to publish into any Confluence space.               |

The full product roadmap (visual editor, timeline animation runtime, SVG/PNG/MP4
export) builds on this same `DiagramDoc`; see `CONFLUENCE.md` for the publishing
workflow and the parent PRD for the broader scope.

## Quick start

```bash
npm install
npm run build
npm test          # 26 tests across schema → Mermaid → draw.io → Confluence

# Turn a canonical diagram into a ready-to-paste Confluence page
node dist/cli.js examples/order-flow.json \
  --media order-flow.svg --media walkthrough.mp4
```

## Library usage

```ts
import { buildConfluencePublishBundle, type DiagramDoc } from '@flowcast/confluence';

const bundle = buildConfluencePublishBundle(doc, {
  mediaFiles: ['order-flow.svg', 'walkthrough.mp4'],
  mermaidMacroName: 'mermaid',
});

bundle.storageFormatPage; // paste into Confluence
bundle.mermaid?.mermaid;  // raw Mermaid text
bundle.drawio.mxGraphXml; // editable draw.io XML
bundle.media;             // static embeds (locked-down safe)
bundle.notes;             // graceful-degradation guidance
```

## Scripts

- `npm run build` — compile to `dist/`.
- `npm test` — run the Vitest suite.
- `npm run typecheck` — strict type-check, no emit.
- `npm run cli -- <args>` — run the built CLI.

## License

MIT.
