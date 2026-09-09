# ADR-0002: Single audio frame per animation tick

## Status

Accepted

## Context

Visualizations read mutable Web Audio analyzer buffers directly and calculated sound inputs independently. Rendering behavior could therefore depend on call order, and visualization tests required browser audio globals.

## Decision

Use one audio-frame sampler before visualization dispatch.

- The analyzer spectrum and waveform are read exactly once per animation tick.
- Every visualization receives the same audio frame through the visualization runtime.
- The audio frame includes normalized bands, raw buffers, frame index, time, sample rate, FFT size, and live/demo status.
- The sampler reuses typed arrays to avoid frame-by-frame allocation.
- Demo bands are deterministic for a given frame index.
- Visualizations do not access the Web Audio analyzer directly.

## Consequences

- Audio sampling has one testable interface and one implementation.
- Visualization output no longer depends on analyzer-read ordering.
- Stateful visualizations can be tested with plain audio-frame fixtures.
- Shared beat detection and logarithmic spectrum sampling can move behind this seam in later slices.
