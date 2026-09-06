(function () {
  "use strict";

  const { canvas, dom, state, config } = window.SWARM;

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

  function showGameOver(options = {}) {
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = "none";
    dom.gameOver.style.display = "flex";
    const title = dom.gameOver?.querySelector("h2");
    if (title)
      title.textContent = options.victory ? "BOSS RUSH CONCLUÍDO" : "GAME OVER";
    if (dom.finalScore) {
      dom.finalScore.textContent = `${options.victory ? "Vitória" : "Score"}: ${state.score} | Tempo: ${Math.floor(state.elapsed / 1000)}s`;
    }
  }
  function showModeSelector() {
    const modeSelector = document.getElementById("mode-selector");
    const profile = window.SWARM.profile.data || {};
    const bossRushBtn = document.getElementById("boss-rush-btn");
    const bossRushCost = document.getElementById("boss-rush-cost");

    if (!modeSelector) return;

    const bossRush = config.profile.gameModes.boss_rush;
    const unlocked = profile.modes_unlocked?.includes("boss_rush");
    const canEnterBossRush = unlocked || profile.coins >= bossRush.cost;

    if (bossRushBtn) {
      bossRushBtn.disabled = !canEnterBossRush;
      if (bossRushCost) {
        bossRushCost.textContent = unlocked
          ? "Desbloqueado"
          : canEnterBossRush
            ? `${bossRush.cost} moedas para desbloquear`
            : `Sem moedas (custa ${bossRush.cost})`;
      }
    }

    modeSelector.classList.add("open");
  }

  function hideModeSelector() {
    const modeSelector = document.getElementById("mode-selector");
    if (modeSelector) modeSelector.classList.remove("open");
  }

  async function consumeBossRushEntry() {
    const profile = window.SWARM.profile.data;
    const bossRush = config.profile.gameModes.boss_rush;
    if (profile.modes_unlocked?.includes("boss_rush")) return true;

    if (profile.coins < bossRush.cost) {
      window.SWARM.shop.setMessage(
        `Você precisa de ${bossRush.cost} moedas para desbloquear o Boss Rush.`,
      );
      return false;
    }

    profile.coins -= bossRush.cost;
    profile.modes_unlocked = Array.from(
      new Set(["survival", ...(profile.modes_unlocked || []), "boss_rush"]),
    );

    window.SWARM.shop.render();
    window.SWARM.profile.save().catch(() => {
      window.SWARM.shop.setMessage("Entrada salva localmente.");
    });
    return true;
  }

  function bind() {
    if (dom.playBtn) {
      dom.playBtn.addEventListener("click", () => {
        showModeSelector();
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

    // Mode selector
    const modeCards = document.querySelectorAll(".mode-card");
    modeCards.forEach((card) => {
      card.addEventListener("click", async () => {
        if (card.disabled) {
          window.SWARM.shop.setMessage("Boss Rush indisponível no momento.");
          return;
        }

        const mode = card.dataset.mode;
        if (mode === "boss_rush" && !(await consumeBossRushEntry())) return;
        window.SWARM.selection = { mode };
        hideModeSelector();

        if (
          window.SWARM &&
          window.SWARM.game &&
          typeof window.SWARM.game.start === "function"
        ) {
          window.SWARM.game.start();
        }
      });
    });

    const modeCancelBtn = document.getElementById("mode-cancel-btn");
    if (modeCancelBtn) {
      modeCancelBtn.addEventListener("click", hideModeSelector);
    }
  }

  function drawHud() {
    const { ctx, player, bossSystem } = window.SWARM;
    const seconds = Math.floor(state.elapsed / 1000);

    const boxX = 20;
    const boxY = 20;
    const boxWidth = 240;
    const boxHeight = 122;

    ctx.fillStyle = "rgba(10, 10, 10, 0.75)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#707070";
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = "#ffeded";
    ctx.font = "20px Impact, Arial";
    ctx.textBaseline = "top";
    ctx.fillText(`Kills: ${state.kills}`, boxX + 14, boxY + 12);
    ctx.fillText(`Score: ${state.score}`, boxX + 14, boxY + 38);
    ctx.fillText(`Tempo: ${seconds}s`, boxX + 14, boxY + 64);
    ctx.fillText(
      `Vida: ${player.health}/${player.maxHealth}`,
      boxX + 14,
      boxY + 90,
    );

    if (state.mode === "boss_rush" && state.bossRush) {
      ctx.fillStyle = "#ffd36d";
      ctx.font = "bold 15px Arial";
      ctx.fillText(
        `BOSS RUSH ${Math.min(state.bossRush.current + 1, state.bossRush.total)}/${state.bossRush.total}`,
        boxX + 14,
        boxY + 114,
      );
    }

    if (!bossSystem.active) return;

    const boss = bossSystem.active;
    const width = Math.min(820, canvas.width - 24);
    const height = 42;
    const x = (canvas.width - width) / 2;
    const y = 10;
    const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    const isFury = Boolean(boss.fury);
    const fillColor = isFury ? "#ff4fd8" : "#a66cff";
    const fillHighlight = isFury ? "#ffb1f0" : "#d7bdff";

    ctx.save();
    ctx.shadowColor = isFury
      ? "rgba(255, 79, 216, 0.75)"
      : "rgba(139, 77, 255, 0.65)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(12, 8, 22, 0.94)";
    ctx.fillRect(x, y, width, height);
    ctx.shadowBlur = 0;

    const inset = 5;
    const trackX = x + inset;
    const trackY = y + inset;
    const trackWidth = width - inset * 2;
    const trackHeight = height - inset * 2;

    ctx.fillStyle = "rgba(4, 3, 10, 0.92)";
    ctx.fillRect(trackX, trackY, trackWidth, trackHeight);

    if (ratio > 0) {
      const fillGradient = ctx.createLinearGradient(
        trackX,
        trackY,
        trackX,
        trackY + trackHeight,
      );
      fillGradient.addColorStop(0, fillHighlight);
      fillGradient.addColorStop(0.35, fillColor);
      fillGradient.addColorStop(1, isFury ? "#a9169e" : "#5b2bb8");
      ctx.fillStyle = fillGradient;
      ctx.fillRect(trackX, trackY, trackWidth * ratio, trackHeight);
    }

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let segment = 1; segment < 10; segment += 1) {
      const segmentX = trackX + (trackWidth * segment) / 10;
      ctx.beginPath();
      ctx.moveTo(segmentX, trackY);
      ctx.lineTo(segmentX, trackY + trackHeight);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = isFury ? "#ff8be7" : "#cdb4ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX, trackY, trackWidth, trackHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `BOSS  ${Math.ceil(boss.hp)} / ${boss.maxHp} HP${isFury ? "  // FURIA" : ""}`,
      canvas.width / 2,
      y + height / 2 + 1,
    );
    ctx.textAlign = "start";
    ctx.restore();
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
