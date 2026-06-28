# PRD — Architecture Diagram Flow Animation

> **Status:** MVP / proof-of-concept
> **Owner:** OpenFlowKit
> **Last updated:** 2026-06-17
> **Related code:** `src/services/export/cinematicBuildPlan.ts`, `src/services/export/cinematicRenderState.ts`, `src/hooks/useCinematicExport.ts`, `src/services/playback/*`, `src/components/StudioPlaybackPanel.tsx`

---

## 1. Summary

OpenFlowKit can already turn a diagram into a **cinematic build video** (nodes and
edges appearing one-by-one) and supports a **Playback Studio** for guided
walkthroughs. This PRD takes that same underlying concept — *order the graph,
build a timeline, reveal the diagram node-by-node and edge-by-edge* — and applies
it specifically to **architecture diagrams**, adding a continuous **flow
animation** that shows data/requests travelling along the edges after the diagram
is built.

The goal of this document is to define the feature and to ship a **minimal,
self-contained MVP** that demonstrates the essential animation concept live in the
browser, independent of the heavier video-export and store plumbing.

---

## 2. Problem

A static architecture diagram answers *"what are the pieces?"* but not *"how does
a request actually move through the system?"*. During architecture reviews,
onboarding, and demos, people manually narrate the flow ("the client calls the
gateway, which calls auth, which reads the database…"). That narration is:

- **Lost** the moment the meeting ends — the static PNG carries none of it.
- **Inconsistent** — every presenter tells the story in a different order.
- **Hard to follow** for newcomers staring at a dense box-and-arrow picture.

OpenFlowKit's cinematic export proves the build-order story is valuable, but it is
a **render-to-file** pipeline: you only see the result after capturing and
encoding a video. There is no lightweight, **live, interactive** way to watch an
architecture diagram assemble itself and then see its flow pulse — with play,
pause, restart, and speed controls — directly on the canvas.

---

## 3. Goals & Non-Goals

### Goals

- **G1 — Reuse the proven concept.** Order the graph topologically with a layout
  tie-break and resolve a "lead edge" per node, exactly like
  `buildCinematicBuildPlan`.
- **G2 — Live build animation.** Reveal nodes and edges progressively on a
  timeline (intro → edge-grow → node-fade → settle → hold), mirroring
  `resolveCinematicRenderState`.
- **G3 — Flow animation.** After the build completes, animate directional
  "packets" travelling along every edge to convey live data flow.
- **G4 — Interactive playback.** Play / pause / restart, a scrub bar, and a
  speed control (slow / normal / fast — same multipliers as cinematic export).
- **G5 — Self-contained MVP.** Runnable as a single static file with zero build
  step, so the concept can be reviewed and iterated quickly.

### Non-Goals (for the MVP)

- **N1** — No video/GIF export. That already exists via `useCinematicExport`.
- **N2** — No integration into the live Zustand store, React Flow canvas, or
  multi-page/scene model.
- **N3** — No diagram editing. The MVP plays a fixed sample architecture graph.
- **N4** — No icon catalog / asset library wiring (1,600+ icons). Emoji/text
  glyphs stand in for branded icons.
- **N5** — No persistence, collaboration, or i18n.

---

## 4. Users & Use Cases

| Persona | Use case |
| ------- | -------- |
| **Staff/Platform engineer** | Presents an architecture review and wants the system to "draw itself" in dependency order, then show request flow. |
| **New hire** | Watches the animated build to understand which component depends on which, instead of decoding a static diagram. |
| **DevRel / founder** | Records a short demo where the architecture assembles and "comes alive" with flowing traffic. |

### Core user stories

- *As a presenter,* I can press **Play** and watch the architecture build in
  dependency order so my audience follows the story without me narrating ordering.
- *As a viewer,* I can see **packets flow** along the arrows so I understand the
  direction of requests/data.
- *As a presenter,* I can **pause, scrub, restart, and change speed** so I can
  talk over any moment of the animation.

---

## 5. The Concept (how it maps to existing code)

The animation is three deterministic stages. The MVP re-implements the essential
math of the production services in plain TypeScript-in-the-browser so the concept
is legible in one file.

### 5.1 Build plan — *port of `cinematicBuildPlan.ts`*

1. **Orientation inference** — compare graph bounding-box width vs height to pick
   `TB` or `LR`, which decides the layout tie-break axis.
2. **Topological order** — Kahn's algorithm over the edges, starting from
   indegree-0 roots, with the layout comparator breaking ties. Falls back to pure
   layout order if the graph has a cycle (`hasTopologyFallback`).
3. **Lead edge per node** — for each node, pick the single incoming edge from an
   already-revealed source. That edge "introduces" the node.
4. Output: `orderedNodeIds` + `segments[]`, where each segment is
   `{ targetNodeId, sourceNodeId, leadEdgeId }`.

### 5.2 Timeline — *port of `cinematicRenderState.ts`*

Each segment expands into timed phases:

| Phase | Source | Meaning |
| ----- | ------ | ------- |
| `introHold` | preset | Blank beat before the first node |
| `edgeGrow` | `easeOutQuart` | Lead edge draws from source → target |
| `nodeFade` | `easeOutCubic` | Target node fades + scales in |
| `settle` | preset | Small pause before the next segment |
| `finalHold` | preset | Completed diagram holds at the end |

`resolveRenderState(timeMs)` returns, for any time: the set of visible nodes, the
set of built edges, the currently-animating node and its `0..1` progress, and the
currently-growing edge and its `0..1` progress. Speed multipliers
(`slow 0.72×`, `normal 1×`, `fast 1.7×`) match `getCinematicSpeedMultiplier`.

### 5.3 Flow animation — *new in this concept*

Once `timeMs >= totalDurationMs`, the renderer enters a **looping flow** state:
evenly-spaced packets travel from each edge's source to its target at a constant
speed, using `path.getPointAtLength`. This is the piece the static cinematic
export does not have, and the reason this is architecture-flow-specific.

---

## 6. MVP Scope & Functional Requirements

The MVP is `examples/architecture-flow-animation/index.html` — one static file,
opened directly in a browser.

| # | Requirement |
| - | ----------- |
| FR1 | Render a fixed sample architecture graph (client → gateway → auth/orders → db/cache). |
| FR2 | Compute the build plan (topological order + lead edges) on load. |
| FR3 | Build a phase timeline from the plan and a speed preset. |
| FR4 | Animate the build live via `requestAnimationFrame`: edges grow, nodes fade/scale in, in dependency order. |
| FR5 | After build, loop a directional flow animation (packets along every edge). |
| FR6 | Controls: **Play/Pause**, **Restart**, **Speed** (slow/normal/fast). |
| FR7 | A scrub bar to seek to any point in the build timeline. |
| FR8 | Light/dark theme toggle (mirrors cinematic `themeMode`). |
| FR9 | Respect `prefers-reduced-motion`: render the completed diagram with no motion. |

### Acceptance criteria

- Pressing Play builds the diagram so that **no node appears before a node it
  depends on**, and **every edge grows from an already-visible source**.
- The build completes in a few seconds at `normal` speed and visibly faster at
  `fast`.
- After build, packets flow **from source to target** along every edge,
  continuously, until paused.
- Scrubbing to any position shows a consistent partial build (no edges to
  invisible nodes).

---

## 7. Technical Design (MVP)

- **Stack:** zero-dependency vanilla HTML + SVG + a small ES module script. No
  bundler, matching the repo's "pure static SPA, deploy a folder" ethos.
- **Rendering:** SVG paths for edges (`stroke-dasharray`/`stroke-dashoffset` for
  grow; `getPointAtLength` for flow packets) and `<g>` groups for nodes
  (`opacity` + `transform: scale` for fade-in).
- **Determinism:** build plan and timeline are pure functions of the graph +
  preset, so the same input always yields the same animation — identical to the
  production services' design.
- **No external assets:** glyphs are inline emoji/text so the file is fully
  portable.

### Path to productionizing (post-MVP)

1. Replace the sample graph with live `nodes`/`edges` from the store.
2. Drive the existing React Flow canvas with a `flowRenderState` instead of SVG,
   reusing `CinematicExportContext`'s render-state channel.
3. Add the flow phase to `cinematicRenderState.ts` so it can also be exported to
   video, and surface a "Flow" toggle in `StudioPlaybackPanel`.
4. Wire the same speed/theme presets already defined in `cinematicExport.ts`.

---

## 8. Success Metrics

- **Comprehension:** in user testing, viewers can correctly state the request path
  through the system after one playback.
- **Engagement:** % of architecture-diagram sessions that trigger a flow
  animation play.
- **Adoption path:** the MVP is accepted as the basis for a productionized
  on-canvas "Animate flow" action.

---

## 9. Milestones

| Milestone | Deliverable |
| --------- | ----------- |
| **M0 (this MVP)** | Self-contained live build + flow animation with controls. |
| M1 | Drive the real React Flow canvas from a flow render-state. |
| M2 | "Flow" phase added to cinematic export + Playback Studio toggle. |
| M3 | Configurable flow (per-edge speed, multi-path highlighting, narration captions). |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Large graphs make the build too long | Reuse the cinematic frame-budget scaling that compresses phase durations. |
| Motion accessibility | Honor `prefers-reduced-motion` (FR9). |
| Cyclic graphs have no topological order | Layout-order fallback (`hasTopologyFallback`), same as production. |
| SVG performance on huge diagrams | MVP targets demo-sized graphs; production path uses the existing canvas renderer. |

---

## 11. Open Questions

- Should flow direction follow edge direction only, or also reflect runtime
  semantics (request vs response)?
- Should the flow phase be part of the exported video, or live-only?
- How should flow interact with multi-component (disconnected) diagrams — flow all
  at once, or per component?
