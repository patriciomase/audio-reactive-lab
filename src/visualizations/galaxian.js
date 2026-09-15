const SHIP_SOURCES = [
  'assets/galaxian/flagship.svg',
  'assets/galaxian/scout-violet.svg',
  'assets/galaxian/scout-cyan.svg',
];

function loadSprite(source, createImage) {
  const image = createImage();
  image.src = source;
  return image;
}

export function createGalaxianVisualization({
  random = Math.random,
  createImage = () => new Image(),
} = {}) {
  const sprites = SHIP_SOURCES.map((source) => loadSprite(source, createImage));
  const fighter = loadSprite('assets/galaxian/fighter.svg', createImage);
  let ships = [];
  let formationWidth = 0;
  let formationHeight = 0;
  let previousLow = 0;
  let bassAverage = .12;
  let impact = 0;

  function populate(width, height) {
    const columns = width < 700 ? 7 : 10;
    const rows = width < 700 ? 5 : 6;
    const spacingX = Math.min(76, width * .075);
    const spacingY = Math.min(62, height * .082);
    formationWidth = (columns - 1) * spacingX;
    formationHeight = (rows - 1) * spacingY;
    ships = [];
    for (let row = 0; row < rows; row += 1) {
      const rowColumns = row === 0 ? Math.max(3, columns - 4) : row === 1 ? columns - 2 : columns;
      for (let column = 0; column < rowColumns; column += 1) {
        ships.push({
          x: (column - (rowColumns - 1) / 2) * spacingX,
          y: row * spacingY,
          row,
          sprite: row === 0 ? 0 : row < 3 ? 1 : 2,
          phase: random() * Math.PI * 2,
          shakeX: .45 + random() * 1.2,
          shakeY: .45 + random() * 1.25,
          scale: .82 + random() * .28,
        });
      }
    }
  }

  return {
    render({ ctx, width, height, bands, audioFrame, frame }) {
      if (!ships.length) populate(width, height);
      bassAverage += (bands.low - bassAverage) * .03;
      const beat = (audioFrame.isLive
        ? bands.low > Math.max(.18, bassAverage * 1.3) && bands.low - previousLow > .014
        : frame % 54 === 0);
      if (beat) impact = Math.min(1, .55 + bands.low * .8);
      previousLow = bands.low;
      impact *= .86;

      const centreX = width * .5;
      const centreY = Math.max(78, height * .13);
      const blockX = Math.sin(frame * .011) * Math.min(34, width * .035)
        + Math.sin(frame * 2.17) * impact * 7;
      const blockY = Math.cos(frame * 1.73) * impact * 5;
      const shipSize = Math.max(30, Math.min(58, Math.min(width, height) * .065));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ships.forEach((ship) => {
        const rowEnergy = ship.row < 2 ? bands.low : ship.row < 4 ? bands.mid : bands.high;
        const shake = .5 + rowEnergy * 8 + impact * 5;
        const x = centreX + blockX + ship.x
          + Math.sin(frame * (.17 + ship.row * .013) + ship.phase) * shake * ship.shakeX;
        const y = centreY + blockY + ship.y
          + Math.cos(frame * (.19 + ship.row * .011) + ship.phase) * shake * ship.shakeY;
        const size = shipSize * ship.scale * (1 + rowEnergy * .12 + impact * .06);
        const image = sprites[ship.sprite];
        if (!image.complete || image.naturalWidth === 0) return;
        ctx.globalAlpha = .66 + Math.min(.3, rowEnergy * .42);
        ctx.shadowColor = ship.sprite === 0 ? '#ff4d68' : ship.sprite === 1 ? '#b76cff' : '#34e4e9';
        ctx.shadowBlur = 7 + rowEnergy * 18 + impact * 9;
        ctx.drawImage(image, x - size / 2, y - size / 2, size, size * .82);
      });

      if (fighter.complete && fighter.naturalWidth !== 0) {
        const size = shipSize * 1.12;
        const x = centreX + Math.sin(frame * .014) * formationWidth * .38;
        const y = Math.min(height - size * .7, centreY + formationHeight + height * .19);
        ctx.globalAlpha = .8;
        ctx.shadowColor = '#42d7ff';
        ctx.shadowBlur = 9 + bands.level * 20;
        ctx.drawImage(fighter, x - size / 2, y - size / 2, size, size * .82);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
    resize({ width, height }) { populate(width, height); },
    dispose() {
      ships = [];
      previousLow = 0;
      bassAverage = .12;
      impact = 0;
    },
  };
}
