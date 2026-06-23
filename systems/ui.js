(function () {
  "use strict";

  const { dom, state } = window.SWARM;

  function formatRecord(record) {
    if (!record) return "Recorde: --";

    const seconds = Math.floor(Number(record.time_ms || 0) / 1000);
    return `Recorde: ${record.score || 0} kills | ${seconds}s`;
  }

  function updateRecord(record) {
    if (dom.menuRecord) dom.menuRecord.textContent = formatRecord(record);
  }

  function showMenu() {
    state.status = "menu";
    dom.menu.style.display = "flex";
    dom.gameOver.style.display = "none";
    console.log("Voltando ao menu, carregando perfil...");
    window.SWARM.profile.load();
  }

  function showGame() {
    dom.menu.style.display = "none";
    dom.gameOver.style.display = "none";
  }

  function showGameOver() {
    dom.gameOver.style.display = "flex";
    if (dom.finalScore) {
      dom.finalScore.textContent = `Score: ${state.score} | Tempo: ${Math.floor(state.elapsed / 1000)}s`;
    }
  }

  function bind() {
    dom.playBtn.addEventListener("click", () => {
      window.SWARM.game.start();
    });

    dom.restartBtn.addEventListener("click", () => {
      window.SWARM.game.start();
    });

    dom.menuBtn.addEventListener("click", () => {
      showMenu();
    });

    dom.playerName.addEventListener("change", () => {
      window.SWARM.profile.load();
    });
  }

  function drawHud() {
    const { ctx, player, bossSystem } = window.SWARM;
    const seconds = Math.floor(state.elapsed / 1000);

    window.SWARM.progression.draw();

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Kills: ${state.kills}`, 20, 90);
    ctx.fillText(`Tempo: ${seconds}s`, 20, 120);
    ctx.fillText(`Vida: ${player.health}/${player.maxHealth}`, 20, 150);

    if (!bossSystem.active) return;

    const boss = bossSystem.active;
    const width = 300;
    const x = 20;
    const y = 180;

    ctx.fillStyle = "red";
    ctx.fillRect(x, y, width, 24);
    ctx.fillStyle = "#7cff5b";
    ctx.fillRect(x, y, (boss.hp / boss.maxHp) * width, 24);
    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, width, 24);
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(`BOSS HP: ${boss.hp}/${boss.maxHp}`, x, y - 10);
  }

  window.SWARM.ui = {
    bind,
    showMenu,
    showGame,
    showGameOver,
    updateRecord,
    drawHud,
  };
})();
