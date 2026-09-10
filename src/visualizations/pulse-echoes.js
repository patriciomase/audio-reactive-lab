export function createPulseEchoes({ random = Math.random } = {}) {
  let echoes = [];
  let nextEmissionAt = null;
  let previousTime = null;

  function schedule(time) {
    nextEmissionAt = time + 4000 + random() * 4000;
  }

  return {
    update({ time, x, y, radius, hue, width, height }) {
      if (previousTime === null) previousTime = time;
      const elapsedSeconds = Math.min(.1, Math.max(0, time - previousTime) / 1000);
      previousTime = time;
      echoes.forEach((echo) => {
        echo.x += echo.vx * elapsedSeconds;
        echo.y += echo.vy * elapsedSeconds;
      });
      echoes = echoes.filter((echo) => echo.x + echo.radius >= 0
        && echo.x - echo.radius <= width
        && echo.y + echo.radius >= 0
        && echo.y - echo.radius <= height);

      if (nextEmissionAt === null) schedule(time);
      if (time >= nextEmissionAt) {
        const alpha = .3 + random() * .1;
        const angle = random() * Math.PI * 2;
        const speed = Math.max(width, height) * (.045 + random() * .025);
        echoes.push({ x, y, radius, hue, alpha, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
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
