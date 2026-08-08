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
    const angle = Math.atan2(input.mouse.y - center.y, input.mouse.x - center.x);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    cooldown = weapon.fireDelay;

    if (weapon.melee) {
      const reach = 78;
      bullets.push({
        type: "melee",
        x: center.x + directionX * reach - 45,
        y: center.y + directionY * reach - 45,
        width: 90,
        height: 90,
        angle,
        damage: weapon.damage,
        life: 0.08,
        hit: new Set()
      });
      return;
    }

    const muzzleDistance = Math.max(player.width, player.height) * 0.38;
    const isArcher = player.weapon === "archer";
    const projectileAsset = isArcher ? "arrow" : "bullet";

    bullets.push({
      type: "bullet",
      assetKey: projectileAsset,
      x: center.x + directionX * muzzleDistance - 9,
      y: center.y + directionY * muzzleDistance - 9,
      width: isArcher ? 28 : 18,
      height: isArcher ? 10 : 18,
      dx: directionX,
      dy: directionY,
      speed: weapon.bulletSpeed,
      angle,
      damage: weapon.damage,
      life: isArcher ? 1.35 : 1.8
    });
  }

  function update(dt) {
    shoot(dt);

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      bullet.life -= dt;

      if (bullet.type === "bullet") {
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
    bullets.forEach(bullet => {
      if (bullet.type === "melee") {
        window.SWARM.ctx.save();
        window.SWARM.ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
        window.SWARM.ctx.rotate(bullet.angle);
        window.SWARM.ctx.strokeStyle = "rgba(255, 236, 92, 0.75)";
        window.SWARM.ctx.lineWidth = 5;
        window.SWARM.ctx.beginPath();
        window.SWARM.ctx.arc(0, 0, bullet.width / 2, -0.75, 0.75);
        window.SWARM.ctx.stroke();
        window.SWARM.ctx.restore();
        return;
      }

      const projectileImg = window.SWARM.assets[bullet.assetKey || "bullet"];
      window.SWARM.ctx.save();
      window.SWARM.ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
      window.SWARM.ctx.rotate(bullet.angle + Math.PI / 2);
      if (bullet.assetKey === "arrow") {
        window.SWARM.ctx.drawImage(projectileImg, -bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
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
    remove
  };
})();
