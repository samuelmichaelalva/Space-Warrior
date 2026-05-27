const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const sessionBestEl = document.getElementById("sessionBest");
const topScoreEl = document.getElementById("topScore");
const healthEl = document.getElementById("health");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const topScoreKey = "space-warrior-top-score";

let sessionBest = 0;
let topScore = Number(localStorage.getItem(topScoreKey) || 0);
let state = "menu";
let lastTime = 0;
let player;
let bullets;
let enemyBullets;
let enemies;
let particles;
let stars;
let score;
let normalKills;
let spawnTimer;
let shootTimer;
let bossActive;

function resetGame() {
  player = {
    x: W / 2,
    y: H - 86,
    w: 54,
    h: 62,
    hp: 100,
    maxHp: 100,
    fireDelay: 185,
    speed: 330
  };
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  stars = makeStars();
  score = 0;
  normalKills = 0;
  spawnTimer = 600;
  shootTimer = 0;
  bossActive = false;
  updateHud();
}

function makeStars() {
  return Array.from({ length: 92 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() > 0.82 ? 3 : 2,
    speed: 35 + Math.random() * 110,
    color: Math.random() > 0.72 ? "#125e67" : "#1d343c"
  }));
}

function startGame() {
  resetGame();
  state = "playing";
  startOverlay.classList.remove("is-visible");
  gameOverOverlay.classList.remove("is-visible");
}

function gameOver() {
  state = "over";
  finalScoreEl.textContent = score;
  sessionBest = Math.max(sessionBest, score);
  if (score > topScore) {
    topScore = score;
    localStorage.setItem(topScoreKey, String(topScore));
  }
  updateHud();
  gameOverOverlay.classList.add("is-visible");
}

function updateHud() {
  scoreEl.textContent = score;
  sessionBestEl.textContent = sessionBest;
  topScoreEl.textContent = topScore;
  healthEl.textContent = Math.max(0, Math.ceil(player?.hp || 0));
}

function spawnEnemy(forceBoss = false) {
  if (forceBoss || (!bossActive && normalKills > 0 && normalKills % 15 === 0)) {
    bossActive = true;
    enemies.push({
      type: "boss",
      x: W / 2,
      y: -70,
      w: 96,
      h: 62,
      hp: 12,
      maxHp: 12,
      speed: 58,
      fireTimer: 450,
      drift: Math.random() * Math.PI * 2
    });
    return;
  }

  enemies.push({
    type: "normal",
    x: 40 + Math.random() * (W - 80),
    y: -48,
    w: 62,
    h: 38,
    hp: 3,
    maxHp: 3,
    speed: 78 + Math.random() * 55,
    fireTimer: 900 + Math.random() * 1100,
    drift: Math.random() * Math.PI * 2
  });
}

function shootPlayer() {
  bullets.push({ x: player.x - 13, y: player.y - 40, r: 4, damage: 1, vy: -520 });
  bullets.push({ x: player.x + 13, y: player.y - 40, r: 4, damage: 1, vy: -520 });
}

function shootEnemy(enemy) {
  const damage = enemy.type === "boss" ? 10 : 5;
  const speed = enemy.type === "boss" ? 330 : 245;
  enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.h * 0.35, r: 5, damage, vy: speed });
}

function update(dt) {
  if (state !== "playing") return;

  updateStars(dt);
  movePlayer(dt);

  shootTimer -= dt;
  if (shootTimer <= 0) {
    shootPlayer();
    shootTimer = player.fireDelay;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(470, 1150 - score * 5) + Math.random() * 420;
  }

  bullets.forEach((b) => b.y += b.vy * dt / 1000);
  enemyBullets.forEach((b) => b.y += b.vy * dt / 1000);
  bullets = bullets.filter((b) => b.y > -20);
  enemyBullets = enemyBullets.filter((b) => b.y < H + 20);

  enemies.forEach((enemy) => {
    enemy.y += enemy.speed * dt / 1000;
    enemy.drift += dt / 700;
    enemy.x += Math.sin(enemy.drift) * (enemy.type === "boss" ? 1.1 : 1.8);
    enemy.x = clamp(enemy.x, enemy.w / 2 + 8, W - enemy.w / 2 - 8);
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && enemy.y > 30) {
      shootEnemy(enemy);
      enemy.fireTimer = enemy.type === "boss" ? player.fireDelay : 1150 + Math.random() * 900;
    }
  });

  handleCollisions();
  enemies = enemies.filter((enemy) => {
    if (enemy.y > H + 80) {
      if (enemy.type === "boss") bossActive = false;
      return false;
    }
    return enemy.hp > 0;
  });

  particles.forEach((p) => {
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.life -= dt;
  });
  particles = particles.filter((p) => p.life > 0);

  if (player.hp <= 0) gameOver();
  updateHud();
}

function updateStars(dt) {
  stars.forEach((star) => {
    star.y += star.speed * dt / 1000;
    if (star.y > H) {
      star.y = -5;
      star.x = Math.random() * W;
    }
  });
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  player.x = clamp(player.x + (dx / len) * player.speed * dt / 1000, 34, W - 34);
  player.y = clamp(player.y + (dy / len) * player.speed * dt / 1000, H * 0.48, H - 44);
}

