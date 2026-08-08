// systems/devmode.js
// Ferramentas exclusivas para desenvolvimento/testes do SWARM.

const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";

const DevMode = {
  enabled: DEV_MODE,

  commands: {},

  register(name, callback) {
    if (typeof callback !== "function") {
      console.warn(`[DEV] Comando inválido: ${name}`);
      return;
    }

    this.commands[name] = callback;
  },

  run(name, ...args) {
    if (!this.enabled) {
      console.warn("[DEV] Dev Mode não está ativado.");
      return;
    }

    const command = this.commands[name];

    if (!command) {
      console.warn(`[DEV] Comando não encontrado: ${name}`);
      return;
    }

    try {
      return command(...args);
    } catch (error) {
      console.error(`[DEV] Erro no comando "${name}":`, error);
    }
  },

  log(message) {
    if (this.enabled) {
      console.log(`[SWARM DEV] ${message}`);
    }
  },

  init() {
    if (!this.enabled) return;

    console.log(
      "%c SWARM DEV MODE ATIVADO ",
      "background:#111;color:#00ff88;font-weight:bold;padding:4px 8px;",
    );

    this.createPanel();
    this.registerDefaultCommands();
  },

  registerDefaultCommands() {
    // Essas funções serão conectadas aos sistemas do jogo.
    this.register("heal", () => {
      if (window.SWARM?.player?.heal) {
        window.SWARM.player.heal();
      }
    });

    this.register("fullHealth", () => {
      if (window.SWARM?.player?.fullHealth) {
        window.SWARM.player.fullHealth();
      }
    });

    this.register("addCoins", (amount = 1000) => {
      if (window.SWARM?.player?.addCoins) {
        window.SWARM.player.addCoins(amount);
      }
    });

    this.register("godMode", () => {
      if (window.SWARM?.player) {
        window.SWARM.player.godMode = !window.SWARM.player.godMode;

        console.log(
          `[DEV] God Mode: ${window.SWARM.player.godMode ? "ON" : "OFF"}`,
        );
      }
    });

    this.register("killEnemies", () => {
      if (window.SWARM?.enemies?.killAll) {
        window.SWARM.enemies.killAll();
      }
    });

    this.register("save", () => {
      if (window.SWARM?.save?.save) {
        window.SWARM.save.save();
      }
    });

    this.register("resetSave", () => {
      if (window.SWARM?.save?.reset) {
        window.SWARM.save.reset();
      }
    });
  },

  createPanel() {
    const panel = document.createElement("div");

    panel.id = "swarm-dev-panel";

    panel.innerHTML = `
            <div class="dev-title">SWARM DEV MODE</div>

            <button data-command="fullHealth">
                ❤️ Vida máxima
            </button>

            <button data-command="addCoins">
                🪙 +1000 moedas
            </button>

            <button data-command="godMode">
                🛡️ God Mode
            </button>

            <button data-command="killEnemies">
                💀 Matar inimigos
            </button>

            <button data-command="save">
                💾 Salvar
            </button>

            <button data-command="resetSave">
                ⚠️ Resetar save
            </button>
        `;

    Object.assign(panel.style, {
      position: "fixed",
      top: "15px",
      right: "15px",
      zIndex: "999999",
      background: "#111",
      color: "#fff",
      padding: "12px",
      borderRadius: "10px",
      border: "1px solid #333",
      fontFamily: "Arial, sans-serif",
      width: "190px",
      boxShadow: "0 5px 25px rgba(0,0,0,.5)",
    });

    panel.querySelectorAll("button").forEach((button) => {
      Object.assign(button.style, {
        display: "block",
        width: "100%",
        marginTop: "7px",
        padding: "7px",
        cursor: "pointer",
        background: "#222",
        color: "#fff",
        border: "1px solid #444",
        borderRadius: "6px",
      });

      button.addEventListener("click", () => {
        const command = button.dataset.command;
        this.run(command);
      });
    });

    document.body.appendChild(panel);
  },
};

window.DevMode = DevMode;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    DevMode.init();
  });
} else {
  DevMode.init();
}
