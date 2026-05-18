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
    weapon: "default"
  };

  function getWeapon() {
    return window.SWARM.config.profile.weapons[player.weapon] || window.SWARM.config.profile.weapons.default;
  }

  function getSpriteKey() {
    if (player.weapon === "pistol") return "pistol";
    if (player.weapon === "rifle") return "rifle";
    if (player.weapon === "knife") return "knife";
    return "player";
  }

  function applyProfile(profile) {
    const upgrades = profile && profile.upgrades ? profile.upgrades : {};
    const speedBonus = Number(upgrades.speed || 0) * 9;
    const healthBonus = Number(upgrades.health || 0);

    player.speed = config.player.baseSpeed + speedBonus;
    player.maxHealth = config.player.baseHealth + healthBonus;
    player.health = player.maxHealth;
    player.weapon = profile && profile.equipped_weapon ? profile.equipped_weapon : "default";
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
    player.angle = Math.atan2(input.mouse.y - center.y, input.mouse.x - center.x);
    player.invulnerableFor = Math.max(0, player.invulnerableFor - dt);
  }

  function damage(amount) {
    if (player.invulnerableFor > 0) return false;

    player.health = Math.max(0, player.health - amount);
    player.invulnerableFor = config.player.invulnerability;

    if (player.health <= 0) {
      window.SWARM.game.end();
    }

    return true;
  }

  function draw() {
    const sprite = window.SWARM.assets[getSpriteKey()];

    if (player.invulnerableFor > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
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
    getWeapon,
    applyProfile
  };
})();
