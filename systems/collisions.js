(function () {
  "use strict";

  const { player, state, utils } = window.SWARM;

  function hitEnemy(enemy, damage, source) {
    if (window.SWARM.enemySystem.damage) {
      return window.SWARM.enemySystem.damage(enemy, damage, source);
    }

    enemy.health -= damage;

    window.SWARM.effectSystem.burst(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      "#ff4b4b",
      6,
    );

    if (enemy.health <= 0) {
      window.SWARM.enemySystem.remove(enemy);
      state.kills += 1;
      window.SWARM.game.addScore(1);
      window.SWARM.progression.gainXP(1);
      window.SWARM.bossSystem.maybeSpawn();
      return true;
    }

    return false;
  }

  // 💥 Explosão da bazuca
  function bazookaExplosion(x, y, damage, radius = 90) {
    // Cria o efeito visual
    window.SWARM.effectSystem.explosion(x, y, radius);

    // Dano nos inimigos próximos
    window.SWARM.enemies.slice().forEach((enemy) => {
      const center = utils.center(enemy);

      const distance = Math.hypot(center.x - x, center.y - y);

      if (distance <= radius) {
        hitEnemy(enemy, damage);
      }
    });

    // Dano no boss, se estiver dentro da explosão
    const boss = window.SWARM.bossSystem.active;

    if (boss) {
      const center = utils.center(boss);

      const distance = Math.hypot(center.x - x, center.y - y);

      if (distance <= radius) {
        window.SWARM.bossSystem.damage(damage);
      }
    }
  }

  function bulletsVsEnemies() {
    window.SWARM.bullets.slice().forEach((bullet) => {
      if (bullet.exploded) return;

      window.SWARM.enemies.slice().forEach((enemy) => {
        if (bullet.exploded) return;
        if (!utils.aabb(bullet, enemy)) return;

        if (bullet.type === "melee" && bullet.hit.has(enemy)) {
          return;
        }

        // 🚀 BAZUCA
        if (bullet.isBazooka) {
          const impactX = enemy.x + enemy.width / 2;
          const impactY = enemy.y + enemy.height / 2;

          bullet.exploded = true;

          bazookaExplosion(impactX, impactY, bullet.damage, 150);

          window.SWARM.bulletSystem.remove(bullet);
          return;
        }

        // Ataques normais
        const killed = hitEnemy(enemy, bullet.damage, {
          color: bullet.type === "lava" ? "#ff8a1f" : "#ff4b4b",
        });

        if (bullet.type === "lava" && !killed) {
          window.SWARM.enemySystem.applyBurn(
            enemy,
            bullet.burnDuration || 2,
            5,
          );
        }

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

    window.SWARM.bullets.slice().forEach((bullet) => {
      if (bullet.exploded) return;
      if (!utils.aabb(bullet, boss)) return;

      // 🚀 Bazuca acertando diretamente o boss
      if (bullet.isBazooka) {
        const impactX = boss.x + boss.width / 2;
        const impactY = boss.y + boss.height / 2;

        bullet.exploded = true;

        bazookaExplosion(impactX, impactY, bullet.damage, 90);

        window.SWARM.bulletSystem.remove(bullet);
        return;
      }

      if (bullet.type === "melee" && bullet.hit.has(boss)) {
        return;
      }

      window.SWARM.bossSystem.damage(bullet.damage);

      if (bullet.type === "melee") {
        bullet.hit.add(boss);
      } else {
        window.SWARM.bulletSystem.remove(bullet);
      }
    });
  }

  function enemiesVsPlayer() {
    if (window.SWARM.game?.vehicles?.vehicle?.occupied) return;

    window.SWARM.enemies.forEach((enemy) => {
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
    if (window.SWARM.game?.vehicles?.vehicle?.occupied) return;

    window.SWARM.bossSystem.projectiles.slice().forEach((projectile) => {
      if (!utils.aabb(projectile, player)) return;

      window.SWARM.playerSystem.damage(projectile.damage);

      const index = window.SWARM.bossSystem.projectiles.indexOf(projectile);

      if (index >= 0) {
        window.SWARM.bossSystem.projectiles.splice(index, 1);
      }
    });
  }

  function update() {
    bulletsVsEnemies();
    bulletsVsBoss();
    enemiesVsPlayer();
    bossProjectilesVsPlayer();
  }

  window.SWARM.collisionSystem = {
    update,
  };
})();
