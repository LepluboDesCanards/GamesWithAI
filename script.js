const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const pauseOverlay = document.getElementById('pauseOverlay');

const TILE_COUNT = 20;
const TILE_SIZE = canvas.width / TILE_COUNT;

const MAX_APPLES = 3;
let foods = [];

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let score = 0;
let running = true;
let isGameOver = false;
let speed = 120;
let loopId = null;

// patterns
let snakeBodyPattern = null;
let snakeHeadPattern = null;
let applePattern = null;

function showPause(show) {
  if (show) {
    pauseOverlay.classList.add('show');
    pauseOverlay.setAttribute('aria-hidden', 'false');
  } else {
    pauseOverlay.classList.remove('show');
    pauseOverlay.setAttribute('aria-hidden', 'true');
  }
}

function createPatterns() {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const sc = s.getContext('2d');
  sc.fillStyle = '#66bb6a';
  sc.fillRect(0,0,64,64);
  sc.strokeStyle = 'rgba(40,70,30,0.32)';
  sc.lineWidth = 6;
  for (let i = -3; i < 8; i++) {
    sc.beginPath();
    sc.moveTo(i*12, 0);
    sc.lineTo(i*12 + 64, 64);
    sc.stroke();
  }
  snakeBodyPattern = ctx.createPattern(s, 'repeat');

  const sh = document.createElement('canvas');
  sh.width = sh.height = 64;
  const shc = sh.getContext('2d');
  shc.fillStyle = '#76ff03';
  shc.fillRect(0,0,64,64);
  shc.fillStyle = 'rgba(255,255,255,0.22)';
  shc.beginPath();
  shc.ellipse(20,16,14,8, -0.4, 0, Math.PI*2);
  shc.fill();
  snakeHeadPattern = ctx.createPattern(sh, 'repeat');

  const a = document.createElement('canvas');
  a.width = a.height = 64;
  const ac = a.getContext('2d');
  ac.fillStyle = '#e53935';
  ac.beginPath(); ac.arc(32,32,20,0,Math.PI*2); ac.fill();
  ac.fillStyle = 'rgba(255,255,255,0.7)';
  ac.beginPath(); ac.ellipse(40,22,8,6,-0.5,0,Math.PI*2); ac.fill();
  ac.fillStyle = '#4e342e'; ac.fillRect(30,12,6,8);
  applePattern = ctx.createPattern(a, 'repeat');
}
createPatterns();

// embedded apple SVG so no external file required
const appleSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#fff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g>
    <circle cx="64" cy="64" r="36" fill="#e53935"/>
    <path d="M64 30 q14 0 20 10 q-8 -6 -20 -6 q-12 0 -20 6 q6 -10 20 -10z" fill="#d32f2f" opacity="0.9"/>
    <rect x="58" y="28" width="12" height="14" rx="3" ry="3" fill="#5d4037" transform="rotate(-20 64 35)"/>
    <ellipse cx="76" cy="50" rx="8" ry="5" fill="url(#g)" opacity="0.9"/>
  </g>
