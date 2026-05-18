(function () {
  "use strict";

  const progression = {
    level: 1,
    xp: 0,
    nextLevelXp: 10,

    reset() {
      this.level = 1;
      this.xp = 0;
      this.nextLevelXp = 10;
    },

    gainXP(amount) {
      this.xp += amount;

      while (this.xp >= this.nextLevelXp) {
        this.xp -= this.nextLevelXp;
        this.level += 1;
        this.nextLevelXp += 5;
      }
    },

    draw() {
      const { ctx, config } = window.SWARM;
      const width = config.hud.xpWidth;
      const height = config.hud.xpHeight;
      const x = config.hud.padding;
      const y = config.hud.padding;
      const progress = this.nextLevelXp > 0 ? this.xp / this.nextLevelXp : 0;

      ctx.fillStyle = "#222";
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = "#7cff5b";
      ctx.fillRect(x, y, progress * width, height);
      ctx.strokeStyle = "white";
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(`LEVEL ${this.level}`, x, y + 40);
    }
  };

  window.SWARM.progression = progression;
})();
