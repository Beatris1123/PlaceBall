/* ============================================================
   PLACEBALL - schedule.js
   KBO 경기일정 페이지 — Spring Boot API 연동 버전
   ============================================================ */

// ──────────────────────────────────────────────────────────────
// 1. 상수
// ──────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  'KIA':  '#C8102E', 'LG':   '#C30452', '삼성': '#074CA1',
  '두산': '#131230', '롯데': '#002B5B', 'SSG':  '#CE0E2D',
  'NC':   '#315288', 'KT':   '#222222', '한화': '#FF6600', '키움': '#820024',
};

// 임시 순위 (순위 API 구현 전까지 사용)
const MOCK_STANDINGS = [
  { rank:1,  team:'KIA',  wins:28, losses:14, pct:'.667' },
  { rank:2,  team:'LG',   wins:25, losses:16, pct:'.610' },
  { rank:3,  team:'삼성', wins:23, losses:18, pct:'.561' },
  { rank:4,  team:'SSG',  wins:22, losses:19, pct:'.537' },
  { rank:5,  team:'두산', wins:21, losses:20, pct:'.512' },
  { rank:6,  team:'KT',   wins:20, losses:21, pct:'.488' },
  { rank:7,  team:'NC',   wins:19, losses:22, pct:'.463' },
  { rank:8,  team:'한화', wins:18, losses:23, pct:'.439' },
  { rank:9,  team:'롯데', wins:15, losses:26, pct:'.366' },
  { rank:10, team:'키움', wins:13, losses:28, pct:'.317' },
];

// ──────────────────────────────────────────────────────────────
// 2. 상태 변수
// ──────────────────────────────────────────────────────────────
const _today     = new Date();
let currentYear  = _today.getFullYear();
let currentMonth = _today.getMonth(); // 0-based
let selectedDate = null;
let activeTeam   = 'all';
let activeTab    = 'all';
let cachedGames  = [];   // API에서 받아온 원본 데이터 캐시