function handleCollisions() {
  bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      if (bullet.hit || !circleRect(bullet, enemy)) return;
      bullet.hit = true;
      enemy.hp -= bullet.damage;
      burst(bullet.x, bullet.y, "#75f7ff", 5);
      if (enemy.hp <= 0) destroyEnemy(enemy);
    });
  });
  bullets = bullets.filter((bullet) => !bullet.hit);

  enemyBullets.forEach((bullet) => {
    if (circleRect(bullet, player)) {
      bullet.hit = true;
      player.hp -= bullet.damage;
      burst(bullet.x, bullet.y, "#ff63d8", 8);
    }
  });
  enemyBullets = enemyBullets.filter((bullet) => !bullet.hit);

  enemies.forEach((enemy) => {
    if (rectsOverlap(enemy, player)) {
      enemy.hp = 0;
      player.hp -= enemy.type === "boss" ? 40 : 18;
      burst(enemy.x, enemy.y, "#ff9b30", 24);
      if (enemy.type === "boss") bossActive = false;
    }
  });
}

function destroyEnemy(enemy) {
  if (enemy.destroyed) return;
  enemy.destroyed = true;
  score += enemy.type === "boss" ? 5 : 1;
  if (enemy.type === "boss") {
    bossActive = false;
    normalKills = 0;
  } else {
    normalKills += 1;
  }
  sessionBest = Math.max(sessionBest, score);
  topScore = Math.max(topScore, score);
  localStorage.setItem(topScoreKey, String(topScore));
  burst(enemy.x, enemy.y, "#ffcf53", enemy.type === "boss" ? 48 : 22);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 210;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 260 + Math.random() * 360,
      color
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawSpace();
  enemies.forEach(drawUfo);
  bullets.forEach((b) => drawBolt(b.x, b.y, "#83fbff", "#2d73ff", 18));
  enemyBullets.forEach((b) => drawBolt(b.x, b.y, "#ff8adc", "#ff4b2f", 13));
  drawShip(player.x, player.y);
  drawParticles();
  drawScanlines();
}

function drawSpace() {
  ctx.fillStyle = "#071016";
  ctx.fillRect(0, 0, W, H);
  stars.forEach((star) => {
    ctx.fillStyle = star.color;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
  });
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);
  px("#94a5a2", [[0,-34,12,10],[-10,-24,32,16],[-25,-8,20,18],[5,-8,20,18],[-34,8,15,11],[19,8,15,11],[-12,12,24,18]]);
  px("#d7e6dc", [[-5,-40,10,8],[-18,-17,9,10],[9,-17,9,10],[-28,-1,9,8],[19,-1,9,8]]);
  px("#1f3353", [[-7,-18,14,25]]);
  px("#1d87ff", [[-4,-16,8,18]]);
  px("#ff8a23", [[-31,19,5,14],[26,19,5,14]]);
  px("#ffffff", [[-13,25,10,20],[3,25,10,20]]);
  px("#4f8dff", [[-10,43,5,14],[7,43,5,14]]);
  ctx.restore();
}

function drawUfo(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const scale = enemy.type === "boss" ? 1.35 : 1;
  ctx.scale(scale, scale);
  px("#55f0ff", [[-18,-17,36,9],[-25,-8,50,12],[-32,2,64,8]]);
  px("#dbe3ea", [[-27,10,54,8],[-20,17,40,6]]);
  px("#7b6ba8", [[-31,4,62,6],[-24,13,48,5]]);
  px("#2a66ff", [[-11,-27,22,18],[-16,-20,32,8]]);
  px("#c9f7ff", [[-5,-24,10,8],[-13,-14,26,5]]);
  for (let i = -20; i <= 20; i += 10) px("#fff7a8", [[i,13,5,4]]);
  if (enemy.type === "boss") {
    px("#ff63d8", [[-34,1,7,11],[27,1,7,11],[-7,19,14,5]]);
  }
  const barW = 44;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(-barW / 2, -42, barW, 4);
  ctx.fillStyle = enemy.type === "boss" ? "#ff63d8" : "#5cfbff";
  ctx.fillRect(-barW / 2, -42, barW * (enemy.hp / enemy.maxHp), 4);
  ctx.restore();
}

function px(color, rects) {
  ctx.fillStyle = color;
  rects.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
}

function drawBolt(x, y, core, glow, h) {
  ctx.fillStyle = glow;
  ctx.fillRect(x - 3, y - h / 2, 6, h);
  ctx.fillStyle = core;
  ctx.fillRect(x - 2, y - h / 2 - 3, 4, h + 6);
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 620);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  });
  ctx.globalAlpha = 1;
}

function drawScanlines() {
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function loop(time) {
  const dt = Math.min(34, time - lastTime || 16);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
  const closestY = clamp(circle.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.r + 2;
}

function rectsOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space" && state === "playing" && shootTimer > 55) shootTimer = 0;
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("pointermove", (event) => {
  if (state !== "playing" || event.pointerType === "mouse" && event.buttons === 0) return;
  const rect = canvas.getBoundingClientRect();
  player.x = clamp((event.clientX - rect.left) * W / rect.width, 34, W - 34);
  player.y = clamp((event.clientY - rect.top) * H / rect.height, H * 0.48, H - 44);
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
updateHud();
requestAnimationFrame(loop);