</svg>`;
const appleImg = new Image();
appleImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(appleSVG);
appleImg.onload = () => {};
appleImg.onerror = () => { console.warn('Impossible de charger l\'image intégrée — fallback utilisé'); };

function init() {
  snake = [];
  for (let i = 4; i >= 0; i--) snake.push({ x: i + 8, y: 10 });
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  foods = [];
  ensureApples();
  score = 0;
  running = true;
  isGameOver = false;
  showPause(false);
  speed = 120;
  scoreEl.textContent = 'Score: 0';
  if (loopId) { clearInterval(loopId); loopId = null; }
  loopId = setInterval(gameTick, speed);
  draw();
}

function placeApple() {
  let attempts = 0;
  while (attempts < 500) {
    attempts++;
    const x = Math.floor(Math.random() * TILE_COUNT);
    const y = Math.floor(Math.random() * TILE_COUNT);
    const occupied = snake.some(s => s.x === x && s.y === y) || foods.some(f => f.x === x && f.y === y);
    if (!occupied) {
      foods.push({ x, y });
      return;
    }
  }
}

function ensureApples() {
  while (foods.length < MAX_APPLES) placeApple();
}

function gameTick() {
  if (!running) return;
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // collision bord => game over
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    gameOver();
    return;
  }
  // collision corps
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  const eatenIndex = foods.findIndex(f => f.x === head.x && f.y === head.y);
  if (eatenIndex !== -1) {
    foods.splice(eatenIndex, 1);
    score++;
    scoreEl.textContent = 'Score: ' + score;
    ensureApples();
    if (speed > 40 && score % 3 === 0) {
      speed = Math.max(40, speed - 8);
      if (loopId) { clearInterval(loopId); loopId = setInterval(gameTick, speed); }
    }
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // légère grille pour contraste (alignée sur pixels)
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < TILE_COUNT; y++) {
    for (let x = 0; x < TILE_COUNT; x++) {
      if ((x + y) % 2 === 0) {
        const gx = Math.round(x * TILE_SIZE);
        const gy = Math.round(y * TILE_SIZE);
        const gsz = Math.round(TILE_SIZE);
        ctx.fillRect(gx, gy, gsz, gsz);
      }
    }
  }

  // pommes : couvrent exactement la case (tile)
  ctx.save();
  for (const f of foods) {
    const imgSize = Math.round(TILE_SIZE);
    const x = Math.round(f.x * TILE_SIZE);
    const y = Math.round(f.y * TILE_SIZE);

    if (appleImg.complete && appleImg.naturalWidth) {
      ctx.drawImage(appleImg, x, y, imgSize, imgSize);
    } else {
      // fallback circle centered in tile
      const cx = x + Math.round(imgSize / 2);
      const cy = y + Math.round(imgSize / 2);
      const radius = Math.max(4, Math.round(imgSize / 2) - 2);
      ctx.fillStyle = applePattern || '#e53935';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - Math.max(1, Math.round(radius / 3)), cy - Math.max(1, Math.round(radius / 3)), Math.max(1, Math.round(radius / 3)), Math.max(1, Math.round(radius / 5)), -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // serpent (head + body) avec patterns
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    const sx = Math.round(s.x * TILE_SIZE);
    const sy = Math.round(s.y * TILE_SIZE);
    const ssize = Math.round(TILE_SIZE);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = (i === 0) ? snakeHeadPattern : snakeBodyPattern;
    ctx.fillRect(1, 1, ssize - 2, ssize - 2);

    if (i === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      const ex = Math.round(ssize * 0.65);
      const ey = Math.round(ssize * 0.35);
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(1, Math.round(ssize * 0.08)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (!running && isGameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over — Cliquez sur le cadre pour rejouer', canvas.width / 2, canvas.height / 2);
  }
}

function gameOver() {
  running = false;
  isGameOver = true;
  if (loopId) { clearInterval(loopId); loopId = null; }
  showPause(false);
  draw();
}

// gestion des touches : pause uniquement si pas en défaite
window.addEventListener('keydown', e => {
  const key = e.key;
  if (key === ' ') {
    if (isGameOver) return;
    running = !running;
    if (!running) {
      if (loopId) { clearInterval(loopId); loopId = null; }
      showPause(true);
    } else {
      showPause(false);
      if (!loopId) loopId = setInterval(gameTick, speed);
    }
    return;
  }

  if (isGameOver) return;

  if (key === 'ArrowUp' || key === 'w' || key === 'z' || key === 'W' || key === 'Z') {
    if (dir.y !== 1) nextDir = { x: 0, y: -1 };
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    if (dir.y !== -1) nextDir = { x: 0, y: 1 };
  } else if (key === 'ArrowLeft' || key === 'a' || key === 'q' || key === 'A' || key === 'Q') {
    if (dir.x !== 1) nextDir = { x: -1, y: 0 };
  } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
    if (dir.x !== -1) nextDir = { x: 1, y: 0 };
  }
});

// clic sur canvas : relancer uniquement si en état de défaite
canvas.addEventListener('click', () => {
  if (isGameOver) init();
});

// démarrage
init();
draw();