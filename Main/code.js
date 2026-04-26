const hide    = document.getElementById('HIDE');
const heroImg = document.getElementById('hero-img');
const imgr    = document.getElementById('imgr');
const settings = document.getElementById('save-settings');
const abouts = document.getElementById("about")

const gameData = [
    {
        name: 'Black Jack',
        desc: 'A 1v1 card game where you face the dealer, trying to get as close to 21 as possible without going over. Outsmart the house.',
        tag: 'CARD GAME'
    },
    {
        name: 'Tic Tac Toe',
        desc: 'The classic 3×3 strategy game. Place your mark, block your opponent, and claim three in a row to win.',
        tag: 'STRATEGY'
    },
    { name: 'Ping Pong', desc: 'The classic table board strategy game where you dont let the ball get past you  .', tag: 'STRATEGY' },
    { name: 'Jump Bird', desc: 'A game inspired by Flappy bird.', tag: 'FUN' },
    { name: 'Dodge', desc: 'A simple deflection game. Shield out the spikes and get up to 20 deflection to win.', tag: 'LOCKED' }
];

async function start(){
    const res  = await fetch('https://bend-production-72e5.up.railway.app/base/Color');
    const r = await res.text()
    document.documentElement.style.setProperty('--cyan', r)
    document.getElementById('color-wheel').value = r;
    console.log(r)
}

start()

async function colorchange(color){
    const res = await fetch("https://bend-production-72e5.up.railway.app/base/Color", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: color
    });
}

document.getElementById('color-wheel').addEventListener('change', (e) => {
    const selectedColor = e.target.value;
    document.documentElement.style.setProperty('--cyan', selectedColor);
    colorchange(selectedColor)
});

settings.addEventListener('click',() => {
    document.getElementById('settings-overlay').classList.remove('active');
})

const heroThemes = ['', 'red-mode', 'white-mode', 'white-mode', 'white-mode'];

// ─── Utility ─────────────────────────────────
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function isLoggedIn() {
    if(localStorage.getItem("login") != "true"){
        return false;
    }else{
        return localStorage.getItem("login")
    }
}

// ─── Navigation ──────────────────────────────
async function account() {
    if (await isLoggedIn()) return showToast("You're already logged in");
    window.location.href = 'Login.html';
}

async function Scores() {
    window.location.href = 'highscores.html';
}

function Settings() {
    document.getElementById('settings-overlay').classList.add('active');
}

async function Logout() {
    localStorage.setItem("login", false);
    localStorage.setItem("username", "");
    showToast("Successfully logged out.");
    await wait(1)
    window.location.href = 'index.html';
}

//Games
async function Blackjack() {
    hide.style.width = '100%';
    await wait(1.4);
    window.location.href = 'Games/Blackjack/Blackjack.html';
}

async function TTT() {
    hide.style.width = '100%';
    await wait(1.4);
    window.location.href = 'Games/TTT/TTT.html';
}

async function pingpong() {
    hide.style.width = '100%';
    await wait(1.4);
    window.location.href = 'Games/pingpong/pingpong.html';
}

async function bird() {
    hide.style.width = '100%';
    await wait(1.4);
    window.location.href = 'Games/test/game.html';
}

async function Dodge() {
    hide.style.width = '100%';
    await wait(1.4);
    window.location.href = 'Games/Dodgy/Dodge.html';
}

//hover
function hoverText(index) {
    const data = gameData[index];
    document.getElementById('game-info-name').textContent = data.name;
    document.getElementById('game-info-desc').textContent = data.desc;

    heroImg.className = heroThemes[index] ? heroThemes[index] : '';
}

//Start
async function startups() {
    if (!await isLoggedIn()) return showToast("You haven't logged in yet.");
    document.getElementById('game-overlay').classList.add('active');
}

function closeOverlay() {
    document.getElementById('game-overlay').classList.remove('active');
}

//clock stuf
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('clock');
    if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

//logout
async function init() {
    if (await isLoggedIn()) {
        document.getElementById('logout-btn').classList.add('visible');
    }
}

function abt(){
    abouts.classList.toggle("active");
}

function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast success`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide'); // Start exit animation
    toast.addEventListener('animationend', () => {
      toast.remove(); // Remove from DOM after animation finishes
    });
  }, duration);
}

init();