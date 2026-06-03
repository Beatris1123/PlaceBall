/* ═══════════════════════════════════════════════════════════════
   PLACEBALL · 점령전 랭킹 (battle-ranking.js)
   ═══════════════════════════════════════════════════════════════ */

/* ── 팀 메타 ── */
const TEAM_META = {
  'KIA':  { emoji:'🐯', color:'#E60012', bg:'#FFF0F0' },
  'LG':   { emoji:'⚡', color:'#C60C30', bg:'#FFF0F3' },
  '삼성': { emoji:'🦁', color:'#074CA1', bg:'#EFF4FF' },
  '두산': { emoji:'🐻', color:'#131230', bg:'#F0F0FF' },
  '롯데': { emoji:'🌊', color:'#041E42', bg:'#EFF6FF' },
  'SSG':  { emoji:'🛬', color:'#CE0E2D', bg:'#FFF0F2' },
  'NC':   { emoji:'🦕', color:'#071D36', bg:'#EDF4FF' },
  'KT':   { emoji:'⚫', color:'#000000', bg:'#F5F5F5' },
  '한화': { emoji:'🦅', color:'#FC4E00', bg:'#FFF3EE' },
  '키움': { emoji:'🦸', color:'#820024', bg:'#FFF0F4' },
};

const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' };

/* ── 상태 ── */
let currentPeriod = 'month';   // 기본값: 이번 달
let rankingData   = [];
let recentData    = [];
let myTeam        = '';

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initYearSelect();
  initMonthSelect();
  // 기본 탭 "이번 달" 활성화
  document.querySelectorAll('.br-period-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.br-period-btn[data-period="month"]')?.classList.add('active');
  document.getElementById('br-month-wrap').style.display = 'flex';
  loadAll();
  bindEvents();
});

function initAuth() {
  const nick = sessionStorage.getItem('nickname') || localStorage.getItem('nickname');
  const team = sessionStorage.getItem('favoriteTeam') || localStorage.getItem('favoriteTeam');
  myTeam = team || '';
  if (nick) {
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('user-info-section').style.display = 'flex';
    document.getElementById('user-nickname').textContent = nick;
  }
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.clear(); localStorage.removeItem('nickname'); localStorage.removeItem('favoriteTeam');
    location.reload();
  });
}

function initYearSelect() {
  const sel = document.getElementById('br-year');
  const now = new Date().getFullYear();
  for (let y = now; y >= 2020; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    if (y === now) opt.selected = true;
    sel.appendChild(opt);
  }
}

function initMonthSelect() {
  const sel = document.getElementById('br-month');
  const now = new Date().getMonth() + 1;
  for (let i = 0; i < sel.options.length; i++) {
    if (parseInt(sel.options[i].value) === now) { sel.selectedIndex = i; break; }
  }
}

function bindEvents() {
  document.querySelectorAll('.br-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.br-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      document.getElementById('br-month-wrap').style.display =
        currentPeriod === 'month' ? 'flex' : 'none';
      loadAll();
    });
  });
  document.getElementById('br-refresh').addEventListener('click', loadAll);
  document.getElementById('br-year').addEventListener('change', loadAll);
  document.getElementById('br-month').addEventListener('change', () => {
    if (currentPeriod === 'month') loadAll();
  });
  document.getElementById('br-modal-close').addEventListener('click', closeModal);
  document.getElementById('br-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('br-modal')) closeModal();
  });
}

/* ── 데이터 로드 ── */
async function loadAll() {
  await Promise.all([loadRankings(), loadRecentResults()]);
}

