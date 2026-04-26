const API_BASE = 'https://bend-production-72e5.up.railway.app/controller';
let allRows = [];

async function fetchData() {
  try {
    const res = await fetch(`${API_BASE}/highscores`);
    if (!res.ok) throw new Error();
    allRows = await res.json();
    populateGameFilter();
    renderTable();
    document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="6"><div class="state-msg"><span>⚠</span>Could not connect to server.<br>Make sure the Spring Boot API is running on port 8080.</div></td></tr>`;
  }
}

function populateGameFilter() {
  const games = [...new Set(allRows.map(r => r.gameName))].sort();
  const sel = document.getElementById('gameFilter');
  const current = sel.value;
  sel.innerHTML = '<option value="">All Games</option>' +
    games.map(g => `<option value="${g}">${g}</option>`).join('');
  sel.value = current;
}

// FIX: Accept the click event as a parameter instead of relying on the global `event`
function setSortCol(col, thElement) {
  document.getElementById('sortBy').value = col;
  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  // FIX: Use the passed element reference instead of `event.target`
  thElement.classList.add('sorted');
  renderTable();
}

function renderTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const game = document.getElementById('gameFilter').value;
  const sort = document.getElementById('sortBy').value;

  let rows = allRows.filter(r =>
    (!search || r.username.toLowerCase().includes(search)) &&
    (!game || r.gameName === game)
  );

  rows.sort((a, b) => {
    if (sort === 'wins') return b.wins - a.wins;
    if (sort === 'losses') return b.losses - a.losses;
    // FIX: 'total' was already correct logic-wise, but now it can actually be reached
    if (sort === 'total') return (b.wins + b.losses) - (a.wins + a.losses);
    if (sort === 'winrate') {
      // FIX: Renamed lambda param to `row` to avoid shadowing the outer `r` variable
      const wr = row => row.wins + row.losses === 0 ? 0 : row.wins / (row.wins + row.losses);
      return wr(b) - wr(a);
    }
    return 0;
  });

  const tbody = document.getElementById('tableBody');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="state-msg"><span>🎮</span>No results found.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const rank = i + 1;
    const total = r.wins + r.losses;
    const wr = total === 0 ? 0 : Math.round((r.wins / total) * 100);
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    return `
      <tr>
        <td class="rank ${rankClass}">${medal}</td>
        <td class="username">${esc(r.username)}</td>
        <td><span class="game-tag">${esc(r.gameName)}</span></td>
        <td class="stat-win">${r.wins}</td>
        <td class="stat-loss">${r.losses}</td>
        <td>
          <div class="winrate-bar-wrap">
            <div class="winrate-bar"><div class="winrate-bar-fill" style="width:${wr}%"></div></div>
            <span class="winrate-pct">${wr}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function goBack() {
  if (document.referrer) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

fetchData();
setInterval(fetchData, 30000); // auto-refresh every 30s