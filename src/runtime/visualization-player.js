import { createVisualizationRuntime } from './visualization-runtime.js';

export function createVisualizationPlayer({
  definitions,
  initialId,
  eligibility = () => ({}),
  prepareTransition = async () => {},
  onChange = () => {},
  onError = () => {},
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let currentId = initialId;
  let carousel = { enabled: false, intervalMs: 30000 };
  let carouselTimer = null;
  let recoveryTimer = null;
  let selectionQueue = Promise.resolve(true);

  function cancelTimer(timer) {
    if (timer !== null) clearTimer(timer);
  }

  function eligibleDefinitions() {
    return runtime.eligible(eligibility());
  }

  function scheduleCarousel() {
    cancelTimer(carouselTimer);
    carouselTimer = null;
    if (!carousel.enabled) return;
    carouselTimer = setTimer(() => advance({ reason: 'carousel' }), carousel.intervalMs);
  }

  async function advance(meta = {}) {
    const available = eligibleDefinitions();
    if (!available.length) return false;
    const currentIndex = available.findIndex(({ id }) => id === currentId);
    const next = available[(currentIndex + 1 + available.length) % available.length];
    return select(next.id, meta);
  }

  const runtime = createVisualizationRuntime({
    definitions,
    beforeActivate: prepareTransition,
    afterActivate: ({ previousDefinition, nextDefinition, meta }) => {
      currentId = nextDefinition.id;
      onChange({ previous: previousDefinition, current: nextDefinition, meta });
      scheduleCarousel();
    },
    onError: (error, definition, phase) => {
      onError({ error, definition, phase });
      if (!carousel.enabled) return;
      cancelTimer(recoveryTimer);
      recoveryTimer = setTimer(() => advance({ reason: 'carousel', recovery: true }), 500);
    },
  });

  function select(id, meta = {}) {
    const selection = selectionQueue.then(() => runtime.activate(id, meta));
    selectionQueue = selection.catch(() => false);
    return selection;
  }

  function configureCarousel({ enabled, intervalMs }) {
    carousel = { enabled: Boolean(enabled), intervalMs: Math.max(1, Number(intervalMs) || 30000) };
    if (!carousel.enabled) cancelTimer(recoveryTimer);
    scheduleCarousel();
  }

  return {
    select,
    advance,
    configureCarousel,
    render: runtime.render,
    resize: runtime.resize,
    dispose() {
      cancelTimer(carouselTimer);
      cancelTimer(recoveryTimer);
      runtime.dispose();
    },
    get currentId() { return currentId; },
    definition: runtime.definition,
  };
}
