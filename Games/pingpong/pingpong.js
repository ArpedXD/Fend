const boxEl        = document.getElementById('box');
const ballEl       = document.getElementById('ball');
const userEl       = document.getElementById('user');
const enemyEl      = document.getElementById('enemy');
const userScoreEl  = document.getElementById('user-score');
const enemyScoreEl = document.getElementById('enemy-score');
const statusEl     = document.getElementById('game-status');

let state = 'idle'; // idle | playing | paused | over

let userScore  = 0;
let enemyScore = 0;

let userX  = 41;
let enemyX = 41;

let ballX, ballY;
let ballVX, ballVY;
const BASE_SPEED = 0.55; // % of box dimension per frame

const keys = { a: false, d: false };
const PADDLE_SPEED = 0.8; // % per frame

function resetBall(scoredSide) {
    const bw = boxEl.clientWidth;
    const bh = boxEl.clientHeight;

    ballX = bw / 2;
    ballY = bh / 2;

    // Launch toward whoever just got scored on
    const angle = (Math.random() * 40 - 20) * (Math.PI / 180);
    const dir   = scoredSide === 'user' ? 1 : -1; // 1 = down toward user, -1 = up toward enemy
    ballVX = Math.sin(angle) * BASE_SPEED * bw;
    ballVY = Math.cos(angle) * BASE_SPEED * bh * dir;
}

function startGame() {
    userScore  = 0;
    enemyScore = 0;
    userScoreEl.textContent  = '0';
    enemyScoreEl.textContent = '0';
    userX  = 41;
    enemyX = 41;
    resetBall('user');
    state = 'playing';
    statusEl.className = 'playing';
}

document.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  keys.a = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (state === 'idle' || state === 'over') startGame();
        else if (state === 'playing') { state = 'paused'; statusEl.textContent = 'PAUSED'; statusEl.className = ''; }
        else if (state === 'paused')  { state = 'playing'; statusEl.className = 'playing'; }
    }
});
document.addEventListener('keyup', e => {
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  keys.a = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
});

function rectOf(el) {
    return {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight
    };
}

function overlaps(bx, by, br, paddle) {
    const p = rectOf(paddle);
    return bx + br > p.x &&
           bx - br < p.x + p.w &&
           by + br > p.y &&
           by - br < p.y + p.h;
}

function moveEnemy() {
    const bw        = boxEl.clientWidth;
    const paddleW   = enemyEl.offsetWidth;
    const center    = enemyX + paddleW / 2;
    const ballCenter = ballX;
    const diff      = ballCenter - center;
    const aiSpeed   = Math.min(Math.abs(diff), PADDLE_SPEED * bw * 0.012);

    if (Math.abs(diff) > 2) {
        enemyX += diff > 0 ? aiSpeed : -aiSpeed;
    }
    enemyX = Math.max(0, Math.min(bw - paddleW, enemyX));
}

function flashArena(side) {
    boxEl.classList.remove('flash-user', 'flash-enemy');
    void boxEl.offsetWidth; // reflow
    boxEl.classList.add(side === 'user' ? 'flash-user' : 'flash-enemy');
}

function bumpScore(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 150);
}

function hitEffect(side) {
    ballEl.classList.remove('hit-user', 'hit-enemy');
    void ballEl.offsetWidth;
    ballEl.classList.add(side === 'user' ? 'hit-user' : 'hit-enemy');
    setTimeout(() => ballEl.classList.remove('hit-user', 'hit-enemy'), 200);
}

// ─── Main loop ───────────────────────────────
async function gameLoop() {
    requestAnimationFrame(gameLoop);
    if (state !== 'playing') return;

    const bw      = boxEl.clientWidth;
    const bh      = boxEl.clientHeight;
    const ballR   = ballEl.offsetWidth / 2;
    const pSpeed  = PADDLE_SPEED * bw * 0.015;

    // ── Move user paddle ──
    if (keys.d) userX = Math.min(bw - userEl.offsetWidth, userX + pSpeed);
    if (keys.a) userX = Math.max(0, userX - pSpeed);
    userEl.style.left = userX + 'px';

    // ── Move enemy ──
    moveEnemy();
    enemyEl.style.left = enemyX + 'px';

    // ── Move ball ──
    ballX += ballVX * 0.016;
    ballY += ballVY * 0.016;

    // ── Wall bounce (left / right) ──
    if (ballX - ballR <= 0)       { ballX = ballR;      ballVX = Math.abs(ballVX); }
    if (ballX + ballR >= bw)      { ballX = bw - ballR; ballVX = -Math.abs(ballVX); }

    // ── Paddle collision: user ──
    if (ballVY > 0 && overlaps(ballX, ballY, ballR, userEl)) {
        const p    = rectOf(userEl);
        const hit  = (ballX - (p.x + p.w / 2)) / (p.w / 2); // -1 to 1
        const angle = hit * 65 * (Math.PI / 180);
        const spd  = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.04;
        ballVX = Math.sin(angle) * spd;
        ballVY = -Math.abs(Math.cos(angle) * spd);
        ballY  = p.y - ballR;
        hitEffect('user');
    }

    // ── Paddle collision: enemy ──
    if (ballVY < 0 && overlaps(ballX, ballY, ballR, enemyEl)) {
        const p    = rectOf(enemyEl);
        const hit  = (ballX - (p.x + p.w / 2)) / (p.w / 2);
        const angle = hit * 65 * (Math.PI / 180);
        const spd  = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.04;
        ballVX =  Math.sin(angle) * spd;
        ballVY =  Math.abs(Math.cos(angle) * spd);
        ballY  = p.y + p.h + ballR;
        hitEffect('enemy');
    }

    // ── Scoring ──
    if (ballY - ballR > bh) {
        // enemy scores
        enemyScore++;
        enemyScoreEl.textContent = enemyScore;
        bumpScore(enemyScoreEl);
        flashArena('enemy');
        if (enemyScore >= 2) {
            endGame('CPU');
            await decis("lose");
            return;
        }
        resetBall('user');
    }
    if (ballY + ballR < 0) {
        // user scores
        userScore++;
        userScoreEl.textContent = userScore;
        bumpScore(userScoreEl);
        flashArena('user');
        if (userScore >= 2) { 
            endGame('YOU');
            await decis("win");
            return;
        }
        resetBall('enemy');
    }

    // ── Render ball ──
    ballEl.style.left = (ballX - ballR) + 'px';
    ballEl.style.top  = (ballY - ballR) + 'px';
}


function endGame(winner) {
    state = 'over';
    statusEl.textContent = `${winner} WIN  ·  SPACE TO REPLAY`;
    statusEl.className   = '';
}

async function decis(win){
    await fetch("http://bend-production-72e5.up.railway.app/pingpong/end", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        a: win,
        b: localStorage.getItem("username")
    })
    });
    return;
}

resetBall('user');
ballEl.style.left = (boxEl.clientWidth  / 2 - ballEl.offsetWidth  / 2) + 'px';
ballEl.style.top  = (boxEl.clientHeight / 2 - ballEl.offsetHeight / 2) + 'px';
userEl.style.left  = userX  + '%';
enemyEl.style.left = enemyX + '%';

gameLoop();