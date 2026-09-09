# ADR-0003: Shared spectrum history for Terrain and Tunnel

## Status

Accepted

## Context

Terrain and Tunnel independently implemented the same logarithmic frequency sampling, demo signal, gain balancing, newest-first ordering, and bounded history. Changes to the shared behavior could drift, and both implementations allocated a row plus a sliced history array every animation tick.

## Decision

Use one activation-scoped spectrum-history module for both visualizations.

- The module owns logarithmic bin mapping and frequency gain balancing.
- It generates the equivalent deterministic demo rows from the audio-frame index.
- It exposes the newest-first history through one `advance(audioFrame)` interface.
- History never exceeds its configured row count.
- Once full, the oldest typed row is recycled as the next row.
- Terrain and Tunnel retain separate projection, movement, and drawing implementations.

## Consequences

- Spectrum sampling behavior has locality in one module and one test surface.
- Terrain and Tunnel cannot drift in their interpretation of the source spectrum.
- Steady-state history updates avoid per-frame row and history-array allocation.
- Removing either visualization leaves the shared implementation useful to the other.
