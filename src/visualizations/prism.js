export function createPrismVisualization() {
  return {
    render({ ctx, width, height, bands, audioFrame, frame, color }) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let layer = 0; layer < 6; layer += 1) {
        ctx.beginPath();
        const baseY = height * (.12 + layer * .152);
        for (let x = 0; x <= width; x += 8) {
          const index = Math.floor((x / width) * Math.max(0, audioFrame.waveform.length - 1));
          const live = audioFrame.isLive ? (audioFrame.waveform[index] - 128) / 128 : Math.sin(x * .009 + frame * .018) * .12;
          const drift = Math.sin(x * .0035 + layer * 1.4 + frame * .0035) * (28 + layer % 2 * 10);
          const ripple = Math.sin(x * .008 + layer * 1.7 - frame * .002) * 12;
          const y = baseY + drift + ripple + live * (38 + bands.level * 45);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const hue = 190 + layer * 24 + frame * .035;
        ctx.strokeStyle = color(hue, 88, 62, .035 + bands.level * .035);
        ctx.shadowColor = color(hue, 92, 62, .14);
        ctx.shadowBlur = 18;
        ctx.lineWidth = 10 + bands.high * 2;
        ctx.stroke();
      }
      ctx.restore();

      ctx.globalCompositeOperation = 'lighter';
      for (let layer = 0; layer < 9; layer += 1) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 5) {
          const index = Math.floor((x / width) * Math.max(0, audioFrame.waveform.length - 1));
          const live = audioFrame.isLive ? (audioFrame.waveform[index] - 128) / 128 : Math.sin(x * .012 + frame * .03) * .12;
          const y = height / 2 + live * (110 + bands.level * 260) + Math.sin(x * .006 + layer + frame * .008) * (24 + bands.mid * 50);
          if (x === 0) ctx.moveTo(x, y + layer * 3); else ctx.lineTo(x, y + layer * 3);
        }
        ctx.strokeStyle = color(180 + layer * 22 + frame * .15, 95, 66, .12 + bands.level * .3);
        ctx.lineWidth = 3 + bands.high * 9;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
