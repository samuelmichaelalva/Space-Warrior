const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const sessionBestEl = document.getElementById("sessionBest");
const topScoreEl = document.getElementById("topScore");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const soundButton = document.getElementById("soundButton");

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
let pickups;
let particles;
let stars;
let score;
let normalKills;
let spawnTimer;
let shootTimer;
let bossActive;
let bossIntroTimer;
let audio;

function createAudioEngine() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const audioContext = new AudioCtx();
  const master = audioContext.createGain();
  const musicGain = audioContext.createGain();
  const sfxGain = audioContext.createGain();
  const bassGain = audioContext.createGain();
  const leadGain = audioContext.createGain();
  const delay = audioContext.createDelay();
  const delayFeedback = audioContext.createGain();

  master.gain.value = 0.35;
  musicGain.gain.value = 0.22;
  sfxGain.gain.value = 0.32;
  bassGain.gain.value = 0.42;
  leadGain.gain.value = 0.2;
  delay.delayTime.value = 0.18;
  delayFeedback.gain.value = 0.22;

  musicGain.connect(master);
  sfxGain.connect(master);
  bassGain.connect(musicGain);
  leadGain.connect(delay);
  leadGain.connect(musicGain);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(musicGain);
  master.connect(audioContext.destination);

  let muted = false;
  let musicTimer = null;
  let step = 0;
  const bassNotes = [55, 55, 82.41, 55, 65.41, 65.41, 98, 65.41];
  const leadNotes = [220, 0, 277.18, 0, 246.94, 329.63, 277.18, 0, 196, 0, 246.94, 0, 220, 293.66, 246.94, 0];

  function envGain(target, start, peak, end, duration) {
    target.gain.cancelScheduledValues(start);
    target.gain.setValueAtTime(0.0001, start);
    target.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    target.gain.exponentialRampToValueAtTime(0.0001, end || start + duration);
  }

  function tone(freq, duration, options = {}) {
    if (muted) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const out = options.out || sfxGain;
    osc.type = options.type || "square";
    osc.frequency.setValueAtTime(freq, now);
    if (options.slideTo) osc.frequency.exponentialRampToValueAtTime(options.slideTo, now + duration);
    envGain(gain, now, options.gain || 0.18, now + duration, duration);
    osc.connect(gain);
     gain.connect(out);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function noise(duration, options = {}) {
    if (muted) return;
    const now = audioContext.currentTime;
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    filter.type = options.filter || "bandpass";
    filter.frequency.value = options.freq || 900;
    filter.Q.value = options.q || 1.2;
    envGain(gain, now, options.gain || 0.2, now + duration, duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    source.start(now);
  }

  function musicStep() {
    if (muted || state !== "playing") return;
    const bass = bassNotes[step % bassNotes.length];
    tone(bass, 0.13, { type: "sawtooth", gain: 0.08, out: bassGain });
    if (step % 2 === 0) tone(bass * 2, 0.04, { type: "triangle", gain: 0.035, out: bassGain });
    const lead = leadNotes[step % leadNotes.length];
    if (lead) tone(lead, 0.11, { type: "square", gain: 0.055, out: leadGain });
    if (step % 4 === 2) noise(0.035, { gain: 0.025, freq: 3600, filter: "highpass" });
    step += 1;
  }

  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(musicStep, 155);
  }

  function stopMusic() {
    if (!musicTimer) return;
    window.clearInterval(musicTimer);
    musicTimer = null;
  }

  return {
    get muted() {
      return muted;
    },
    async resume() {
      if (audioContext.state !== "running") await audioContext.resume();
    },
    startMusic,
    stopMusic,
    toggleMute() {
      muted = !muted;
      master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    laser() {
      tone(880, 0.07, { type: "square", gain: 0.09, slideTo: 320 });
    },
    enemyLaser() {
      tone(230, 0.09, { type: "sawtooth", gain: 0.08, slideTo: 130 });
    },
    hit() {
      tone(130, 0.08, { type: "triangle", gain: 0.1, slideTo: 80 });
    },
    explode(isBoss = false) {
      noise(isBoss ? 0.48 : 0.22, { gain: isBoss ? 0.34 : 0.22, freq: isBoss ? 180 : 420, filter: "lowpass" });
      tone(isBoss ? 92 : 180, isBoss ? 0.42 : 0.16, { type: "sawtooth", gain: isBoss ? 0.16 : 0.1, slideTo: 45 });
    },
     bossAlert() {
      tone(196, 0.22, { type: "square", gain: 0.12, slideTo: 146.83 });
      window.setTimeout(() => tone(196, 0.22, { type: "square", gain: 0.12, slideTo: 146.83 }), 300);
      window.setTimeout(() => tone(293.66, 0.34, { type: "square", gain: 0.14, slideTo: 220 }), 620);
    },
    pickup() {
      tone(523.25, 0.08, { type: "triangle", gain: 0.11 });
      window.setTimeout(() => tone(659.25, 0.08, { type: "triangle", gain: 0.11 }), 80);
      window.setTimeout(() => tone(783.99, 0.13, { type: "triangle", gain: 0.12 }), 160);
    },
    gameOver() {
      tone(220, 0.18, { type: "sawtooth", gain: 0.13, slideTo: 155.56 });
      window.setTimeout(() => tone(146.83, 0.3, { type: "sawtooth", gain: 0.14, slideTo: 73.42 }), 180);
    }
  };
}

async function enableAudio() {
  if (!audio) audio = createAudioEngine();
  if (!audio) return;
  await audio.resume();
  audio.startMusic();
  updateSoundButton();
}

function updateSoundButton() {
  if (!soundButton || !audio) return;
  soundButton.textContent = audio.muted ? "Sound Off" : "Sound On";
  soundButton.setAttribute("aria-pressed", String(!audio.muted));
}

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
  pickups = [];
  particles = [];
  stars = makeStars();
  score = 0;
  normalKills = 0;
  spawnTimer = 600;
  shootTimer = 0;
  bossActive = false;
  bossIntroTimer = 0;
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
  enableAudio();
  resetGame();
  state = "playing";
  audio?.startMusic();
  startOverlay.classList.remove("is-visible");
  gameOverOverlay.classList.remove("is-visible");
}

