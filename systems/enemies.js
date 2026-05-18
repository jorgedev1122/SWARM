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
    if (side === 1) return { x: canvas.width + size, y: Math.random() * canvas.height };
    if (side === 2) return { x: Math.random() * canvas.width, y: canvas.height + size };
    return { x: -size, y: Math.random() * canvas.height };
  }

  function spawnEnemy(options) {
    const difficulty = getDifficulty();
    const size = config.enemy.size;
    const point = getSpawnPoint(size);

    enemies.push({
      x: point.x,
      y: point.y,
      width: size,
      height: size,
      speed: config.enemy.baseSpeed + difficulty * 9,
      angle: 0,
      health: options && options.health ? options.health : Math.max(1, Math.floor(difficulty / 1.8)),
      contactDamage: config.enemy.contactDamage
    });
  }

  function updateSpawner(dt) {
    if (enemies.length >= config.spawn.maxEnemies) return;

    const difficulty = getDifficulty();
    const interval = Math.max(config.spawn.minInterval, config.spawn.baseInterval - difficulty * 0.06);
    spawnTimer -= dt;

    while (spawnTimer <= 0 && enemies.length < config.spawn.maxEnemies) {
      spawnEnemy();
      spawnTimer += interval;
    }
  }

  function update(dt) {
    updateSpawner(dt);

    enemies.forEach(enemy => {
      const enemyCenter = utils.center(enemy);
      const playerCenter = utils.center(player);
      const angle = Math.atan2(playerCenter.y - enemyCenter.y, playerCenter.x - enemyCenter.x);

      enemy.angle = angle;
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    });
  }

  function remove(enemy) {
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
  }

  function draw() {
    const enemyImg = window.SWARM.assets.enemy;
    enemies.forEach(enemy => {
      utils.drawRotatedImage(enemyImg, enemy, enemy.angle);
    });
  }

  window.SWARM.enemies = enemies;
  window.SWARM.enemySystem = {
    reset,
    update,
    draw,
    remove,
    spawnEnemy
  };
})();
