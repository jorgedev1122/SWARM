(function () {
  "use strict";

  /**
   * BarrelManager: Barris que explodem
   * - Spawn: 2 barris a cada 40 segundos
   * - Explode ao primeiro contato
   * - Explosão: raio 240px, dano 100
   */
  class Barrel {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.width = 50;
      this.height = 50;
      this.exploded = false;
    }
  }

  class BarrelManager {
    constructor(options = {}) {
      this.world = options;
      this.spawnEvery = options.spawnEvery || 40;
      this.maxBarrels = options.maxBarrels || 2;
      this.explosionRadius = options.explosionRadius || 150;
      this.explosionDamage = options.explosionDamage || 50;
      this.onExplosion = options.onExplosion || (() => {});

      this.barrels = [];
      this.spawnTimer = 0;
    }

    reset() {
      this.barrels.length = 0;
      this.spawnTimer = 0;
    }

    getRandomSpawnPoint() {
      const { canvas } = this.world;
      const padding = 90;
      const side = Math.floor(Math.random() * 4);
      const x = side % 2 === 0 ? padding : canvas.width - padding - 50;
      const y = side < 2 ? padding : canvas.height - padding - 50;
      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
      };
    }

    explode(barrel) {
      if (!barrel || barrel.exploded) return;
      barrel.exploded = true;
      this.onExplosion(barrel);
    }

    update(dt, now) {
      this.spawnTimer -= dt;

      while (this.spawnTimer <= 0 && this.barrels.length < this.maxBarrels) {
        const point = this.getRandomSpawnPoint();
        this.barrels.push(new Barrel(point.x, point.y));
        this.spawnTimer += this.spawnEvery;
      }

      const { player, enemies, utils } = this.world;
      this.barrels.slice().forEach((barrel) => {
        if (barrel.exploded) return;
        const playerHit = player && utils.aabb(player, barrel);
        const enemyHit = enemies.some((enemy) => utils.aabb(enemy, barrel));
        if (playerHit || enemyHit) this.explode(barrel);
      });
    }

    checkBulletCollisions(bullets) {
      // Preparar dados para colisão
      bullets.forEach((bullet) => {
        bullet.hitBarrels = bullet.hitBarrels || new Set();
      });
    }

    handleBulletCollisions(bullets) {
      const { utils } = this.world;

      bullets.slice().forEach((bullet) => {
        this.barrels.slice().forEach((barrel) => {
          if (barrel.exploded) return;
          if (!utils.aabb(bullet, barrel)) return;
          if (bullet.hitBarrels?.has(barrel)) return;

          if (!bullet.hitBarrels) bullet.hitBarrels = new Set();
          bullet.hitBarrels.add(barrel);

          this.explode(barrel);
        });
      });
    }

    draw(ctx) {
      const { utils } = this.world;

      this.barrels.forEach((barrel) => {
        if (barrel.exploded) return;

        const centerX = barrel.x + barrel.width / 2;
        const centerY = barrel.y + barrel.height / 2;

        // Gradiente de barril
        const gradient = ctx.createRadialGradient(
          centerX - 8,
          centerY - 8,
          5,
          centerX,
          centerY,
          barrel.width * 0.6,
        );
        gradient.addColorStop(0, "#fff7bf");
        gradient.addColorStop(0.3, "#ffd135");
        gradient.addColorStop(0.7, "#fa5a17");
        gradient.addColorStop(1, "rgba(162, 25, 8, 0.3)");

        ctx.save();
        ctx.shadowColor = "rgba(255, 89, 20, 0.7)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, barrel.width * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }
  }

  window.SWARM = window.SWARM || {};
  window.SWARM.BarrelManager = BarrelManager;
})();
