import { createBeatZoomEffect } from './breathing-zoom.js';

export function createKaleidoscopeEffect() {
  const paintBeatZoom = createBeatZoomEffect();
  return (renderFrame) => paintBeatZoom({
    ...renderFrame,
    paintSource: () => paintKaleidoscope(renderFrame),
  });
}

export function createKaleidoscopeGrid(width, height) {
  const columns = width <= 700 ? 4 : 6;
  const rows = Math.max(3, Math.ceil(height / (width / columns)));
  const tileWidth = width / columns;
  const tileHeight = height / rows;
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      tiles.push({
        x: column * tileWidth,
        y: row * tileHeight,
        width: tileWidth,
        height: tileHeight,
        mirrorX: column % 2 ? -1 : 1,
        mirrorY: row % 2 ? -1 : 1,
      });
    }
  }
  return { columns, rows, tiles };
}

export function paintKaleidoscope({ ctx, width, height, paintSource }) {
  const grid = createKaleidoscopeGrid(width, height);
  grid.tiles.forEach((tile) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(tile.x, tile.y, tile.width, tile.height);
    ctx.clip();
    ctx.translate(tile.x + tile.width * .5, tile.y + tile.height * .5);
    ctx.scale(tile.mirrorX, tile.mirrorY);
    ctx.translate(width * -.5, height * -.5);
    paintSource(ctx);
    ctx.restore();
  });
}
