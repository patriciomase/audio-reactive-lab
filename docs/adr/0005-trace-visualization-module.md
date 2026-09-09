# ADR-0005: Trace owns visual processing, not camera media

## Status

Accepted

## Context

Trace contour extraction, scratch buffers, beat cadence, layer history, animation, and rendering lived in `main.js` beside camera permission and stream lifecycle. Its activation state was global and its implementation could not be tested without the entire application.

## Decision

Extract Trace as an activation-scoped visualization module.

- Trace owns camera-frame cropping and mirroring, contour extraction, scratch canvases, beat/refresh cadence, bounded layers, animation, compositing, and disposal.
- A stable video element is injected as a read-only frame adapter.
- Palette resolution and the shared starfield are injected adapters evaluated while rendering.
- Camera permission, video playback, media tracks, and stream teardown remain outside Trace.
- Pure contour detection is exposed as part of the module's test surface.

## Consequences

- Trace visual behavior and state have locality in one module.
- Leaving Trace disposes its visual buffers independently of camera teardown.
- Contour behavior is testable without browser media permission.
- The player and media adapter retain responsibility for deciding when Trace may activate.
