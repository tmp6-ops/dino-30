// --- Audio Synthesizer (Web Audio API) ---
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Classic jump sound: rapid upward chirp
  playJump() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Crash sound: low pitch noise / crunch
  playHit() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Milestone beep (every 100 points)
  playScoreMilestone() {
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1050, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// --- Game Logic ---
const sounds = new SoundEffects();

const dino = document.getElementById('dino');
const cactus = document.getElementById('cactus');
const gameWorld = document.getElementById('game-world');
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const gameOverScreen = document.getElementById('game-over-screen');
const startScreen = document.getElementById('start-screen');
const restartBtn = document.getElementById('restart-btn');

let isPlaying = false;
let isJumping = false;
let score = 0;
let highScore = 0;
let cactusX = 700;
let baseSpeed = 5.5;
let animationFrameId = null;

// Load saved high score from localStorage
if (localStorage.getItem('dino_high_score')) {
  highScore = parseInt(localStorage.getItem('dino_high_score'), 10) || 0;
  highScoreEl.textContent = formatScore(highScore);
}

function formatScore(num) {
  return String(Math.floor(num)).padStart(5, '0');
}

function jump() {
  if (!isPlaying) {
    startGame();
    return;
  }

  if (isJumping) return;

  isJumping = true;
  sounds.playJump();
  dino.classList.add('jump');

  setTimeout(() => {
    dino.classList.remove('jump');
    isJumping = false;
  }, 520);
}

function startGame() {
  isPlaying = true;
  score = 0;
  cactusX = gameWorld.clientWidth;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  dino.classList.remove('jump');
  isJumping = false;

  cancelAnimationFrame(animationFrameId);
  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function gameOver() {
  isPlaying = false;
  cancelAnimationFrame(animationFrameId);
  sounds.playHit();
  gameOverScreen.classList.remove('hidden');

  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('dino_high_score', highScore);
    highScoreEl.textContent = formatScore(highScore);
  }
}

let lastTime = null;

function gameLoop(timestamp) {
  if (!isPlaying) return;

  const delta = (timestamp - lastTime) / 16.666; // Normalize to ~60fps
  lastTime = timestamp;

  // Slowly accelerate as score increases
  const currentSpeed = (baseSpeed + Math.min(score / 200, 7)) * delta;
  cactusX -= currentSpeed;

  // Reset cactus position when off-screen
  if (cactusX < -30) {
    cactusX = gameWorld.clientWidth + Math.random() * 120;
  }
  cactus.style.left = `${cactusX}px`;

  // Increase score
  const prevScore = Math.floor(score);
  score += 0.15 * delta;
  const newScore = Math.floor(score);

  currentScoreEl.textContent = formatScore(newScore);

  // Play milestone chime every 100 points
  if (newScore > 0 && newScore % 100 === 0 && prevScore % 100 !== 0) {
    sounds.playScoreMilestone();
  }

  // Accurate Hitbox Collision Detection
  const dinoRect = dino.getBoundingClientRect();
  const cactusRect = cactus.getBoundingClientRect();

  // Padding to make the hitboxes feel natural and fair
  const dinoHitbox = {
    left: dinoRect.left + 8,
    right: dinoRect.right - 8,
    top: dinoRect.top + 6,
    bottom: dinoRect.bottom - 4
  };

  const cactusHitbox = {
    left: cactusRect.left + 5,
    right: cactusRect.right - 5,
    top: cactusRect.top + 5,
    bottom: cactusRect.bottom
  };

  const hasCollided = !(
    dinoHitbox.right < cactusHitbox.left ||
    dinoHitbox.left > cactusHitbox.right ||
    dinoHitbox.bottom < cactusHitbox.top ||
    dinoHitbox.top > cactusHitbox.bottom
  );

  if (hasCollided) {
    gameOver();
    return;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Input Handlers (Keyboard, Click, Touch)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!isPlaying && !gameOverScreen.classList.contains('hidden')) {
      startGame();
    } else {
      jump();
    }
  }
});

gameWorld.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!isPlaying && !gameOverScreen.classList.contains('hidden')) {
    startGame();
  } else {
    jump();
  }
});

restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startGame();
});