async function loadRankings() {
  const year  = document.getElementById('br-year').value;
  const month = currentPeriod === 'month' ? document.getElementById('br-month').value : '';

  document.getElementById('br-podium').innerHTML    = '<div class="podium-loading">순위를 계산하는 중...</div>';
  document.getElementById('br-table-wrap').innerHTML = '<div class="table-loading">데이터를 불러오는 중...</div>';

  // 항상 월간 집계 (이번 달 기준)
  let url = `/api/battle/rankings?year=${year}`;
  if (month) url += `&month=${month}`;

  try {
    const res   = await fetch(url);
    rankingData  = await res.json();
    renderPodium(rankingData);
    renderTable(rankingData, !!month);
  } catch (e) {
    document.getElementById('br-podium').innerHTML    = '<div class="podium-loading">데이터를 불러올 수 없습니다.</div>';
    document.getElementById('br-table-wrap').innerHTML = '<div class="table-loading">오류가 발생했습니다.</div>';
  }
}

async function loadRecentResults() {
  document.getElementById('br-recent-list').innerHTML = '<div class="recent-loading">불러오는 중...</div>';

  // 최근 30일: 오늘부터 하루씩 거슬러 올라가며 결과 수집
  const results = [];
  const today   = new Date();
  try {
    for (let i = 0; i < 30 && results.length < 20; i++) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const res     = await fetch(`/api/battle/result?date=${dateStr}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.length > 0) {
        results.push(...data.map(r => ({ ...r, gameDate: r.gameDate || dateStr })));
      }
    }
    recentData = results;
    renderRecentResults(results);
  } catch (e) {
    document.getElementById('br-recent-list').innerHTML =
      '<div class="recent-empty">최근 점령전 결과를 불러올 수 없습니다.</div>';
  }
}

/* ── 포디엄 렌더링 ── */
function renderPodium(data) {
  const el = document.getElementById('br-podium');
  // 경기를 한 팀만 (played > 0) 포디엄에 올림
  const played = data.filter(t => t.played > 0);
  if (!played || played.length === 0) {
    el.innerHTML = '<div class="podium-loading">이번 달 아직 확정된 점령전이 없습니다.</div>'; return;
  }

  const top3  = played.slice(0, 3);
  const order = [
    top3.find(t => t.rank === 2),
    top3.find(t => t.rank === 1),
    top3.find(t => t.rank === 3),
  ].filter(Boolean);

  el.innerHTML = `<div class="podium-wrap">${order.map(t => podiumCard(t)).join('')}</div>`;
}

function podiumCard(t) {
  const meta = TEAM_META[t.team] || { emoji:'⚾', color:'#374151', bg:'#F9FAFB' };
  const pct  = t.winPct === '-' ? '-.---' : t.winPct;
  return `
  <div class="podium-item rank-${t.rank}" onclick="openTeamModal('${t.team}')">
    <div class="podium-card" style="border-color:${meta.color}22;">
      <div class="podium-rank-badge">${t.rank}</div>
      ${t.rank === 1 ? '<div class="podium-crown">👑</div>' : ''}
      <div class="podium-emblem" style="background:${meta.bg};border-color:${meta.color}33;">
        ${meta.emoji}
      </div>
      <div class="podium-team-name" style="color:${meta.color};">${t.team}</div>
      <div class="podium-stats">
        <div class="podium-stat">
          <span class="podium-stat-num win">${t.wins}</span>
          <span class="podium-stat-label">승</span>
        </div>
        <div class="podium-stat">
          <span class="podium-stat-num lose">${t.loses}</span>
          <span class="podium-stat-label">패</span>
        </div>
        <div class="podium-stat">
          <span class="podium-stat-num draw">${t.draws}</span>
          <span class="podium-stat-label">무</span>
        </div>
      </div>
      <div class="podium-pct">승률 ${pct}</div>
    </div>
    <div class="podium-block"></div>
  </div>`;
}

/* ── 테이블 렌더링 ── */
function renderTable(data, isMonth) {
  const wrap = document.getElementById('br-table-wrap');
  if (!data || data.length === 0) {
    wrap.innerHTML = '<div class="table-loading">아직 점령전 결과가 없습니다.</div>'; return;
  }

  const ptsLabel = isMonth ? '이달 총 응원점수' : '시즌 총 응원점수';

  const rows = data.map(t => {
    const meta      = TEAM_META[t.team] || { emoji:'⚾', color:'#374151', bg:'#F9FAFB' };
    const rankBadge = t.rank <= 3
      ? `<span class="rank-num rank-${t.rank}-badge">${t.rank}</span>`
      : `<span class="rank-num rank-rest">${t.rank}</span>`;
    const isMe      = t.team === myTeam;
    const pct       = t.winPct === '-' ? 0 : parseFloat('0' + t.winPct);
    const pctDisplay = t.winPct === '-' ? '-' : t.winPct;
    // 경기 없는 팀은 회색으로
    const rowStyle  = t.played === 0 ? 'opacity:0.45;' : '';

    return `
    <tr class="${isMe ? 'my-team-row' : ''}" style="${rowStyle}" onclick="openTeamModal('${t.team}')">
      <td class="rank-cell center">${rankBadge}</td>
      <td>
        <div class="team-cell">
          <div class="team-emblem-sm" style="background:${meta.bg};border-color:${meta.color}33;">${meta.emoji}</div>
          <span class="team-name-sm" style="color:${meta.color};">${t.team}</span>
          ${isMe ? '<span class="team-tag-my">나의 팀</span>' : ''}
        </div>
      </td>
      <td class="center">${t.played}</td>
      <td class="center wins-cell">${t.wins}</td>
      <td class="center loses-cell">${t.loses}</td>
      <td class="center draws-cell">${t.draws}</td>
      <td class="center pct-cell">${pctDisplay}</td>
      <td class="center pts-cell">${t.totalPts.toLocaleString()}pt</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
  <table class="br-table">
    <thead>
      <tr>
        <th class="center">순위</th>
        <th>팀</th>
        <th class="center">경기</th>
        <th class="center">승</th>
        <th class="center">패</th>
        <th class="center">무</th>
        <th class="center">승률</th>
        <th class="center">${ptsLabel}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ── 최근 결과 렌더링 ── */
function renderRecentResults(results) {
  const el = document.getElementById('br-recent-list');
  if (!results || results.length === 0) {
    el.innerHTML = '<div class="recent-empty">최근 30일간 확정된 점령전 결과가 없습니다.</div>'; return;
  }

  el.innerHTML = results.slice(0, 15).map(r => {
    const homeMeta = TEAM_META[r.homeTeam] || { emoji:'⚾', color:'#374151' };
    const awayMeta = TEAM_META[r.awayTeam] || { emoji:'⚾', color:'#374151' };
    const winner   = r.cheerWinner;
    const isCancel = winner === 'cancel';
    const isDraw   = winner === 'draw';

    let badge = '';
    if      (isCancel)              badge = `<span class="recent-winner-badge winner-cancel">취소</span>`;
    else if (isDraw)                badge = `<span class="recent-winner-badge winner-draw">무승부</span>`;
    else if (winner === r.homeTeam) badge = `<span class="recent-winner-badge winner-home">${r.homeTeam} 승리 🏆</span>`;
    else                            badge = `<span class="recent-winner-badge winner-away">${r.awayTeam} 승리 🏆</span>`;

    return `
    <div class="recent-card">
      <span class="recent-date">${r.gameDate.slice(5)}</span>
      <div class="recent-match">
        <div class="recent-team">
          <span class="recent-team-emoji">${homeMeta.emoji}</span>
          <span class="recent-team-name" style="color:${homeMeta.color}">${r.homeTeam}</span>
        </div>
        <div class="recent-score-block">
          <div class="recent-cheer-label">응원포인트</div>
          <div class="recent-score">${r.homeCheerScore}<span class="recent-score-sep">:</span>${r.awayCheerScore}</div>
        </div>
        <div class="recent-team">
          <span class="recent-team-emoji">${awayMeta.emoji}</span>
          <span class="recent-team-name" style="color:${awayMeta.color}">${r.awayTeam}</span>
        </div>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

/* ── 팀 상세 모달 ── */
function openTeamModal(teamName) {
  const t    = rankingData.find(r => r.team === teamName);
  if (!t) return;
  const meta   = TEAM_META[teamName] || { emoji:'⚾', color:'#374151', bg:'#F9FAFB' };
  const pct    = t.winPct === '-' ? 0 : parseFloat('0' + t.winPct);
  const pctPct = Math.round(pct * 100);

  const teamRecent = recentData
    .filter(r => r.homeTeam === teamName || r.awayTeam === teamName)
    .slice(0, 6);

  const recentRows = teamRecent.length === 0
    ? '<div style="color:#94A3B8;font-size:12px;padding:.5rem 0;">최근 결과 없음</div>'
    : teamRecent.map(r => {
        const isHome   = r.homeTeam === teamName;
        const opponent = isHome ? r.awayTeam : r.homeTeam;
        const oppMeta  = TEAM_META[opponent] || { emoji:'⚾' };
        const winner   = r.cheerWinner;
        let resClass = 'res-draw', resText = '무';
        if      (winner === 'cancel')      { resClass = 'res-draw'; resText = '취'; }
        else if (winner === 'draw')        { resClass = 'res-draw'; resText = '무'; }
        else if (winner === teamName)      { resClass = 'res-win';  resText = '승'; }
        else                               { resClass = 'res-lose'; resText = '패'; }
        const myPts  = isHome ? r.homeCheerScore : r.awayCheerScore;
        const oppPts = isHome ? r.awayCheerScore : r.homeCheerScore;
        return `
        <div class="modal-recent-row">
          <span class="modal-result-badge ${resClass}">${resText}</span>
          <span class="modal-vs-text">${r.gameDate.slice(5)} vs ${oppMeta.emoji} ${opponent}</span>
          <span class="modal-pts-text">${myPts}pt : ${oppPts}pt</span>
        </div>`;
      }).join('');

  const isMonth  = currentPeriod === 'month';
  const ptsLabel = isMonth ? '이달 총 응원점수' : '시즌 총 응원점수';

  document.getElementById('br-modal-content').innerHTML = `
    <div class="modal-team-header">
      <div class="modal-team-emoji">${meta.emoji}</div>
      <div class="modal-team-name" style="color:${meta.color}">${teamName}</div>
      <div class="modal-team-rank">${t.rank}위 · ${t.played}경기</div>
    </div>
    <div class="modal-stats-grid">
      <div class="modal-stat-card win-card">
        <span class="modal-stat-num">${t.wins}</span>
        <span class="modal-stat-label">승리</span>
      </div>
      <div class="modal-stat-card lose-card">
        <span class="modal-stat-num">${t.loses}</span>
        <span class="modal-stat-label">패배</span>
      </div>
      <div class="modal-stat-card">
        <span class="modal-stat-num" style="color:#94A3B8">${t.draws}</span>
        <span class="modal-stat-label">무승부</span>
      </div>
    </div>
    <div class="modal-winpct">
      <div class="modal-winpct-label">승률</div>
      <div class="modal-winpct-bar-track">
        <div class="modal-winpct-bar-fill" style="width:0%" id="modal-bar"></div>
      </div>
      <div class="modal-winpct-val">${t.winPct === '-' ? '-' : t.winPct}</div>
    </div>
    <div style="text-align:center;margin-bottom:1rem;padding:.75rem;
                background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;">
      <div style="font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:.06em;margin-bottom:3px;">${ptsLabel.toUpperCase()}</div>
      <div style="font-size:1.6rem;font-weight:900;color:#0F1923;">${t.totalPts.toLocaleString()}<span style="font-size:.9rem;font-weight:600;color:#94A3B8;">pt</span></div>
    </div>
    <div class="modal-recent-title">최근 점령전 결과</div>
    ${recentRows}`;

  document.getElementById('br-modal').style.display = 'flex';
  setTimeout(() => {
    const bar = document.getElementById('modal-bar');
    if (bar) bar.style.width = pctPct + '%';
  }, 50);
}

function closeModal() {
  document.getElementById('br-modal').style.display = 'none';
}
