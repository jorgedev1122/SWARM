(function () {
  "use strict";

  const { canvas, config, player, state, utils } = window.SWARM;

  const enemies = [];
  let spawnTimer = 0;

  function reset() {
    enemies.length = 0;
    spawnTimer = 0; 
  }

  function getDifficulty() {
    return 1 + state.elapsed / 60000 + state.kills / 80;
  }

  function getSpawnPoint(size) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: Math.random() * canvas.width, y: -size };
    if (side === 1)
      return { x: canvas.width + size, y: Math.random() * canvas.height };
    if (side === 2)
      return { x: Math.random() * canvas.width, y: canvas.height + size };
    return { x: -size, y: Math.random() * canvas.height };
  }

  function spawnEnemy(options) {
    const difficulty = getDifficulty();
    const size = config.enemy.size;
    const point = getSpawnPoint(size);

    const health =
      options && options.health
        ? options.health
        : Math.max(1, Math.floor(difficulty / 1.8));

    enemies.push({
      x: point.x,
      y: point.y,
      width: size,
      height: size,
      speed: config.enemy.baseSpeed + difficulty * 9,
      angle: 0,
      health,
      maxHealth: health,
      contactDamage: config.enemy.contactDamage,
      isBurning: false,
      burnDuration: 0,
      burnTick: 0.2,
    });
  }

  function updateSpawner(dt) {
    if (enemies.length >= config.spawn.maxEnemies) return;

    const difficulty = getDifficulty();
    const interval = Math.max(
      config.spawn.minInterval,
      config.spawn.baseInterval - difficulty * 0.06,
    );
    spawnTimer -= dt;

    while (spawnTimer <= 0 && enemies.length < config.spawn.maxEnemies) {
      spawnEnemy();
      spawnTimer += interval;
    }
  }

  function update(dt) {
    if (!window.SWARM.bossSystem.active && state.mode !== "boss_rush") {
      updateSpawner(dt);
    }

    enemies.slice().forEach((enemy) => {
      updateBurn(enemy, dt);
      if (!enemies.includes(enemy)) return;

      const enemyCenter = utils.center(enemy);
      const playerCenter = utils.center(player);
      const angle = Math.atan2(
        playerCenter.y - enemyCenter.y,
        playerCenter.x - enemyCenter.x,
      );

      enemy.angle = angle;
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    });
  }

  function remove(enemy) {
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
  }

  function damage(enemy, amount, source = {}) {
    if (!enemy || !enemies.includes(enemy)) return false;

    enemy.health -= Math.max(0, Number(amount) || 0);
    window.SWARM.effectSystem.burst(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      source.color || "#ff4b4b",
      source.particles || 6,
    );

    if (enemy.health > 0) return false;

    remove(enemy);
    state.kills += 1;
    window.SWARM.game.addScore(
      Number.isFinite(source.score) ? source.score : 1,
    );
    window.SWARM.progression.gainXP(
      Number.isFinite(source.xp) ? source.xp : 1,
    );

    if (state.mode !== "boss_rush") {
      window.SWARM.bossSystem.maybeSpawn();
    }

    if (window.SWARM.game?.onEnemyKilled) {
      window.SWARM.game.onEnemyKilled(enemy, source);
    }
    return true;
  }

  function applyBurn(enemy, duration = 2, tickDamage = 5) {
    if (!enemy || !enemies.includes(enemy)) return;
    enemy.isBurning = true;
    enemy.burnDuration = Math.max(enemy.burnDuration || 0, duration);
    enemy.burnTick = Math.min(enemy.burnTick || 0.2, 0.2);
    enemy.burnDamage = tickDamage;
  }

  function updateBurn(enemy, dt) {
    if (!enemy.isBurning) return;

    enemy.burnDuration -= dt;
    enemy.burnTick -= dt;

    while (enemy.burnTick <= 0 && enemy.burnDuration > 0) {
      enemy.burnTick += 0.2;
      if (damage(enemy, enemy.burnDamage || 5, { color: "#ff8a1f", particles: 4 })) {
        return;
      }
    }

    if (enemy.burnDuration <= 0) {
      enemy.isBurning = false;
      enemy.burnDuration = 0;
      enemy.burnTick = 0.2;
    }
  }

  function draw() {
    const enemyImg = window.SWARM.assets.enemy;
    enemies.forEach((enemy) => {
      if (enemy.isBurning) {
        const center = utils.center(enemy);
        const aura = window.SWARM.ctx.createRadialGradient(
          center.x,
          center.y,
          4,
          center.x,
          center.y,
          enemy.width * 0.72,
        );
        aura.addColorStop(0, "rgba(255, 245, 169, 0.86)");
        aura.addColorStop(0.38, "rgba(255, 126, 24, 0.56)");
        aura.addColorStop(1, "rgba(218, 41, 12, 0)");
        window.SWARM.ctx.save();
        window.SWARM.ctx.fillStyle = aura;
        window.SWARM.ctx.beginPath();
        window.SWARM.ctx.arc(center.x, center.y, enemy.width * 0.72, 0, Math.PI * 2);
        window.SWARM.ctx.fill();
        window.SWARM.ctx.restore();
      }

      utils.drawRotatedImage(enemyImg, enemy, enemy.angle);

      const ratio = Math.max(0, enemy.health / Math.max(1, enemy.maxHealth || enemy.health));
      const barY = enemy.y - 8;
      window.SWARM.ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      window.SWARM.ctx.fillRect(enemy.x, barY, enemy.width, 4);
      window.SWARM.ctx.fillStyle = enemy.isBurning ? "#ff9d28" : "#8cff8c";
      window.SWARM.ctx.fillRect(enemy.x, barY, enemy.width * ratio, 4);
    });
  }

  window.SWARM.enemies = enemies;
  window.SWARM.enemySystem = {
    reset,
    update,
    draw,
    remove,
    damage,
    applyBurn,
    spawnEnemy,
  };
})();
