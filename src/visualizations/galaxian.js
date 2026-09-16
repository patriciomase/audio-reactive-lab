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

function averageSpectrum(spectrum, from, to) {
  let total = 0;
  const start = Math.max(1, Math.floor(from));
  const end = Math.min(spectrum.length, Math.ceil(to));
  for (let index = start; index < end; index += 1) total += spectrum[index];
  return total / Math.max(1, end - start) / 255;
}

export function createGalaxianFrequencyLanes(count) {
  const lanes = Array.from({ length: count }, () => ({ average: null, energy: 0 }));
  return {
    update({ audioFrame, bands, frame }) {
      lanes.forEach((lane, index) => {
        const position = count === 1 ? .5 : index / (count - 1);
        let raw;
        if (audioFrame.isLive && audioFrame.spectrum.length) {
          const minFrequency = 45;
          const maxFrequency = Math.min(15000, audioFrame.sampleRate / 2);
          const frequency = minFrequency * Math.pow(maxFrequency / minFrequency, position);
          const bin = frequency / (audioFrame.sampleRate / audioFrame.fftSize);
          const radius = 2 + Math.round(position * 5);
          raw = averageSpectrum(audioFrame.spectrum, bin - radius, bin + radius + 1);
        } else {
          raw = position < .5
            ? bands.low + (bands.mid - bands.low) * position * 2
            : bands.mid + (bands.high - bands.mid) * (position - .5) * 2;
          raw *= .82 + Math.sin(frame * .025 + index * 1.47) * .18;
        }
        if (lane.average === null) lane.average = Math.max(.025, raw);
        lane.average += (raw - lane.average) * .012;
        const normalized = raw <= .008 ? 0
          : Math.max(0, Math.min(1.2, (raw - lane.average * .5) / (lane.average * .82 + .025)));
        lane.energy += (normalized - lane.energy) * (normalized > lane.energy ? .22 : .065);
      });
      return lanes;
    },
    reset() {
      lanes.forEach((lane) => { lane.average = null; lane.energy = 0; });
    },
  };
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
  let frequencyLanes = null;
  let laneCount = 0;
  let fighterX = null;
  let fighterPreviousX = null;
  let fighterPhase = 0;
  let fighterLift = 0;
  let formationPhase = 0;

  function populate(width, height) {
    const columns = width < 700 ? 7 : 10;
    laneCount = columns;
    frequencyLanes = createGalaxianFrequencyLanes(columns);
    const rows = width < 700 ? 5 : 6;
    const spacingX = Math.min(76, width * .075);
    const spacingY = Math.min(62, height * .082);
    formationWidth = (columns - 1) * spacingX;
    formationHeight = (rows - 1) * spacingY;
    ships = [];
    for (let row = 0; row < rows; row += 1) {
      const rowColumns = row === 0 ? Math.max(3, columns - 4) : row === 1 ? columns - 2 : columns;
      const firstLane = Math.floor((columns - rowColumns) / 2);
      for (let column = 0; column < rowColumns; column += 1) {
        const lane = firstLane + column;
        ships.push({
          x: (lane - (columns - 1) / 2) * spacingX,
          y: row * spacingY,
          row,
          lane,
          sprite: row === 0 ? 0 : row < 3 ? 1 : 2,
          phase: random() * Math.PI * 2,
          scale: .82 + random() * .28,
          rotates: random() < .2,
          rotationSpeed: .006 + random() * .012,
          rotationRange: .08 + random() * .2,
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
      formationPhase += .004 + Math.min(1, bands.level) * .003;
      const formationX = Math.sin(formationPhase) * Math.min(48, width * .045);
      const shipSize = Math.max(30, Math.min(58, Math.min(width, height) * .065));
      const lanes = frequencyLanes.update({ audioFrame, bands, frame });

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
        const energy = lanes[Math.min(laneCount - 1, ship.lane)].energy;
        const barScale = 1 + energy * .38;
        const distanceFromBottom = formationHeight - ship.y;
        const x = centreX + formationX + ship.x;
        const y = centreY + formationHeight - distanceFromBottom * barScale - energy * 7 - impact * 3;
        const size = shipSize * ship.scale * (1 + energy * .1);
        const image = sprites[ship.sprite];
        if (!image.complete || image.naturalWidth === 0) return;
        ctx.globalAlpha = .66 + Math.min(.3, energy * .42);
        if (ship.rotates) {
          const rotation = Math.sin(frame * ship.rotationSpeed + ship.phase) * ship.rotationRange * (.25 + energy * .75);
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
        fighterPhase += .008 + Math.min(1, bands.mid) * .012;
        const steering = Math.sin(fighterPhase) * .76 + Math.sin(fighterPhase * .43 + 1.3) * .24;
        const targetX = centreX + steering * formationWidth * (.22 + Math.min(1, bands.mid) * .16);
        if (fighterX === null) fighterX = centreX;
        fighterPreviousX ??= fighterX;
        fighterX += (targetX - fighterX) * .055;
        const velocity = fighterX - fighterPreviousX;
        fighterPreviousX = fighterX;
        const targetLift = impact * 15 + Math.min(1, bands.low) * 8;
        fighterLift += (targetLift - fighterLift) * .09;
        const y = height - Math.max(88, size * .8) - fighterLift;
        const rotation = Math.max(-.18, Math.min(.18, velocity * .025));
        ctx.globalAlpha = .8;
        ctx.save();
        ctx.translate(fighterX, y);
        ctx.rotate(rotation);
        ctx.drawImage(fighter, -size / 2, -size * .41, size, size * .82);
        ctx.restore();
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
      frequencyLanes?.reset();
      frequencyLanes = null;
      laneCount = 0;
      fighterX = null;
      fighterPreviousX = null;
      fighterPhase = 0;
      fighterLift = 0;
      formationPhase = 0;
    },
  };
}
