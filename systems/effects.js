(function () {
  "use strict";

  const effects = [];

  function reset() {
    effects.length = 0;
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      effects.push({
        type: "burst",
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
      });
    }
  }

  function lightning(x1, y1, x2, y2, color, duration) {
    effects.push({
      type: "lightning",
      x1,
      y1,
      x2,
      y2,
      color,
      life: duration,
      maxLife: duration,
      width: 4,
      segments: 10,
    });
  }

  function update(dt) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.life -= dt;

      if (effect.type === "burst") {
        effect.x += effect.dx * dt;
        effect.y += effect.dy * dt;
      }

      if (effect.life <= 0) effects.splice(index, 1);
    }
  }

  function draw() {
    const ctx = window.SWARM.ctx;

    effects.forEach((effect) => {
      ctx.save();
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.globalAlpha = alpha;

      if (effect.type === "lightning") {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = effect.width;
        ctx.beginPath();
        const dx = (effect.x2 - effect.x1) / effect.segments;
        const dy = (effect.y2 - effect.y1) / effect.segments;
        let px = effect.x1;
        let py = effect.y1;
        ctx.moveTo(px, py);

        for (let index = 1; index <= effect.segments; index += 1) {
          const nx = effect.x1 + dx * index;
          const ny = effect.y1 + dy * index;
          const offset = (Math.random() - 0.5) * 18 * (alpha + 0.2);
          ctx.lineTo(
            nx + (dy * offset) / Math.hypot(dx, dy),
            ny - (dx * offset) / Math.hypot(dx, dy),
          );
          px = nx;
          py = ny;
        }

        ctx.stroke();
      } else {
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  window.SWARM.effectSystem = {
    reset,
    burst,
    lightning,
    update,
    draw,
  };
})();
