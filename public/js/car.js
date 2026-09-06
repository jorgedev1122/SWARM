(function () {
  "use strict";

  /**
   * VehicleManager: Carro que mata inimigos
   * - Duração: 20 segundos
   * - Surge em um canto do mapa
   * - Pode ser ocupado ao tocar nele
   * - E controlado por WASD/setas enquanto ocupado
   * - Mata inimigos ao atropelar
   * - Barra de duração visual
   */
  class Vehicle {
    constructor(x, y, duration = 20) {
      this.x = x;
      this.y = y;
      this.width = 80;
      this.height = 50;
      this.duration = duration;
      this.maxDuration = duration;
      this.speed = 320;
      this.kills = 0;
      this.occupied = false;
    }
  }

  class VehicleManager {
    constructor(options = {}) {
      this.world = options;
      this.duration = options.duration || 20;
      this.spawnEvery = options.spawnEvery || 25;
      this.initialDelay = options.initialDelay || 8;
      this.onRunOver = options.onRunOver || (() => {});

      this.vehicle = null;
      this.spawnTimer = this.initialDelay;
    }

    reset() {
      this.vehicle = null;
      this.spawnTimer = this.initialDelay;
    }

    getCornerSpawnPoint() {
      const { canvas } = this.world;
      const padding = 24;
      const corner = Math.floor(Math.random() * 4);
      return {
        x: corner % 2 === 0 ? padding : canvas.width - padding - 80,
        y: corner < 2 ? padding : canvas.height - padding - 50,
      };
    }

    spawn() {
      if (this.vehicle) return false;

      const point = this.getCornerSpawnPoint();
      this.vehicle = new Vehicle(point.x, point.y, this.duration);
      return true;
    }

    activate(player) {
      return this.spawn();
    }

    update(dt, now) {
      if (!this.vehicle) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawn();
          this.spawnTimer = this.spawnEvery;
        }
        return;
      }

      const { player, enemies, input, utils } = this.world;

      if (!this.vehicle.occupied && utils.aabb(this.vehicle, player)) {
        this.vehicle.occupied = true;
        player.x = this.vehicle.x + (this.vehicle.width - player.width) / 2;
        player.y = this.vehicle.y + (this.vehicle.height - player.height) / 2;
      }

      if (this.vehicle.occupied) {
        let dx = 0;
        let dy = 0;
        if (input.keys.w || input.keys.arrowup) dy -= 1;
        if (input.keys.s || input.keys.arrowdown) dy += 1;
        if (input.keys.a || input.keys.arrowleft) dx -= 1;
        if (input.keys.d || input.keys.arrowright) dx += 1;

        const movement = utils.normalize(dx, dy);
        this.vehicle.x += movement.x * this.vehicle.speed * dt;
        this.vehicle.y += movement.y * this.vehicle.speed * dt;
        this.vehicle.x = utils.clamp(
          this.vehicle.x,
          0,
          this.world.canvas.width - this.vehicle.width,
        );
        this.vehicle.y = utils.clamp(
          this.vehicle.y,
          0,
          this.world.canvas.height - this.vehicle.height,
        );
        player.x = this.vehicle.x + (this.vehicle.width - player.width) / 2;
        player.y = this.vehicle.y + (this.vehicle.height - player.height) / 2;
      }

      // Atualizar duração
      this.vehicle.duration -= dt;

      if (this.vehicle.duration <= 0) {
        this.vehicle.occupied = false;
        this.vehicle = null;
        return;
      }

      if (!this.vehicle.occupied) return;

      enemies.slice().forEach((enemy) => {
        if (!utils.aabb(this.vehicle, enemy)) return;

        this.onRunOver(enemy);
        this.vehicle.kills += 1;
      });
    }

    draw(ctx) {
      if (!this.vehicle) return;

      const v = this.vehicle;
      const centerX = v.x + v.width / 2;
      const centerY = v.y + v.height / 2;

      // Desenhar carro (retângulo com gradiente)
      const gradient = ctx.createLinearGradient(v.x, v.y, v.x, v.y + v.height);
      gradient.addColorStop(0, "#2ecc71");
      gradient.addColorStop(0.5, "#27ae60");
      gradient.addColorStop(1, "#229954");

      ctx.save();
      ctx.shadowColor = "rgba(46, 204, 113, 0.6)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = gradient;
      ctx.fillRect(v.x, v.y, v.width, v.height);

      // Rodas
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(v.x + 16, v.y + v.height, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(v.x + v.width - 16, v.y + v.height, 8, 0, Math.PI * 2);
      ctx.fill();

      // Barra de duração (topo)
      const ratio = Math.max(0, v.duration / v.maxDuration);
      const barHeight = 6;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(v.x, v.y - barHeight - 4, v.width, barHeight);

      // Cor da barra: verde → amarelo → vermelho
      if (ratio > 0.5) {
        ctx.fillStyle = `rgb(${Math.floor(255 * (1 - ratio * 2))}, 255, 0)`;
      } else {
        ctx.fillStyle = `rgb(255, ${Math.floor(255 * ratio * 2)}, 0)`;
      }
      ctx.fillRect(v.x, v.y - barHeight - 4, v.width * ratio, barHeight);

      // Borda
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(v.x, v.y, v.width, v.height);

      ctx.restore();
    }
  }

  window.SWARM = window.SWARM || {};
  window.SWARM.VehicleManager = VehicleManager;
})();
