# Architecture Flow Animation — MVP

A self-contained proof-of-concept that animates an architecture diagram building
itself in dependency order, then loops a directional **data-flow** animation along
the edges.

It distills OpenFlowKit's existing **cinematic export** concept
(`src/services/export/cinematicBuildPlan.ts` + `cinematicRenderState.ts`) into the
essential, live, interactive slice — no video encoding, no store wiring.

## Run it

No build step. Open the file directly:

```bash
open examples/architecture-flow-animation/index.html
# or serve the folder, e.g.
npx serve examples/architecture-flow-animation
```

## What it demonstrates

1. **Build plan** — topological order (Kahn's algorithm) + layout tie-break +
   per-node "lead edge", ported from `cinematicBuildPlan.ts`.
2. **Timeline** — phased reveal (intro → edge-grow → node-fade → settle →
   final-hold) with `slow`/`normal`/`fast` speed multipliers, ported from
   `cinematicRenderState.ts`.
3. **Flow animation** — once built, packets travel source → target along every
   edge (the architecture-flow-specific addition).

## Controls

- **Play / Pause**, **Restart**
- **Speed**: Slow / Normal / Fast (same multipliers as cinematic export)
- **Build scrubber** to seek anywhere in the build
- **Dark / Light** theme toggle
- Honors `prefers-reduced-motion` (jumps to the built diagram, no motion)

See [`PRD.md`](./PRD.md) for the full product requirements, scope, and the path to
productionizing this on the real React Flow canvas.
