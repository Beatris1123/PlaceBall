/* ============================================================
   PLACEBALL - diary.js  직관 다이어리 (DB 연동)
   ============================================================ */

const RESULT_LABEL = { win:'승', lose:'패', draw:'무', cancel:'취소' };

let records = [];
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDate  = null;
let editingId     = null;
let selectedResult  = null;
let selectedWeather = null;
let selectedMood    = null;
let selectedGameId  = null;
let gameListYear  = new Date().getFullYear();
let gameListMonth = new Date().getMonth() + 1;
let gameListCache  = {};

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadRecordsFromDB().then(() => {
    renderCalendar();
    renderMonthlySummary();
    renderMonthlyRecords();
    renderSummaryBar();
    renderStats();
    renderTickets();
  });
  initForm();
  initModals();
  initTabs();
  initCostCalc();
});

function getLoginUser() {
  return localStorage.getItem('loggedInUser') || '';
}

async function loadRecordsFromDB() {
  const user = getLoginUser();
  if (!user) { records = []; return; }
  try {
    const res = await fetch(`/api/diary?nickname=${encodeURIComponent(user)}`);
    if (res.ok) records = await res.json();
    else records = [];
  } catch(e) {
    console.warn('다이어리 로드 실패:', e);
    records = [];
  }
}

function initAuth() {
  const user = getLoginUser();
  const loginBtn = document.getElementById('login-btn');
  const section  = document.getElementById('user-info-section');
  const nick     = document.getElementById('user-nickname');
  if (user) {
    loginBtn.style.display = 'none';
    section.style.display  = 'flex';
    nick.textContent = user;
  }
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('favoriteTeam');
    location.reload();
  });
}

