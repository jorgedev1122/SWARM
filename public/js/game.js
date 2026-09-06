(function () {
  "use strict";

  /**
   * Integrates the feature modules with the original SWARM systems.  The
   * legacy systems still own rendering assets, basic movement and the main
   * requestAnimationFrame loop; this class owns mode-specific state and all
   * optional combat systems.
   */
  class Game {
    constructor(systems) {
      this.systems = systems;
      this.parry = null;
      this.barrels = null;
      this.vehicles = null;
      this.npc = null;
      this.rushIntermission = 0;
      this.vehicleButtonBound = false;
      this.createFeatureSystems();
      this.bindVehicleButton();
    }

    createFeatureSystems() {
      const { canvas, ctx, player, enemies, bullets, utils } = this.systems;
      const world = {
        canvas,
        ctx,
        player,
        getPlayer: () => player,
        enemies,
        getEnemies: () => enemies,
        bullets,
        getBullets: () => bullets,
        input: this.systems.input,
        utils,
        onKill: (enemy, source) => this.killEnemy(enemy, source),
        onPlayerDamage: (amount) => this.systems.playerSystem.damage(amount),
        onScore: (amount) => this.addScore(amount),
      };

      if (typeof this.systems.ParrySystem === "function") {
        this.parry = new this.systems.ParrySystem({
          ...world,
          radius: 60,
          windowMs: 300,
          cooldownMs: 500,
          onSuccess: (enemy) => this.handleParry(enemy),
        });
      }

      if (typeof this.systems.BarrelManager === "function") {
        this.barrels = new this.systems.BarrelManager({
          ...world,
          spawnEvery: 18,
          maxBarrels: 2,
          explosionRadius: 240,
          explosionDamage: 100,
          onExplosion: (barrel) => this.handleBarrelExplosion(barrel),
        });
      }

      if (typeof this.systems.VehicleManager === "function") {
        this.vehicles = new this.systems.VehicleManager({
          ...world,
          duration: 20,
          initialDelay: 8,
          spawnEvery: 25,
          onRunOver: (enemy) => this.handleVehicleKill(enemy),
        });
      }

      if (typeof this.systems.NPC === "function") {
        this.npc = new this.systems.NPC({ canvas, ctx, duration: 3000 });
      }
    }

    call(manager, method, ...args) {
      if (manager && typeof manager[method] === "function") {
        return manager[method](...args);
      }
      return undefined;
    }

    bindVehicleButton() {
      if (this.vehicleButtonBound) return;
      const button = document.getElementById("vehicle-btn");
      if (!button) return;
      button.addEventListener("click", () => this.spawnVehicle());
      this.vehicleButtonBound = true;
    }

    selectedMode() {
      const profile = this.systems.profile.data || {};
      const selection = this.systems.selection?.mode;
      const selected =
        selection ||
        document.querySelector("[data-mode].is-selected")?.dataset.mode ||
        document.querySelector("input[name='game-mode']:checked")?.value ||
        "survival";

      return selected === "boss_rush" ||
        profile.modes_unlocked?.includes(selected)
        ? selected
        : "survival";
    }

    resetRun() {
      const { systems } = this;
      systems.state.status = "playing";
      systems.state.startedAt = performance.now();
      systems.state.elapsed = 0;
      systems.state.score = 0;
      systems.state.kills = 0;
      systems.state.lastBossKillMark = 0;
      systems.state.mode = this.selectedMode();
      systems.state.bossRush = null;
      systems.state.victory = false;
      systems.state.bossRushReward = 0;
      this.rushIntermission = 0;

      systems.playerSystem.reset(systems.profile.data);
      systems.bulletSystem.reset();
      systems.enemySystem.reset();
      systems.bossSystem.reset();
      systems.effectSystem.reset();
      systems.progression.reset();

      this.call(this.parry, "reset");
      this.call(this.barrels, "reset");
      this.call(this.vehicles, "reset");
      this.call(this.npc, "clear");

      if (systems.state.mode === "boss_rush") {
        systems.state.bossRush = { current: 0, total: 1 };
        this.spawnNextRushBoss();
      }
    }

    start() {
      this.resetRun();
      this.systems.ui.showGame();
      this.bindVehicleButton();
    }

    update(now, dt) {
      const { systems } = this;
      systems.state.elapsed = now - systems.state.startedAt;

      if (!this.vehicles?.occupied) systems.playerSystem.update(dt);
      systems.enemySystem.update(dt);
      systems.bulletSystem.update(dt);

      // A parry resolves before contact damage in the collision pass.
      if (systems.input.justPressed.space || systems.input.justPressed[" "]) {
        this.call(this.parry, "activate", now);
        this.call(this.parry, "tryParry", now);
      }
      this.call(this.parry, "update", dt, now);

      this.call(this.barrels, "update", dt, now);
      this.call(this.barrels, "checkBulletCollisions", systems.bullets);
      this.call(this.barrels, "handleBulletCollisions", systems.bullets);

      systems.bossSystem.update(dt);
      systems.collisionSystem.update();

      this.call(this.vehicles, "update", dt, now);
      this.call(this.npc, "update", dt, now);
      this.updateBossRush(dt);
      systems.effectSystem.update(dt);
      systems.input.justPressed = {};
    }

    updateBossRush(dt) {
      const rush = this.systems.state.bossRush;
      if (!rush || this.systems.state.mode !== "boss_rush") return;
      if (this.systems.bossSystem.active) return;

      this.rushIntermission -= dt;
      if (this.rushIntermission <= 0 && rush.current < rush.total) {
        this.spawnNextRushBoss();
      }
    }

    spawnNextRushBoss() {
      const rush = this.systems.state.bossRush;
      if (!rush || rush.current >= rush.total) return;
      this.systems.bossSystem.spawnRushBoss(rush.current, rush.total);
    }

    onBossDefeated() {
      this.say("bossDefeated");
      const rush = this.systems.state.bossRush;
      if (!rush || this.systems.state.mode !== "boss_rush") return;

      rush.current += 1;
      if (rush.current >= rush.total) {
        this.systems.state.victory = true;
        this.systems.state.bossRushReward =
          this.systems.config.profile.gameModes.boss_rush.victoryReward;
        this.end({ victory: true });
        return;
      }

      this.rushIntermission = 1.2;
    }

    killEnemy(enemy, source = {}) {
      if (!enemy) return false;
      return this.systems.enemySystem.damage(
        enemy,
        Math.max(1, Number(enemy.health || 1)),
        source,
      );
    }

    handleParry(enemy) {
      if (!enemy) return false;
      const killed = this.killEnemy(enemy, {
        score: 50,
        xp: 1,
        color: "#ffd66b",
        particles: 18,
        parry: true,
      });
      if (killed) this.say("parry");
      return killed;
    }

    handleVehicleKill(enemy) {
      return this.killEnemy(enemy, {
        score: 15,
        xp: 1,
        color: "#9dff72",
        particles: 12,
        vehicle: true,
      });
    }

    handleBarrelExplosion(barrel) {
      if (!barrel) return;
      const { player, enemies, utils } = this.systems;
      const centerX = barrel.x + barrel.width / 2;
      const centerY = barrel.y + barrel.height / 2;
      const radius = this.barrels?.explosionRadius || 240;
      const damage = this.barrels?.explosionDamage || 100;

      this.systems.effectSystem.explosion(centerX, centerY, radius);
      enemies.slice().forEach((enemy) => {
        const center = utils.center(enemy);
        if (Math.hypot(center.x - centerX, center.y - centerY) <= radius) {
          this.systems.enemySystem.damage(enemy, damage, {
            color: "#ffad31",
            particles: 14,
            barrel: true,
          });
        }
      });

      const playerCenter = utils.center(player);
      if (
        Math.hypot(playerCenter.x - centerX, playerCenter.y - centerY) <= radius
      ) {
        this.systems.playerSystem.damage(damage);
      }
    }

    onEnemyKilled() {
      // Hook kept for feature managers and future combat telemetry.
    }

    spawnVehicle() {
      if (this.systems.state.status !== "playing") return false;
      const spawned =
        this.call(this.vehicles, "spawn", this.systems.player) ??
        this.call(this.vehicles, "activate", this.systems.player);
      return Boolean(spawned ?? this.vehicles);
    }

    say(event) {
      if (!this.npc) return;
      if (typeof this.npc.say === "function") this.npc.say(event);
      else if (typeof this.npc.show === "function") this.npc.show(event);
      else if (typeof this.npc.trigger === "function") this.npc.trigger(event);
    }

    addScore(amount) {
      this.systems.state.score += Math.max(0, Number(amount) || 0);
    }

    async end(options = {}) {
      const { systems } = this;
      if (systems.state.status !== "playing") return;

      systems.state.status = "gameover";
      systems.input.mouse.down = false;
      this.say(options.victory ? "bossDefeated" : "gameOver");

      const result = await systems.profile.saveRun();
      if (result?.saved) this.say("newRecord");
      systems.ui.showGameOver(options);
    }

    draw() {
      const { systems } = this;
      const { ctx, canvas, state } = systems;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.status !== "playing" && state.status !== "gameover") return;

      const shake = systems.bossSystem.getShakeOffset();
      const isShaking = shake.x !== 0 || shake.y !== 0;
      if (isShaking) {
        ctx.save();
        ctx.translate(shake.x, shake.y);
      }

      this.call(this.barrels, "draw", ctx);
      systems.enemySystem.draw();
      systems.bossSystem.draw();
      systems.bulletSystem.draw();
      this.call(this.vehicles, "draw", ctx);
      if (!this.vehicles?.vehicle?.occupied) systems.playerSystem.draw();
      this.call(this.parry, "draw", ctx);
      systems.effectSystem.draw();

      if (isShaking) ctx.restore();

      systems.ui.drawHud();
      this.call(this.npc, "draw", ctx);
    }
  }

  window.SWARM = window.SWARM || {};
  window.SWARM.Game = Game;
})();
