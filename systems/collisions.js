(function () {
  "use strict";

  const { player, state, utils } = window.SWARM;

  function hitEnemy(enemy, damage) {
    enemy.health -= damage;
    window.SWARM.effectSystem.burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#7cff5b", 6);

    if (enemy.health <= 0) {
      window.SWARM.enemySystem.remove(enemy);
      state.kills += 1;
      window.SWARM.game.addScore(1);
      window.SWARM.progression.gainXP(1);
      window.SWARM.bossSystem.maybeSpawn();
    }
  }

  function bulletsVsEnemies() {
    window.SWARM.bullets.slice().forEach(bullet => {
      window.SWARM.enemies.slice().forEach(enemy => {
        if (!utils.aabb(bullet, enemy)) return;
        if (bullet.type === "melee" && bullet.hit.has(enemy)) return;

        hitEnemy(enemy, bullet.damage);

        if (bullet.type === "melee") {
          bullet.hit.add(enemy);
        } else {
          window.SWARM.bulletSystem.remove(bullet);
        }
      });
    });
  }

  function bulletsVsBoss() {
    const boss = window.SWARM.bossSystem.active;
    if (!boss) return;

    window.SWARM.bullets.slice().forEach(bullet => {
      if (!utils.aabb(bullet, boss)) return;
      if (bullet.type === "melee" && bullet.hit.has(boss)) return;

      window.SWARM.bossSystem.damage(bullet.damage);

      if (bullet.type === "melee") {
        bullet.hit.add(boss);
      } else {
        window.SWARM.bulletSystem.remove(bullet);
      }
    });
  }

  function enemiesVsPlayer() {
    window.SWARM.enemies.forEach(enemy => {
      if (utils.aabb(enemy, player)) {
        window.SWARM.playerSystem.damage(enemy.contactDamage);
      }
    });

    const boss = window.SWARM.bossSystem.active;
    if (boss && utils.aabb(boss, player)) {
      window.SWARM.playerSystem.damage(boss.contactDamage);
    }
  }

  function bossProjectilesVsPlayer() {
    window.SWARM.bossSystem.projectiles.slice().forEach(projectile => {
      if (!utils.aabb(projectile, player)) return;

      window.SWARM.playerSystem.damage(projectile.damage);
      const index = window.SWARM.bossSystem.projectiles.indexOf(projectile);
      if (index >= 0) window.SWARM.bossSystem.projectiles.splice(index, 1);
    });
  }

  function update() {
    bulletsVsEnemies();
    bulletsVsBoss();
    enemiesVsPlayer();
    bossProjectilesVsPlayer();
  }

  window.SWARM.collisionSystem = {
    update
  };
})();