function initTabs() {
  document.querySelectorAll('.dtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'stats')   renderStats();
      if (btn.dataset.tab === 'tickets') renderTickets();
    });
  });
}

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${currentYear}년 ${currentMonth + 1}월`;
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
  const grid     = document.getElementById('calDaysGrid');
  const todayStr = new Date().toISOString().slice(0, 10);
  grid.innerHTML = '';
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }
  for (let d = 1; d <= lastDate; d++) {
    const ds  = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(ds + 'T00:00:00').getDay();
    const recs = records.filter(r => r.date === ds);
    const el = document.createElement('div');
    el.className = 'cal-cell'
      + (dow === 0 ? ' sun' : dow === 6 ? ' sat' : '')
      + (ds === todayStr     ? ' today'    : '')
      + (ds === selectedDate ? ' selected' : '')
      + (recs.length         ? ' has-record' : '');
    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = d;
    el.appendChild(numEl);
    if (recs.length) {
      const icon = document.createElement('div');
      icon.className = 'cal-result-icon ' + recs[0].result;
      icon.textContent = RESULT_LABEL[recs[0].result] || '';
      el.appendChild(icon);
    }
    el.addEventListener('click', () => selectDate(ds));
    grid.appendChild(el);
  }
  renderMonthlySummary();
}

function selectDate(ds) {
  selectedDate = (selectedDate === ds) ? null : ds;
  renderCalendar();
  if (selectedDate) renderDayDetail(selectedDate);
  else renderMonthlyRecords();
}

function renderMonthlySummary() {
  const monthRecs = getMonthRecords();
  const win   = monthRecs.filter(r => r.result === 'win').length;
  const lose  = monthRecs.filter(r => r.result === 'lose').length;
  const draw  = monthRecs.filter(r => r.result === 'draw').length;
  const total = win + lose + draw;
  const rate  = total ? Math.round(win / total * 100) : null;
  const el = document.getElementById('monthlySummary');
  if (!monthRecs.length) {
    el.innerHTML = '<span style="font-size:12px;color:var(--text-3);">이번 달 직관 기록이 없어요</span>';
    return;
  }
  el.innerHTML = `
    <span style="font-size:12px;font-weight:700;">이번 달</span>
    <span class="ms-badge win">승 ${win}</span>
    <span class="ms-badge lose">패 ${lose}</span>
    ${draw ? `<span class="ms-badge draw">무 ${draw}</span>` : ''}
    ${rate !== null ? `<span style="margin-left:auto;font-size:12px;font-weight:800;color:var(--yellow);">승률 ${rate}%</span>` : ''}
  `;
}

function getMonthRecords() {
  return records.filter(r => {
    const [y, m] = r.date.split('-').map(Number);
    return y === currentYear && m === currentMonth + 1;
  });
}

function renderMonthlyRecords() {
  const panel     = document.getElementById('dayDetail');
  const monthRecs = getMonthRecords().sort((a, b) => a.date.localeCompare(b.date));
  const days      = ['일','월','화','수','목','금','토'];
  let html = `
    <div class="monthly-records-header">
      <span class="monthly-records-title">📋 ${currentYear}년 ${currentMonth + 1}월 직관 기록</span>
      <button class="detail-add-btn" id="monthAddBtn">+ 기록 추가</button>
    </div>`;
  if (!monthRecs.length) {
    html += `
      <div class="monthly-records-empty">
        <div style="font-size:3rem;margin-bottom:.75rem;">⚾</div>
        <p>이번 달 직관 기록이 없어요</p>
        <p style="font-size:11px;margin-top:.25rem;color:var(--text-3);">위 버튼으로 첫 번째 기록을 남겨보세요!</p>
      </div>`;
  } else {
    const grouped = {};
    monthRecs.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    Object.entries(grouped).forEach(([date, recs]) => {
      const d = new Date(date + 'T00:00:00');
      const dateLabel = `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
      html += `<div class="monthly-date-group"><div class="monthly-date-label">${dateLabel}</div>`;
      recs.forEach(r => {
        const cost = (r.cost?.ticket||0)+(r.cost?.transport||0)+(r.cost?.food||0)+(r.cost?.goods||0);
        html += `
          <div class="detail-ticket ${r.result}">
            <div class="ticket-result-badge ${r.result}">${RESULT_LABEL[r.result]||''}</div>
            <div class="ticket-match">${r.home||'-'} vs ${r.away||'-'}</div>
            <div class="ticket-score">${r.homeScore??'-'} : ${r.awayScore??'-'}</div>
            <div class="ticket-meta">
              ${r.stadium ? `<span class="ticket-tag">🏟 ${r.stadium}</span>` : ''}
              ${r.seat    ? `<span class="ticket-tag">💺 ${r.seat}</span>`    : ''}
              ${r.weather ? `<span class="ticket-tag">${r.weather}</span>`    : ''}
              ${r.mate    ? `<span class="ticket-tag">👥 ${r.mate}</span>`    : ''}
              ${r.mood    ? `<span class="ticket-tag">${r.mood}</span>`       : ''}
              ${cost      ? `<span class="ticket-tag">💰 ${cost.toLocaleString()}원</span>` : ''}
            </div>
            ${r.memo ? `<div class="ticket-memo">${r.memo}</div>` : ''}
            <div class="ticket-actions">
              <button class="ticket-edit-btn" data-id="${r.id}">수정</button>
              <button class="ticket-del-btn"  data-id="${r.id}">삭제</button>
            </div>
          </div>`;
      });
      html += `</div>`;
    });
  }
  panel.innerHTML = html;
  document.getElementById('monthAddBtn')?.addEventListener('click', () => openWriteModal());
  panel.querySelectorAll('.ticket-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  panel.querySelectorAll('.ticket-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id)));
}

