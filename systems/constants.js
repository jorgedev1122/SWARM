(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const dom = {
    menu: document.getElementById("menu"),
    mainMenu: document.querySelector(".main-menu"),
    playBtn: document.getElementById("play-btn"),
    restartBtn: document.getElementById("restart-btn"),
    menuBtn: document.getElementById("menu-btn"),
    gameOver: document.getElementById("game-over"),
    finalScore: document.getElementById("final-score"),
    playerName: document.getElementById("player-name"),
    menuRecord: document.getElementById("menu-record"),
    coinCount: document.getElementById("coin-count"),
    shopToggle: document.getElementById("shop-toggle"),
    shopPanel: document.getElementById("shop-panel"),
    shopClose: document.getElementById("shop-close"),
    shopMessage: document.getElementById("shop-message"),
    speedLevel: document.getElementById("speed-level"),
    healthLevel: document.getElementById("health-level"),
    luckLevel: document.getElementById("luck-level"),
    upgradeCards: Array.from(document.querySelectorAll("[data-upgrade]")),
    weaponCards: Array.from(document.querySelectorAll("[data-weapon]")),
  };

  const config = {
    spawn: {
      baseInterval: 1,
      minInterval: 0.28,
      maxEnemies: 90,
    },
    boss: {
      killInterval: 30,
    },
    player: {
      width: 70,
      height: 70,
      baseSpeed: 280,
      baseHealth: 5,
      invulnerability: 0.7,
    },
    enemy: {
      size: 60,
      baseSpeed: 95,
      contactDamage: 1,
    },
    hud: {
      padding: 20,
      xpWidth: 240,
      xpHeight: 20,
    },
    profile: {
      upgradeCost: {
        speed: 3,
        health: 3,
        luck: 1,
      },
      upgradeMax: {
        speed: 20,
        health: 10,
        luck: 100,
      },
      weapons: {
        default: {
          name: "Soldado",
          cost: 0,
          damage: 1,
          fireDelay: 0.12,
          bulletSpeed: 720,
          sprite: "assets/soldier.png",
        },
        pistol: {
          name: "Aguia",
          cost: 6,
          damage: 5,
          fireDelay: 0.22,
          bulletSpeed: 760,
          sprite: "assets/soldier2.gif",
        },
        rifle: {
          name: "Executor",
          cost: 15,
          damage: 10,
          fireDelay: 0.34,
          bulletSpeed: 820,
          sprite: "assets/soldier3.png",
        },
        knife: {
          name: "Ceifador",
          cost: 25,
          damage: 18,
          fireDelay: 0.0,
          melee: true,
          sprite: "assets/soldier4.png",
        },
      },
    },
  };

  const state = {
    status: "menu",
    startedAt: 0,
    elapsed: 0,
    score: 0,
    kills: 0,
    lastBossKillMark: 0,
  };

  const input = {
    keys: {},
    mouse: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      down: false,
    },
  };

  const imageSources = {
    player: "assets/soldier.png",
    pistol: "assets/soldier2.gif",
    rifle: "assets/soldier3.png",
    knife: "assets/soldier4.png",
    enemy: "assets/zombie.png",
    bullet: "assets/bullet.webp",
    boss: "assets/BOSS1.png",
    bossFury: "assets/BOSS2.gif",
  };

  const assets = Object.fromEntries(
    Object.entries(imageSources).map(([key, src]) => {
      const image = new Image();
      image.src = src;
      return [key, image];
    }),
  );

  const utils = {
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    aabb(a, b) {
      return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    },

    center(entity) {
      return {
        x: entity.x + entity.width / 2,
        y: entity.y + entity.height / 2,
      };
    },

    normalize(dx, dy) {
      const length = Math.hypot(dx, dy) || 1;
      return {
        x: dx / length,
        y: dy / length,
      };
    },

    drawRotatedImage(image, entity, angle) {
      ctx.save();
      ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
      ctx.rotate(angle);
      ctx.drawImage(
        image,
        -entity.width / 2,
        -entity.height / 2,
        entity.width,
        entity.height,
      );
      ctx.restore();
    },
  };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = event.clientX - rect.left;
    input.mouse.y = event.clientY - rect.top;
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    input.keys[event.key.toLowerCase()] = true;
  });
  window.addEventListener("keyup", (event) => {
    input.keys[event.key.toLowerCase()] = false;
  });
  window.addEventListener("mousemove", updateMouse);
  window.addEventListener("mousedown", (event) => {
    if (event.button === 0) input.mouse.down = true;
  });
  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) input.mouse.down = false;
  });
  window.addEventListener("blur", () => {
    input.mouse.down = false;
    input.keys = {};
  });

  resizeCanvas();

  window.SWARM = {
    canvas,
    ctx,
    dom,
    config,
    state,
    input,
    assets,
    utils,
  };
})();
