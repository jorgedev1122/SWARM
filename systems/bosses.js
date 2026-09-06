(function () {
  "use strict";

  const { canvas, player, state, utils } = window.SWARM;
  const TAU = Math.PI * 2;

  function syncBossBodyState() {
    const body = document.body;
    if (!body) return;
    const active = !!bossSystem.active;
    body.classList.toggle("boss-stage", active);
    body.classList.toggle("boss-fury", active && bossSystem.active.fury);
  }

  function effect(name, ...args) {
    const fn = window.SWARM.effectSystem?.[name];
    if (typeof fn === "function") fn(...args);
  }

  function damagePlayer(amount) {
    window.SWARM.playerSystem.damage(amount);
  }

  const bossSystem = {
    active: null,
    projectiles: [],
    telegraphs: [],
    shakeTimer: 0,
    shakeIntensity: 0,

    reset() {
      this.active = null;
      this.projectiles.length = 0;
      this.telegraphs.length = 0;
      this.shakeTimer = 0;
      this.shakeIntensity = 0;
      syncBossBodyState();
    },

    triggerShake(duration, intensity) {
      this.shakeTimer = Math.max(this.shakeTimer, duration);
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    },

    getShakeOffset() {
      if (this.shakeTimer <= 0) return { x: 0, y: 0 };
      const amount = this.shakeIntensity * Math.min(this.shakeTimer / 2, 1);
      return {
        x: (Math.random() * 2 - 1) * amount,
        y: (Math.random() * 2 - 1) * amount,
      };
    },

    maybeSpawn() {
      if (state.mode === "boss_rush") return;
      const interval = window.SWARM.config.boss.killInterval;
      if (
        this.active ||
        state.kills < interval ||
        state.kills % interval !== 0 ||
        state.kills === state.lastBossKillMark
      )
        return;
      state.lastBossKillMark = state.kills;
      window.SWARM.enemySystem.reset();
      this.active = new Boss();
      this.triggerShake(1.2, 7);
      syncBossBodyState();
    },

    spawnRushBoss(index, total) {
      this.projectiles.length = 0;
      this.telegraphs.length = 0;
      window.SWARM.enemySystem.reset();
      this.active = new Boss({ rushIndex: index, rushTotal: total });
      this.triggerShake(1, 6 + index * 1.5);
      syncBossBodyState();
    },

    addTelegraph(data) {
      this.telegraphs.push({
        life: 1,
        delay: (data.delay ?? 0) * 0.8,
        fired: false,
        ...data,
        delay: (data.delay ?? 0) * 0.8,
      });
    },

    updateTelegraphs(dt) {
      for (let index = this.telegraphs.length - 1; index >= 0; index -= 1) {
        const item = this.telegraphs[index];
        item.life -= dt;
        item.delay -= dt;
        if (!item.fired && item.delay <= 0) {
          item.fired = true;
          item.onFire?.();
        }
        if (item.life <= 0) this.telegraphs.splice(index, 1);
      }
    },

    updateProjectile(projectile, dt) {
      projectile.life -= dt;
      projectile.age = (projectile.age || 0) + dt;
      if (projectile.behavior === "orbit") {
        projectile.orbitAngle += projectile.orbitSpeed * dt;
        projectile.x =
          projectile.anchorX +
          Math.cos(projectile.orbitAngle) * projectile.orbitRadius;
        projectile.y =
          projectile.anchorY +
          Math.sin(projectile.orbitAngle) * projectile.orbitRadius;
        if (projectile.age > projectile.orbitDuration) {
          projectile.behavior = "straight";
          const aim = utils.normalize(
            player.x - projectile.x,
            player.y - projectile.y,
          );
          projectile.dx = aim.x;
          projectile.dy = aim.y;
          projectile.speed = 220;
        }
      } else if (projectile.behavior === "chase") {
        const aim = utils.normalize(
          player.x - projectile.x,
          player.y - projectile.y,
        );
        projectile.dx += (aim.x - projectile.dx) * Math.min(1, dt * 1.5);
        projectile.dy += (aim.y - projectile.dy) * Math.min(1, dt * 1.5);
        const direction = utils.normalize(projectile.dx, projectile.dy);
        projectile.dx = direction.x;
        projectile.dy = direction.y;
      } else if (projectile.behavior === "spiral") {
        projectile.spinAngle += projectile.spinRate * dt;
        projectile.dx = Math.cos(projectile.spinAngle);
        projectile.dy = Math.sin(projectile.spinAngle);
      } else if (
        projectile.behavior === "boomerang" &&
        projectile.age > projectile.turnAfter
      ) {
        const boss = this.active;
        if (boss) {
          const aim = utils.normalize(
            boss.x + boss.width / 2 - projectile.x,
            boss.y + boss.height / 2 - projectile.y,
          );
          projectile.dx = aim.x;
          projectile.dy = aim.y;
        }
      }
      projectile.x += projectile.dx * projectile.speed * dt;
      projectile.y += projectile.dy * projectile.speed * dt;
    },

    update(dt) {
      if (this.shakeTimer > 0)
        this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.active) this.active.update(dt);
      this.updateTelegraphs(dt);
      for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
        const projectile = this.projectiles[index];
        this.updateProjectile(projectile, dt);
        if (
          projectile.life <= 0 ||
          projectile.x < -120 ||
          projectile.x > canvas.width + 120 ||
          projectile.y < -120 ||
          projectile.y > canvas.height + 120
        )
          this.projectiles.splice(index, 1);
      }
      syncBossBodyState();
    },

    damage(amount) {
      if (!this.active) return;
      this.active.hp = Math.max(
        0,
        this.active.hp - Math.max(0, Number(amount) || 0),
      );
      effect(
        "burst",
        this.active.x + this.active.width / 2,
        this.active.y + this.active.height / 2,
        "#ff2b38",
        8,
      );
      if (this.active.hp > 0) return;
      const defeatedBoss = this.active;
      this.active = null;
      this.projectiles.length = 0;
      this.telegraphs.length = 0;
      syncBossBodyState();
      window.SWARM.progression.gainXP(10);
      window.SWARM.game.addScore(10);
      if (state.mode !== "boss_rush")
        state.normalBossReward += window.SWARM.config.boss.normalReward;
      window.SWARM.game.onBossDefeated?.(defeatedBoss);
    },

    draw() {
      this.active?.draw();
      const ctx = window.SWARM.ctx;
      this.telegraphs.forEach((item) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, Math.min(0.85, item.life));
        ctx.strokeStyle = item.color || "#ff668c";
        ctx.fillStyle = item.fill || "rgba(255, 70, 110, 0.12)";
        ctx.lineWidth = 3;
        if (item.type === "line") {
          ctx.beginPath();
          ctx.moveTo(item.x1, item.y1);
          ctx.lineTo(item.x2, item.y2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius || 35, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });
      this.projectiles.forEach((projectile) => {
        ctx.save();
        const color = projectile.color || "#9c67ff";
        const x = projectile.x + projectile.width / 2;
        const y = projectile.y + projectile.height / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - projectile.dx * 16, y - projectile.dy * 16);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(x, y, projectile.width / 2 + 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      });
    },
  };

  class Boss {
    constructor(options = {}) {
      this.width = 220;
      this.height = 220;
      this.rushIndex = Number(options.rushIndex || 0);
      this.rushTotal = Number(options.rushTotal || 0);
      this.isRush = this.rushTotal > 0;
      this.arenaCenterX = canvas.width / 2 - this.width / 2;
      this.arenaCenterY = canvas.height / 2 - this.height / 2;
      this.targetX = this.arenaCenterX;
      this.targetY = this.arenaCenterY;
      this.x = this.arenaCenterX;
      this.y = this.isRush ? -this.height : this.arenaCenterY;
      this.bossRushMoveTimer = 0;
      this.bossRushMoveTarget = { x: this.arenaCenterX, y: this.arenaCenterY };
      this.maxHp = this.isRush
        ? 2500 + this.rushIndex * 500
        : 50 + Math.floor(state.kills / 25) * 15;
      this.hp = this.maxHp;
      this.speed = 70;
      this.angle = 0;
      this.contactDamage = 2;
      this.attackTimer = this.isRush ? 1.2 : 1.8;
      this.attackClock = 0;
      this.attackHistory = [];
      this.attackCooldowns = {};
      this.attackState = "idle";
      this.fury = false;
    }

    getPhase() {
      const ratio = this.hp / this.maxHp;
      return ratio > 0.7 ? 1 : ratio > 0.35 ? 2 : 3;
    }

    move(dt) {
      if (this.isRush) {
        this.bossRushMoveTimer -= dt;
        if (this.bossRushMoveTimer <= 0) {
          this.bossRushMoveTimer = 4.5;
          this.bossRushMoveTarget = {
            x: this.arenaCenterX + (Math.random() * 2 - 1) * 35,
            y: this.arenaCenterY + (Math.random() * 2 - 1) * 25,
          };
        }
        this.targetX = this.bossRushMoveTarget.x;
        this.targetY = this.bossRushMoveTarget.y;
        this.x += (this.targetX - this.x) * Math.min(1, dt * 0.7);
        this.y += (this.targetY - this.y) * Math.min(1, dt * 0.7);
        this.x = utils.clamp(
          this.x,
          this.arenaCenterX - 55,
          this.arenaCenterX + 55,
        );
        this.y = utils.clamp(
          this.y,
          this.arenaCenterY - 45,
          this.arenaCenterY + 45,
        );
        return;
      }
      const bossCenter = utils.center(this);
      const playerCenter = utils.center(player);
      this.angle = Math.atan2(
        playerCenter.y - bossCenter.y,
        playerCenter.x - bossCenter.x,
      );
      this.x = utils.clamp(
        this.x + Math.cos(this.angle) * this.speed * dt,
        -this.width * 0.25,
        canvas.width - this.width * 0.75,
      );
      this.y = utils.clamp(
        this.y + Math.sin(this.angle) * this.speed * dt,
        -this.height * 0.25,
        canvas.height - this.height * 0.75,
      );
    }

    update(dt) {
      this.attackClock += dt;
      this.fury = this.getPhase() === 3;
      this.move(dt);
      Object.keys(this.attackCooldowns).forEach((id) => {
        this.attackCooldowns[id] = Math.max(0, this.attackCooldowns[id] - dt);
      });
      this.attackTimer -= dt;
      if (this.attackTimer <= 0 && this.attackState === "idle") {
        const attack = this.chooseNextAttack();
        this.performAttack(attack);
        this.attackTimer = this.fury ? 0.7 : this.getPhase() === 2 ? 0.95 : 1.2;
      }
    }

    chooseNextAttack() {
      const phase = this.getPhase();
      const simple = ["single", "spread", "radial", "cross", "aimed", "summon"];
      const advanced = [
        "spiral",
        "doubleSpiral",
        "rain",
        "wall",
        "markers",
        "chase",
        "laser",
        "lightning",
        "meteor",
        "orbit",
        "boomerang",
      ];
      const fury = [
        "doubleRadial",
        "xPattern",
        "finalFury",
        "laser",
        "lightning",
        "meteor",
        "chase",
        "spiral",
      ];
      const pool =
        phase === 1
          ? simple
          : phase === 2
            ? simple.concat(advanced)
            : simple.concat(advanced, fury);
      const available = pool.filter(
        (id) =>
          !this.attackHistory.slice(-3).includes(id) &&
          !this.attackCooldowns[id],
      );
      const choices = available.length
        ? available
        : pool.filter((id) => !this.attackCooldowns[id]);
      return (
        choices[Math.floor(Math.random() * Math.max(1, choices.length))] ||
        "single"
      );
    }

    performAttack(id) {
      this.attackHistory.push(id);
      if (this.attackHistory.length > 6) this.attackHistory.shift();
      this.attackCooldowns[id] = this.fury ? 1.8 : 2.6;
      const actions = {
        single: () => this.singleShot(),
        spread: () => this.spread(),
        radial: () => this.radialBurst(),
        doubleRadial: () => this.doubleRadial(),
        spiral: () => this.spiral(false),
        doubleSpiral: () => this.spiral(true),
        cross: () => this.cross(),
        xPattern: () => this.xPattern(),
        aimed: () => this.aimedBurst(),
        orbit: () => this.orbitingProjectiles(),
        rain: () => this.rain(),
        wall: () => this.wall(),
        markers: () => this.targetMarkers(),
        chase: () => this.chasingOrbs(),
        boomerang: () => this.boomerang(),
        laser: () => this.laser(),
        lightning: () => this.lightningGrid(),
        summon: () => this.summon(),
        meteor: () => this.meteor(),
        finalFury: () => this.finalFury(),
      };
      actions[id]?.();
    }

    spawn(angle, options = {}) {
      const center = utils.center(this);
      const size = options.size || 18;
      bossSystem.projectiles.push({
        x: options.x ?? center.x - size / 2,
        y: options.y ?? center.y - size / 2,
        width: size,
        height: size,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: (options.speed ?? 250) * 1.25,
        damage: options.damage ?? (this.fury ? 2 : 1),
        life: options.life ?? 3,
        color: options.color || (this.fury ? "#ff68ed" : "#9c67ff"),
        behavior: "straight",
        ...options,
      });
    }

    aimAngle() {
      const center = utils.center(this);
      return Math.atan2(
        player.y + player.height / 2 - center.y,
        player.x + player.width / 2 - center.x,
      );
    }

    singleShot() {
      this.spawn(this.aimAngle(), { size: 28, speed: 230, damage: 2, life: 4 });
    }
    spread() {
      const angle = this.aimAngle();
      for (let index = 0; index < 5; index += 1)
        this.spawn(angle - 0.42 + index * 0.21, { size: 16, speed: 250 });
    }
    radialBurst() {
      const count = this.fury ? 14 : 10;
      for (let index = 0; index < count; index += 1)
        this.spawn((TAU * index) / count, { size: 14, speed: 190, life: 3.5 });
      bossSystem.triggerShake(0.25, 3);
    }
    doubleRadial() {
      this.radialBurst();
      const c = utils.center(this);
      bossSystem.addTelegraph({
        type: "circle",
        x: c.x,
        y: c.y,
        radius: 80,
        delay: 0.45,
        life: 1,
        onFire: () => this.radialBurst(),
      });
    }
    spiral(double) {
      const count = double ? 12 : 10;
      for (let index = 0; index < count; index += 1) {
        const angle = (TAU * index) / count + this.attackClock;
        this.spawn(angle, {
          size: 13,
          speed: 175,
          life: 4,
          behavior: "spiral",
          spinAngle: angle,
          spinRate: 0.85,
        });
        if (double)
          this.spawn(angle + Math.PI, {
            size: 13,
            speed: 175,
            life: 4,
            behavior: "spiral",
            spinAngle: angle + Math.PI,
            spinRate: -0.85,
          });
      }
    }
    cross() {
      for (let rotation = 0; rotation < 2; rotation += 1)
        for (let index = 0; index < 4; index += 1)
          this.spawn(rotation * 0.22 + (TAU * index) / 4, {
            size: 16,
            speed: 210,
          });
    }
    xPattern() {
      for (let rotation = 0; rotation < 2; rotation += 1)
        for (let index = 0; index < 4; index += 1)
          this.spawn(Math.PI / 4 + rotation * 0.22 + (TAU * index) / 4, {
            size: 16,
            speed: 220,
          });
    }
    aimedBurst() {
      const angle = this.aimAngle();
      for (let index = 0; index < 4; index += 1)
        this.spawn(angle, { size: 18, speed: 300 + index * 20, life: 2.8 });
    }

    orbitingProjectiles() {
      const c = utils.center(this);
      for (let index = 0; index < 3; index += 1)
        this.spawn(0, {
          size: 16,
          speed: 0,
          life: 5,
          behavior: "orbit",
          anchorX: c.x,
          anchorY: c.y,
          orbitAngle: (TAU * index) / 3,
          orbitRadius: 125,
          orbitSpeed: 1.8,
          orbitDuration: 1.7,
        });
    }
    rain() {
      for (let index = 0; index < 8; index += 1)
        this.spawn(Math.PI / 2, {
          x: 70 + Math.random() * Math.max(1, canvas.width - 140),
          y: -20,
          size: 16,
          speed: 190,
          life: 4,
        });
    }
    wall() {
      const gap = 2 + Math.floor(Math.random() * 5);
      const horizontal = Math.random() > 0.5;
      for (let index = 0; index < 10; index += 1) {
        if (index === gap || index === gap + 1) continue;
        this.spawn(horizontal ? 0 : Math.PI / 2, {
          x: horizontal ? (index * canvas.width) / 10 : canvas.width / 2,
          y: horizontal ? canvas.height / 2 : (index * canvas.height) / 10,
          size: 24,
          speed: 75,
          life: 5,
        });
      }
    }
    targetMarkers() {
      for (let index = 0; index < 3; index += 1) {
        const x = 80 + Math.random() * Math.max(1, canvas.width - 160);
        const y = 80 + Math.random() * Math.max(1, canvas.height - 160);
        bossSystem.addTelegraph({
          type: "circle",
          x,
          y,
          radius: 48,
          delay: 0.8,
          life: 1.2,
          onFire: () => {
            if (
              Math.hypot(
                utils.center(player).x - x,
                utils.center(player).y - y,
              ) < 58
            )
              damagePlayer(2);
            effect("explosion", x, y, 48);
          },
        });
      }
    }
    chasingOrbs() {
      for (let index = 0; index < 3; index += 1)
        this.spawn(Math.random() * TAU, {
          size: 18,
          speed: 105,
          life: 4,
          behavior: "chase",
        });
    }
    boomerang() {
      for (let index = 0; index < 3; index += 1)
        this.spawn(this.aimAngle() - 0.2 + index * 0.2, {
          size: 17,
          speed: 240,
          life: 5,
          behavior: "boomerang",
          turnAfter: 0.9,
        });
    }

    laser() {
      const angle = this.aimAngle();
      const c = utils.center(this);
      bossSystem.addTelegraph({
        type: "line",
        x1: c.x,
        y1: c.y,
        x2: c.x + Math.cos(angle) * canvas.width,
        y2: c.y + Math.sin(angle) * canvas.width,
        delay: 0.9,
        life: 1.2,
        color: "#ff5353",
        onFire: () => {
          const dx = utils.center(player).x - c.x;
          const dy = utils.center(player).y - c.y;
          const projection = dx * Math.cos(angle) + dy * Math.sin(angle);
          if (
            projection > 0 &&
            Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle)) < 45
          )
            damagePlayer(3);
          bossSystem.triggerShake(0.4, 7);
        },
      });
    }
    lightningGrid() {
      for (let index = 0; index < 4; index += 1) {
        const x = 100 + Math.random() * Math.max(1, canvas.width - 200);
        const y = 100 + Math.random() * Math.max(1, canvas.height - 200);
        bossSystem.addTelegraph({
          x,
          y,
          radius: 35,
          delay: 0.7,
          life: 1.1,
          color: "#8cfffd",
          onFire: () => {
            if (
              Math.hypot(
                utils.center(player).x - x,
                utils.center(player).y - y,
              ) < 45
            )
              damagePlayer(2);
            effect("lightning", x, y, x, y - 80, "#8cfffd", 0.2);
          },
        });
      }
    }
    summon() {
      if (this.isRush) return;
      const c = utils.center(this);
      bossSystem.addTelegraph({
        x: c.x,
        y: c.y,
        radius: 70,
        delay: 0.8,
        life: 1.2,
        color: "#ffad5c",
        onFire: () => {
          for (let index = 0; index < (this.fury ? 3 : 2); index += 1)
            window.SWARM.enemySystem.spawnEnemy({ health: 1 });
          effect("burst", c.x, c.y, "#ffad5c", 12);
        },
      });
    }
    meteor() {
      for (let index = 0; index < 3; index += 1) {
        const x = 80 + Math.random() * Math.max(1, canvas.width - 160);
        const y = 80 + Math.random() * Math.max(1, canvas.height - 160);
        bossSystem.addTelegraph({
          x,
          y,
          radius: 55,
          delay: 0.9,
          life: 1.3,
          color: "#ff9d5c",
          onFire: () => {
            if (
              Math.hypot(
                utils.center(player).x - x,
                utils.center(player).y - y,
              ) < 65
            )
              damagePlayer(3);
            effect("explosion", x, y, 55);
            bossSystem.triggerShake(0.25, 4);
          },
        });
      }
    }
    finalFury() {
      this.radialBurst();
      this.spiral(true);
      this.aimedBurst();
      this.lightningGrid();
      bossSystem.triggerShake(0.6, 8);
    }

    draw() {
      const ctx = window.SWARM.ctx;
      const image = window.SWARM.assets.boss;
      const c = utils.center(this);
      ctx.save();
      ctx.globalAlpha = this.fury ? 0.45 : 0.25;
      ctx.fillStyle = this.fury ? "#ff4fd8" : "#7d46ff";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = this.fury ? 40 : 24;
      ctx.beginPath();
      ctx.arc(c.x, c.y, this.width * 0.48, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.shadowColor = this.fury ? "#ff5aff" : "#825aff";
      ctx.shadowBlur = this.fury ? 34 : 22;
      ctx.drawImage(image, this.x, this.y, this.width, this.height);
      ctx.restore();
    }
  }

  window.SWARM.Boss = Boss;
  window.SWARM.bossSystem = bossSystem;
})();