function renderDayDetail(ds) {
  const panel = document.getElementById('dayDetail');
  const recs  = records.filter(r => r.date === ds);
  const d     = new Date(ds + 'T00:00:00');
  const days  = ['일','월','화','수','목','금','토'];
  const label = `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  let html = `
    <div class="detail-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="detail-back-btn" id="detailBackBtn">‹ 전체</button>
        <span class="detail-date">${label}</span>
      </div>
      <button class="detail-add-btn" id="detailAddBtn">+ 기록 추가</button>
    </div>`;
  if (!recs.length) {
    html += '<div style="text-align:center;padding:3rem 0;color:var(--text-3);font-size:13px;font-weight:600;">⚾ 이날 직관 기록이 없어요</div>';
  } else {
    recs.forEach(r => {
      const cost = (r.cost?.ticket||0)+(r.cost?.transport||0)+(r.cost?.food||0)+(r.cost?.goods||0);
      html += `
        <div class="detail-ticket ${r.result}">
          <div class="ticket-result-badge ${r.result}">${RESULT_LABEL[r.result]||''}</div>
          <div class="ticket-match">${r.home||'-'} vs ${r.away||'-'}</div>
          <div class="ticket-score">${r.homeScore??'-'} : ${r.awayScore??'-'}</div>
          <div class="ticket-meta">
            ${r.stadium ? `<span class="ticket-tag">🏟 ${r.stadium}</span>` : ''}
            ${r.seat    ? `<span class="ticket-tag">💺 ${r.seat}</span>`    : ''}
            ${r.weather ? `<span class="ticket-tag">${r.weather}</span>`    : ''}
            ${r.mate    ? `<span class="ticket-tag">👥 ${r.mate}</span>`    : ''}
            ${r.mood    ? `<span class="ticket-tag">${r.mood}</span>`       : ''}
            ${cost      ? `<span class="ticket-tag">💰 ${cost.toLocaleString()}원</span>` : ''}
          </div>
          ${r.memo ? `<div class="ticket-memo">${r.memo}</div>` : ''}
          <div class="ticket-actions">
            <button class="ticket-edit-btn" data-id="${r.id}">수정</button>
            <button class="ticket-del-btn"  data-id="${r.id}">삭제</button>
          </div>
        </div>`;
    });
  }
  panel.innerHTML = html;
  document.getElementById('detailBackBtn')?.addEventListener('click', () => {
    selectedDate = null; renderCalendar(); renderMonthlyRecords();
  });
  document.getElementById('detailAddBtn')?.addEventListener('click', () => openWriteModal());
  panel.querySelectorAll('.ticket-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  panel.querySelectorAll('.ticket-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id)));
}

function openEditModal(id) {
  const r = records.find(rec => String(rec.id) === String(id));
  if (!r) return;
  editingId       = id;
  selectedResult  = r.result  || null;
  selectedWeather = r.weather && r.weather.trim() ? r.weather : null;
  selectedMood    = r.mood    && r.mood.trim()    ? r.mood    : null;
  selectedGameId  = r.gameId  ? String(r.gameId)  : null;
  document.getElementById('f-game-id').value    = r.gameId   || '';
  document.getElementById('f-date').value       = r.date     || '';
  document.getElementById('f-home').value       = r.home     || '';
  document.getElementById('f-away').value       = r.away     || '';
  document.getElementById('f-home-score').value = r.homeScore ?? '';
  document.getElementById('f-away-score').value = r.awayScore ?? '';
  document.getElementById('f-stadium').value    = r.stadium  || '';
  document.getElementById('f-seat').value       = r.seat     || '';
  document.getElementById('f-mate').value       = r.mate     || '';
  document.getElementById('f-memo').value       = r.memo     || '';
  document.getElementById('f-cost-ticket').value    = r.cost?.ticket    || '';
  document.getElementById('f-cost-transport').value = r.cost?.transport || '';
  document.getElementById('f-cost-food').value      = r.cost?.food      || '';
  document.getElementById('f-cost-goods').value     = r.cost?.goods     || '';
  updateCostTotal();
  document.querySelectorAll('.result-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.result === r.result);
    b.disabled = false; b.style.opacity = '1'; b.style.cursor = 'pointer';
  });
  document.querySelectorAll('.weather-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.w === r.weather));
  document.querySelectorAll('.mood-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mood === r.mood));
  const lockMsg = document.getElementById('result-lock-msg');
  if (lockMsg) lockMsg.style.display = 'none';
  const msgEl = document.getElementById('f-game-message');
  if (msgEl) {
    msgEl.textContent = `✅ 선택된 경기: ${r.date} ${r.home} vs ${r.away} — ${r.stadium||''}`;
    msgEl.className   = 'form-msg ok';
  }
  gameListYear  = r.date ? parseInt(r.date.split('-')[0]) : new Date().getFullYear();
  gameListMonth = r.date ? parseInt(r.date.split('-')[1]) : new Date().getMonth() + 1;
  updateGameListMonthLabel();
  loadGameList().then(() => {
    const item = document.querySelector(`.game-select-item[data-id="${r.gameId}"]`);
    if (item) {
      document.querySelectorAll('.game-select-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    }
  });
  document.getElementById('writeModalTitle').textContent = '✏️ 직관 기록 수정';
  document.getElementById('writeModal').classList.add('open');
}

async function deleteRecord(id) {
  if (!confirm('이 직관 기록을 삭제할까요?')) return;
  const user = getLoginUser();
  try {
    const res  = await fetch(`/api/diary/${id}?nickname=${encodeURIComponent(user)}`, { method:'DELETE' });
    const data = await res.json();
    if (!data.success) { alert('삭제 실패: ' + (data.message||'')); return; }
  } catch(e) { alert('서버 오류로 삭제에 실패했어요.'); return; }
  records = records.filter(r => String(r.id) !== String(id));
  renderCalendar();
  if (selectedDate) renderDayDetail(selectedDate);
  else renderMonthlyRecords();
  renderSummaryBar();
  renderTickets();
}

function renderTickets() {
  const grid   = document.getElementById('ticketsGrid');
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    grid.innerHTML = '<div class="tickets-empty"><div style="font-size:3.5rem;margin-bottom:1rem;">🎫</div><p>직관 기록을 추가하면 티켓이 쌓여요!</p></div>';
    return;
  }
  const days = ['일','월','화','수','목','금','토'];
  grid.innerHTML = sorted.map(r => {
    const cost = (r.cost?.ticket||0)+(r.cost?.transport||0)+(r.cost?.food||0)+(r.cost?.goods||0);
    const d = new Date(r.date + 'T00:00:00');
    const dateLabel = `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()}. (${days[d.getDay()]})`;
    return `
      <div class="ticket-card" data-id="${r.id}">
        <div class="ticket-card-header ${r.result}">
          <span class="tc-date">${dateLabel}</span>
          <span class="tc-result ${r.result}">${RESULT_LABEL[r.result]||''}</span>
        </div>
        <div class="ticket-card-body">
          <div class="tc-match">${r.home||'-'} vs ${r.away||'-'}</div>
          <div class="tc-score">${r.homeScore??'-'} : ${r.awayScore??'-'}</div>
          <div class="tc-tags">
            ${r.stadium ? `<span class="tc-tag">🏟 ${r.stadium}</span>` : ''}
            ${r.seat    ? `<span class="tc-tag">💺 ${r.seat}</span>`    : ''}
            ${r.weather ? `<span class="tc-tag">${r.weather}</span>`    : ''}
            ${r.mate    ? `<span class="tc-tag">👥 ${r.mate}</span>`    : ''}
          </div>
        </div>
        <div class="ticket-card-divider"></div>
        <div class="ticket-card-footer">
          <span class="tc-cost">${cost ? cost.toLocaleString()+'원' : '-'}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tc-mood">${r.mood||'⚾'}</span>
            <button class="tc-edit-btn" data-id="${r.id}">수정</button>
            <button class="tc-del-btn"  data-id="${r.id}">삭제</button>
          </div>
        </div>
      </div>`;
  }).join('');
  grid.querySelectorAll('.tc-edit-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openEditModal(btn.dataset.id); }));
  grid.querySelectorAll('.tc-del-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); deleteRecord(btn.dataset.id); }));
}

function renderStats() {
  const win  = records.filter(r => r.result === 'win').length;
  const lose = records.filter(r => r.result === 'lose').length;
  const draw = records.filter(r => r.result === 'draw').length;
  const total = win + lose + draw;
  const rate  = total ? Math.round(win / total * 100) : null;
  const circ = 2 * Math.PI * 46;
  const winArc  = total ? circ * win  / total : 0;
  const loseArc = total ? circ * lose / total : 0;
  document.getElementById('donutWin').setAttribute('stroke-dasharray',  `${winArc} ${circ}`);
  document.getElementById('donutLose').setAttribute('stroke-dasharray', `${loseArc} ${circ}`);
  document.getElementById('donutLose').style.strokeDashoffset = 72.25 - winArc;
  document.getElementById('donutPct').textContent  = rate !== null ? rate + '%' : '-';
  document.getElementById('lgWin').textContent     = win;
  document.getElementById('lgLose').textContent    = lose;
  document.getElementById('lgDraw').textContent    = draw;
  const monthMap = {};
  records.forEach(r => {
    const [y, m] = r.date.split('-').map(Number);
    const key = `${y}-${String(m).padStart(2,'0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const keys = Object.keys(monthMap).sort().slice(-6);
  const chartEl = document.getElementById('monthBarChart');
  if (!keys.length) { chartEl.innerHTML = '<div class="chart-empty">기록이 쌓이면 차트가 보여요</div>'; }
  else {
    const maxVal = Math.max(...keys.map(k => monthMap[k]));
    chartEl.innerHTML = keys.map(k => {
      const [, m] = k.split('-');
      const pct = Math.round(monthMap[k] / maxVal * 100);
      return `<div class="month-bar-col"><div class="bar-val">${monthMap[k]}</div><div class="bar" style="height:${pct}%"></div><div class="bar-label">${parseInt(m)}월</div></div>`;
    }).join('');
  }
  const stadMap = {};
  records.forEach(r => { if (r.stadium) stadMap[r.stadium] = (stadMap[r.stadium]||0)+1; });
  const stadEl = document.getElementById('stadiumStats');
  if (!Object.keys(stadMap).length) { stadEl.innerHTML = '<div class="chart-empty">기록이 쌓이면 보여요</div>'; }
  else {
    const maxS = Math.max(...Object.values(stadMap));
    stadEl.innerHTML = Object.entries(stadMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,c]) =>
      `<div class="stadium-row"><span class="stadium-name">${s}</span><div class="stadium-bar-track"><div class="stadium-bar-fill" style="width:${c/maxS*100}%"></div></div><span class="stadium-count">${c}회</span></div>`
    ).join('');
  }
  let ticket=0,transport=0,food=0,goods=0;
  records.forEach(r => { ticket+=r.cost?.ticket||0; transport+=r.cost?.transport||0; food+=r.cost?.food||0; goods+=r.cost?.goods||0; });
  const totalCost = ticket+transport+food+goods;
  const costEl = document.getElementById('costStats');
  if (!totalCost) { costEl.innerHTML = '<div class="chart-empty">기록이 쌓이면 보여요</div>'; }
  else {
    costEl.innerHTML = [['🎫 티켓',ticket],['🚌 교통',transport],['🍗 식비',food],['🧢 굿즈',goods]].filter(([,v])=>v)
      .map(([l,v])=>`<div class="cost-row"><span class="cost-label">${l}</span><span class="cost-val">${v.toLocaleString()}원</span></div>`).join('') +
      `<div class="cost-row" style="margin-top:6px;border-top:1px solid var(--border-md);padding-top:8px;"><span style="font-weight:900;color:var(--text-1);">합계</span><span style="font-weight:900;color:#A78BFA;">${totalCost.toLocaleString()}원</span></div>`;
  }
  renderSummaryBar();
}

