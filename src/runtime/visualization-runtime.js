function validateDefinitions(definitions) {
  const ids = new Set();
  definitions.forEach((definition) => {
    if (!definition.id || !definition.label || typeof definition.create !== 'function') {
      throw new Error('Every visualization needs an id, label, and create factory.');
    }
    if (ids.has(definition.id)) throw new Error(`Duplicate visualization id: ${definition.id}`);
    ids.add(definition.id);
  });
}

export function createVisualizationRuntime({
  definitions,
  beforeActivate = async () => {},
  afterActivate = () => {},
  onError = () => {},
}) {
  validateDefinitions(definitions);
  const catalog = new Map(definitions.map((definition) => [definition.id, definition]));
  let active = null;
  let activeDefinition = null;

  function disposeActive() {
    try {
      active?.dispose?.();
    } catch (error) {
      onError(error, activeDefinition, 'dispose');
    }
    active = null;
    activeDefinition = null;
  }

  async function activate(id, meta = {}) {
    const nextDefinition = catalog.get(id);
    if (!nextDefinition) throw new Error(`Unknown visualization: ${id}`);
    const previousDefinition = activeDefinition;
    try {
      await beforeActivate({ previousDefinition, nextDefinition, meta });
      disposeActive();
      active = nextDefinition.create();
      activeDefinition = nextDefinition;
      afterActivate({ previousDefinition, nextDefinition, meta });
      return true;
    } catch (error) {
      onError(error, nextDefinition, 'enter');
      disposeActive();
      return false;
    }
  }

  function render(frame) {
    if (!active) return false;
    try {
      active.render(frame);
      return true;
    } catch (error) {
      const failedDefinition = activeDefinition;
      onError(error, failedDefinition, 'render');
      disposeActive();
      return false;
    }
  }

  function resize(viewport) {
    if (!active?.resize) return;
    try {
      active.resize(viewport);
    } catch (error) {
      const failedDefinition = activeDefinition;
      onError(error, failedDefinition, 'resize');
      disposeActive();
    }
  }

  return {
    definitions,
    activate,
    render,
    resize,
    dispose: disposeActive,
    get activeId() { return activeDefinition?.id ?? null; },
    definition(id) { return catalog.get(id); },
    eligible(meta = {}) {
      return definitions.filter((definition) => definition.carouselEligible?.(meta) !== false);
    },
  };
}
