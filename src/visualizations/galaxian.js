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
  let starLayers = [];
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
          rotates: random() < .2,
          rotationSpeed: .012 + random() * .025,
          rotationRange: .12 + random() * .32,
          dives: row > 0 && random() < .11,
          diveOffset: Math.floor(random() * 720),
        });
      }
    }
    starLayers = [
      { count: width < 700 ? 24 : 42, speed: .28, size: .7, alpha: .2, stars: [] },
      { count: width < 700 ? 18 : 30, speed: .62, size: 1.15, alpha: .34, stars: [] },
      { count: width < 700 ? 10 : 18, speed: 1.15, size: 1.8, alpha: .5, stars: [] },
    ];
    starLayers.forEach((layer) => {
      layer.stars = Array.from({ length: layer.count }, () => ({
        x: random() * width,
        y: random() * height,
        phase: random() * Math.PI * 2,
      }));
    });
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
      ctx.globalCompositeOperation = 'source-over';
      starLayers.forEach((layer, layerIndex) => {
        ctx.fillStyle = `rgba(${190 + layerIndex * 20}, ${205 + layerIndex * 15}, 255, ${layer.alpha + bands.high * .08})`;
        layer.stars.forEach((star) => {
          star.y += layer.speed * (1 + bands.high * .45);
          star.x += Math.sin(frame * .006 + star.phase) * layer.speed * .035;
          if (star.y > height + layer.size * 3) {
            star.y = -layer.size * 3;
            star.x = random() * width;
          }
          const streak = layer.size * (1.4 + layer.speed * 2 + bands.high * 2.5);
          ctx.fillRect(star.x, star.y, layer.size, streak);
        });
      });

      ships.forEach((ship) => {
        const rowEnergy = ship.row < 2 ? bands.low : ship.row < 4 ? bands.mid : bands.high;
        const shake = .5 + rowEnergy * 8 + impact * 5;
        let x = centreX + blockX + ship.x
          + Math.sin(frame * (.17 + ship.row * .013) + ship.phase) * shake * ship.shakeX;
        let y = centreY + blockY + ship.y
          + Math.cos(frame * (.19 + ship.row * .011) + ship.phase) * shake * ship.shakeY;
        let diveRotation = 0;
        if (ship.dives) {
          const diveCycle = ((frame + ship.diveOffset) % 720) / 720;
          if (diveCycle < .24) {
            const progress = diveCycle / .24;
            const envelope = Math.sin(progress * Math.PI);
            x += Math.sin(progress * Math.PI * 2) * width * .16 * envelope;
            y += envelope * height * .34;
            diveRotation = Math.sin(progress * Math.PI * 2) * .72;
          }
        }
        const size = shipSize * ship.scale;
        const image = sprites[ship.sprite];
        if (!image.complete || image.naturalWidth === 0) return;
        ctx.globalAlpha = .66 + Math.min(.3, rowEnergy * .42);
        if (ship.rotates || diveRotation) {
          const rotation = diveRotation + Math.sin(frame * ship.rotationSpeed + ship.phase) * ship.rotationRange;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.drawImage(image, -size / 2, -size * .41, size, size * .82);
          ctx.restore();
        } else {
          ctx.drawImage(image, x - size / 2, y - size * .41, size, size * .82);
        }
      });

      if (fighter.complete && fighter.naturalWidth !== 0) {
        const size = shipSize * 1.12;
        const x = centreX + Math.sin(frame * .014) * formationWidth * .38;
        const y = Math.min(height - size * .7, centreY + formationHeight + height * .19);
        ctx.globalAlpha = .8;
        ctx.drawImage(fighter, x - size / 2, y - size / 2, size, size * .82);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
    resize({ width, height }) { populate(width, height); },
    dispose() {
      ships = [];
      starLayers = [];
      previousLow = 0;
      bassAverage = .12;
      impact = 0;
    },
  };
}
