(function () {
  "use strict";

  /**
   * ParrySystem: Pressionar ESPAÇO para cancelar ataques próximos
   * - Raio: 60px
   * - Janela: 300ms
   * - Cooldown: 500ms
   * - Recompensa: 50 pontos + 1 XP
   */
  class ParrySystem {
    constructor(options = {}) {
      this.world = options;
      this.radius = options.radius || 60;
      this.windowMs = options.windowMs || 300;
      this.cooldownMs = options.cooldownMs || 500;
      this.onSuccess = options.onSuccess || (() => {});

      this.active = false;
      this.activeTime = 0;
      this.cooldownTime = 0;
      this.particles = [];
    }

    reset() {
      this.active = false;
      this.activeTime = 0;
      this.cooldownTime = 0;
      this.particles.length = 0;
    }

    activate(now) {
      if (this.cooldownTime > 0) return false;

      this.active = true;
      this.activeTime = this.windowMs / 1000;
      this.cooldownTime = this.cooldownMs / 1000;

      const { player, utils } = this.world;
      const center = utils.center(player);

      // Efeito visual de ativação
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        this.particles.push({
          x: center.x,
          y: center.y,
          dx: Math.cos(angle),
          dy: Math.sin(angle),
          speed: 180,
          radius: 3,
          life: 0.25,
          maxLife: 0.25,
          color: "#ffd66b",
        });
      }

      return true;
    }

    tryParry(now) {
      if (!this.active || this.activeTime <= 0) return false;

      const { player, enemies, utils, onKill } = this.world;
      const playerCenter = utils.center(player);
      let parried = false;

      // Verificar inimigos próximos
      enemies.slice().forEach((enemy) => {
        const enemyCenter = utils.center(enemy);
        const distance = Math.hypot(
          enemyCenter.x - playerCenter.x,
          enemyCenter.y - playerCenter.y,
        );

        if (distance <= this.radius) {
          parried = true;
          this.onSuccess(enemy);

          // Efeito de partículas ao parry
          for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
              x: enemyCenter.x,
              y: enemyCenter.y,
              dx: Math.cos(angle),
              dy: Math.sin(angle),
              speed: 240,
              radius: 2.5,
              life: 0.35,
              maxLife: 0.35,
              color: "#ffd66b",
            });
          }
        }
      });

      if (parried) {
        this.active = false;
        this.activeTime = 0;
      }

      return parried;
    }

    update(dt, now) {
      this.activeTime = Math.max(0, this.activeTime - dt);
      this.cooldownTime = Math.max(0, this.cooldownTime - dt);

      // Atualizar partículas
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.x += p.dx * p.speed * dt;
        p.y += p.dy * p.speed * dt;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      if (this.activeTime <= 0) {
        this.active = false;
      }
    }

    draw(ctx) {
      const { player, utils } = this.world;
      const playerCenter = utils.center(player);

      // Desenhar círculo de parry quando ativo
      if (this.active && this.activeTime > 0) {
        const alpha = this.activeTime / (this.windowMs / 1000);
        const expandRadius = this.radius * (1 + (1 - alpha) * 0.5);

        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = "#ffd66b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(playerCenter.x, playerCenter.y, expandRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = "#ffd66b";
        ctx.beginPath();
        ctx.arc(playerCenter.x, playerCenter.y, expandRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Desenhar partículas
      ctx.save();
      this.particles.forEach((p) => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  window.SWARM = window.SWARM || {};
  window.SWARM.ParrySystem = ParrySystem;
})();
