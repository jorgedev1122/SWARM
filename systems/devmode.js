(function () {
  "use strict";

  const systems = window.SWARM;

  const params = new URLSearchParams(window.location.search);
  const enabled = params.get("dev") === "1";

  if (!enabled) return;

  const DevMode = {
    enabled: true,

    init() {
      console.log(
        "%c SWARM DEV MODE ATIVADO ",
        "background:#111;color:#00ff88;font-weight:bold;padding:6px 10px;border-radius:4px;",
      );

      this.createPanel();
      this.bindShortcuts();
    },

    addCoins(amount) {
      const profile = systems.profile.data;

      profile.coins += Number(amount);
      systems.profile.save();
      systems.shop.render();

      this.log(`+${amount} moedas. Total: ${profile.coins}`);
    },

    setCoins(amount) {
      const profile = systems.profile.data;

      profile.coins = Math.max(0, Number(amount));
      systems.profile.save();
      systems.shop.render();

      this.log(`Moedas definidas para ${profile.coins}`);
    },

    fullHealth() {
      systems.player.health = systems.player.maxHealth;

      this.log(
        `Vida restaurada: ${systems.player.health}/${systems.player.maxHealth}`,
      );
    },

    damagePlayer(amount = 10) {
      systems.playerSystem.damage(Number(amount));

      this.log(`Jogador recebeu ${amount} de dano.`);
    },

    toggleGodMode() {
      systems.player.devGodMode = !systems.player.devGodMode;

      this.log(
        `God Mode: ${systems.player.devGodMode ? "ATIVADO" : "DESATIVADO"}`,
      );

      this.updatePanel();
    },

    unlockWeapons() {
      const profile = systems.profile.data;
      const weapons = systems.config.profile.weapons;

      Object.keys(weapons).forEach((weaponId) => {
        if (!profile.weapons.includes(weaponId)) {
          profile.weapons.push(weaponId);
        }
      });

      systems.profile.save();
      systems.shop.render();

      this.log("Todas as armas foram desbloqueadas.");
    },

    maxUpgrades() {
      const profile = systems.profile.data;
      const max = systems.config.profile.upgradeMax;

      Object.keys(max).forEach((upgrade) => {
        profile.upgrades[upgrade] = max[upgrade];
      });

      systems.profile.save();
      systems.shop.render();

      // Reaplica os atributos do jogador imediatamente.
      systems.playerSystem.applyProfile(profile);

      this.log("Todos os upgrades foram maximizados.");
    },

    resetProfile() {
      const confirmed = window.confirm(
        "ATENÇÃO: isso vai zerar o perfil do SWARM. Continuar?",
      );

      if (!confirmed) return;

      systems.profile.data = {
        coins: 0,
        upgrades: {
          speed: 0,
          health: 0,
          luck: 0,
        },
        weapons: ["default"],
        equipped_weapon: "default",
        level: 0,
      };

      localStorage.removeItem("swarm-profile");

      systems.profile.save();
      systems.shop.render();
      systems.playerSystem.applyProfile(systems.profile.data);

      this.log("Perfil resetado.");
    },

    save() {
      systems.profile.save();
      this.log("Perfil salvo.");
    },

    updatePanel() {
      const status = document.getElementById("swarm-dev-status");

      if (!status) return;

      status.textContent = systems.player.devGodMode
        ? "🛡️ God Mode: ON"
        : "🛡️ God Mode: OFF";
    },

    log(message) {
      console.log(`[SWARM DEV] ${message}`);
    },

    createButton(text, callback) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = text;

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        callback();
      });

      Object.assign(button.style, {
        width: "100%",
        marginTop: "6px",
        padding: "7px",
        background: "#222",
        color: "#fff",
        border: "1px solid #444",
        borderRadius: "6px",
        cursor: "pointer",
      });

      return button;
    },

    createPanel() {
      const panel = document.createElement("div");

      panel.id = "swarm-dev-panel";

      Object.assign(panel.style, {
        position: "fixed",
        top: "15px",
        right: "15px",
        zIndex: "999999",
        width: "220px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "12px",
        background: "#111",
        color: "#fff",
        border: "1px solid #444",
        borderRadius: "10px",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 10px 30px rgba(0,0,0,.5)",
      });

      const title = document.createElement("div");

      title.textContent = "⚙️ SWARM DEV MODE";

      Object.assign(title.style, {
        fontWeight: "bold",
        marginBottom: "8px",
        color: "#00ff88",
      });

      panel.appendChild(title);

      const status = document.createElement("div");

      status.id = "swarm-dev-status";
      status.textContent = "🛡️ God Mode: OFF";

      Object.assign(status.style, {
        fontSize: "12px",
        marginBottom: "8px",
        opacity: "0.8",
      });

      panel.appendChild(status);

      panel.appendChild(
        this.createButton("🪙 +1.000 moedas", () => this.addCoins(1000)),
      );

      panel.appendChild(
        this.createButton("🪙 +100.000 moedas", () => this.addCoins(100000)),
      );

      panel.appendChild(
        this.createButton("💰 1.000.000 moedas", () => this.setCoins(1000000)),
      );

      panel.appendChild(
        this.createButton("❤️ Vida máxima", () => this.fullHealth()),
      );

      panel.appendChild(
        this.createButton("🛡️ God Mode", () => this.toggleGodMode()),
      );

      panel.appendChild(
        this.createButton("🔓 Desbloquear armas", () => this.unlockWeapons()),
      );

      panel.appendChild(
        this.createButton("⬆️ Max upgrades", () => this.maxUpgrades()),
      );

      panel.appendChild(
        this.createButton("💾 Salvar perfil", () => this.save()),
      );

      panel.appendChild(
        this.createButton("🗑️ Resetar perfil", () => this.resetProfile()),
      );

      document.body.appendChild(panel);
    },

    bindShortcuts() {
      window.addEventListener("keydown", (event) => {
        if (event.key === "F2") {
          const panel = document.getElementById("swarm-dev-panel");

          if (panel) {
            panel.style.display =
              panel.style.display === "none" ? "block" : "none";
          }
        }
      });
    },
  };

  systems.devMode = DevMode;

  // Espera o DOM e os sistemas estarem prontos.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      DevMode.init();
    });
  } else {
    DevMode.init();
  }
})();
