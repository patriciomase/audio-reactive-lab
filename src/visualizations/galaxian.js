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

export function createGalaxianShotController({ random = Math.random } = {}) {
  const fireRateMultiplier = 5;
  const shots = [];
  let nextShotAt = null;
  let previousTime = null;
  let fired = 0;

  return {
    update({ time, width, height, level, spawnX, spawnY }) {
      const delta = previousTime === null ? 1000 / 60 : Math.min(50, Math.max(0, time - previousTime));
      previousTime = time;
      if (nextShotAt === null) nextShotAt = time + 750 / fireRateMultiplier;
      let didFire = false;
      if (time >= nextShotAt) {
        shots.push({ x: spawnX, y: spawnY, speed: .16 + random() * .08 });
        fired += 1;
        didFire = true;
        nextShotAt = time + Math.max(500, Math.min(1000, 1000 - Math.min(1, level) * 500)) / fireRateMultiplier;
      }
      for (let index = shots.length - 1; index >= 0; index -= 1) {
        shots[index].y += shots[index].speed * delta;
        if (shots[index].y > height + 24) shots.splice(index, 1);
      }
      return didFire;
    },
    safeTarget({ preferredX, fighterY, width, margin, minX = margin, maxX = width - margin }) {
      const approaching = shots.filter((shot) => shot.y < fighterY + margin
        && (fighterY - shot.y) / shot.speed < 1400);
      if (!approaching.length) return { x: preferredX, urgency: 0 };
      const requiredClearance = margin * .88;
      const clampX = (x) => Math.max(minX, Math.min(maxX, x));
      const candidates = [clampX(preferredX)];
      approaching.forEach((shot) => {
        candidates.push(clampX(shot.x - requiredClearance));
        candidates.push(clampX(shot.x + requiredClearance));
      });
      const isClear = (candidate) => approaching.every((shot) => (
        Math.abs(candidate - shot.x) >= requiredClearance
      ));
      const clearCandidates = candidates.filter(isClear);
      const safestX = clearCandidates.length
        ? clearCandidates.reduce((nearest, candidate) => (
          Math.abs(candidate - preferredX) < Math.abs(nearest - preferredX) ? candidate : nearest
        ))
        : candidates.reduce((best, candidate) => {
          const clearance = Math.min(...approaching.map((shot) => Math.abs(candidate - shot.x)));
          const bestClearance = Math.min(...approaching.map((shot) => Math.abs(best - shot.x)));
          return clearance > bestClearance ? candidate : best;
        });
      const nearestArrival = Math.min(...approaching.map((shot) => (fighterY - shot.y) / shot.speed));
      return { x: safestX, urgency: Math.max(0, Math.min(1, 1 - nearestArrival / 900)) };
    },
    get shots() { return shots; },
    get fired() { return fired; },
    reset() {
      shots.length = 0;
      nextShotAt = null;
      previousTime = null;
      fired = 0;
    },
  };
}

