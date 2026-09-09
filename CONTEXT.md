# Audio Reactive Lab context

## Glossary

### Visualization

A named experience users can select directly or reach through the carousel. A visualization has activation-scoped state: entering starts it fresh and leaving disposes its state.

### Visualization runtime

The module that owns the visualization catalog, active visualization lifecycle, frame dispatch, resize dispatch, carousel eligibility, media requirements, and visualization-specific settings visibility.

### Activation

One continuous period in which a visualization is selected. State belongs to an activation and is not retained after leaving it.

### Effect

A rendering transformation applied to a visualization source. An effect may be exposed to users as a separate visualization while reusing the source implementation.

Effects render through capped, activation-scoped offscreen buffers. Standalone visualizations draw directly to the screen. The user-facing visualization list remains flat even when an entry is internally composed from a source and an effect.

### Listening session

The period between enabling and stopping microphone input. A listening session survives visualization changes.

### Temporary media

Extra media required only by the active visualization, such as Trace camera input. The visualization runtime acquires it on entry and releases it on leave. Carousel navigation must not trigger a new permission prompt.

Failure to acquire temporary media does not end the listening session.

### Global setting

A setting shared across visualizations, such as sensitivity, color mode, carousel state, or transition interval. Storage and migrations are centralized.

### Visualization setting

A setting declared by one visualization, such as Equalizer center text. The active visualization controls its visibility, but its implementation does not access the DOM or local storage.

### Failed activation

A visualization activation that throws during entry, rendering, or resize. The visualization runtime disposes it, keeps the animation loop alive, shows a small error, and advances the carousel when carousel mode is active.
