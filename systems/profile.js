(function () {
  "use strict";

  const { config, dom } = window.SWARM;
  const storageKey = "swarm-profile";

  // ✅ Definir window.SWARM.save UMA VEZ no início
  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GET ${url} failed`);
    return response.json();
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`POST ${url} failed`);
    return response.json();
  }

  window.SWARM.save = { getJson, postJson };

  function defaultProfile() {
    return {
      coins: 0,
      upgrades: { speed: 0, health: 0, luck: 0 },
      weapons: ["default"],
      equipped_weapon: "default",
      characters: ["player_default"],
      equipped_character: "player_default",
      modes_unlocked: ["survival"],
    };
  }

  window.DEBUG_PROFILE = true;

  function normalize(raw) {
    const profile = Object.assign(defaultProfile(), raw || {});
    profile.upgrades = Object.assign(
      defaultProfile().upgrades,
      profile.upgrades || {},
    );
    profile.weapons = Array.from(
      new Set(["default"].concat(profile.weapons || [])),
    );
    profile.characters = Array.from(
      new Set(["player_default"].concat(profile.characters || [])),
    );
    profile.modes_unlocked = Array.from(
      new Set(["survival"].concat(profile.modes_unlocked || [])),
    );

    Object.keys(config.profile.upgradeMax).forEach((key) => {
      const max = config.profile.upgradeMax[key];
      profile.upgrades[key] = window.SWARM.utils.clamp(
        Number(profile.upgrades[key] || 0),
        0,
        max,
      );
    });

    profile.coins = Math.max(0, Number(profile.coins || 0));
    profile.level = Math.max(0, Number(profile.level || 0));
    if (!profile.weapons.includes(profile.equipped_weapon)) {
      profile.equipped_weapon = "default";
    }

    if (!profile.characters.includes(profile.equipped_character)) {
      profile.equipped_character = "player_default";
    }

    return profile;
  }

  function playerName() {
    return (
      " "
        .concat(dom.playerName.value || "Jogador")
        .trim()
        .slice(0, 24) || "Jogador"
    );
  }

  const profile = {
    data: defaultProfile(),
    record: null,

    async load() {
      const player = playerName();

      if (window.DEBUG_PROFILE) {
        console.log("=== CARREGANDO PERFIL ===");
        console.log("Jogador:", player);
      }

      try {
        const data = await window.SWARM.save.getJson(
          `/api/profile?player=${encodeURIComponent(player)}`,
        );
        this.data = normalize(data.profile);
        this.record = data.record || null;
        if (window.DEBUG_PROFILE) {
          console.log("Perfil carregado da API:", this.data);
        }
      } catch (error) {
        if (window.DEBUG_PROFILE) {
          console.log("Erro ao carregar API, usando localStorage");
        }
        const stored = localStorage.getItem(storageKey);
        const parsed = stored ? JSON.parse(stored) : null;
        if (window.DEBUG_PROFILE) {
          console.log("localStorage atual:", parsed);
        }
        this.data = normalize(parsed);
        this.record = null;
      }

      localStorage.setItem(storageKey, JSON.stringify(this.data));
      if (window.DEBUG_PROFILE) {
        console.log("Perfil final em memory:", this.data);
      }
      window.SWARM.shop.render();
      window.SWARM.ui.updateRecord(this.record);
    },

    async save() {
      const player = playerName();
      this.data = normalize(this.data);
      localStorage.setItem(storageKey, JSON.stringify(this.data));

      if (window.DEBUG_PROFILE) {
        console.log("Salvando perfil no localStorage:", this.data);
      }

      try {
        const saved = await window.SWARM.save.postJson("/api/profile", {
          player,
          profile: this.data,
        });
        if (saved.profile) this.data = normalize(saved.profile);
      } catch (error) {
        if (window.DEBUG_PROFILE) {
          console.error("Erro ao salvar perfil na API:", error);
        }
        window.SWARM.shop.setMessage("Perfil salvo localmente.");
      }
    },

    async saveRun() {
      const player = playerName();
      const currentLevel = window.SWARM.progression.level;
      const earnedCoins = Math.floor(window.SWARM.state.score / 100) * 3;
      const bossRushReward = Number(window.SWARM.state.bossRushReward || 0);

      if (window.DEBUG_PROFILE) {
        console.log("=== SALVANDO PARTIDA ===");
        console.log("Jogador:", player);
        console.log("Score:", window.SWARM.state.score);
        console.log("Moedas a ganhar:", earnedCoins);
        console.log("Level alcançado:", currentLevel);
        console.log("Moedas antes:", this.data.coins);
      }

      this.data.coins += earnedCoins + bossRushReward;
      this.data.level = Math.max(this.data.level, currentLevel);

      if (window.DEBUG_PROFILE) {
        console.log("Moedas depois:", this.data.coins);
      }

      this.data = normalize(this.data);
      localStorage.setItem(storageKey, JSON.stringify(this.data));

      if (window.DEBUG_PROFILE) {
        const saved = localStorage.getItem(storageKey);
        console.log("Salvo no localStorage:", JSON.parse(saved));
      }

      await this.save();

      let savedRecord = false;
      try {
        const data = await window.SWARM.save.postJson("/api/score", {
          player,
          score: window.SWARM.state.score,
          time_ms: Math.floor(window.SWARM.state.elapsed),
          level: currentLevel,
        });

        savedRecord = Boolean(data.saved);
        this.record = data.record || this.record;
        if (data.profile) this.data = normalize(data.profile);
      } catch (error) {
        if (window.DEBUG_PROFILE) {
          console.error("Erro ao salvar na API:", error);
        }
      }

      window.SWARM.shop.render();
      window.SWARM.ui.updateRecord(this.record);
      return { saved: savedRecord, record: this.record };
    },

    getPlayerName: playerName,
  };

  window.SWARM.profile = profile;
})();
