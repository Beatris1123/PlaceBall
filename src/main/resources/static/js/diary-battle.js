/* ═══════════════════════════════════════════════════════════════
   PLACEBALL · diary-battle.js
   다이어리 날짜 패널에 점령전 결과를 표시하는 확장 모듈.
   diary.js 이후에 로드된다.
   ═══════════════════════════════════════════════════════════════ */

const TEAM_META_DIARY = {
  'KIA':  { emoji:'🐯', color:'#E60012', bg:'#FFF0F0' },
  'LG':   { emoji:'⚡', color:'#C60C30', bg:'#FFF0F3' },
  '삼성': { emoji:'🦁', color:'#074CA1', bg:'#EFF4FF' },
  '두산': { emoji:'🐻', color:'#131230', bg:'#F0F0FF' },
  '롯데': { emoji:'🌊', color:'#041E42', bg:'#EFF6FF' },
  'SSG':  { emoji:'🛬', color:'#CE0E2D', bg:'#FFF0F2' },
  'NC':   { emoji:'🦕', color:'#071D36', bg:'#EDF4FF' },
  'KT':   { emoji:'⚫', color:'#333333', bg:'#F5F5F5' },
  '한화': { emoji:'🦅', color:'#FC4E00', bg:'#FFF3EE' },
  '키움': { emoji:'🦸', color:'#820024', bg:'#FFF0F4' },
};

// 날짜별 점령전 결과 캐시
const _battleCache = {};

/**
 * 특정 날짜의 점령전 결과 API 조회 (자정 이후 날짜만)
 */
async function fetchBattleResults(dateStr) {
  const today  = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  if (target > today) return []; // 미래 날짜는 조회 안 함

  if (_battleCache[dateStr] !== undefined) return _battleCache[dateStr];
  try {
    const res  = await fetch(`/api/battle/result?date=${dateStr}`);
    const data = await res.json();
    _battleCache[dateStr] = Array.isArray(data) ? data : [];
    return _battleCache[dateStr];
  } catch {
    _battleCache[dateStr] = [];
    return [];
  }
}

/**
 * 점령전 결과 카드 HTML
 */
function buildBattleCard(record, myTeam) {
  // 취소 처리
  if (!record || record.cheerWinner === 'cancel') {
    return `<div class="dbc-card dbc-canceled">
      <span class="dbc-icon">⛔</span>
      <span>경기 취소로 점령전이 진행되지 않았습니다</span>
    </div>`;
  }

  const hm    = TEAM_META_DIARY[record.homeTeam] || { emoji:'⚾', color:'#374151', bg:'#F9FAFB' };
  const am    = TEAM_META_DIARY[record.awayTeam] || { emoji:'⚾', color:'#374151', bg:'#F9FAFB' };
  const total = record.homeCheerScore + record.awayCheerScore;
  const homePct = total === 0 ? 50 : Math.round(record.homeCheerScore / total * 100);
  const awayPct = 100 - homePct;
  const winner  = record.cheerWinner;
  const isDraw  = winner === 'draw';
  const homeWon = winner === record.homeTeam;

  // 내 팀 승/패 계산
  let myResult = '';
  if (myTeam) {
    const involved = record.homeTeam === myTeam || record.awayTeam === myTeam;
    if (involved) {
      myResult = isDraw ? 'draw' : winner === myTeam ? 'win' : 'lose';
    }
  }

  const myBadgeHtml = myResult ? `
    <span class="dbc-my-badge dbc-my-${myResult}">
      ${ myResult==='win' ? '🏆 우리 팀 점령 성공!' : myResult==='lose' ? '😢 점령 실패' : '🤝 무승부' }
    </span>` : '';

  return `
  <div class="dbc-card dbc-result${myResult ? ' dbc-my-' + myResult : ''}">
    <div class="dbc-header">
      <span class="dbc-title">⚔️ 점령전 결과</span>
      ${myBadgeHtml}
    </div>

    <div class="dbc-match">
      <!-- 홈팀 -->
      <div class="dbc-team ${homeWon && !isDraw ? 'dbc-team-winner' : ''}">
        <div class="dbc-emblem" style="background:${hm.bg}">${hm.emoji}</div>
        <div class="dbc-team-name" style="color:${hm.color}">${record.homeTeam}</div>
        <div class="dbc-pts">${record.homeCheerScore}pt</div>
      </div>

      <!-- 중앙 -->
      <div class="dbc-center">
        <div class="dbc-vs">VS</div>
        <div class="dbc-winner-label">
          ${isDraw
            ? '<span class="dbc-badge-draw">무승부</span>'
            : `<span class="dbc-badge-win" style="color:${homeWon ? hm.color : am.color}">
                ${winner} 점령 🏆
               </span>`
          }
        </div>
      </div>

      <!-- 원정팀 -->
      <div class="dbc-team ${!homeWon && !isDraw ? 'dbc-team-winner' : ''}">
        <div class="dbc-emblem" style="background:${am.bg}">${am.emoji}</div>
        <div class="dbc-team-name" style="color:${am.color}">${record.awayTeam}</div>
        <div class="dbc-pts">${record.awayCheerScore}pt</div>
      </div>
    </div>

    <!-- 점령 비율 바 -->
    <div class="dbc-bar-wrap">
      <div class="dbc-bar-segment" style="width:${homePct}%;background:${hm.color}1A;border-right:2px solid ${hm.color}40;">
        <span class="dbc-bar-pct" style="color:${hm.color}">${homePct}%</span>
      </div>
      <div class="dbc-bar-segment" style="width:${awayPct}%;background:${am.color}1A;border-left:2px solid ${am.color}40;">
        <span class="dbc-bar-pct" style="color:${am.color}">${awayPct}%</span>
      </div>
    </div>

    <div class="dbc-footer">
      <a href="battle-ranking.html" class="dbc-ranking-link">📊 점령전 랭킹 보기 →</a>
    </div>
  </div>`;
}

/**
 * 날짜 패널(#dayDetail) 하단에 점령전 결과 섹션 추가
 */
async function appendBattleSection(dateStr) {
  const panel   = document.getElementById('dayDetail');
  if (!panel) return;

  const results = await fetchBattleResults(dateStr);
  if (!results.length) return;

  const myTeam  = localStorage.getItem('favoriteTeam') || '';
  const section = document.createElement('div');
  section.className = 'dbc-section';
  section.innerHTML = `
    <div class="dbc-section-label">⚔️ 이 날의 점령전</div>
    ${results.map(r => buildBattleCard(r, myTeam)).join('')}`;
  panel.appendChild(section);
}

/* ── diary.js의 selectDate를 덮어써서 점령전 결과를 붙임 ── */
document.addEventListener('DOMContentLoaded', () => {
  // diary.js가 먼저 로드됐다고 가정하고 함수 참조를 패치
  const origSelectDate = window.selectDate;
  if (typeof origSelectDate !== 'function') return;

  window.selectDate = function(ds) {
    origSelectDate(ds);
    // selectedDate가 설정됐을 때만 점령전 카드 추가
    const sd = window.selectedDate;
    if (sd) appendBattleSection(sd);
  };
});
