/* =========================
   ELEMENTOS
========================= */

const menu = document.getElementById("menu");
const playBtn = document.getElementById("play-btn");
const gameOverScreen = document.getElementById("game-over");
const restartBtn = document.getElementById("restart-btn");
const finalScore = document.getElementById("final-score");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* =========================
   CONFIG
========================= */

const zoom = 1.5;
const bulletSpriteAngleOffset = Math.PI / 2;
const lastRunKey = "swarmLastRun";
const bestRunKey = "swarmBestRun";

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* =========================
   STATE
========================= */

let gameStarted = false;
let gameOver = false;

const maxHealth = 5;

let health = maxHealth;
let score = 0;
let startTime = 0;
let elapsedTime = 0;

let zombiesKilled = 0;
let nextBossAt = 30;

let boss = null;
let bossIntroActive = false;
let bossIntroUntil = 0;
let screenShakeUntil = 0;
let screenShakePower = 0;

/* =========================
   IMAGES
========================= */

const playerImg = new Image();
playerImg.src = "assets/soldier.png";

const enemyImg = new Image();
enemyImg.src = "assets/zombie.png";

const bulletImg = new Image();
bulletImg.src = "assets/bullet.webp";

/* =========================
   PLAYER
========================= */

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 70,
  height: 70,
  speed: 5,
  angle: 0
};

/* =========================
   ARRAYS
========================= */

const enemies = [];
const bullets = [];
const enemyProjectiles = [];

/* =========================
   INPUT
========================= */

const keys = {};
const mouse = { x: 0, y: 0 };

/* =========================
   EVENTS
========================= */

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

playBtn.addEventListener("click", () => {
  gameStarted = true;
  startTime = performance.now();
  elapsedTime = 0;
  menu.style.display = "none";
});

restartBtn.addEventListener("click", resetGame);

window.addEventListener("mousemove", e => {
  mouse.x = e.clientX / zoom;
  mouse.y = e.clientY / zoom;
});

window.addEventListener("click", shoot);

/* =========================
   SHOOT
========================= */

function shoot() {
  if (!gameStarted || gameOver) return;

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;

  const angle = Math.atan2(mouse.y - cy, mouse.x - cx);

  bullets.push({
    x: cx - 10,
    y: cy - 10,
    width: 20,
    height: 20,
    speed: 10,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    angle
  });
}

/* =========================
   PLAYER MOVE
========================= */

function movePlayer() {
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  const limitX = canvas.width / zoom - player.width;
  const limitY = canvas.height / zoom - player.height;

  player.x = Math.max(0, Math.min(player.x, limitX));
  player.y = Math.max(0, Math.min(player.y, limitY));

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  player.angle = Math.atan2(mouse.y - cy, mouse.x - cx);
}

/* =========================
   GAME STATE
========================= */

function endGame() {
  gameOver = true;
  elapsedTime = performance.now() - startTime;
  saveRun();
  finalScore.innerHTML = buildFinalScoreText();
  gameOverScreen.style.display = "flex";
}

function resetGame() {
  gameOver = false;
  gameStarted = true;
  health = maxHealth;
  score = 0;
  startTime = performance.now();
  elapsedTime = 0;
  zombiesKilled = 0;
  nextBossAt = 30;
  boss = null;
  bossIntroActive = false;
  bossIntroUntil = 0;
  screenShakeUntil = 0;
  screenShakePower = 0;

  player.x = canvas.width / zoom / 2 - player.width / 2;
  player.y = canvas.height / zoom / 2 - player.height / 2;
  player.angle = 0;

  enemies.length = 0;
  bullets.length = 0;
  enemyProjectiles.length = 0;

  menu.style.display = "none";
  gameOverScreen.style.display = "none";
}

