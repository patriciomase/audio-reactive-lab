# Audio Reactive Lab

An experimental, microphone-driven visual playground inspired by classic Winamp AVS, rebuilt with the Web Audio API and Canvas for the modern browser.

## Prototype question

Which visual direction feels worth developing into a customizable audiovisual instrument? This throwaway first pass provides three modes on one route:

- **Orbit** — low/mid/high frequency bands drive layered particle rings.
- **Terrain** — FFT history becomes a perspective spectrum landscape.
- **Prism** — the time-domain waveform becomes a layered chromatic field.

Once microphone input is active, the interface fades into an immersive visual-only state. Move the pointer to the right edge to reveal sensitivity and color controls. Color presets include Original, Dark, Colorful, Random, and Vibrant.

Microphone audio never leaves the browser and is not recorded.

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
