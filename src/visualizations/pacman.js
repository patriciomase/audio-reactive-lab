const PACMAN_FRAMES = [
  'assets/pacman/pacman-open.svg',
  'assets/pacman/pacman-half.svg',
  'assets/pacman/pacman-closed.svg',
  'assets/pacman/pacman-half.svg',
];

const GHOSTS = [
  'assets/pacman/ghost-red.svg',
  'assets/pacman/ghost-pink.svg',
  'assets/pacman/ghost-cyan.svg',
  'assets/pacman/ghost-orange.svg',
];

function createSprite(source, createImage) {
  const image = createImage();
  image.src = source;
  return image;
}

export function createPacmanVisualization({
  random = Math.random,
  createImage = () => new Image(),
} = {}) {
  const pacmanFrames = PACMAN_FRAMES.map((source) => createSprite(source, createImage));
  const ghosts = GHOSTS.map((source) => createSprite(source, createImage));
  let travelers = [];
  let viewportWidth = 0;
  let viewportHeight = 0;
  let previousLow = 0;
  let lowAverage = .12;
  let lastBeat = -100;

  function resetTraveler(traveler, width, height, initial = false) {
    const direction = random() < .76 ? 1 : -1;
    const size = Math.min(width, height) * (.055 + random() * .14);
    traveler.sprite = Math.floor(random() * ghosts.length);
    traveler.direction = direction;
    traveler.size = Math.max(34, Math.min(170, size));
    traveler.speed = .35 + random() * 1.45;
    traveler.x = initial
      ? random() * (width + traveler.size * 2) - traveler.size
      : direction > 0 ? -traveler.size * 1.3 : width + traveler.size * 1.3;
    traveler.y = traveler.size * .65 + random() * Math.max(1, height - traveler.size * 1.3);
    traveler.phase = random() * Math.PI * 2;
    traveler.bob = 2 + random() * 12;
    traveler.alpha = .5 + random() * .45;
    traveler.jumpDelay = Math.floor(random() * 8);
    traveler.jumpDuration = 23 + Math.floor(random() * 10);
    traveler.jumpStrength = .55 + random() * .75;
  }

  function populate(width, height) {
    const count = width < 700 ? 9 : Math.max(12, Math.min(22, Math.round(width / 95)));
    travelers = Array.from({ length: count }, (_, index) => {
      const traveler = { kind: index === 0 ? 'pacman' : 'ghost' };
      resetTraveler(traveler, width, height, true);
      return traveler;
    });
    viewportWidth = width;
    viewportHeight = height;
  }

  return {
    render({ ctx, width, height, bands, audioFrame, frame }) {
      if (!travelers.length || width !== viewportWidth || height !== viewportHeight) populate(width, height);
      const audioSpeed = 1 + Math.min(1, bands.level) * .75 + Math.min(1, bands.mid) * .35;
      lowAverage += (bands.low - lowAverage) * .028;
      const beat = (audioFrame.isLive
        ? bands.low > Math.max(.17, lowAverage * 1.3) && bands.low - previousLow > .014
        : frame % 52 === 0)
        && frame - lastBeat > 16;
      if (beat) {
        lastBeat = frame;
      }
      previousLow = bands.low;

      travelers.forEach((traveler, index) => {
        traveler.x += traveler.speed * traveler.direction * audioSpeed;
        if (traveler.direction > 0 && traveler.x - traveler.size > width
          || traveler.direction < 0 && traveler.x + traveler.size < 0) {
          resetTraveler(traveler, width, height);
        }

        const bob = Math.sin(frame * (.018 + traveler.speed * .008) + traveler.phase)
          * traveler.bob * (1 + bands.high * .7);
        const jumpElapsed = frame - lastBeat - traveler.jumpDelay;
        const jumpProgress = Math.max(0, Math.min(1, jumpElapsed / traveler.jumpDuration));
        const isJumping = jumpElapsed >= 0 && jumpElapsed <= traveler.jumpDuration;
        const jump = isJumping
          ? -Math.sin(jumpProgress * Math.PI) * (12 + traveler.size * .22) * traveler.jumpStrength
            * (1 + Math.min(1, bands.low) * .35)
          : 0;
        const pulse = 1 + Math.sin(frame * .025 + traveler.phase) * .018 + bands.low * .055;
        const size = traveler.size * pulse;
        const mouthFrameDuration = Math.max(5, Math.round((7 - Math.min(3, Math.floor(bands.level * 4))) * 1.5));
        const image = traveler.kind === 'pacman'
          ? pacmanFrames[Math.floor(frame / mouthFrameDuration) % pacmanFrames.length]
          : ghosts[traveler.sprite];
        if (!image.complete || image.naturalWidth === 0) return;

        ctx.save();
        ctx.globalAlpha = traveler.alpha;
        ctx.translate(traveler.x, traveler.y + bob + jump);
        if (traveler.direction < 0) ctx.scale(-1, 1);
        ctx.shadowColor = traveler.kind === 'pacman' ? 'rgba(255,216,0,.32)' : 'rgba(160,120,255,.22)';
        ctx.shadowBlur = 8 + bands.level * 18;
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        ctx.restore();

        if (traveler.kind === 'pacman' && index % 2 === 0) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 228, 191, ${.16 + bands.high * .18})`;
          ctx.arc(traveler.x - traveler.direction * size * .78, traveler.y + bob + jump, Math.max(1.5, size * .035), 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    resize({ width, height }) { populate(width, height); },
    dispose() {
      travelers = [];
      previousLow = 0;
      lowAverage = .12;
      lastBeat = -100;
    },
  };
}
