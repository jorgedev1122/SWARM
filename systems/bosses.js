(function () {
  "use strict";

  const { canvas, player, state, utils } = window.SWARM;

  function syncBossBodyState() {
    const body = document.body;
    if (!body) return;

    const activeBoss = !!bossSystem.active;
    body.classList.toggle("boss-stage", activeBoss);
    body.classList.toggle("boss-fury", activeBoss && bossSystem.active.fury);
  }

  const bossSystem = {
    active: null,
    projectiles: [],
    shakeTimer: 0,
    shakeIntensity: 0,

    reset() {
      this.active = null;
      this.projectiles.length = 0;
      this.shakeTimer = 0;
      this.shakeIntensity = 0;
      syncBossBodyState();
    },

    triggerShake(duration, intensity) {
      this.shakeTimer = duration;
      this.shakeIntensity = intensity;
    },

    getShakeOffset() {
      if (this.shakeTimer <= 0) return { x: 0, y: 0 };
      const magnitude = this.shakeIntensity * Math.min(this.shakeTimer / 2, 1);
      return {
        x: (Math.random() * 2 - 1) * magnitude,
        y: (Math.random() * 2 - 1) * magnitude,
      };
    },

    maybeSpawn() {
      const interval = window.SWARM.config.boss.killInterval;
      if (this.active || state.kills < interval) return;
      if (state.kills % interval !== 0) return;
      if (state.kills === state.lastBossKillMark) return;

      state.lastBossKillMark = state.kills;
      window.SWARM.enemySystem.reset();
      this.active = new Boss();
      this.triggerShake(2, 8);
      syncBossBodyState();
    },

    update(dt) {
      if (this.shakeTimer > 0) {
        this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      }

      if (this.active) this.active.update(dt);
      syncBossBodyState();

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
        syncBossBodyState();
        window.SWARM.progression.gainXP(10);
        window.SWARM.game.addScore(10);
      }
    },

    draw() {
      if (this.active) this.active.draw();

      const ctx = window.SWARM.ctx;
      this.projectiles.forEach((projectile) => {
        ctx.save();
        const color = projectile.color || "rgba(145, 70, 255, 0.9)";
        const centerX = projectile.x + projectile.width / 2;
        const centerY = projectile.y + projectile.height / 2;
        const trailX = centerX - projectile.dx * 16;
        const trailY = centerY - projectile.dy * 16;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.shadowColor = color.replace("0.9", "0.65").replace("0.95", "0.7");
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(centerX, centerY, projectile.width / 2 + 2, 0, Math.PI * 2);
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
      this.attackTimer = 0.9;
      this.attackCycle = 0;
      this.summonTimer = 3.2;
      this.specialTimer = 7.2;
      this.specialActive = false;
      this.specialWindow = 0;
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
      this.specialTimer -= dt;

      if (this.specialActive) {
        this.specialWindow -= dt;
        if (window.SWARM.input.keys.space) {
          this.specialActive = false;
          this.specialWindow = 0;
          window.SWARM.effectSystem.burst(
            this.x + this.width / 2,
            this.y + this.height / 2,
            "#ffb17f",
            10,
          );
          window.SWARM.playerSystem.dodgeDash();
          window.SWARM.effectSystem.lightning(
            this.x + this.width / 2,
            this.y + this.height / 2,
            player.x + player.width / 2,
            player.y + player.height / 2,
            "#8cfffd",
            0.18,
          );
        }

        if (this.specialWindow <= 0 && this.specialActive) {
          this.specialActive = false;
          this.fireLightningAtPlayer();
        }
      } else if (this.specialTimer <= 0) {
        this.specialActive = true;
        this.specialWindow = 0.8;
        this.specialTimer = this.fury ? 5.6 : 7.2;
      }

      if (this.attackTimer <= 0) {
        const pattern = this.fury
          ? this.attackCycle % 2 === 0
            ? "burst"
            : "spread"
          : this.attackCycle % 3 === 0
            ? "spread"
            : "single";

        this.shoot(angle, pattern);
        this.attackTimer = this.fury ? 0.8 : 1.35;
        this.attackCycle += 1;
      }

      if (this.summonTimer <= 0) {
        for (let count = 0; count < (this.fury ? 4 : 2); count += 1) {
          window.SWARM.enemySystem.spawnEnemy({ health: 1 });
        }
        this.summonTimer = this.fury ? 3.2 : 5;
      }
    }

    shoot(angle, pattern = "single") {
      const center = utils.center(this);
      const baseColor = this.fury
        ? "rgba(220, 95, 255, 0.95)"
        : "rgba(145, 70, 255, 0.9)";

      if (pattern === "spread") {
        const count = this.fury ? 5 : 3;
        const startAngle = angle - 0.25;
        const endAngle = angle + 0.25;

        for (let index = 0; index < count; index += 1) {
          const shotAngle =
            startAngle + ((endAngle - startAngle) * index) / (count - 1 || 1);
          bossSystem.projectiles.push({
            x: center.x - 10,
            y: center.y - 10,
            width: this.fury ? 18 : 14,
            height: this.fury ? 18 : 14,
            dx: Math.cos(shotAngle),
            dy: Math.sin(shotAngle),
            speed: this.fury ? 360 : 280,
            damage: this.fury ? 2 : 1,
            life: this.fury ? 2.3 : 2.8,
            color: baseColor,
          });
        }
        return;
      }

      if (pattern === "burst") {
        const count = this.fury ? 6 : 4;
        for (let index = 0; index < count; index += 1) {
          const spreadOffset = (index - (count - 1) / 2) * 0.16;
          bossSystem.projectiles.push({
            x: center.x - 10,
            y: center.y - 10,
            width: this.fury ? 16 : 12,
            height: this.fury ? 16 : 12,
            dx: Math.cos(angle + spreadOffset),
            dy: Math.sin(angle + spreadOffset),
            speed: this.fury ? 340 : 260,
            damage: this.fury ? 2 : 1,
            life: this.fury ? 2.1 : 2.5,
            color: baseColor,
          });
        }
        return;
      }

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
        color: baseColor,
      });
    }

    fireLightningAtPlayer() {
      const bossCenter = utils.center(this);
      const playerCenter = utils.center(player);
      window.SWARM.effectSystem.lightning(
        bossCenter.x,
        bossCenter.y,
        playerCenter.x,
        playerCenter.y,
        "#8cfffd",
        0.18,
      );
      window.SWARM.effectSystem.burst(
        playerCenter.x,
        playerCenter.y,
        "#ffffff",
        18,
      );
      window.SWARM.playerSystem.damage(3);
    }

    draw() {
      const image = window.SWARM.assets.boss;
      const ctx = window.SWARM.ctx;
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      const auraRadius = this.width * 0.42;

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = this.fury
        ? "rgba(255, 92, 255, 0.45)"
        : "rgba(125, 70, 255, 0.32)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(this.x, this.y - 16, this.width, 8);
      ctx.fillStyle = this.fury ? "#ff6dff" : "#8b4dff";
      ctx.fillRect(this.x, this.y - 16, (this.hp / this.maxHp) * this.width, 8);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = this.fury
        ? "rgba(255, 90, 255, 0.95)"
        : "rgba(130, 90, 255, 0.85)";
      ctx.shadowBlur = this.fury ? 30 : 22;
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
      ctx.restore();

      if (this.specialActive) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 82, 82, 0.95)";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("APERTE ESPAÇO!", canvas.width / 2, 70);
        ctx.font = "16px Arial";
        ctx.fillText("ou tome 3 de dano", canvas.width / 2, 98);
        ctx.restore();
      }
    }
  }

  window.SWARM.Boss = Boss;
  window.SWARM.bossSystem = bossSystem;
})();