function formatTime(timeMs) {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function saveRun() {
  const currentRun = {
    score,
    time: elapsedTime
  };

  localStorage.setItem(lastRunKey, JSON.stringify(currentRun));

  const bestRun = JSON.parse(localStorage.getItem(bestRunKey) || "null");
  const isBestRun = !bestRun || score > bestRun.score || (score === bestRun.score && elapsedTime > bestRun.time);

  if (isBestRun) {
    localStorage.setItem(bestRunKey, JSON.stringify(currentRun));
  }
}

function buildFinalScoreText() {
  const bestRun = JSON.parse(localStorage.getItem(bestRunKey) || "null");
  const bestText = bestRun ? `<br>Recorde: ${bestRun.score} | ${formatTime(bestRun.time)}` : "";

  return `Score: ${score}<br>Tempo: ${formatTime(elapsedTime)}${bestText}`;
}

/* =========================
   ENEMIES
========================= */

function spawnEnemy() {
  if (boss || bossIntroActive) return;

  const size = 60;

  const side = Math.floor(Math.random() * 4);

  let x, y;

  if (side === 0) { x = -size; y = Math.random() * canvas.height / zoom; }
  if (side === 1) { x = canvas.width / zoom + size; y = Math.random() * canvas.height / zoom; }
  if (side === 2) { x = Math.random() * canvas.width / zoom; y = -size; }
  if (side === 3) { x = Math.random() * canvas.width / zoom; y = canvas.height / zoom + size; }

  enemies.push({
    x, y,
    width: size,
    height: size,
    speed: 1.5 + Math.random() * 1.5
  });
}

function updateEnemies() {
  enemies.forEach(e => {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;
  });
}

/* =========================
   BULLETS
========================= */

function updateBullets() {
  bullets.forEach((b, i) => {
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;

    if (
      b.x < -100 ||
      b.x > canvas.width / zoom + 100 ||
      b.y < -100 ||
      b.y > canvas.height / zoom + 100
    ) {
      bullets.splice(i, 1);
    }
  });
}

function spawnEnemyWave() {
  const waveSize = Math.min(5, 2 + Math.floor(zombiesKilled / 20));

  for (let i = 0; i < waveSize; i++) {
    spawnEnemy();
  }
}

function updateEnemyProjectiles() {
  enemyProjectiles.forEach((p, i) => {
    p.x += p.dx * p.speed;
    p.y += p.dy * p.speed;

    if (
      p.x < -100 ||
      p.x > canvas.width / zoom + 100 ||
      p.y < -100 ||
      p.y > canvas.height / zoom + 100
    ) {
      enemyProjectiles.splice(i, 1);
    }
  });
}

/* =========================
   COLLISIONS
========================= */

function checkCollisions() {
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {

      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);

        score++;
        zombiesKilled++;

        spawnBossCheck();
      }
    });

    if (
      boss &&
      b.x < boss.x + boss.width &&
      b.x + b.width > boss.x &&
      b.y < boss.y + boss.height &&
      b.y + b.height > boss.y
    ) {
      bullets.splice(bi, 1);
      boss.hp--;

      if (boss.hp <= 0) endBossFight();
    }
  });

  enemies.forEach((e, ei) => {
    if (
      player.x < e.x + e.width &&
      player.x + player.width > e.x &&
      player.y < e.y + e.height &&
      player.y + player.height > e.y
    ) {
      enemies.splice(ei, 1);
      health--;

      if (health <= 0) endGame();
    }
  });

  enemyProjectiles.forEach((p, pi) => {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      enemyProjectiles.splice(pi, 1);
      health -= p.damage;

      if (health <= 0) endGame();
    }
  });
}

/* =========================
   BOSS SYSTEM (CLEAN)
========================= */

class BossZombie {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.hp = 50;
    this.maxHp = 50;
    this.speed = 2;

    this.damage = 2;
    this.width = 180;
    this.height = 180;
    this.meleeRange = 60;

    const spawnTime = performance.now();

    this.lastAttack = spawnTime;
    this.lastSpit = spawnTime;
    this.lastSummon = spawnTime;
    this.summoningUntil = 0;
    this.pendingSummon = false;
  }

  update(now) {
    if (this.summoningUntil > now) return;

    if (this.pendingSummon) {
      this.spawnSummonedZombies();
      this.pendingSummon = false;
    }

    const angle = this.angleToPlayer();

    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;

    this.melee(now);
    this.spit(now);
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  angleToPlayer() {
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;

    return Math.atan2(py - this.centerY, px - this.centerX);
  }

  melee(now) {
    if (now - this.lastAttack < 2000) return;

    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const dist = Math.hypot(px - this.centerX, py - this.centerY);

    if (dist < this.width / 2 + this.meleeRange) {
      health -= this.damage;
      this.lastAttack = now;

      if (health <= 0) endGame();
    }
  }

  spit(now) {
    if (now - this.lastSpit < 5000) return;

    const angle = this.angleToPlayer();

    enemyProjectiles.push({
      x: this.centerX - 12,
      y: this.centerY - 12,
      width: 24,
      height: 24,
      speed: 6,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      damage: 1
    });

    this.lastSpit = now;
  }

  summon(now) {
    if (now - this.lastSummon < 15000) return;

    this.lastSummon = now;
    this.summoningUntil = now + 1000;
    this.pendingSummon = true;
  }

  spawnSummonedZombies() {
    enemies.push({ x: this.x + this.width, y: this.y + this.height / 2, width: 60, height: 60, speed: 2 });
    enemies.push({ x: this.x - 60, y: this.y + this.height / 2, width: 60, height: 60, speed: 2 });
  }

  draw() {
    ctx.drawImage(
      enemyImg,
      this.x,
      this.y,
      this.width,
      this.height
    );

    const barWidth = this.width;
    const barHeight = 10;
    const hpPercent = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(this.x, this.y - 18, barWidth, barHeight);
    ctx.fillStyle = "#7cff5b";
    ctx.fillRect(this.x, this.y - 18, barWidth * hpPercent, barHeight);
  }
}

