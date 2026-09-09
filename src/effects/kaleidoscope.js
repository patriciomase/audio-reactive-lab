export function paintKaleidoscope({ ctx, width, height, bands, frame, paintSource }) {
  const cx = width * .5;
  const cy = height * .5;
  const slices = width <= 700 ? 10 : 14;
  const sliceAngle = Math.PI * 2 / slices;
  const reach = Math.hypot(width, height);
  const rotation = frame * (.0008 + bands.mid * .0018);
  const radii = [reach * .12, reach * .34, reach * .58];

  for (let slice = 0; slice < slices; slice += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation + slice * sliceAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, -sliceAngle * .51, sliceAngle * .51);
    ctx.closePath();
    ctx.clip();
    if (slice % 2) ctx.scale(1, -1);
    radii.forEach((radius) => {
      ctx.save();
      ctx.translate(radius, 0);
      ctx.rotate(-rotation);
      ctx.translate(-cx, -cy);
      paintSource(ctx);
      ctx.restore();
    });
    ctx.restore();
  }
}
