(function () {
  "use strict";

  const { config, dom } = window.SWARM;

  function getProfile() {
    return window.SWARM.profile.data;
  }

  function setMessage(message) {
    if (dom.shopMessage) dom.shopMessage.textContent = message;
  }

  function canSpend(cost) {
    return getProfile().coins >= cost;
  }

  function buyUpgrade(upgrade) {
    const profile = getProfile();
    const max = config.profile.upgradeMax[upgrade];
    const cost = config.profile.upgradeCost[upgrade];

    if (profile.upgrades[upgrade] >= max) {
      setMessage("Upgrade ja esta no nivel maximo.");
      return;
    }

    if (!canSpend(cost)) {
      setMessage("Moedas insuficientes.");
      return;
    }

    profile.coins -= cost;
    profile.upgrades[upgrade] += 1;
    window.SWARM.profile.save();
    render();
    setMessage("Upgrade comprado.");
  }

  function buyOrEquipWeapon(weaponId) {
    const profile = getProfile();
    const weapon = config.profile.weapons[weaponId];
    if (!weapon) return;

    if (!profile.weapons.includes(weaponId)) {
      if (!canSpend(weapon.cost)) {
        setMessage("Moedas insuficientes.");
        return;
      }

      profile.coins -= weapon.cost;
      profile.weapons.push(weaponId);
      setMessage(`${weapon.name} comprado.`);
    } else {
      setMessage(`${weapon.name} equipado.`);
    }

    profile.equipped_weapon = weaponId;
    window.SWARM.profile.save();
    render();
  }

  function render() {
    const profile = getProfile();

    if (dom.coinCount) dom.coinCount.textContent = String(profile.coins);
    if (dom.speedLevel) dom.speedLevel.textContent = `${profile.upgrades.speed}/${config.profile.upgradeMax.speed}`;
    if (dom.healthLevel) dom.healthLevel.textContent = `${profile.upgrades.health}/${config.profile.upgradeMax.health}`;
    if (dom.luckLevel) dom.luckLevel.textContent = `${profile.upgrades.luck}%`;

    dom.weaponCards.forEach(card => {
      const weaponId = card.dataset.weapon;
      const owned = profile.weapons.includes(weaponId);
      card.classList.toggle("owned", owned);
      card.classList.toggle("equipped", profile.equipped_weapon === weaponId);
    });
  }

  function bind() {
    if (dom.shopToggle && dom.shopPanel && dom.mainMenu) {
      dom.shopToggle.addEventListener("click", () => {
        dom.shopPanel.classList.add("open");
        dom.mainMenu.classList.add("shop-mode");
      });
    }

    if (dom.shopClose && dom.shopPanel && dom.mainMenu) {
      dom.shopClose.addEventListener("click", () => {
        dom.shopPanel.classList.remove("open");
        dom.mainMenu.classList.remove("shop-mode");
      });
    }

    dom.upgradeCards.forEach(card => {
      card.addEventListener("click", () => buyUpgrade(card.dataset.upgrade));
    });

    dom.weaponCards.forEach(card => {
      card.addEventListener("click", () => buyOrEquipWeapon(card.dataset.weapon));
    });
  }

  window.SWARM.shop = {
    bind,
    render,
    setMessage
  };
})();