/* =========================
   BOSS SPAWN
========================= */

function spawnBossCheck() {
  if (zombiesKilled >= nextBossAt && !boss && !bossIntroActive) startBossIntro();
}

function startBossIntro() {
  bossIntroActive = true;
  bossIntroUntil = performance.now() + 2200;
  screenShakeUntil = bossIntroUntil;
  screenShakePower = 18;

  enemies.length = 0;
  enemyProjectiles.length = 0;
}

function spawnBoss() {
  const x = canvas.width / zoom / 2 - 90;
  const y = 80;

  boss = new BossZombie(x, y);
  bossIntroActive = false;
  screenShakePower = 0;
}

function endBossFight() {
  boss = null;
  score += 10;
  health = Math.min(maxHealth, health + getBossHealthReward());
  nextBossAt += 30;
}

function getBossHealthReward() {
  return Math.random() < 0.6 ? 2 : 3;
}

/* =========================
   DRAW HELPERS
========================= */

function drawRotatedImage(img, x, y, width, height, angle) {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(angle);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawHearts() {
  ctx.font = "30px Arial";

  for (let i = 0; i < maxHealth; i++) {
    ctx.fillStyle = i < health ? "#ff2b3d" : "rgba(255,255,255,0.18)";
    ctx.fillText("♥", 20 + i * 34, 96);
  }
}

function getScreenShake(now) {
  if (now > screenShakeUntil) return { x: 0, y: 0 };

  const remaining = (screenShakeUntil - now) / 2200;
  const power = screenShakePower * Math.max(0.25, remaining);

  return {
    x: (Math.random() - 0.5) * power,
    y: (Math.random() - 0.5) * power
  };
}

function drawBossIntro(now) {
  if (!bossIntroActive) return;

  const pulse = 1 + Math.sin(now / 80) * 0.08;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(pulse, pulse);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 86px Arial";
  ctx.fillStyle = "#ff1f2d";
  ctx.shadowColor = "rgba(255,31,45,0.8)";
  ctx.shadowBlur = 30;
  ctx.fillText("BOSS FIGHT", 0, 0);
  ctx.restore();
}

/* =========================
   DRAW
========================= */

function draw(now = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) return;

  const shake = getScreenShake(now);

  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.scale(zoom, zoom);

  drawRotatedImage(playerImg, player.x, player.y, player.width, player.height, player.angle);

  enemies.forEach(e => {
    ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height);
  });

  bullets.forEach(b => {
    drawRotatedImage(bulletImg, b.x, b.y, b.width, b.height, b.angle + bulletSpriteAngleOffset);
  });

  enemyProjectiles.forEach(p => {
    ctx.fillStyle = "#6cff38";
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  if (boss) boss.draw();

  ctx.restore();

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Tempo: ${formatTime(elapsedTime)}`, 20, 58);
  drawHearts();

  if (boss) {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Boss: ${boss.hp}/${boss.maxHp}`, 20, 130);
  }

  drawBossIntro(now);
}

/* =========================
   UPDATE LOOP
========================= */

function update(now) {
  elapsedTime = now - startTime;

  movePlayer();
  updateEnemies();
  updateBullets();
  updateEnemyProjectiles();
  checkCollisions();

  if (bossIntroActive && now >= bossIntroUntil) spawnBoss();
  if (boss) boss.update(now);
}

/* =========================
   LOOP
========================= */

function animate(now = 0) {
  if (gameStarted && !gameOver) update(now);

  draw(now);
  requestAnimationFrame(animate);
}

/* =========================
   SPAWN
========================= */

setInterval(() => {
  if (gameStarted && !gameOver) spawnEnemyWave();
}, 650);

/* =========================
   START
========================= */

animate();