// ──────────────────────────────────────────────────────────────
// 3. 유틸
// ──────────────────────────────────────────────────────────────
function todayStr() {
  const y = _today.getFullYear();
  const m = String(_today.getMonth() + 1).padStart(2, '0');
  const d = String(_today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTeamColor(name) {
  return TEAM_COLORS[name] || '#6b7280';
}

// API 응답(Game 엔티티) → 프론트 통일 포맷 변환
function normalizeGame(g) {
  return {
    id:         g.id,
    date:       g.gameDate,                          // "2025-05-02"
    time:       g.gameTime ? g.gameTime.slice(0,5) : '',  // "18:30:00" → "18:30"
    home:       g.homeTeam,
    away:       g.awayTeam,
    homeScore:  g.homeScore,
    awayScore:  g.awayScore,
    status:     g.status || 'upcoming',
    venue:      g.venue   || '미정',
    inning:     g.inning  || '',
    weather:    g.weather || '☀️',
  };
}

// ──────────────────────────────────────────────────────────────
// 4. API 호출
// ──────────────────────────────────────────────────────────────
function showLoading(show) {
  const list  = document.getElementById('gamesList');
  const empty = document.getElementById('emptyState');
  if (show) {
    list.innerHTML = `
      <div style="text-align:center;padding:3rem;color:rgba(255,255,255,0.8);">
        <div style="font-size:2rem;margin-bottom:0.75rem;animation:pulse 1s infinite;">⚾</div>
        <p style="font-weight:700;">경기 정보를 불러오는 중...</p>
      </div>`;
    empty.style.display = 'none';
  }
}

async function fetchGames() {
  showLoading(true);

  let url = `/api/games?year=${currentYear}&month=${currentMonth + 1}`;
  if (activeTeam !== 'all') url += `&team=${encodeURIComponent(activeTeam)}`;
  if (activeTab === 'upcoming' || activeTab === 'finished' || activeTab === 'live') {
    url += `&status=${activeTab}`;
  }

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedGames = data.map(normalizeGame);
  } catch (e) {
    console.warn('API 호출 실패, 빈 목록으로 처리:', e);
    cachedGames = [];
  }

  renderCalendar();
  renderGames();
}

async function fetchTodayGames() {
  try {
    const res  = await fetch('/api/games/today');
    const data = await res.json();
    return data.map(normalizeGame);
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// 5. 클라이언트 필터
// ──────────────────────────────────────────────────────────────
function getFilteredGames() {
  let games = [...cachedGames];

  // 탭 필터 (today는 클라이언트에서)
  if (activeTab === 'today')    games = games.filter(g => g.date === todayStr());

  // 날짜 선택 필터
  if (selectedDate) games = games.filter(g => g.date === selectedDate);

  games.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return games;
}

// ──────────────────────────────────────────────────────────────
// 6. 렌더: 경기 카드
// ──────────────────────────────────────────────────────────────
function renderGames() {
  const list  = document.getElementById('gamesList');
  const empty = document.getElementById('emptyState');
  const games = getFilteredGames();

  if (games.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // 날짜별 그룹핑
  const grouped = {};
  games.forEach(g => {
    if (!grouped[g.date]) grouped[g.date] = [];
    grouped[g.date].push(g);
  });

  let html = '';
  Object.keys(grouped).sort().forEach(date => {
    const label   = formatDateLabel(date);
    const count   = grouped[date].length;
    const isToday = date === todayStr();
    html += `
      <div class="date-divider">
        <span class="date-divider-text">${label}${isToday ? ' 🔴' : ''}</span>
        <div class="date-divider-line"></div>
        <span class="date-divider-badge">${count}경기</span>
      </div>`;
    grouped[date].forEach((g, i) => { html += buildGameCard(g, i); });
  });

  list.innerHTML = html;
}

function formatDateLabel(dateStr) {
  const d    = new Date(dateStr + 'T00:00:00');
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function buildGameCard(g, idx) {
  const homeColor  = getTeamColor(g.home);
  const awayColor  = getTeamColor(g.away);
  const badgeClass = { live:'badge-live', upcoming:'badge-upcoming', finished:'badge-finished' }[g.status] || 'badge-upcoming';
  const badgeText  = { live:'LIVE', upcoming:'예정', finished:'종료' }[g.status] || '예정';

  const scoreHTML = g.status === 'upcoming'
    ? `<span class="game-time">${g.time}</span>`
    : `<div class="score-display">
        <span class="score-num">${g.awayScore ?? '-'}</span>
        <span class="score-sep">:</span>
        <span class="score-num">${g.homeScore ?? '-'}</span>
       </div>`;

  const inningText = g.status === 'live' && g.inning
    ? `<span class="inning-info">${g.inning}</span>` : '';

  return `
    <div class="game-card ${g.status === 'live' ? 'is-live' : ''}" style="animation-delay:${idx*0.04}s">
      <div class="team-block away">
        <div class="team-logo-wrap" style="background:${awayColor}">${g.away}</div>
        <span class="team-name-full">${g.away}</span>
      </div>
      <div class="score-center">
        <span class="game-status-badge ${badgeClass}">${badgeText}</span>
        ${scoreHTML}
        ${inningText}
        <span class="game-venue">🏟 ${g.venue}</span>
      </div>
      <div class="team-block home">
        <div class="team-logo-wrap" style="background:${homeColor}">${g.home}</div>
        <span class="team-name-full">${g.home}</span>
      </div>
      <div class="game-extra">
        <span class="weather-info">${g.weather}</span>
      </div>
    </div>`;
}

// ──────────────────────────────────────────────────────────────
// 7. 렌더: 미니 캘린더
// ──────────────────────────────────────────────────────────────
function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = `${currentMonth+1}월 ${currentYear}`;

  const container = document.getElementById('calDays');
  const firstDay  = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate  = new Date(currentYear, currentMonth + 1, 0).getDate();

  const gameDates = new Set(cachedGames.map(g => g.date));

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= lastDate; d++) {
    const ds  = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(ds + 'T00:00:00').getDay();
    const cls = ['cal-day',
      dow===0?'sun-col': dow===6?'sat-col':'',
      ds===todayStr()?'today':'',
      ds===selectedDate&&ds!==todayStr()?'selected':'',
      gameDates.has(ds)?'has-game':'',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = selectedDate === el.dataset.date ? null : el.dataset.date;
      renderCalendar();
      renderGames();
    });
  });
}

// ──────────────────────────────────────────────────────────────
// 8. 렌더: 오늘 경기 요약
// ──────────────────────────────────────────────────────────────
async function renderTodaySummary() {
  const wrap  = document.getElementById('todayGamesSummary');
  const games = await fetchTodayGames();

  if (games.length === 0) {
    wrap.innerHTML = `<p class="no-game-today">오늘 경기가 없습니다</p>`;
    return;
  }
  wrap.innerHTML = games.map(g => {
    const score = g.status === 'upcoming'
      ? `<span class="tg-time">${g.time}</span>`
      : `<span class="tg-score">${g.awayScore} : ${g.homeScore}</span>`;
    return `<div class="today-game-item">
      <span class="tg-teams">${g.away} vs ${g.home}</span>${score}
    </div>`;
  }).join('');
}

// ──────────────────────────────────────────────────────────────
// 9. 렌더: 순위 (임시)
// ──────────────────────────────────────────────────────────────
function renderStandings() {
  document.getElementById('standingsList').innerHTML = MOCK_STANDINGS.map(s => `
    <div class="standing-row">
      <span class="st-rank ${s.rank<=3?'top3':''}">${s.rank}</span>
      <span class="st-team">${s.team}</span>
      <span class="st-stat">${s.wins}승</span>
      <span class="st-pct">${s.pct}</span>
    </div>`).join('');
}

// ──────────────────────────────────────────────────────────────
// 10. 월 이동
// ──────────────────────────────────────────────────────────────
function updateMonthLabel() {
  document.getElementById('currentMonthLabel').textContent =
    `${currentYear}년 ${currentMonth+1}월`;
}

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth=11; currentYear--; }
  selectedDate = null;
  updateMonthLabel();
  fetchGames();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth=0; currentYear++; }
  selectedDate = null;
  updateMonthLabel();
  fetchGames();
});

