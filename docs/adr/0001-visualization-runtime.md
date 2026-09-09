# ADR-0001: Catalog-driven visualization runtime

## Status

Accepted

## Context

Visualization identity, rendering, state resets, media requirements, settings visibility, carousel eligibility, and UI options were spread across multiple locations in `src/main.js` and `index.html`. Pulse and Kaleidoscope also need to share one visual source without duplicating state or update logic.

## Decision

Use one catalog-driven visualization runtime.

- A visualization has activation-scoped state and restarts on entry.
- Leaving disposes its canvases, histories, timers, and temporary media.
- The listening session survives visualization changes.
- Temporary camera media belongs to Trace and is released when Trace is left.
- Carousel navigation never triggers a new camera permission request.
- The catalog drives user-facing mode choices, lifecycle, settings visibility, media requirements, and carousel eligibility.
- User-facing entries remain flat even when a visualization internally composes a source and an effect.
- Rendering failures are isolated from the shared animation loop.

## Consequences

- New visualizations have one registration point.
- Existing visualizations migrate through temporary adapters.
- Pulse becomes a reusable source and Kaleidoscope becomes an effect adapter.
- The runtime interface becomes the primary lifecycle test seam.
- Microphone acquisition remains global; visualization-only media is acquired separately.
