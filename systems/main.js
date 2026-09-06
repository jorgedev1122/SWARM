(function () {
  "use strict";

  const systems = window.SWARM;
  let lastFrame = 0;

  /*
   * The original game loop remains the single requestAnimationFrame owner.
   * Feature orchestration lives in public/js/game.js so the legacy systems
   * keep working while new game modes and entities share the same canvas.
   */
  const game = new systems.Game(systems);
  systems.game = game;

  function animate(now) {
    const dt = Math.min((now - lastFrame) / 1000 || 0, 0.05);
    lastFrame = now;

    if (systems.state.status === "playing") {
      game.update(now, dt);
    }

    game.draw();
    requestAnimationFrame(animate);
  }

  systems.shop.bind();
  systems.ui.bind();
  systems.ui.showWelcome();
  systems.profile.load();

  requestAnimationFrame(animate);
})();
