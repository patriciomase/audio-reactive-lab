import { createKaleidoscopeEffect } from '../effects/kaleidoscope.js';
import { createPulseVisualization } from './pulse.js';

export const visualizationMetadata = [
  ['orbit', 'Orbit'],
  ['terrain', 'Terrain'],
  ['prism', 'Prism'],
  ['overlap', 'Overlap'],
  ['universe', 'Universe'],
  ['tangle', 'Tangle'],
  ['tunnel', 'Tunnel'],
  ['trace', 'Trace'],
  ['equalizer', 'Equalizer'],
  ['glyph', 'Glyph'],
  ['pulse', 'Pulse'],
  ['kaleidoscope', 'Kaleidoscope'],
];

export function createVisualizationCatalog(legacy) {
  const definitions = visualizationMetadata.slice(0, 10).map(([id, label]) => ({
    id,
    label,
    media: id === 'trace' ? 'camera' : 'microphone',
    settings: id === 'equalizer' ? ['equalizerText'] : [],
    carouselEligible: id === 'trace' ? ({ hasCamera }) => hasCamera : undefined,
    create: legacy[id],
  }));

  definitions.push(
    { id: 'pulse', label: 'Pulse', media: 'microphone', settings: [], create: () => createPulseVisualization() },
    {
      id: 'kaleidoscope',
      label: 'Kaleidoscope',
      media: 'microphone',
      settings: [],
      create: () => createPulseVisualization({ effect: createKaleidoscopeEffect(), sizeScale: .48 }),
    },
  );
  return definitions;
}
