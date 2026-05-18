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
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }
  }

  function update(dt) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.life -= dt;
      effect.x += effect.dx * dt;
      effect.y += effect.dy * dt;

      if (effect.life <= 0) effects.splice(index, 1);
    }
  }

  function draw() {
    const ctx = window.SWARM.ctx;

    effects.forEach(effect => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife);
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  window.SWARM.effectSystem = {
    reset,
    burst,
    update,
    draw
  };
})();
