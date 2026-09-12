import { createSpectrumHistory } from '../audio/spectrum-history.js';

const COLUMNS = 72;
const ROWS = 88;

export function createTerrainVisualization({ random = Math.random } = {}) {
  const history = createSpectrumHistory({ columns: COLUMNS, rows: ROWS });
  let angle = 0;
  let direction = 1;
  let velocity = .0045;
  let targetVelocity = .0045;
  let nextTurnFrame = null;

  return {
    render({ ctx, width, height, bands, audioFrame, frame, color }) {
      const spectrumHistory = history.advance(audioFrame);
      if (nextTurnFrame === null) nextTurnFrame = frame + 420 + random() * 540;
      if (frame >= nextTurnFrame && targetVelocity !== 0) {
        targetVelocity = 0;
        nextTurnFrame = Infinity;
      }
      velocity += (targetVelocity - velocity) * .025;
      if (targetVelocity === 0 && Math.abs(velocity) < .00006) {
        direction *= -1;
        targetVelocity = .0045 * direction;
        nextTurnFrame = frame + 420 + random() * 720;
      }
      angle += velocity;

      const pitch = .82 + bands.low * .08;
      const roll = bands.high * .025;
      const cosY = Math.cos(angle), sinY = Math.sin(angle);
      const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
      const cosZ = Math.cos(roll), sinZ = Math.sin(roll);
      const focal = Math.max(width, height) * 1.15;
      const project = (x, y, z) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const x3 = x1 * cosZ - y2 * sinZ;
        const y3 = x1 * sinZ + y2 * cosZ;
        const scale = focal / (focal + z2);
        return { x: width / 2 + x3 * scale, y: height * .56 + y3 * scale };
      };

      const side = Math.min(width, height) * .9;
      const grid = spectrumHistory.map((row, z) => Array.from(row, (value, index) => project(
        (index / (row.length - 1) - .5) * side,
        -value * side * (.64 + bands.low * .24),
        (z / (ROWS - 1) - .5) * side,
      )));

      ctx.lineWidth = 1.05;
      grid.forEach((row, z) => {
        ctx.beginPath();
        row.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
        ctx.strokeStyle = color(190 + z * 4 + bands.high * 80, 90, 64, .82 - z / 45);
        ctx.stroke();
      });
      for (let column = 0; column < COLUMNS; column += 2) {
        ctx.beginPath();
        grid.forEach((row, z) => z === 0 ? ctx.moveTo(row[column].x, row[column].y) : ctx.lineTo(row[column].x, row[column].y));
        ctx.strokeStyle = color(225 + column * 2 + bands.high * 70, 84, 60, .24);
        ctx.stroke();
      }
    },
  };
}
