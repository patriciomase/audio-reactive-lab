export const OVERLAP_MORPH_DURATION = 2200;

export function overlapMorphDelay(random = Math.random) {
  return 18000 + random() * 18000;
}