function renderSummaryBar() {
  const win=records.filter(r=>r.result==='win').length, lose=records.filter(r=>r.result==='lose').length, draw=records.filter(r=>r.result==='draw').length;
  const total=records.length, totalWL=win+lose+draw, rate=totalWL?Math.round(win/totalWL*100):null;
  const totalCost=records.reduce((s,r)=>s+(r.cost?.ticket||0)+(r.cost?.transport||0)+(r.cost?.food||0)+(r.cost?.goods||0),0);
  document.getElementById('stat-total').textContent=total;
  document.getElementById('stat-win').textContent=win;
  document.getElementById('stat-lose').textContent=lose;
  document.getElementById('stat-draw').textContent=draw;
  document.getElementById('stat-rate').textContent=rate!==null?rate+'%':'-%';
  document.getElementById('stat-cost').textContent=totalCost?totalCost.toLocaleString()+'원':'0원';
}

function initForm() {
  document.getElementById('resultBtns').addEventListener('click', e => {
    const btn = e.target.closest('.result-btn');
    if (!btn || btn.disabled) return;
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedResult = btn.dataset.result;
  });
  document.getElementById('weatherBtns').addEventListener('click', e => {
    const btn = e.target.closest('.weather-btn'); if (!btn) return;
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedWeather = btn.dataset.w;
  });
  document.getElementById('moodBtns').addEventListener('click', e => {
    const btn = e.target.closest('.mood-btn'); if (!btn) return;
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedMood = btn.dataset.mood;
  });
  document.getElementById('saveDiary').addEventListener('click', saveRecord);
}

