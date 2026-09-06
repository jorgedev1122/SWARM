(function () {
  "use strict";

  const { canvas, config, input, utils } = window.SWARM;

  const player = {
    x: 0,
    y: 0,
    width: config.player.width,
    height: config.player.height,
    speed: config.player.baseSpeed,
    angle: 0,
    health: config.player.baseHealth,
    maxHealth: config.player.baseHealth,
    invulnerableFor: 0,
    weapon: "default",
    characterId: "player_default",
    damageMultiplier: 1,
    devGodMode: false,
  };
  let lavaMage = null;

  function getWeapon() {
    return (
      window.SWARM.config.profile.weapons[player.weapon] ||
      window.SWARM.config.profile.weapons.default
    );
  }

  function getSpriteKey() {
    if (player.weapon === "archer") return "archer";
    if (player.weapon === "pistol") return "pistol";
    if (player.weapon === "rifle") return "rifle";
    if (player.weapon === "knife") return "knife";
    if (player.weapon === "bazooka") return "bazooka";
    return "player";
  }

  function applyProfile(profile) {
    const upgrades = profile && profile.upgrades ? profile.upgrades : {};
    const speedBonus = Number(upgrades.speed || 0) * 9;
    const healthBonus = Number(upgrades.health || 0);
    const characterId =
      profile && profile.equipped_character === "lava_mage"
        ? "lava_mage"
        : "player_default";
    const isLavaMage = characterId === "lava_mage";

    player.characterId = characterId;
    player.speed =
      (config.player.baseSpeed + speedBonus) * (isLavaMage ? 0.8 : 1);
    player.maxHealth = Math.max(
      1,
      Math.round(
        (config.player.baseHealth + healthBonus) * (isLavaMage ? 1.2 : 1),
      ),
    );
    player.health = player.maxHealth;
    player.damageMultiplier = isLavaMage ? 1.3 : 1;
    player.weapon =
      profile && profile.equipped_weapon ? profile.equipped_weapon : "default";

    lavaMage = null;
    if (isLavaMage && typeof window.SWARM.LavaMage === "function") {
      try {
        lavaMage = new window.SWARM.LavaMage({
          x: player.x,
          y: player.y,
          width: player.width,
          height: player.height,
          speed: player.speed,
          maxHealth: player.maxHealth,
        });
      } catch (error) {
        // The canvas fallback below keeps the selected character playable if
        // an external character implementation is unavailable.
        lavaMage = null;
      }
    }
  }

  function reset(profile) {
    player.width = config.player.width;
    player.height = config.player.height;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height / 2 - player.height / 2;
    player.angle = 0;
    player.invulnerableFor = 0;
    applyProfile(profile);
  }

  function update(dt) {
    let dx = 0;
    let dy = 0;

    if (input.keys.w || input.keys.arrowup) dy -= 1;
    if (input.keys.s || input.keys.arrowdown) dy += 1;
    if (input.keys.a || input.keys.arrowleft) dx -= 1;
    if (input.keys.d || input.keys.arrowright) dx += 1;

    const movement = utils.normalize(dx, dy);
    if (dx !== 0 || dy !== 0) {
      player.x += movement.x * player.speed * dt;
      player.y += movement.y * player.speed * dt;
    }

    player.x = utils.clamp(player.x, 0, canvas.width - player.width);
    player.y = utils.clamp(player.y, 0, canvas.height - player.height);

    const center = utils.center(player);
    player.angle = Math.atan2(
      input.mouse.y - center.y,
      input.mouse.x - center.x,
    );
    player.invulnerableFor = Math.max(0, player.invulnerableFor - dt);
  }

  function damage(amount) {
    if (window.SWARM.game?.vehicles?.vehicle?.occupied) return false;
    if (player.devGodMode) return false;

    if (player.invulnerableFor > 0) return false;

    player.health = Math.max(0, player.health - amount);
    player.invulnerableFor = config.player.invulnerability;

    if (player.health <= 0) {
      window.SWARM.game.end();
    }

    return true;
  }

  function dodgeDash() {
    const padding = 24;
    const dashDistance = 160;
    const leftSpace = player.x - padding;
    const rightSpace = canvas.width - (player.x + player.width) - padding;
    let targetX = player.x;
    let targetY = player.y;

    if (Math.abs(leftSpace - rightSpace) > 16) {
      targetX =
        leftSpace > rightSpace
          ? Math.max(padding, player.x - dashDistance)
          : Math.min(
              canvas.width - player.width - padding,
              player.x + dashDistance,
            );
    } else {
      const topSpace = player.y - padding;
      const bottomSpace = canvas.height - (player.y + player.height) - padding;
      if (topSpace > bottomSpace) {
        targetY = Math.max(padding, player.y - dashDistance);
      } else {
        targetY = Math.min(
          canvas.height - player.height - padding,
          player.y + dashDistance,
        );
      }
    }

    player.x = utils.clamp(
      targetX,
      padding,
      canvas.width - player.width - padding,
    );
    player.y = utils.clamp(
      targetY,
      padding,
      canvas.height - player.height - padding,
    );
    const center = utils.center(player);
    window.SWARM.effectSystem.burst(center.x, center.y, "#88ffff", 12);
  }

  function draw() {
    if (player.characterId === "lava_mage") {
      if (lavaMage && typeof lavaMage.draw === "function") {
        try {
          Object.assign(lavaMage, {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height,
            angle: player.angle,
            health: player.health,
            maxHealth: player.maxHealth,
          });
          lavaMage.draw(window.SWARM.ctx);
          return;
        } catch (error) {
          lavaMage = null;
        }
      }

      const ctx = window.SWARM.ctx;
      const center = utils.center(player);
      const radius = Math.max(player.width, player.height) * 0.58;
      const aura = ctx.createRadialGradient(
        center.x,
        center.y,
        5,
        center.x,
        center.y,
        radius,
      );
      aura.addColorStop(0, "#fff0a6");
      aura.addColorStop(0.28, "#ff9d1f");
      aura.addColorStop(0.65, "#e33a13");
      aura.addColorStop(1, "rgba(110, 15, 8, 0.1)");

      ctx.save();
      ctx.shadowColor = "rgba(255, 89, 20, 0.9)";
      ctx.shadowBlur = 26;
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3d1010";
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 0.31, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const sprite = window.SWARM.assets[getSpriteKey()];

    if (
      player.invulnerableFor > 0 &&
      Math.floor(performance.now() / 80) % 2 === 0
    ) {
      return;
    }

    utils.drawRotatedImage(sprite, player, player.angle);
  }

  window.SWARM.player = player;
  window.SWARM.playerSystem = {
    reset,
    update,
    draw,
    damage,
    dodgeDash,
    getWeapon,
    getDamageMultiplier: () => player.damageMultiplier,
    isLavaMage: () => player.characterId === "lava_mage",
    applyProfile,
  };
})();
