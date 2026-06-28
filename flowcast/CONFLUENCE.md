# Publishing FlowCast diagrams to Confluence

Confluence environments vary enormously. Some spaces have a Mermaid marketplace
app; some standardise on the draw.io / diagrams.net app; the most locked-down
ones allow only **page attachments** and the built-in **code macro**. FlowCast
treats this as a first-class constraint: from one canonical diagram it generates
**three publishing modes** plus a single ready-to-paste page that **degrades
gracefully** so your diagram is always publishable in at least one
documentation-safe mode.

> **Source first.** The canonical JSON document (`DiagramDoc`) is the single
> source of truth. Mermaid, draw.io XML, and the static-media embeds are all
> derived from it, so the published artifact never drifts from the diagram you
> authored.

---

## TL;DR

```bash
# Build once
npm install && npm run build

# Generate a ready-to-paste Confluence storage-format page
node dist/cli.js examples/order-flow.json \
  --media order-flow.svg --media walkthrough.mp4 > page.xhtml
```

Or from code:

```ts
import { buildConfluencePublishBundle } from '@flowcast/confluence';

const bundle = buildConfluencePublishBundle(doc, {
  mediaFiles: ['order-flow.svg', 'walkthrough.mp4'],
  mermaidMacroName: 'mermaid', // match your installed app
});

bundle.storageFormatPage; // paste into Confluence storage format
bundle.notes;             // graceful-degradation guidance
```

---

## Choosing a mode

| Your space has…                         | Recommended mode            | What you paste / upload                          |
| --------------------------------------- | --------------------------- | ------------------------------------------------ |
| A Mermaid app (Mermaid, Mermaid Cloud…) | **Mode 1 — Mermaid macro**  | `bundle.mermaid.mermaidMacroStorageFormat`       |
| The draw.io / diagrams.net app          | **Mode 2 — draw.io**        | `bundle.drawio.mxGraphXml` (editable)            |
| Neither / locked-down policy            | **Mode 3 — static media**   | SVG/PNG + MP4 attachments via `bundle.media`     |

The assembled `storageFormatPage` picks a primary mode automatically and tucks
the others into collapsible **fallback** sections, so a single paste covers
every reader regardless of what their space allows.

---

## Mode 1 — Mermaid macro

Best when a Mermaid marketplace app is installed. Confluence renders the diagram
live and it stays text-versionable.

1. Add the Mermaid macro to the page (type `/mermaid`, exact name varies by app).
2. Paste the contents of `bundle.mermaid.mermaid` (the raw Mermaid text — also
   available from the CLI with `--mode mermaid`).

For automated publishing via the REST API, paste
`bundle.mermaid.mermaidMacroStorageFormat` directly into the page's storage
format. Macro names differ between apps (`mermaid`, `mermaid-cloud`, …) — pass
`mermaidMacroName` to match yours.

**No Mermaid app?** `bundle.mermaid.codeMacroStorageFormat` wraps the same text
in the built-in **code macro**. It needs no app at all — the diagram source is
always visible, and several Mermaid apps auto-render code macros tagged as
Mermaid. You can also paste `bundle.mermaid.markdownFenced` through
**Insert → Markdown**.

> Mermaid is an interoperability layer, not the canonical model. Animation
> timelines and rich metadata are intentionally dropped on export. Use Mode 3
> (MP4) to publish the animated walkthrough.

---

## Mode 2 — draw.io insertion

Best when your space standardises on the draw.io / diagrams.net app. You get a
**fully editable** diagram in Confluence.

1. Insert a draw.io diagram on the page (`/draw.io`).
2. In the editor, choose **Extras → Edit Diagram…**.
3. Replace the XML with `bundle.drawio.mxGraphXml` and click **OK**.

The diagram is now native draw.io and editable in place. `mxGraphXml` honours
any authored node positions and falls back to a simple grid where positions are
absent, so it is usable without a layout engine.

---

## Mode 3 — static media (locked-down safe)

The **always-available** path. It needs no marketplace app — only the ability to
attach a file to a page.

1. Export your diagram from FlowCast as **SVG** or **PNG** (static) and/or
   **MP4** (the animated walkthrough).
2. **Upload** those files as attachments on the Confluence page.
3. Paste the embed markup. For each file, `bundle.media[i].storageFormat` gives:
   - images → `<ac:image>` referencing the attachment;
   - video → the `multimedia` macro referencing the attachment.

This is the mode to rely on when app installation or scripting is restricted by
enterprise policy. SVG keeps the diagram crisp at any zoom; MP4 carries the
animated explanation that static formats cannot.

> The filenames you pass to `mediaFiles` must match the names of the files you
> attach to the page.

---

## The assembled page & graceful degradation

`bundle.storageFormatPage` is a complete storage-format fragment you can paste
into the Confluence editor (source mode) or push via the REST API. Its structure:

- **Mermaid-expressible diagrams** (architecture, flow, sequence, state) lead
  with the live Mermaid macro and keep the app-free code macro, the static
  media, and the draw.io XML as fallbacks.
- **Non-Mermaid diagrams** (deployment, …) lead with static media — the
  locked-down-safe mode — and keep draw.io as the editable fallback.

`bundle.notes` explains, in plain language, which mode was chosen and what to do
if your space can't render it. Always read the notes the first time you publish
into a new space.

### Publishing via the REST API

`storageFormatPage` is valid Confluence storage format and can be sent as the
`body.storage.value` of a create/update page request. Upload the `mediaFiles`
as attachments to the same page (the Attachments REST endpoint) using the exact
filenames you passed to `buildConfluencePublishBundle`.

---

## CLI reference

```
flowcast-confluence <diagram.json> [options]

--media <file>        Attachment filename to embed (repeatable)
--mermaid-macro <n>   Mermaid app macro name (default: mermaid)
--out <file>          Write output to a file instead of stdout
--mode <mode>         page | mermaid | drawio | bundle (default: page)
-h, --help            Show help
```

`--mode page` emits the assembled storage-format page; `--mode bundle` emits the
full JSON bundle (all three modes + notes) for scripting.
