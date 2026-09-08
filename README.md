# Audio Reactive Lab

An experimental, microphone-driven visual playground inspired by classic Winamp AVS, rebuilt with the Web Audio API and Canvas for the modern browser.

## Prototype question

Which visual direction feels worth developing into a customizable audiovisual instrument? This throwaway first pass provides three modes on one route:

- **Orbit** — low/mid/high frequency bands drive layered particle rings with subtly varied electron sizes; long-lived echoes capture the current formation, expand beyond the screen edges, and only then fade while transients briefly reverse orbital direction.
- **Terrain** — a dense, logarithmically balanced FFT history becomes a square 3D spectrum mesh sized to 90% of the viewport's shorter edge. It rotates at half speed, periodically decelerates to a full stop, and reverses direction at randomized intervals.
- **Prism** — the time-domain waveform becomes a layered chromatic field.
- **Overlap** — outlined figures drift and pulse with the music, their backgrounds independently fade between black and dark gray over 10–18 seconds, and their intersections reveal new color fields. Every randomized 2–3 minute interval, the figures slowly morph between squares and circles.
- **Dancers** — an ensemble of faceless, hollow human contours performs procedural contemporary movement; bass drives weight and stomps, mids drive tempo and arms, and treble drives outline energy and delayed motion traces.
- **Universe** — a deep-space flight through layered stars and a four-armed galaxy; bass bends the core and releases gravitational ripples, mids turn the galaxy, and treble accelerates the starfield.
- **Tangle** — frequency-mapped dots bounce independently while remaining a single closed loop; self-crossing interior facets accumulate into colored regions, bass deepens the fill, and treble energizes the connections.

Once microphone input is active, the interface fades into an immersive visual-only state. Move the pointer to the right edge to reveal sensitivity and color controls, or to the bottom edge to reveal visualization types. Color presets include Original, Dark, Colorful, Random, and Vibrant, and affect only the visualization elements—not the neutral background.

Microphone audio never leaves the browser and is not recorded.

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
