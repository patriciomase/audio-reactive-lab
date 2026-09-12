import { createSpectrumHistory } from '../audio/spectrum-history.js';

const COLUMNS = 72;
const ROWS = 88;

export function createTunnelVisualization({ random = Math.random } = {}) {
  const history = createSpectrumHistory({ columns: COLUMNS, rows: ROWS });
  let grid = [];
  const rotation = { x: .48, y: -.32, z: .12 };
  const velocity = { x: .0018, y: -.0013, z: .0011 };
  const targetVelocity = { ...velocity };
  let nextDirection = 0;

  return {
    render({ ctx, width, height, bands, audioFrame, frame, color }) {
      const tunnelHistory = history.advance(audioFrame);
      if (frame >= nextDirection) {
        const randomVelocity = () => (random() * 2 - 1) * (.0022 + random() * .0018);
        targetVelocity.x = randomVelocity();
        targetVelocity.y = randomVelocity();
        targetVelocity.z = randomVelocity();
        nextDirection = frame + 300 + random() * 540;
      }
      ['x', 'y', 'z'].forEach((axis) => {
        velocity[axis] += (targetVelocity[axis] - velocity[axis]) * .008;
        rotation[axis] += velocity[axis];
      });

      const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
      const cosZ = Math.cos(rotation.z), sinZ = Math.sin(rotation.z);
      const focal = Math.max(width, height) * 1.4;
      const project = (x, y, z, target) => {
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const x3 = x2 * cosZ - y1 * sinZ;
        const y3 = x2 * sinZ + y1 * cosZ;
        const scale = focal / (focal + z2);
        target.x = width / 2 + x3 * scale;
        target.y = height * .52 + y3 * scale;
      };

      const side = Math.min(width, height) * .68;
      const baseRadius = side * .255;
      while (grid.length < tunnelHistory.length) grid.push(Array.from({ length: COLUMNS }, () => ({ x: 0, y: 0 })));
      grid.length = tunnelHistory.length;
      tunnelHistory.forEach((row, rowIndex) => row.forEach((value, column) => {
        const pointAngle = column / (COLUMNS - 1) * Math.PI * 2;
        const radius = baseRadius + value * side * (.32 + bands.low * .12);
        project(Math.cos(pointAngle) * radius, Math.sin(pointAngle) * radius, (rowIndex / (ROWS - 1) - .5) * side, grid[rowIndex][column]);
      }));

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      grid.forEach((ring, rowIndex) => {
        ctx.beginPath();
        ring.forEach((point, column) => column === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
        ctx.closePath();
        const depth = rowIndex / Math.max(1, ROWS - 1);
        ctx.strokeStyle = color(180 + rowIndex * 3 + bands.high * 80, 90, 64, .16 + Math.sin(depth * Math.PI) * .58);
        ctx.stroke();
      });
      for (let column = 0; column < COLUMNS; column += 3) {
        ctx.beginPath();
        grid.forEach((ring, rowIndex) => rowIndex === 0 ? ctx.moveTo(ring[column].x, ring[column].y) : ctx.lineTo(ring[column].x, ring[column].y));
        ctx.strokeStyle = color(220 + column * 2 + bands.mid * 70, 86, 62, .22 + bands.high * .18);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    dispose() { grid = []; },
  };
}
