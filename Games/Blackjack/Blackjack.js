// ── SCORE DISPLAY ──────────────────────────────────────────────

function setPlayerTotal(val) {
    const el = document.getElementById('player_total');
    el.textContent = val;
    el.className   = 'hand-total' + (val > 21 ? ' danger' : '');
}

function setEnemyTotal(val) {
    const el = document.getElementById('enemy_total');
    el.textContent = val === null ? '?' : val;
    el.className   = 'hand-total' + (val > 21 ? ' danger' : '');
}

// ── FETCH HELPERS ──────────────────────────────────────────────
async function getnumberU() {
    const res = await fetch("https://bend-production-72e5.up.railway.app/blackjack/number");
    return res.json();
}

async function getnumberO() {
    const res = await fetch("https://bend-production-72e5.up.railway.app/blackjack/number2");
    return res.json();
}

async function fetchPlayerTotal() {
    const res = await fetch("https://bend-production-72e5.up.railway.app/blackjack/getTotal");
    return res.json();
}

async function fetchEnemyTotal() {
    const res = await fetch("https://bend-production-72e5.up.railway.app/blackjack/getEnemy");
    return res.json();
}

// ── START ──────────────────────────────────────────────────────
async function start() {
    stand.disabled = false;
    hit.disabled   = false;
    onstand        = false;

    container.innerHTML = '';
    enemy_c.innerHTML   = '';
    setPlayerTotal(0);
    setEnemyTotal(null);

    try {
        await fetch("https://bend-production-72e5.up.railway.app/blackjack/start");

        const nameRes  = localStorage.getItem("username");
        document.getElementById('uname_val').textContent = nameRes;

        // Deal first player card
        await dealPlayerCard();

        // Deal first enemy card
        await dealEnemyCard();

    } catch (e) {
        console.error("Start error:", e);
    }
}

// ── DEAL HELPERS ───────────────────────────────────────────────
async function dealPlayerCard() {
    const num  = await getnumberU();
    const suit = CardType[randomize(CardType)];
    const div  = document.createElement("div");
    div.classList.add('Card');
    div.style.backgroundImage = `url(Cards/${num}_of_${suit}.png)`;
    container.appendChild(div);

    const total = await fetchPlayerTotal();
    setPlayerTotal(total);
    return total;
}

async function dealEnemyCard() {
    const num  = await getnumberO();
    const suit = CardType[randomize(CardType)];
    const div  = document.createElement("div");
    div.classList.add('ECard');
    div.style.backgroundImage = `url(Cards/${num}_of_${suit}.png)`;
    enemy_c.appendChild(div);
}

// ── HIT ────────────────────────────────────────────────────────
async function callHit() {
    if (onstand) return;

    hit.disabled = true;
    hit.style.animation = 'Ahit1 0.5s ease-in-out forwards';
    await wait(0.5);

    const total = await dealPlayerCard();

    hit.style.animation = 'Ahit2 0.4s ease-in-out forwards';
    await wait(0.4);
    hit.style.animation = '';

    if (total >= 21) {
        await callStand();
        return;
    }

    hit.disabled = false;
}

// ── STAND ──────────────────────────────────────────────────────
async function callStand() {
    if (onstand) return;

    stand.disabled = true;
    hit.disabled   = true;
    onstand        = true;

    let user_value  = await fetchPlayerTotal();
    let enemy_value = await fetchEnemyTotal();

    // Reveal enemy total
    setEnemyTotal(enemy_value);

    // Enemy draws to 17
    while (enemy_value < 17) {
        await dealEnemyCard();
        await wait(0.8);
        enemy_value = await fetchEnemyTotal();
        setEnemyTotal(enemy_value);
    }

    await wait(0.5);

    // Determine result
    if (user_value > 21) {
        showResult('lose', user_value, enemy_value);
    } else if (enemy_value > 21 || user_value > enemy_value) {
        showResult('win', user_value, enemy_value);
    } else if (user_value < enemy_value) {
        showResult('lose', user_value, enemy_value);
    } else {
        showResult('tie', user_value, enemy_value);
    }
}

// ── RESULT OVERLAY ─────────────────────────────────────────────
function showResult(type, playerVal, enemyVal) {
    const overlay = document.getElementById('result-overlay');
    const box     = document.getElementById('result-box');
    const tag     = document.getElementById('result-tag');
    const title   = document.getElementById('result-title');
    const detail  = document.getElementById('result-detail');
    const btn     = document.getElementById('result-btn');

    box.className = '';
    overlay.classList.add('show');

    detail.textContent = `PLAYER ${playerVal}  ·  DEALER ${enemyVal}`;

    if (type === 'win') {
        tag.textContent   = '// ROUND COMPLETE';
        title.textContent = 'VICTORY';
        title.style.color = 'var(--green)';
        title.style.textShadow = 'var(--glow-g)';
        btn.style.borderColor  = 'rgba(0,255,136,0.35)';
        btn.style.color = 'var(--green)';
        pendingRestart = () => { totalWins++; decisionWin("win"); };
    } else if (type === 'lose') {
        box.classList.add('lose-box');
        tag.textContent   = '// ROUND COMPLETE';
        title.textContent = 'DEFEATED';
        title.style.color = 'var(--red)';
        title.style.textShadow = 'var(--glow-r)';
        btn.style.borderColor  = 'rgba(255,61,90,0.35)';
        btn.style.color = 'var(--red)';
        pendingRestart = () => { totalLosses++; decisionWin("lose"); };
    } else {
        box.classList.add('tie-box');
        tag.textContent   = '// ROUND COMPLETE';
        title.textContent = 'STALEMATE';
        title.style.color = 'var(--gold)';
        title.style.textShadow = 'var(--glow-gold)';
        btn.style.borderColor  = 'rgba(255,201,64,0.35)';
        btn.style.color = 'var(--gold)';
        pendingRestart = null;
    }
}

function dismissResult() {
    document.getElementById('result-overlay').classList.remove('show');
    if (pendingRestart) pendingRestart();
    pendingRestart = null;
    start();
}

// ── SCORE SUBMIT ───────────────────────────────────────────────
async function decisionWin(decis) {
    try {
        await fetch("https://bend-production-72e5.up.railway.app/blackjack/receive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                a: decis,
                b: localStorage.getItem("username")
            })
        });
    } catch (e) {
        console.error("Score submit error:", e);
    }
}
var hs = null;
hit.addEventListener("mouseenter", (e) => {
    var hv = document.createElement('div')
    hv.classList.add('over');
    hv.innerHTML = 
    "<span class='over_span'> Hit</span>"

    document.body.appendChild(hv)
    hs = hv;
})

hit.addEventListener("mousemove", (e) => {
  hs.style.left = e.clientX + 10;
  hs.style.top = e.clientY + 10;
})

hit.addEventListener("mouseleave", (e) => {
    var hv = document.createElement('div')
    hv.classList.remove('over');

    hs.remove();
})
start();