function initCostCalc() {
  ['f-cost-ticket','f-cost-transport','f-cost-food','f-cost-goods'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { el.value = el.value.replace(/[^0-9]/g, ''); updateCostTotal(); });
    el.addEventListener('paste', e => { e.preventDefault(); el.value=(e.clipboardData||window.clipboardData).getData('text').replace(/[^0-9]/g,''); updateCostTotal(); });
  });
}

function getCostValue(id) { return parseInt(document.getElementById(id).value.replace(/[^0-9]/g,''))||0; }

function updateCostTotal() {
  const total = getCostValue('f-cost-ticket')+getCostValue('f-cost-transport')+getCostValue('f-cost-food')+getCostValue('f-cost-goods');
  document.getElementById('costTotal').textContent = total.toLocaleString()+'원';
}

function updateGameListMonthLabel() {
  document.getElementById('f-month-label').textContent = `${gameListYear}년 ${gameListMonth}월`;
}

async function loadGameList() {
  let favoriteTeam = localStorage.getItem('favoriteTeam') || '';
  const listEl = document.getElementById('f-game-list');
  if (!favoriteTeam) {
    const loginUser = getLoginUser();
    if (!loginUser) { listEl.innerHTML='<div class="game-select-empty">⚠️ 로그인 후 이용해주세요.</div>'; return; }
    try {
      const res=await fetch(`/api/my-info?nickname=${encodeURIComponent(loginUser)}`);
      const info=await res.json();
      if (info.favoriteTeam) { favoriteTeam=info.favoriteTeam; localStorage.setItem('favoriteTeam',favoriteTeam); }
    } catch(e) {}
  }
  if (!favoriteTeam) { listEl.innerHTML='<div class="game-select-empty">⚠️ 최애팀 정보가 없어요.</div>'; return; }
  const cacheKey=`${gameListYear}-${gameListMonth}`;
  if (gameListCache[cacheKey]) { renderGameList(gameListCache[cacheKey],favoriteTeam); return; }
  listEl.innerHTML='<div class="game-select-loading">경기 목록을 불러오는 중...</div>';
  try {
    const res=await fetch(`/api/games/my-team?team=${encodeURIComponent(favoriteTeam)}&year=${gameListYear}&month=${gameListMonth}`);
    const all=await res.json();
    const finished=all.filter(g=>g.status==='finished');
    gameListCache[cacheKey]=finished; renderGameList(finished,favoriteTeam);
  } catch(e) { listEl.innerHTML='<div class="game-select-empty">❌ 경기 정보를 불러오지 못했어요.</div>'; }
}