export function createGalaxianFighterMotion({
  acceleration = .00135,
  maxSpeed = .34,
} = {}) {
  let x = null;
  let velocity = 0;

  return {
    update({ targetX, initialX, delta = 1000 / 60, minX, maxX }) {
      if (x === null) x = initialX;
      const elapsed = Math.min(50, Math.max(0, delta));
      const distance = targetX - x;
      const direction = Math.sign(distance);
      const stoppingDistance = velocity * velocity / (2 * acceleration);
      let thrust = 0;

      if (Math.abs(distance) > .5) {
        const movingAway = velocity !== 0 && Math.sign(velocity) !== direction;
        const shouldBrake = !movingAway && stoppingDistance >= Math.abs(distance);
        thrust = (movingAway || shouldBrake) ? -Math.sign(velocity) * acceleration : direction * acceleration;
      } else if (Math.abs(velocity) > .002) {
        thrust = -Math.sign(velocity) * acceleration;
      }

      const previousVelocity = velocity;
      velocity = Math.max(-maxSpeed, Math.min(maxSpeed, velocity + thrust * elapsed));
      if (previousVelocity !== 0 && Math.sign(previousVelocity) !== Math.sign(velocity) && Math.abs(distance) <= .5) {
        velocity = 0;
      }
      x += velocity * elapsed;
      if ((direction > 0 && x > targetX) || (direction < 0 && x < targetX)) {
        x = targetX;
        velocity = 0;
      }
      if (x < minX || x > maxX) {
        x = Math.max(minX, Math.min(maxX, x));
        velocity = 0;
      }
      return { x, velocity };
    },
    reset() { x = null; velocity = 0; },
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
  let formationSpacingX = 0;
  let previousLow = 0;
  let bassAverage = .12;
  let impact = 0;
  let frequencyLanes = null;
  let laneCount = 0;
  let fighterX = null;
  let fighterLift = 0;
  let previousRenderTime = null;
  const shotController = createGalaxianShotController({ random });
  const fighterMotion = createGalaxianFighterMotion();
  let shooterIndex = 0;

  function populate(width, height) {
    const columns = width < 700 ? 7 : 10;
    laneCount = columns;
    frequencyLanes = createGalaxianFrequencyLanes(columns);
    const rows = width < 700 ? 5 : 6;
    const spacingX = Math.min(76, width * .075);
    const spacingY = Math.min(62, height * .082);
    formationWidth = (columns - 1) * spacingX;
    formationSpacingX = spacingX;
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
      const shipSize = Math.max(20, Math.min(52, Math.min(width, height) * .065, formationSpacingX * .72));
      const lanes = frequencyLanes.update({ audioFrame, bands, frame });
      const time = Number.isFinite(audioFrame.time) ? audioFrame.time : frame * 1000 / 60;

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
        const shakeRange = Math.min(8, formationSpacingX * .11);
        const horizontalShake = Math.sin(frame * (.038 + ship.lane * .0018) + ship.lane * 1.21)
          * energy * shakeRange;
        const x = centreX + ship.x + horizontalShake;
        const y = centreY + ship.y;
        const size = shipSize * ship.scale;
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
        const fighterY = height - Math.max(88, size * .8) - fighterLift;
        const shooter = ships[shooterIndex % ships.length];
        const shooterEnergy = lanes[Math.min(laneCount - 1, shooter.lane)].energy;
        const shooterShake = Math.sin(frame * (.038 + shooter.lane * .0018) + shooter.lane * 1.21)
          * shooterEnergy * Math.min(8, formationSpacingX * .11);
        if (shotController.update({
          time,
          width,
          height,
          level: bands.level,
          spawnX: centreX + shooter.x + shooterShake,
          spawnY: centreY + shooter.y + shipSize * .4,
        })) shooterIndex = (shooterIndex + 7) % ships.length;
        if (fighterX === null) fighterX = centreX;
        const formationMinX = centreX - formationWidth * .5;
        const formationMaxX = centreX + formationWidth * .5;
        const safe = shotController.safeTarget({
          preferredX: fighterX,
          fighterY,
          width,
          margin: size,
          minX: formationMinX,
          maxX: formationMaxX,
        });
        const delta = previousRenderTime === null ? 1000 / 60 : time - previousRenderTime;
        previousRenderTime = time;
        const motion = fighterMotion.update({
          targetX: safe.x,
          initialX: centreX,
          delta,
          minX: formationMinX,
          maxX: formationMaxX,
        });
        fighterX = motion.x;
        const targetLift = impact * 15 + Math.min(1, bands.low) * 8;
        fighterLift += (targetLift - fighterLift) * .09;
        const y = height - Math.max(88, size * .8) - fighterLift;
        const rotation = Math.max(-.18, Math.min(.18, motion.velocity * .55));
        ctx.globalAlpha = .8;
        ctx.save();
        ctx.translate(fighterX, y);
        ctx.rotate(rotation);
        ctx.drawImage(fighter, -size / 2, -size * .41, size, size * .82);
        ctx.restore();

        shotController.shots.forEach((shot) => {
          const length = 13 + bands.high * 5;
          ctx.globalAlpha = .9;
          ctx.fillStyle = 'rgba(25, 3, 12, .9)';
          ctx.fillRect(shot.x - 3.2, shot.y - 2, 6.4, length + 4);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ff315d';
          ctx.fillRect(shot.x - 2, shot.y, 4, length);
          ctx.fillStyle = '#fff4d6';
          ctx.fillRect(shot.x - .75, shot.y + 2, 1.5, Math.max(5, length - 6));
        });
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
      fighterLift = 0;
      previousRenderTime = null;
      formationSpacingX = 0;
      shotController.reset();
      fighterMotion.reset();
      shooterIndex = 0;
    },
  };
}
