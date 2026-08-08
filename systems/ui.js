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
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = "none";
    dom.menu.style.display = "flex";
    dom.gameOver.style.display = "none";
    console.log("Voltando ao menu, carregando perfil...");
    window.SWARM.profile.load();
  }

  function showWelcome() {
    state.status = "welcome";
    dom.welcomeScreen.style.display = "flex";
    dom.menu.style.display = "none";
    dom.gameOver.style.display = "none";
  }

  function showGame() {
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = "none";
    dom.menu.style.display = "none";
    dom.gameOver.style.display = "none";
  }

  function showGameOver() {
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = "none";
    dom.gameOver.style.display = "flex";
    if (dom.finalScore) {
      dom.finalScore.textContent = `Score: ${state.score} | Tempo: ${Math.floor(state.elapsed / 1000)}s`;
    }
  }

  function bind() {
    if (dom.playBtn) {
      dom.playBtn.addEventListener("click", () => {
        console.log("[SWARM] play button clicked", window.SWARM?.game);
        if (
          window.SWARM &&
          window.SWARM.game &&
          typeof window.SWARM.game.start === "function"
        ) {
          window.SWARM.game.start();
        } else {
          console.error(
            "[SWARM] game.start() unavailable, fallback to showGame",
          );
          showGame();
        }
      });
    }

    if (dom.restartBtn) {
      dom.restartBtn.addEventListener("click", () => {
        if (
          window.SWARM &&
          window.SWARM.game &&
          typeof window.SWARM.game.start === "function"
        ) {
          window.SWARM.game.start();
        } else {
          showGame();
        }
      });
    }

    if (dom.menuBtn) {
      dom.menuBtn.addEventListener("click", () => {
        showMenu();
      });
    }

    if (dom.enterMenuBtn) {
      dom.enterMenuBtn.addEventListener("click", () => {
        showMenu();
      });
    }

    if (dom.playerName) {
      dom.playerName.addEventListener("change", () => {
        window.SWARM.profile.load();
      });
    }

    setTimeout(() => {
      if (state.status === "welcome") {
        showMenu();
      }
    }, 7000);
  }

  function drawHud() {
    const { ctx, player, bossSystem } = window.SWARM;
    const seconds = Math.floor(state.elapsed / 1000);

    const boxX = 20;
    const boxY = 20;
    const boxWidth = 240;
    const boxHeight = 96;

    ctx.fillStyle = "rgba(10, 10, 10, 0.75)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#707070";
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = "#ffeded";
    ctx.font = "20px Impact, Arial";
    ctx.textBaseline = "top";
    ctx.fillText(`Kills: ${state.kills}`, boxX + 14, boxY + 12);
    ctx.fillText(`Tempo: ${seconds}s`, boxX + 14, boxY + 38);
    ctx.fillText(
      `Vida: ${player.health}/${player.maxHealth}`,
      boxX + 14,
      boxY + 64,
    );

    if (!bossSystem.active) return;

    const boss = bossSystem.active;
    const width = 300;
    const x = 20;
    const y = 140;

    ctx.fillStyle = "#7f1a1a";
    ctx.fillRect(x, y, width, 24);
    ctx.fillStyle = "#ff7b7b";
    ctx.fillRect(x, y, (boss.hp / boss.maxHp) * width, 24);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, 24);
    ctx.fillStyle = "white";
    ctx.font = "18px Impact, Arial";
  }

  window.SWARM.ui = {
    bind,
    showMenu,
    showWelcome,
    showGame,
    showGameOver,
    updateRecord,
    drawHud,
  };
})();
