(function () {
  "use strict";

  /**
   * NPC: Diálogos contextuais
   * - Fade in/out: 3 segundos
   * - Posição: topo da tela
   * - Eventos: parry, bossDefeated, gameOver, newRecord, etc
   */
  class NPC {
    constructor(options = {}) {
      this.canvas = options.canvas;
      this.ctx = options.ctx;
      this.duration = options.duration || 3000;

      this.currentMessage = null;
      this.messageTime = 0;
      this.messageMaxTime = 0;

      this.dialogues = {
        parry: [
          "Defesa perfeita!",
          "Que reflexos!",
          "Excelente timing!",
          "Bloqueado com sucesso!",
        ],
        bossDefeated: [
          "Boss derrotado!",
          "Vitória!",
          "Você venceu!",
          "Parabéns!",
        ],
        gameOver: [
          "Você foi derrotado...",
          "Game Over",
          "Tente novamente",
          "Fim de jogo",
        ],
        newRecord: [
          "Novo recorde!",
          "Parabéns! Recorde batido!",
          "Você é o melhor!",
          "Recorde pessoal!",
        ],
        characterUnlocked: [
          "Novo personagem desbloqueado!",
          "Personagem disponível!",
          "Você desbloqueou um novo herói!",
        ],
        modeUnlocked: [
          "Novo modo desbloqueado!",
          "Modo disponível!",
          "Você desbloqueou um novo desafio!",
        ],
      };
    }

    clear() {
      this.currentMessage = null;
      this.messageTime = 0;
    }

    say(event) {
      const messages = this.dialogues[event];
      if (!messages || messages.length === 0) return;

      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      this.currentMessage = randomMessage;
      this.messageTime = 0;
      this.messageMaxTime = this.duration / 1000;
    }

    show(event) {
      this.say(event);
    }

    trigger(event) {
      this.say(event);
    }

    update(dt, now) {
      if (!this.currentMessage) return;

      this.messageTime += dt;

      if (this.messageTime >= this.messageMaxTime) {
        this.currentMessage = null;
      }
    }

    draw(ctx) {
      if (!this.currentMessage) return;

      const progress = this.messageTime / this.messageMaxTime;
      let alpha =
        progress < 0.15
          ? progress / 0.15
          : progress > 0.85
            ? (1 - progress) / 0.15
            : 1;
      alpha = Math.max(0, Math.min(1, alpha));

      const boxWidth = 320;
      const boxHeight = 70;
      const boxX = (this.canvas.width - boxWidth) / 2;
      const boxY = 40;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Fundo da caixa
      ctx.fillStyle = "rgba(13, 15, 17, 0.95)";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      // Borda dourada
      ctx.strokeStyle = "#e2b65f";
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Sombra
      ctx.shadowColor = "rgba(226, 182, 95, 0.4)";
      ctx.shadowBlur = 16;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Texto
      ctx.fillStyle = "#ffd36d";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        this.currentMessage,
        boxX + boxWidth / 2,
        boxY + boxHeight / 2,
      );

      ctx.restore();
    }
  }

  window.SWARM = window.SWARM || {};
  window.SWARM.NPC = NPC;
})();
