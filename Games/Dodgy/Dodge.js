const player = document.getElementById("user");
const shield = document.getElementById("shield");
const menu = document.getElementById("menu");
const game = document.getElementById("game");

let hearts = 3;
let score = 0;
let gameActive = false;
let spawnInterval;
let wins = 0;
let losses = 0;

// ── MENU ──────────────────────────────────────────────────────────────────────

function openMenu() {
    menu.classList.add('active');
}

function closeMenu() {
    menu.classList.remove('active');
}

function returnToMenu() {
    gameActive = false;
    clearInterval(spawnInterval);
    removeAllSpikes();
    game.style.display = 'none';
    openMenu();
}

// ── GAME LIFECYCLE ─────────────────────────────────────────────────────────────

function startGame() {
    closeMenu();close
    game.style.display = 'block';
    hearts = 3;
    score = 0;
    gameActive = true;
    updateStats();
    removeAllSpikes();
    spawnSpikes();
}

function updateStats() {
    document.getElementById('hearts').textContent = hearts;
    document.getElementById('score').textContent = score;
}

function updateMenuStats() {
    document.getElementById('stat-wins').textContent = wins;
    document.getElementById('stat-losses').textContent = losses;
}

function removeAllSpikes() {
    document.querySelectorAll('.spike').forEach(s => s.remove());
}

// ── SPAWNING ──────────────────────────────────────────────────────────────────

function spawnSpikes() {
    spawnInterval = setInterval(() => {
        if (!gameActive) { clearInterval(spawnInterval); return; }

        const spike = document.createElement('div');
        spike.classList.add('spike');

        const direction = Math.floor(Math.random() * 4);
        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const cx = sw / 2;
        const cy = sh / 2;

        let x, y, dx, dy;

        if (direction === 0) {           // top → down
            x = cx; y = -50; dx = 0; dy = 10;
            spike.style.transform = 'rotate(180deg)';
        } else if (direction === 1) {    // right → left
            x = sw + 50; y = cy; dx = -10; dy = 0;
            spike.style.transform = 'rotate(-90deg)';
        } else if (direction === 2) {    // bottom → up
            x = cx; y = sh + 50; dx = 0; dy = -10;
            spike.style.transform = 'rotate(0deg)';
        } else {                         // left → right
            x = -50; y = cy; dx = 10; dy = 0;
            spike.style.transform = 'rotate(90deg)';
        }

        spike.style.left = x + 'px';
        spike.style.top  = y + 'px';
        document.body.appendChild(spike);
        moveSpike(spike, x, y, dx, dy, direction);

    }, Math.floor(Math.random() * 1000) + 800);
}

function moveSpike(spike, x, y, dx, dy, direction) {
    const moveInterval = setInterval(() => {
        if (!gameActive) { clearInterval(moveInterval); spike.remove(); return; }

        x += dx;
        y += dy;
        spike.style.left = x + 'px';
        spike.style.top  = y + 'px';

        const playerRect = player.getBoundingClientRect();
        const spikeRect  = spike.getBoundingClientRect();

        if (checkCollision(playerRect, spikeRect)) {
            clearInterval(moveInterval);
            spike.remove();

            if (isDeflected(direction, shield.classList.value)) {
                score++;
                updateStats();
                toast(`Deflected! ${score}/20`);
                if (score >= 20) { winGame(); }
            } else {
                hearts--;
                updateStats();
                if (hearts <= 0) { loseGame(); }
            }
            return;
        }

        // off-screen cleanup
        if (x < -100 || x > window.innerWidth + 100 ||
            y < -100 || y > window.innerHeight + 100) {
            clearInterval(moveInterval);
            spike.remove();
        }
    }, 20);
}

function checkCollision(r1, r2) {
    return !(r1.right < r2.left || r1.left > r2.right ||
             r1.bottom < r2.top || r1.top > r2.bottom);
}

function isDeflected(direction, shieldClass) {
    if (direction === 0 && shieldClass.includes('top'))    return true;
    if (direction === 1 && shieldClass.includes('right'))  return true;
    if (direction === 2 && shieldClass.includes('bottom')) return true;
    if (direction === 3 && shieldClass.includes('left'))   return true;
    return false;
}

// ── END SCREENS ───────────────────────────────────────────────────────────────

function winGame() {
    gameActive = false;
    clearInterval(spawnInterval);
    removeAllSpikes();
    wins++;
    updateMenuStats();
    decis("win");

    const el = document.createElement('div');
    el.classList.add('win');
    el.innerHTML = `
        <h2>YOU WIN!</h2>
        <p>All 20 spikes deflected</p>
        <button onclick="startGame(); this.closest('.win').remove();">Play Again</button>
        <button onclick="returnToMenu(); this.closest('.win').remove();">Menu</button>
    `;
    document.body.appendChild(el);
}

function loseGame() {
    gameActive = false;
    clearInterval(spawnInterval);
    removeAllSpikes();
    losses++;
    updateMenuStats();
    decis("lose");

    const el = document.createElement('div');
    el.classList.add('game-over');
    el.innerHTML = `
        <h2>GAME OVER</h2>
        <p>Final Score: ${score}/20</p>
        <button onclick="startGame(); this.closest('.game-over').remove();">Try Again</button>
        <button onclick="returnToMenu(); this.closest('.game-over').remove();">Menu</button>
    `;
    document.body.appendChild(el);
}

// ── BACKEND ───────────────────────────────────────────────────────────────────

async function decis(result){
    await fetch("https://bend-production-72e5.up.railway.app/Dodge/end", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"},
        body: JSON.stringify({
            a: result,
            b: localStorage.getItem("username")
        })
    });
}

// ── CONTROLS ──────────────────────────────────────
// ────────────────────────────

document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    switch (e.code) {
        case 'KeyW': shield.classList.value = 'shield top';    break;
        case 'KeyA': shield.classList.value = 'shield left';   break;
        case 'KeyS': shield.classList.value = 'shield bottom'; break;
        case 'KeyD': shield.classList.value = 'shield right';  break;
    }
});

// ── TOAST ─────────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg) {
    const el   = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    msgEl.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1200);
}