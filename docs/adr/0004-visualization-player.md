# ADR-0004: Visualization player owns selection policy

## Status

Accepted

## Context

Selection policy was split across carousel scheduling, failure advancement, runtime callbacks, UI handlers, and startup code in `main.js`. A successful activation required coordinating current mode, timer replacement, eligibility, and recovery behavior in several locations.

## Decision

Introduce a visualization-player module around the visualization runtime.

- The player owns the authoritative current visualization.
- Async selections are serialized so transitions cannot interleave.
- Carousel enablement, interval changes, timer replacement, and eligible-next selection are internal.
- Failed activations trigger delayed eligible advancement only when carousel mode is enabled.
- Transition preparation and successful/error projections are adapters supplied by the composition root.
- DOM, URL, storage, analytics, and media implementations remain outside the player.
- A failure during transition preparation preserves the current activation.

## Consequences

- Selection and carousel policy have one interface and one test surface.
- The composition root no longer knows how to calculate the next eligible visualization or recover the carousel.
- Media permissions remain replaceable through the transition-preparation seam.
- A later UI/settings extraction can change adapters without changing selection policy.