function renderGameList(games, myTeam) {
  const listEl = document.getElementById('f-game-list');
  if (!games.length) { listEl.innerHTML=`<div class="game-select-empty">이번 달 ${myTeam}의 종료된 경기가 없어요</div>`; return; }
  listEl.innerHTML = games.map(g => {
    const isHome=g.homeTeam===myTeam, opponent=isHome?g.awayTeam:g.homeTeam;
    const myScore=isHome?g.homeScore:g.awayScore, oppScore=isHome?g.awayScore:g.homeScore;
    const hasScore=myScore>=0&&oppScore>=0;
    const d=new Date(g.date+'T00:00:00'), days=['일','월','화','수','목','금','토'];
    const dateLabel=`${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]}) ${g.time}`;
    return `<div class="game-select-item" data-id="${g.id}" data-date="${g.date}" data-home="${g.homeTeam}" data-away="${g.awayTeam}" data-home-score="${g.homeScore}" data-away-score="${g.awayScore}" data-venue="${g.venue}" data-status="${g.status}">
      <span class="gsi-date">${dateLabel}</span>
      <span class="gsi-teams">${myTeam} vs ${opponent}</span>
      <span class="gsi-score">${hasScore?myScore+' : '+oppScore:'-'}</span>
      <span class="gsi-venue">${g.venue}</span>
    </div>`;
  }).join('');
  listEl.querySelectorAll('.game-select-item').forEach(item => item.addEventListener('click',()=>selectGame(item)));
}

