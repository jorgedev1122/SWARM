(function () {
  "use strict";

  const { canvas, player, state, utils } = window.SWARM;

  const bossSystem = {
    active: null,
    projectiles: [],

    reset() {
      this.active = null;
      this.projectiles.length = 0;
    },

    maybeSpawn() {
      const interval = window.SWARM.config.boss.killInterval;
      if (this.active || state.kills < interval) return;
      if (state.kills - state.lastBossKillMark < interval) return;

      state.lastBossKillMark = state.kills;
      this.active = new Boss();
    },

    update(dt) {
      if (this.active) this.active.update(dt);

      for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
        const projectile = this.projectiles[index];
        projectile.x += projectile.dx * projectile.speed * dt;
        projectile.y += projectile.dy * projectile.speed * dt;
        projectile.life -= dt;

        if (
          projectile.life <= 0 ||
          projectile.x < -80 ||
          projectile.x > canvas.width + 80 ||
          projectile.y < -80 ||
          projectile.y > canvas.height + 80
        ) {
          this.projectiles.splice(index, 1);
        }
      }
    },

    damage(amount) {
      if (!this.active) return;

      this.active.hp = Math.max(0, this.active.hp - amount);
      window.SWARM.effectSystem.burst(
        this.active.x + this.active.width / 2,
        this.active.y + this.active.height / 2,
        "#ff2b38",
        10,
      );

      if (this.active.hp <= 0) {
        this.active = null;
        this.projectiles.length = 0;
        window.SWARM.progression.gainXP(10);
        window.SWARM.game.addScore(10);
      }
    },

    draw() {
      if (this.active) this.active.draw();

      const ctx = window.SWARM.ctx;
      this.projectiles.forEach((projectile) => {
        ctx.save();
        ctx.fillStyle = "rgba(124, 255, 91, 0.85)";
        ctx.shadowColor = "rgba(124, 255, 91, 0.65)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(
          projectile.x + projectile.width / 2,
          projectile.y + projectile.height / 2,
          projectile.width / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      });
    },
  };

  class Boss {
    constructor() {
      this.width = 220;
      this.height = 220;
      this.x = canvas.width / 2 - this.width / 2;
      this.y = -this.height;
      this.maxHp = 50 + Math.floor(state.kills / 25) * 15;
      this.hp = this.maxHp;
      this.speed = 85;
      this.angle = 0;
      this.attackTimer = 1.6;
      this.summonTimer = 5;
      this.fury = false;
      this.contactDamage = 2;
    }

    update(dt) {
      const bossCenter = utils.center(this);
      const playerCenter = utils.center(player);
      const angle = Math.atan2(
        playerCenter.y - bossCenter.y,
        playerCenter.x - bossCenter.x,
      );

      this.fury = this.hp <= this.maxHp * 0.3;
      this.angle = angle;
      this.speed = this.fury ? 130 : 85;
      this.x += Math.cos(angle) * this.speed * dt;
      this.y += Math.sin(angle) * this.speed * dt;

      this.attackTimer -= dt;
      this.summonTimer -= dt;

      if (this.attackTimer <= 0) {
        this.shoot(angle);
        this.attackTimer = this.fury ? 0.85 : 1.45;
      }

      if (this.summonTimer <= 0) {
        for (let count = 0; count < (this.fury ? 4 : 2); count += 1) {
          window.SWARM.enemySystem.spawnEnemy({ health: 1 });
        }
        this.summonTimer = this.fury ? 3.2 : 5;
      }
    }

    shoot(angle) {
      const center = utils.center(this);
      bossSystem.projectiles.push({
        x: center.x - 12,
        y: center.y - 12,
        width: 24,
        height: 24,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: this.fury ? 330 : 250,
        damage: this.fury ? 2 : 1,
        life: 3,
      });
    }

    draw() {
      const image = window.SWARM.assets.boss;
      const ctx = window.SWARM.ctx;
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
    }
  }

  window.SWARM.Boss = Boss;
  window.SWARM.bossSystem = bossSystem;
})();
