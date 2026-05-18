(function () {
  "use strict";

  const systems = window.SWARM;
  let lastFrame = 0;

  function resetRun() {
    systems.state.status = "playing";
    systems.state.startedAt = performance.now();
    systems.state.elapsed = 0;
    systems.state.score = 0;
    systems.state.kills = 0;
    systems.state.lastBossKillMark = 0;
    systems.playerSystem.reset(systems.profile.data);
    systems.bulletSystem.reset();
    systems.enemySystem.reset();
    systems.bossSystem.reset();
    systems.effectSystem.reset();
    systems.progression.reset();
  }

  function update(now, dt) {
    systems.state.elapsed = now - systems.state.startedAt;
    systems.playerSystem.update(dt);
    systems.enemySystem.update(dt);
    systems.bulletSystem.update(dt);
    systems.bossSystem.update(dt);
    systems.collisionSystem.update();
    systems.effectSystem.update(dt);
  }

  function drawBackground() {
    systems.ctx.clearRect(0, 0, systems.canvas.width, systems.canvas.height);
  }

  function draw() {
    drawBackground();

    if (systems.state.status !== "playing" && systems.state.status !== "gameover") return;

    systems.enemySystem.draw();
    systems.bossSystem.draw();
    systems.bulletSystem.draw();
    systems.playerSystem.draw();
    systems.effectSystem.draw();
    systems.ui.drawHud();
  }

  function animate(now) {
    const dt = Math.min((now - lastFrame) / 1000 || 0, 0.05);
    lastFrame = now;

    if (systems.state.status === "playing") {
      update(now, dt);
    }

    draw();
    requestAnimationFrame(animate);
  }

  systems.game = {
    start() {
      resetRun();
      systems.ui.showGame();
    },

    async end() {
      if (systems.state.status !== "playing") return;

      systems.state.status = "gameover";
      systems.input.mouse.down = false;
      await systems.profile.saveRun();
      systems.ui.showGameOver();
    },

    addScore(amount) {
      systems.state.score += amount;
    }
  };

  systems.shop.bind();
  systems.ui.bind();
  systems.profile.load();

  requestAnimationFrame(animate);
})();