function selectGame(item) {
  document.querySelectorAll('.game-select-item').forEach(i=>i.classList.remove('selected'));
  item.classList.add('selected');
  selectedGameId=item.dataset.id;
  document.getElementById('f-game-id').value=item.dataset.id;
  document.getElementById('f-date').value=item.dataset.date;
  document.getElementById('f-home').value=item.dataset.home;
  document.getElementById('f-away').value=item.dataset.away;
  document.getElementById('f-home-score').value=item.dataset.homeScore;
  document.getElementById('f-away-score').value=item.dataset.awayScore;
  document.getElementById('f-stadium').value=item.dataset.venue;
  const myTeam=localStorage.getItem('favoriteTeam')||'';
  const isHome=item.dataset.home===myTeam;
  const myScore=parseInt(isHome?item.dataset.homeScore:item.dataset.awayScore);
  const oppScore=parseInt(isHome?item.dataset.awayScore:item.dataset.homeScore);
  let result='draw';
  if (!isNaN(myScore)&&!isNaN(oppScore)) result=myScore>oppScore?'win':myScore<oppScore?'lose':'draw';
  selectedResult=result;
  document.querySelectorAll('.result-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.result===result);
    b.disabled=true; b.style.opacity=b.dataset.result===result?'1':'0.35'; b.style.cursor='default';
  });
  const lockMsg=document.getElementById('result-lock-msg'); if(lockMsg) lockMsg.style.display='flex';
  const opponent=isHome?item.dataset.away:item.dataset.home;
  const msg=document.getElementById('f-game-message');
  msg.textContent=`✅ ${item.dataset.date} ${myTeam} vs ${opponent} — ${item.dataset.venue}`;
  msg.className='form-msg ok';
}