function gameOver() {
  state = "over";
  audio?.gameOver();
  audio?.stopMusic();
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
}

function spawnEnemy(forceBoss = false) {
 if (forceBoss || (!bossActive && normalKills > 0 && normalKills % 15 === 0)) {
    bossActive = true;
    bossIntroTimer = 1000;
    audio?.bossAlert();
    enemies.push({
      type: "boss",
      x: W / 2,
      y: -70,
      w: 96,
      h: 62,
      hp: 24,
      maxHp: 24,
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
  audio?.laser();
}

function shootEnemy(enemy) {
  const damage = enemy.type === "boss" ? 10 : 5;
  const speed = enemy.type === "boss" ? 330 : 245;
  enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.h * 0.35, r: 5, damage, vy: speed });
  audio?.enemyLaser();
}

function update(dt) {
  if (state !== "playing") return;

  updateStars(dt);

  if (bossIntroTimer > 0) {
    bossIntroTimer = Math.max(0, bossIntroTimer - dt);
    return;
  }

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
  pickups.forEach((pickup) => pickup.y += pickup.vy * dt / 1000);
  bullets = bullets.filter((b) => b.y > -20);
  enemyBullets = enemyBullets.filter((b) => b.y < H + 20);
  pickups = pickups.filter((pickup) => pickup.y < H + 30 && !pickup.collected);

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
      audio?.hit();
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

  pickups.forEach((pickup) => {
    if (rectsOverlap(pickup, player)) {
       pickup.collected = true;
      player.hp = Math.min(player.maxHp, player.hp + pickup.value);
      burst(pickup.x, pickup.y, "#62ff8a", 18);
      audio?.pickup();
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
    pickups.push({
      type: "hp",
      x: enemy.x,
      y: enemy.y,
      w: 30,
      h: 30,
      value: 5,
      vy: 105
    });
  } else {
    normalKills += 1;
  }
  sessionBest = Math.max(sessionBest, score);
  topScore = Math.max(topScore, score);
  localStorage.setItem(topScoreKey, String(topScore));
  burst(enemy.x, enemy.y, "#ffcf53", enemy.type === "boss" ? 48 : 22);
  audio?.explode(enemy.type === "boss");
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
  pickups.forEach(drawHpTank);
  bullets.forEach((b) => drawBolt(b.x, b.y, "#83fbff", "#2d73ff", 18));
  enemyBullets.forEach((b) => drawBolt(b.x, b.y, "#ff8adc", "#ff4b2f", 13));
  drawPlayerHp();
  drawShip(player.x, player.y);
  drawParticles();
  if (bossIntroTimer > 0) drawBossIntro();
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

function drawPlayerHp() {
  const hp = Math.max(0, player.hp);
  const ratio = hp / player.maxHp;
  const barW = 70;
  const barH = 7;
  const x = Math.floor(player.x - barW / 2);
  const y = Math.floor(player.y - 68);

  ctx.save();
  ctx.fillStyle = "rgba(3, 10, 14, 0.7)";
  ctx.fillRect(x - 2, y - 13, barW + 4, barH + 17);
  ctx.fillStyle = "#d5f9ff";
  ctx.font = "10px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(`HP ${Math.ceil(hp)}`, player.x, y - 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = ratio > 0.5 ? "#5cfbff" : ratio > 0.25 ? "#ffcf53" : "#ff4b2f";
  ctx.fillRect(x, y, barW * ratio, barH);
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.strokeRect(x - 0.5, y - 0.5, barW + 1, barH + 1);
  ctx.restore();
}

function drawHpTank(pickup) {
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  px("#d5f9ff", [[-12,-12,24,24]]);
  px("#62ff8a", [[-8,-8,16,16],[-3,-13,6,26],[-13,-3,26,6]]);
  px("#1f6b48", [[-12,-12,24,4],[-12,8,24,4],[-12,-12,4,24],[8,-12,4,24]]);
  ctx.fillStyle = "#d5f9ff";
  ctx.font = "9px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("+5", 0, 24);
  ctx.restore();
}

function drawBossIntro() {
  ctx.save();
  ctx.fillStyle = "rgba(5, 9, 13, 0.55)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ff63d8";
  ctx.font = "34px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ff63d8";
  ctx.shadowBlur = 18;
  ctx.fillText("BOSS SHIP!", W / 2, H / 2);
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
soundButton.addEventListener("click", async () => {
  await enableAudio();
  if (!audio) {
    soundButton.textContent = "No Audio";
    return;
  }
  audio.toggleMute();
  if (!audio.muted && state === "playing") audio.startMusic();
  updateSoundButton();
});

resetGame();
updateHud();
updateSoundButton();
requestAnimationFrame(loop);