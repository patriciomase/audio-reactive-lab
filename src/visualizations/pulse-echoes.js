export function createPulseEchoes({ random = Math.random } = {}) {
  let echoes = [];
  let nextEmissionAt = null;
  let previousTime = null;

  function schedule(time) {
    nextEmissionAt = time + 1500 + random() * 3000;
  }

  function distanceUntilExit({ x, y, radius, vx, vy, width, height }) {
    const distanceX = vx === 0 ? Infinity : vx > 0 ? (width + radius - x) / vx : (-radius - x) / vx;
    const distanceY = vy === 0 ? Infinity : vy > 0 ? (height + radius - y) / vy : (-radius - y) / vy;
    return Math.min(distanceX, distanceY) * Math.hypot(vx, vy);
  }

  return {
    update({ time, x, y, radius, hue, width, height }) {
      if (previousTime === null) previousTime = time;
      const elapsedSeconds = Math.min(.1, Math.max(0, time - previousTime) / 1000);
      previousTime = time;
      echoes.forEach((echo) => {
        const dx = echo.vx * elapsedSeconds;
        const dy = echo.vy * elapsedSeconds;
        echo.x += dx;
        echo.y += dy;
        echo.distance += Math.hypot(dx, dy);
        const progress = Math.min(1, echo.distance / echo.exitDistance);
        echo.alpha = echo.startAlpha * Math.pow(1 - progress, .7);
      });
      echoes = echoes.filter((echo) => echo.x + echo.radius >= 0
        && echo.x - echo.radius <= width
        && echo.y + echo.radius >= 0
        && echo.y - echo.radius <= height);

      if (nextEmissionAt === null) schedule(time);
      if (time >= nextEmissionAt) {
        const alpha = .3 + random() * .1;
        const angle = random() * Math.PI * 2;
        const speed = Math.max(width, height) * (.04 + random() * .045);
        const childRadius = radius * (1.1 + random() * .25);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        echoes.push({
          x,
          y,
          radius: childRadius,
          hue,
          alpha,
          startAlpha: alpha,
          vx,
          vy,
          distance: 0,
          exitDistance: distanceUntilExit({ x, y, radius: childRadius, vx, vy, width, height }),
        });
        schedule(time);
      }
    },
    get items() {
      return echoes;
    },
    reset() {
      echoes = [];
      nextEmissionAt = null;
      previousTime = null;
    },
  };
}