async function saveRecord() {
  const user=getLoginUser();
  if (!user) { alert('로그인이 필요합니다.'); return; }
  if (!selectedGameId&&!editingId) { alert('경기를 선택해주세요!'); return; }
  if (!selectedResult) { alert('경기 결과를 선택해주세요!'); return; }
  const date=document.getElementById('f-date').value;
  const existingGameId=editingId?records.find(r=>String(r.id)===String(editingId))?.gameId:null;
  const payload={
    nickname: user,
    gameId: selectedGameId?parseInt(selectedGameId):existingGameId,
    date, home: document.getElementById('f-home').value, away: document.getElementById('f-away').value,
    homeScore: parseInt(document.getElementById('f-home-score').value)||null,
    awayScore: parseInt(document.getElementById('f-away-score').value)||null,
    myteam: localStorage.getItem('favoriteTeam')||'',
    result: selectedResult,
    stadium: document.getElementById('f-stadium').value,
    seat: document.getElementById('f-seat').value,
    weather: selectedWeather||'',
    mate: document.getElementById('f-mate').value,
    mood: selectedMood||'',
    memo: document.getElementById('f-memo').value,
    costTicket: getCostValue('f-cost-ticket'), costTransport: getCostValue('f-cost-transport'),
    costFood: getCostValue('f-cost-food'), costGoods: getCostValue('f-cost-goods'),
  };
  const saveBtn=document.getElementById('saveDiary');
  saveBtn.disabled=true; saveBtn.textContent='저장 중...';
  try {
    const url=editingId?`/api/diary/${editingId}`:'/api/diary';
    const method=editingId?'PUT':'POST';
    const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if (!data.success) { alert('저장 실패: '+(data.message||'')); return; }
  } catch(e) { alert('서버 오류로 저장에 실패했어요.'); return; }
  finally { saveBtn.disabled=false; saveBtn.textContent='저장하기 ⚾'; }
  closeWriteModal();
  const [y,m]=date.split('-').map(Number);
  currentYear=y; currentMonth=m-1;
  await loadRecordsFromDB();
  renderCalendar();
  if (selectedDate) renderDayDetail(selectedDate);
  else renderMonthlyRecords();
  renderSummaryBar(); renderTickets();
}

function initModals() {
  document.getElementById('openWriteModal').addEventListener('click',()=>openWriteModal());
  document.getElementById('closeWriteModal').addEventListener('click',closeWriteModal);
  document.getElementById('writeModal').addEventListener('click',function(e){if(e.target===this)closeWriteModal();});
  document.getElementById('f-month-prev').addEventListener('click',()=>{
    gameListMonth--; if(gameListMonth<1){gameListMonth=12;gameListYear--;} updateGameListMonthLabel(); loadGameList();
  });
  document.getElementById('f-month-next').addEventListener('click',()=>{
    gameListMonth++; if(gameListMonth>12){gameListMonth=1;gameListYear++;} updateGameListMonthLabel(); loadGameList();
  });
  document.getElementById('closeTicketModal')?.addEventListener('click',()=>document.getElementById('ticketModal').classList.remove('open'));
  document.getElementById('ticketModal')?.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
  document.getElementById('calPrev').addEventListener('click',()=>{
    currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} selectedDate=null; renderCalendar(); renderMonthlyRecords();
  });
  document.getElementById('calNext').addEventListener('click',()=>{
    currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} selectedDate=null; renderCalendar(); renderMonthlyRecords();
  });
}

function openWriteModal() {
  editingId=null; selectedResult=null; selectedWeather=null; selectedMood=null; selectedGameId=null;
  ['f-game-id','f-date','f-home','f-away','f-home-score','f-away-score','f-stadium','f-seat','f-mate','f-memo'].forEach(id=>document.getElementById(id).value='');
  ['f-cost-ticket','f-cost-transport','f-cost-food','f-cost-goods'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('costTotal').textContent='0원';
  document.querySelectorAll('.result-btn,.weather-btn,.mood-btn').forEach(b=>{
    b.classList.remove('active'); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer';
  });
  const lockMsg=document.getElementById('result-lock-msg'); if(lockMsg) lockMsg.style.display='none';
  const msgEl=document.getElementById('f-game-message'); if(msgEl){msgEl.textContent='';msgEl.className='form-msg';}
  gameListYear=new Date().getFullYear(); gameListMonth=new Date().getMonth()+1;
  updateGameListMonthLabel(); loadGameList();
  document.getElementById('writeModalTitle').textContent='⚾ 직관 기록하기';
  document.getElementById('writeModal').classList.add('open');
}

function closeWriteModal() {
  document.getElementById('writeModal').classList.remove('open');
  editingId=null;
}