// ──────────────────────────────────────────────────────────────
// 11. 팀 필터
// ──────────────────────────────────────────────────────────────
document.getElementById('teamFilter').addEventListener('click', e => {
  const btn = e.target.closest('.team-btn');
  if (!btn) return;
  document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeTeam   = btn.dataset.team;
  selectedDate = null;
  fetchGames();
});

// ──────────────────────────────────────────────────────────────
// 12. 탭 필터
// ──────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    // today 탭은 클라이언트 필터, 나머지는 API 재호출
    if (activeTab === 'today') { renderGames(); }
    else { fetchGames(); }
  });
});

// ──────────────────────────────────────────────────────────────
// 13. 로그인 상태
// ──────────────────────────────────────────────────────────────
function initLoginState() {
  const nick            = localStorage.getItem('loggedInUser');
  const loginBtn        = document.getElementById('login-btn');
  const userInfoSection = document.getElementById('user-info-section');
  const userNicknameEl  = document.getElementById('user-nickname');
  const logoutBtn       = document.getElementById('logout-btn');

  if (nick) {
    loginBtn.style.display        = 'none';
    userInfoSection.style.display = 'inline-flex';
    userNicknameEl.textContent    = nick;
  } else {
    loginBtn.style.display        = 'inline-block';
    userInfoSection.style.display = 'none';
  }
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('loggedInUser');
    alert('로그아웃 되었습니다.');
    window.location.reload();
  });
}

// ──────────────────────────────────────────────────────────────
// 14. 헤더 스코어보드 동적 로딩
// ──────────────────────────────────────────────────────────────
const TEAM_COLORS_HEADER = {
  'KIA':'#EF4444','기아':'#EF4444','LG':'#3B82F6','두산':'#1E3A8A',
  '삼성':'#1D4ED8','롯데':'#EF4444','SSG':'#CE0E2D','NC':'#0EA5E9',
  'KT':'#DC2626','한화':'#F97316','키움':'#820024'
};
function headerTeamColor(name) { return TEAM_COLORS_HEADER[name] || '#94A3B8'; }

async function loadHeaderScoreboard() {
  const board = document.getElementById('header-scoreboard');
  if (!board) return;
  try {
    const res   = await fetch('/api/games/today');
    if (!res.ok) return;
    const games = await res.json();
    if (!games.length) return;

    const myTeam = localStorage.getItem('favoriteTeam') || '';
    let game = games[0];
    if (myTeam) {
      const found = games.find(g => g.homeTeam === myTeam || g.awayTeam === myTeam);
      if (found) game = found;
    }

    const ht = game.homeTeam || 'HOME';
    const at = game.awayTeam || 'AWAY';
    const hs = (game.homeScore != null && game.homeScore >= 0) ? game.homeScore : '-';
    const as_ = (game.awayScore != null && game.awayScore >= 0) ? game.awayScore : '-';
    const hc = headerTeamColor(ht);
    const ac = headerTeamColor(at);

    document.getElementById('sch-away-badge').textContent       = at.slice(0, 1);
    document.getElementById('sch-away-badge').style.background  = ac;
    document.getElementById('sch-away-name').textContent        = at;
    document.getElementById('sch-away-score').textContent       = String(as_);
    document.getElementById('sch-away-score').style.color       = ac;
    document.getElementById('sch-home-badge').textContent       = ht.slice(0, 1);
    document.getElementById('sch-home-badge').style.background  = hc;
    document.getElementById('sch-home-name').textContent        = ht;
    document.getElementById('sch-home-score').textContent       = String(hs);
    document.getElementById('sch-home-score').style.color       = hc;

    const statusBadge = document.getElementById('sch-status-badge');
    const inningEl    = document.getElementById('sch-inning');
    const s = (game.status || '').toLowerCase();
    if (s.includes('live') || s.includes('진행')) {
      statusBadge.textContent        = 'LIVE';
      statusBadge.style.background   = '#22C55E';
      if (game.inning) inningEl.textContent = game.inning;
    } else if (s.includes('종료') || s.includes('final')) {
      statusBadge.textContent        = '종료';
      statusBadge.style.background   = '#64748B';
    } else {
      statusBadge.textContent        = game.gameTime ? game.gameTime.slice(0, 5) : '예정';
      statusBadge.style.background   = '#3B82F6';
    }
    board.style.visibility = 'visible';
  } catch(e) { /* 조용히 무시 */ }
}

// ──────────────────────────────────────────────────────────────
// 15. 초기화
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initLoginState();
  updateMonthLabel();
  renderStandings();
  loadHeaderScoreboard();
  await renderTodaySummary();
  await fetchGames();   // API 호출 → renderCalendar + renderGames 내부 실행
});