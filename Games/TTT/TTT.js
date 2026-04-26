const divs = document.querySelectorAll("#main_b div");
let playerChar = '';
let pendingResult = null;

// ── Score tracking (totals across restarts) ──
let totalWins = 0;
let totalLosses = 0;
let gameActive = true;
let isProcessing = false; // Add this flag to prevent clicks during initialization/enemy turn

async function start() {
    gameActive = true;
    isProcessing = true; // Block clicks during initialization
    
    // Reset board visuals
    divs.forEach(div => {
        div.innerHTML = '';
        div.classList.remove('x-cell', 'o-cell', 'taken', 'win-cell');
    });
    setTurnIndicator('loading');

    try {
        await fetch("https://bend-production-72e5.up.railway.app/ttt/Start");

        // Get username
        const username = localStorage.getItem("username");
        document.getElementById("uname_val").textContent = username;

        // Get player character
        const charRes = await fetch("https://bend-production-72e5.up.railway.app/ttt/player");
        playerChar = await charRes.json();
        console.log("Player character:", playerChar);

        if (playerChar === 'O') {
            setTurnIndicator('enemy');
            await wait(0.3);
            await enemymove();
            setTurnIndicator('yours');
        } else {
            setTurnIndicator('yours');
        }
        
        isProcessing = false; // Unblock clicks after initialization
    } catch (e) {
        console.error("Start error:", e);
        setTurnIndicator('error');
        isProcessing = false; // Unblock even on error
    }
}

async function board(x, y) {
    var texts = document.getElementById('turn-indicator').textContent 
    if(texts == 'CONNECTION ERROR') return
    // Prevent clicks during initialization, enemy turn, or after game ends
    if (isProcessing || !gameActive) {
        console.log("Click blocked - processing:", isProcessing, "gameActive:", gameActive);
        flashInvalid(y); // Visual feedback that click was blocked
        return;
    }
    
    if (y.classList.contains('taken')) {
        flashInvalid(y);
        return;
    }

    // Block further clicks during move processing
    isProcessing = true;
    
    console.log(`Player move at index ${x}, char: ${playerChar}`);
    markCell(y, playerChar);
    setTurnIndicator('enemy');

    try {
        await fetch("https://bend-production-72e5.up.railway.app/ttt/move", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: String(x)
        });

        const ended = await check();
        if (ended) {
            gameActive = false;
            isProcessing = false;
            return;
        }

        await enemymove();
        
        const endedAfterEnemy = await check();
        if (endedAfterEnemy) {
            gameActive = false;
        } else {
            setTurnIndicator('yours');
        }
        
        isProcessing = false;
    } catch (e) {
        console.error("Move error:", e);
        setTurnIndicator('yours');
        isProcessing = false;
    }
}

async function enemymove() {
    if (!gameActive) return;
    
    try {
        const res = await fetch("https://bend-production-72e5.up.railway.app/ttt/enemymove");
        const idx = await res.json();
        console.log(`Enemy move at index: ${idx}`);
        
        const div = document.querySelector(`#main_b div:nth-child(${idx + 1})`);
        
        if (div.classList.contains('taken')) {
            console.warn("Enemy tried to move to taken cell!");
            return;
        }
        
        const enemyChar = playerChar === 'X' ? 'O' : 'X';
        console.log(`Enemy char: ${enemyChar}`);
        markCell(div, enemyChar);
    } catch (e) {
        console.error("Enemy move error:", e);
    }
}

async function check() {
    try {
        const res = await fetch("https://bend-production-72e5.up.railway.app/ttt/Checkwin", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: localStorage.getItem("username")
        });
        const result = await res.json();
        console.log("Check result:", result);

        if (result === 1) {
            totalWins++;
            await wait(0.4);
            showStatus('win');
            return true;
        } else if (result === 2) {
            totalLosses++;
            await wait(0.4);
            showStatus('lose');
            return true;
        } else if (result === 3) {
            await wait(0.4);
            showStatus('draw');
            return true;
        }
    } catch (e) {
        console.error("Check error:", e);
    }
    return false;
}

// ── Helpers ──

function markCell(div, char) {
    console.log(`Marking cell with: ${char}`);
    div.innerHTML = char;
    div.classList.add('taken', char === 'X' ? 'x-cell' : 'o-cell');
}

function flashInvalid(div) {
    div.style.borderColor = 'rgba(255,0,200,0.8)';
    setTimeout(() => { div.style.borderColor = ''; }, 300);
}

function setTurnIndicator(state) {
    const el = document.getElementById('turn-indicator');
    el.className = '';
    switch (state) {
        case 'yours':
            el.textContent = `▶ YOUR TURN  [ ${playerChar} ]`;
            el.classList.add('your-turn');
            break;
        case 'enemy':
            el.textContent = '// ENEMY COMPUTING...';
            el.classList.add('enemy-turn');
            break;
        case 'loading':
            el.innerHTML = 'INITIALIZING<span class="blink">...</span>';
            break;
        case 'error':
            el.textContent = 'CONNECTION ERROR';
            el.classList.add('enemy-turn');
            break;
    }
}

function showStatus(type) {
    const overlay = document.getElementById('status-overlay');
    const box = document.getElementById('status-box');
    const text = document.getElementById('status-text');
    const sub = document.getElementById('status-sub');

    box.className = '';
    overlay.classList.add('show');

    if (type === 'win') {
        box.classList.add('win-box');
        text.style.color = 'var(--cyan)';
        text.style.textShadow = 'var(--glow-cyan)';
        text.textContent = 'VICTORY';
        sub.textContent = '// You win!';
    } else if (type === 'lose') {
        box.classList.add('lose-box');
        text.style.color = 'var(--magenta)';
        text.style.textShadow = 'var(--glow-magenta)';
        text.textContent = 'DEFEAT';
        sub.textContent = '// You Lose!';
    } else {
        box.classList.add('draw-box');
        text.style.color = 'rgba(255,220,0,0.9)';
        text.style.textShadow = '0 0 8px rgba(255,200,0,0.6)';
        text.textContent = 'STALEMATE';
        sub.textContent = '// Draw.';
    }
}

function dismissStatus() {
    document.getElementById('status-overlay').classList.remove('show');
    gameActive = true;
    start();
}

function wait(sec) {
    return new Promise(r => setTimeout(r, sec * 1000));
}

start();