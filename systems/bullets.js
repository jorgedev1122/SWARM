(function () {
  "use strict";

  const { canvas, input, player, utils } = window.SWARM;

  const bullets = [];
  let cooldown = 0;

  function reset() {
    bullets.length = 0;
    cooldown = 0;
  }

  function shoot(dt) {
    cooldown = Math.max(0, cooldown - dt);
    if (!input.mouse.down || cooldown > 0) return;

    const weapon = window.SWARM.playerSystem.getWeapon();
    const center = utils.center(player);
    const angle = Math.atan2(
      input.mouse.y - center.y,
      input.mouse.x - center.x,
    );
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    cooldown = weapon.fireDelay;
    const damageMultiplier = window.SWARM.playerSystem.getDamageMultiplier
      ? window.SWARM.playerSystem.getDamageMultiplier()
      : 1;

    // Lava Mage replaces every equipped weapon projectile with a lava bolt.
    // The bolt keeps the weapon cadence while applying the class multiplier.
    if (window.SWARM.playerSystem.isLavaMage?.()) {
      const muzzleDistance = Math.max(player.width, player.height) * 0.38;
      bullets.push({
        type: "lava",
        x: center.x + directionX * muzzleDistance - 12,
        y: center.y + directionY * muzzleDistance - 12,
        width: 24,
        height: 24,
        dx: directionX,
        dy: directionY,
        speed: Math.max(560, Number(weapon.bulletSpeed || 0) * 0.9),
        angle,
        damage: Number(weapon.damage || 1) * damageMultiplier,
        burnDuration: 2,
        life: 1.65,
      });
      return;
    }

    if (weapon.melee) {
      const reach = 78;
      bullets.push({
        type: "melee",
        x: center.x + directionX * reach - 45,
        y: center.y + directionY * reach - 45,
        width: 90,
        height: 90,
        angle,
        damage: weapon.damage * damageMultiplier,
        life: 0.08,
        hit: new Set(),
      });
      return;
    }

    const muzzleDistance = Math.max(player.width, player.height) * 0.38;
    const isArcher = player.weapon === "archer";
    const isBazooka = player.weapon === "bazooka";

    let projectileAsset = "bullet";

    if (isArcher) {
      projectileAsset = "arrow";
    } else if (isBazooka) {
      projectileAsset = "bazookabullet";
    }

    bullets.push({
      type: "bullet",
      assetKey: projectileAsset,
      isBazooka: isBazooka,
      x: center.x + directionX * muzzleDistance - 9,
      y: center.y + directionY * muzzleDistance - 9,
      width: isArcher ? 28 : isBazooka ? 32 : 18,
      height: isArcher ? 10 : isBazooka ? 16 : 18,
      dx: directionX,
      dy: directionY,
      speed: weapon.bulletSpeed,
      angle,
      damage: weapon.damage * damageMultiplier,
      life: isArcher ? 1.35 : isBazooka ? 2 : 1.8,
    });
  }

  function update(dt) {
    shoot(dt);

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      bullet.life -= dt;

      if (bullet.type === "bullet" || bullet.type === "lava") {
        bullet.x += bullet.dx * bullet.speed * dt;
        bullet.y += bullet.dy * bullet.speed * dt;
      }

      const outOfBounds =
        bullet.x < -80 ||
        bullet.x > canvas.width + 80 ||
        bullet.y < -80 ||
        bullet.y > canvas.height + 80;

      if (bullet.life <= 0 || outOfBounds) {
        bullets.splice(index, 1);
      }
    }
  }

  function remove(bullet) {
    const index = bullets.indexOf(bullet);
    if (index >= 0) bullets.splice(index, 1);
  }

  function draw() {
    bullets.forEach((bullet) => {
      if (bullet.type === "melee") {
        window.SWARM.ctx.save();
        window.SWARM.ctx.translate(
          bullet.x + bullet.width / 2,
          bullet.y + bullet.height / 2,
        );
        window.SWARM.ctx.rotate(bullet.angle);
        window.SWARM.ctx.strokeStyle = "rgba(255, 236, 92, 0.75)";
        window.SWARM.ctx.lineWidth = 5;
        window.SWARM.ctx.beginPath();
        window.SWARM.ctx.arc(0, 0, bullet.width / 2, -0.75, 0.75);
        window.SWARM.ctx.stroke();
        window.SWARM.ctx.restore();
        return;
      }

      if (bullet.type === "lava") {
        const centerX = bullet.x + bullet.width / 2;
        const centerY = bullet.y + bullet.height / 2;
        const radius = bullet.width * 0.7;
        const gradient = window.SWARM.ctx.createRadialGradient(
          centerX - bullet.dx * 5,
          centerY - bullet.dy * 5,
          1,
          centerX,
          centerY,
          radius,
        );
        gradient.addColorStop(0, "#fff7bf");
        gradient.addColorStop(0.35, "#ffd135");
        gradient.addColorStop(0.72, "#fa5a17");
        gradient.addColorStop(1, "rgba(162, 25, 8, 0)");

        window.SWARM.ctx.save();
        window.SWARM.ctx.shadowColor = "#ff631d";
        window.SWARM.ctx.shadowBlur = 18;
        window.SWARM.ctx.fillStyle = gradient;
        window.SWARM.ctx.beginPath();
        window.SWARM.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        window.SWARM.ctx.fill();
        window.SWARM.ctx.restore();
        return;
      }

      const projectileImg = window.SWARM.assets[bullet.assetKey || "bullet"];
      window.SWARM.ctx.save();
      window.SWARM.ctx.translate(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
      );
      window.SWARM.ctx.rotate(bullet.angle + Math.PI / 2);
      if (bullet.assetKey === "arrow") {
        window.SWARM.ctx.drawImage(
          projectileImg,
          -bullet.width / 2,
          -bullet.height / 2,
          bullet.width,
          bullet.height,
        );
      } else {
        window.SWARM.ctx.drawImage(projectileImg, -10, -10, 20, 20);
      }
      window.SWARM.ctx.restore();
    });
  }

  window.SWARM.bullets = bullets;
  window.SWARM.bulletSystem = {
    reset,
    update,
    draw,
    remove,
  };
})();
