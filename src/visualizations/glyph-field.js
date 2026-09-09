export function createGlyphField({
  random = Math.random,
  maxDensity = .085,
  fade = .996,
  displacedFade = .72,
} = {}) {
  let columns = 0;
  let rows = 0;
  let cells = new Map();

  const keyFor = (column, row) => row * columns + column;

  function resize(nextColumns, nextRows, preserve = false) {
    if (!preserve || !columns || !rows) {
      cells.clear();
    } else if (nextColumns !== columns || nextRows !== rows) {
      const remapped = new Map();
      cells.forEach((cell) => {
        const column = Math.min(nextColumns - 1, Math.floor((cell.column + .5) / columns * nextColumns));
        const row = Math.min(nextRows - 1, Math.floor((cell.row + .5) / rows * nextRows));
        const key = row * nextColumns + column;
        const candidate = { ...cell, column, row };
        if (!remapped.has(key) || remapped.get(key).current.alpha < candidate.current.alpha) remapped.set(key, candidate);
      });
      cells = remapped;
    }
    columns = nextColumns;
    rows = nextRows;
  }

  function chooseCell() {
    let fallback;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const column = Math.floor(random() * columns);
      const row = Math.floor(random() * rows);
      const key = keyFor(column, row);
      const candidate = { key, column, row, cell: cells.get(key) };
      fallback ??= candidate;
      if (!candidate.cell) return candidate;
    }
    return fallback;
  }

  function write(count, createGlyph) {
    if (!columns || !rows) return;
    const limit = Math.max(1, Math.floor(columns * rows * maxDensity));
    for (let index = 0; index < count; index += 1) {
      const target = chooseCell();
      if (!target) return;
      if (!target.cell && cells.size >= limit) continue;
      const current = createGlyph(target.column, target.row);
      const outgoing = target.cell?.current
        ? { ...target.cell.current, alpha: Math.min(target.cell.current.alpha, .8) }
        : null;
      cells.set(target.key, { column: target.column, row: target.row, current, outgoing });
    }
  }

  function advance() {
    cells.forEach((cell, key) => {
      cell.current.alpha *= fade;
      if (cell.outgoing) {
        cell.outgoing.alpha *= displacedFade;
        if (cell.outgoing.alpha < .02) cell.outgoing = null;
      }
      if (cell.current.alpha < .02 && !cell.outgoing) cells.delete(key);
    });
  }

  return {
    resize,
    write,
    advance,
    entries: () => Array.from(cells.values()),
    clear: () => cells.clear(),
  };
}
