# FATBEATS.org

An experimental, microphone-driven visual playground inspired by classic Winamp AVS, rebuilt with the Web Audio API and Canvas for the modern browser.

## Prototype question

Which visual direction feels worth developing into a customizable audiovisual instrument? This throwaway first pass provides three modes on one route:

- **Orbit** — low/mid/high frequency bands drive layered particle rings with subtly varied electron sizes; long-lived echoes capture the current formation, expand beyond the screen edges, and only then fade while transients briefly reverse orbital direction.
- **Terrain** — a dense, logarithmically balanced FFT history becomes a square 3D spectrum mesh sized to 90% of the viewport's shorter edge. It rotates at half speed, periodically decelerates to a full stop, and reverses direction at randomized intervals.
- **Prism** — the time-domain waveform becomes a layered chromatic field.
- **Overlap** — outlined figures drift and pulse with the music, their backgrounds independently fade between black and dark gray over 10–18 seconds, and their intersections reveal new color fields. Roughly every 18–36 seconds, the figures smoothly morph between squares, circles, and triangles.
- **Universe** — a deep-space flight through layered stars and a four-armed galaxy; bass bends the core and releases gravitational ripples, mids turn the galaxy, and treble accelerates the starfield.
- **Tangle** — frequency-mapped dots bounce independently while remaining a single closed loop; self-crossing interior facets accumulate into colored regions, bass deepens the fill, and treble energizes the connections.
- **Tunnel** — Terrain's spectrum history is wrapped into a cylindrical mesh that carries new rings through its length while smoothly tumbling around randomized X, Y, and Z axes.
- **Trace** — when camera access is enabled, each bass beat freezes a colorized contour-only view; older outlines drift, enlarge, and fade while new moments accumulate above them.
- **Equalizer** — a four-way mirrored classic bar spectrum gives extra response to the outer frequencies while a customizable, heavy filled title releases drifting color echoes on each beat.
- **Glyph** — a dense character grid where beats write, replace, and slowly erase randomized symbols.
- **Pulse** — a single translucent orb whose color and two-axis movement follow the live waveform.
- **Kaleidoscope** — Pulse passed through a slowly rotating radial mirror effect.

Once microphone input is active, the interface fades into an immersive visual-only state. Move the pointer to the right edge to reveal sensitivity and color controls, or to the bottom edge to reveal visualization types. Color presets include Original, Dark, Colorful, Random, and Vibrant, and affect only the visualization elements—not the neutral background.

Microphone audio and optional Trace camera frames never leave the browser and are not recorded. Trace keeps only a short-lived set of processed contour layers in memory; the original camera image is never displayed or stored.

Anonymous, cookieless usage analytics are provided by Umami. The site records page visits, session duration, microphone activation, visualization changes, and color-preset changes; it never sends microphone audio or sensitivity values.

## Run locally

```bash
npm install
npm run dev
```

Open the local HTTPS/localhost URL and select **Enable microphone**. The visualizer runs a gentle demo signal before permission is granted.

Use `?mode=orbit`, `?mode=terrain`, or `?mode=prism` to link directly to a variation.

## Next decisions

- Pick or combine the strongest visual direction.
- Add palettes, frequency crossover controls, and reactive mappings.
- Add audio-file/system-audio input and shareable presets.
- Explore WebGL shaders and 3D scenes after validating the interaction model.

## Status

Prototype code: optimize for learning, then absorb the winning direction into a production architecture.

The visual engine is deliberately plain JavaScript. A UI framework can be introduced later if a substantial preset editor or customization system makes it worthwhile.
