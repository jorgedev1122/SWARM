(function () {
  "use strict";

  const { config, dom } = window.SWARM;
  const storageKey = "swarm-profile";

  function defaultProfile() {
    return {
      coins: 0,
      upgrades: {
        speed: 0,
        health: 0,
        luck: 0
      },
      weapons: ["default"],
      equipped_weapon: "default"
    };
  }

  function normalize(raw) {
    const profile = Object.assign(defaultProfile(), raw || {});
    profile.upgrades = Object.assign(defaultProfile().upgrades, profile.upgrades || {});
    profile.weapons = Array.from(new Set(["default"].concat(profile.weapons || [])));

    Object.keys(config.profile.upgradeMax).forEach(key => {
      const max = config.profile.upgradeMax[key];
      profile.upgrades[key] = window.SWARM.utils.clamp(Number(profile.upgrades[key] || 0), 0, max);
    });

    profile.coins = Math.max(0, Number(profile.coins || 0));

    if (!profile.weapons.includes(profile.equipped_weapon)) {
      profile.equipped_weapon = "default";
    }

    return profile;
  }

  function playerName() {
    return " ".concat(dom.playerName.value || "Jogador").trim().slice(0, 24) || "Jogador";
  }

  const profile = {
    data: defaultProfile(),
    record: null,

    async load() {
      const player = playerName();

      try {
        const data = await window.SWARM.save.getJson(`/api/profile?player=${encodeURIComponent(player)}`);
        this.data = normalize(data.profile);
        this.record = data.record || null;
      } catch (error) {
        const stored = localStorage.getItem(storageKey);
        this.data = normalize(stored ? JSON.parse(stored) : null);
        this.record = null;
      }

      localStorage.setItem(storageKey, JSON.stringify(this.data));
      window.SWARM.shop.render();
      window.SWARM.ui.updateRecord(this.record);
    },

    async save() {
      const player = playerName();
      this.data = normalize(this.data);
      localStorage.setItem(storageKey, JSON.stringify(this.data));

      try {
        await window.SWARM.save.postJson("/api/profile", {
          player,
          profile: this.data
        });
      } catch (error) {
        window.SWARM.shop.setMessage("Perfil salvo localmente.");
      }
    },

    async saveRun() {
      const player = playerName();
      const earnedCoins = Math.floor(window.SWARM.state.score / 100) * 3;
      this.data.coins += earnedCoins;
      this.data = normalize(this.data);

      try {
        const data = await window.SWARM.save.postJson("/api/score", {
          player,
          score: window.SWARM.state.score,
          time_ms: Math.floor(window.SWARM.state.elapsed)
        });

        this.record = data.record || this.record;
        if (data.profile) this.data = normalize(data.profile);
      } catch (error) {
        localStorage.setItem(storageKey, JSON.stringify(this.data));
      }

      window.SWARM.shop.render();
      window.SWARM.ui.updateRecord(this.record);
    }
  };

  window.SWARM.profile = profile;
})();
