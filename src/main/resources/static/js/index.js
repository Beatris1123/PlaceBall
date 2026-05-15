// ─── 1. 공통 유틸 및 성향 뱃지 로직 ───
const PERSONALITY_MAP = {
  'cheer'    : { name: '불타는 응원단장',  emoji: '🔥', color: '#EF4444', desc: '응원가를 외우고 떼창을 이끄는 열정 팬' },
  'food'     : { name: '먹거리 탐험가',    emoji: '🌭', color: '#F59E0B', desc: '직관의 목적은 치킨과 맥주! 맛집 지도 완성' },
  'analyst'  : { name: '데이터 분석가',    emoji: '📊', color: '#3B82F6', desc: '기록지와 스탯으로 경기를 읽는 야구 박사' },
  'photo'    : { name: '직관 포토그래퍼',  emoji: '📸', color: '#8B5CF6', desc: '인생샷 건지러 구장 구석구석을 탐험' },
  'social'   : { name: '인싸 직관러',      emoji: '🎉', color: '#EC4899', desc: '친구들과의 추억 만들기가 최우선' },
  'lucky'    : { name: '행운의 마스코트',  emoji: '🍀', color: '#10B981', desc: '내가 가면 팀이 이긴다는 믿음의 팬' },
  'vintage'  : { name: '레전드 올드팬',    emoji: '🏆', color: '#F97316', desc: '창단 멤버부터 알고 있는 산증인 팬' },
  'relaxed'  : { name: '여유로운 관람객',  emoji: '☀️', color: '#06B6D4', desc: '잔디 냄새와 여유를 즐기는 힐링 팬' },
  'collector': { name: '굿즈 수집가',      emoji: '🧢', color: '#6366F1', desc: '한정판 굿즈를 위해서라면 어디든 간다' },
  'streamer' : { name: '직관 스트리머',    emoji: '📱', color: '#EF4444', desc: '실시간 중계와 SNS 공유가 직관의 이유' },
};

function getPersonality() {
  try {
    const raw = localStorage.getItem('placeball_personality');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.type && PERSONALITY_MAP[data.type]) return { ...PERSONALITY_MAP[data.type], ...data };
    if (data.name) return data;
    return null;
  } catch(e) { return null; }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const TEAM_COLORS = {
  'KIA':'#EF4444','기아':'#EF4444','LG':'#3B82F6','두산':'#1E3A8A',
  '삼성':'#1D4ED8','롯데':'#EF4444','SSG':'#CE0E2D','NC':'#0EA5E9',
  'KT':'#DC2626','한화':'#F97316','키움':'#820024'
};
function tc(name) { return TEAM_COLORS[name] || '#94A3B8'; }

// ─── 2. 헤더 로그인 및 뱃지 처리 ───
(function() {
  const user = localStorage.getItem('loggedInUser');
  const loginBtn  = document.getElementById('login-btn');
  const userInfo  = document.getElementById('user-info');
  const userNick  = document.getElementById('user-nick');
  if (user) {
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (userInfo)  userInfo.style.display  = 'flex';
    if (userNick)  userNick.textContent    = user;

    // 성향 뱃지
    const p = getPersonality();
    const wrap = document.getElementById('header-personality-badge');
    if (p && wrap) {
      const badgeEl = document.getElementById('header-badge-el');
      const color = p.color || '#3B82F6';
      if (badgeEl) badgeEl.style.cssText = `background:${hexToRgba(color,0.14)};border-color:${hexToRgba(color,0.35)};color:${color}`;

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('hb-emoji', p.emoji || '⚾');
      setEl('hb-label', p.name || '');
      setEl('hb-tooltip-emoji', p.emoji || '⚾');
      setEl('hb-tooltip-name', p.name || '');
      setEl('hb-tooltip-desc', p.desc || '');
      wrap.style.display = 'block';
    }
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('loggedInUser');
      location.reload();
    });
  }
})();

// ─── 3. 통합 경기 데이터 로딩 (스코어보드, 전광판, 일정카드 완벽 동기화) ───
(function() {
  function getDateStr(val) {
    if (!val) return "";
    if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`;
    return val.toString().substring(0, 10);
  }
  function getTimeStr(val) {
    if (!val) return "18:30";
    if (Array.isArray(val)) return `${String(val[0]).padStart(2,'0')}:${String(val[1]).padStart(2,'0')}`;
    return val.toString().substring(0, 5);
  }

  // 전광판 (SVG) 업데이트
  function updateSvgScoreboard(home, away, homeScore, awayScore, status) {
    const svgHomeScore = document.getElementById('svg-home-score');
    const svgAwayScore = document.getElementById('svg-away-score');
    const svgHomeTeam  = document.getElementById('svg-home-team');
    const svgAwayTeam  = document.getElementById('svg-away-team');

    const s = (status || '').toLowerCase();
    const isPlayingOrDone = s.includes('live') || s.includes('진행') || s.includes('종료') || s.includes('final');

    if (svgHomeScore) {
      svgHomeScore.textContent = isPlayingOrDone && homeScore != null ? String(homeScore) : '-';
      svgHomeScore.setAttribute('fill', isPlayingOrDone ? tc(home) : '#fff');
    }
    if (svgAwayScore) {
      svgAwayScore.textContent = isPlayingOrDone && awayScore != null ? String(awayScore) : '-';
      svgAwayScore.setAttribute('fill', isPlayingOrDone ? tc(away) : '#fff');
    }
    if (svgHomeTeam) svgHomeTeam.textContent = home || 'HOME';
    if (svgAwayTeam) svgAwayTeam.textContent = away || 'AWAY';
  }

  // 상단 스코어보드 업데이트
  function updateHeaderScoreboard(game) {
    const awayBadge     = document.getElementById('awayBadge');
    const awayTeamName  = document.getElementById('awayTeamName');
    const awayScoreEl   = document.getElementById('awayScore');
    const statusBadge   = document.getElementById('matchStatusBadge');
    const mainMatchInfo = document.getElementById('mainMatchInfo');
    const homeScoreEl   = document.getElementById('homeScore');
    const homeTeamName  = document.getElementById('homeTeamName');
    const homeBadge     = document.getElementById('homeBadge');

    const ht = game.homeTeam || 'HOME';
    const at = game.awayTeam || 'AWAY';

    if (awayTeamName)  awayTeamName.textContent = at;
    if (homeTeamName)  homeTeamName.textContent = ht;
    if (awayBadge) { awayBadge.textContent = at.slice(0,1); awayBadge.style.background = tc(at); }
    if (homeBadge) { homeBadge.textContent = ht.slice(0,1); homeBadge.style.background = tc(ht); }

    const s = (game.status || '').toLowerCase();
    const isPlayingOrDone = s.includes('live') || s.includes('진행') || s.includes('종료') || s.includes('final');

    if (awayScoreEl) {
      awayScoreEl.textContent = isPlayingOrDone && game.awayScore != null ? String(game.awayScore) : '-';
      awayScoreEl.style.color = isPlayingOrDone ? tc(at) : '#fff';
    }
    if (homeScoreEl) {
      homeScoreEl.textContent = isPlayingOrDone && game.homeScore != null ? String(game.homeScore) : '-';
      homeScoreEl.style.color = isPlayingOrDone ? tc(ht) : '#fff';
    }

    if (statusBadge) {
      statusBadge.style.display   = 'inline-block';
      statusBadge.style.animation = '';
      if (s.includes('live') || s.includes('진행')) {
        statusBadge.textContent    = 'LIVE';
        statusBadge.style.background = '#22C55E';
        statusBadge.style.animation  = 'pulse-live 2s ease-in-out infinite';
      } else if (s.includes('종료') || s.includes('final')) {
        statusBadge.textContent    = '종료';
        statusBadge.style.background = '#64748B';
      } else {
        statusBadge.textContent    = getTimeStr(game.gameTime || game.time);
        statusBadge.style.background = '#3B82F6';
      }
    }
    if (mainMatchInfo) mainMatchInfo.textContent = game.venue || '';
  }

  // 통합 데이터 가져오기 및 렌더링
  async function loadAllGameData() {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // 이번 달 데이터 전체 가져오기
      const res = await fetch(`/api/games?year=${year}&month=${month}`);
      if (!res.ok) return;
      const games = await res.json();

      const card = document.querySelector('.schedule-card');
      const mn = card ? card.querySelector('.match-name') : null;
      const mt = card ? card.querySelector('.match-time') : null;
      const mm = card ? card.querySelector('.match-meta') : null;
      const tl = card ? card.querySelector('.match-time-label') : null;

      if (!games || games.length === 0) {
        if (mn) mn.textContent = 'DB에 이번 달 경기 데이터가 없습니다.';
        return;
      }

      // 1순위: 오늘 경기
      let targetGames = games.filter(g => getDateStr(g.gameDate || g.date) === todayStr);

      // 2순위: 오늘 경기가 없으면 가장 가까운 미래 또는 과거 경기
      if (targetGames.length === 0) {
          const futureGames = games.filter(g => getDateStr(g.gameDate || g.date) > todayStr).sort((a,b) => getDateStr(a.gameDate || a.date).localeCompare(getDateStr(b.gameDate || b.date)));
          if (futureGames.length > 0) {
              const closestDate = getDateStr(futureGames[0].gameDate || futureGames[0].date);
              targetGames = futureGames.filter(g => getDateStr(g.gameDate || g.date) === closestDate);
          } else {
              const pastGames = games.filter(g => getDateStr(g.gameDate || g.date) < todayStr).sort((a,b) => getDateStr(b.gameDate || b.date).localeCompare(getDateStr(a.gameDate || a.date)));
              if (pastGames.length > 0) {
                  const closestDate = getDateStr(pastGames[0].gameDate || pastGames[0].date);
                  targetGames = pastGames.filter(g => getDateStr(g.gameDate || g.date) === closestDate);
              }
          }
      }

      if (targetGames.length === 0) return;

      const myTeam = localStorage.getItem('myTeam') || localStorage.getItem('favoriteTeam') || '';
      let featured = targetGames[0];
      if (myTeam) {
        const found = targetGames.find(g => g.homeTeam === myTeam || g.awayTeam === myTeam);
        if (found) featured = found;
      }

      // 스코어보드 & 전광판 업데이트 적용
      updateHeaderScoreboard(featured);
      updateSvgScoreboard(featured.homeTeam, featured.awayTeam, featured.homeScore, featured.awayScore, (featured.status||'').toLowerCase());

      // 일정 카드 메인 매치 적용
      if (mn) {
        mn.innerHTML = `<span style="color:${tc(featured.awayTeam)};font-weight:900;">${featured.awayTeam}</span>`
          + ` <span style="color:var(--text-3);font-size:0.85em;margin:0 4px">vs</span> `
          + `<span style="color:${tc(featured.homeTeam)};font-weight:900;">${featured.homeTeam}</span>`;
      }
      if (mt) {
        const s = (featured.status||'').toLowerCase();
        if (s.includes('live') || s.includes('진행')) {
          mt.innerHTML = `<span style="background:#22C55E;color:#fff;padding:2px 7px;border-radius:99px;font-size:11px;font-weight:800;">LIVE</span>`;
        } else if (s.includes('종료') || s.includes('final')) {
          mt.textContent = `${featured.awayScore ?? '-'} : ${featured.homeScore ?? '-'}`;
        } else {
          mt.textContent = getTimeStr(featured.gameTime || featured.time);
        }
      }

      const displayDate = getDateStr(featured.gameDate || featured.date);
      if (tl) tl.textContent = displayDate === todayStr ? '오늘의 매치' : `${displayDate} 매치`;
      if (mm) mm.textContent = (featured.venue || '') + (myTeam && (featured.homeTeam===myTeam||featured.awayTeam===myTeam) ? ' · 내 응원팀 경기' : '');

      // 일정 카드 서브 리스트 적용
      if (card) {
        card.querySelectorAll('.schedule-row').forEach(row => row.remove());
        const divider = card.querySelector('.divider');
        const rest = targetGames.filter(g => g.id !== featured.id).slice(0, 3);

        rest.forEach(g => {
          const s = (g.status||'').toLowerCase();
          const scoreOrTime = (s.includes('live')||s.includes('진행'))
            ? `<span style="background:#22C55E;color:#fff;padding:1px 6px;border-radius:99px;font-size:10px;">LIVE</span>`
            : (s.includes('종료') ? `${g.awayScore??'-'}:${g.homeScore??'-'}` : getTimeStr(g.gameTime || g.time));

          const rowDiv = document.createElement('div');
          rowDiv.className = 'schedule-row';
          rowDiv.innerHTML = `
            <span><span style="color:${tc(g.awayTeam)};font-weight:700;">${g.awayTeam}</span> vs <span style="color:${tc(g.homeTeam)};font-weight:700;">${g.homeTeam}</span></span>
            <span style="color:var(--text-3)">${scoreOrTime}</span>
          `;
          if (divider) card.insertBefore(rowDiv, divider);
        });
      }
    } catch(e) { console.error("Schedule Load Error:", e); }
  }

  document.addEventListener('DOMContentLoaded', loadAllGameData);
})();

// ─── 4. 각종 모달창 관리 (Photos 등) ───
function openPhotosModal() { document.getElementById('photos-modal').classList.add('open'); }

const openPhotosBtn = document.getElementById('open-photos');
if (openPhotosBtn) openPhotosBtn.addEventListener('click', openPhotosModal);
const popupOpenPhotos = document.getElementById('popup-open-photos');
if (popupOpenPhotos) popupOpenPhotos.addEventListener('click', openPhotosModal);
const popupUploadBanner = document.getElementById('popup-upload-banner');
if (popupUploadBanner) popupUploadBanner.addEventListener('click', openPhotosModal);

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    if (target) target.classList.remove('open');
  });
});
document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

// ─── 5. 구역 선택 (ZONE SELECTOR) ───
const zoneData = {
  'orange-3b': { name: '3루 오렌지석 (원정 응원석)', desc: '잠실의 원정팀 핵심 응원 구역. 상대팀 팬이 집결해 역응원 열기가 가장 강한 곳입니다.', zones: ['zone-orange-3b','zone-orange-3b-top','zone-red-3b','zone-red-3b-side'] },
  'orange-1b': { name: '1루 오렌지석 (홈팀 응원석)', desc: '홈팀 팬의 핵심 응원 구역. 떼창과 단체 응원가가 가장 강렬하게 터지는 곳입니다.', zones: ['zone-orange-1b','zone-orange-1b-top','zone-red-1b','zone-red-1b-side'] },
  'outfield-center': { name: '중앙 외야 그린석', desc: '홈런볼이 떨어지는 중립 외야 구역. 양 팀 응원이 교차하며 분위기가 가장 다채로운 곳입니다.', zones: ['zone-outfield-center','zone-outfield-left','zone-outfield-right'] },
  'premium': { name: '테이블석 / 프리미엄석', desc: '포수 바로 뒤 중앙 최고급 좌석. 경기장 전체를 한눈에 볼 수 있는 명당으로 응원보다 관람 중심입니다.', zones: ['zone-premium','zone-table-top','zone-exciting-l','zone-exciting-r'] },
  'foul': { name: '외야 파울존 / 블루석', desc: '1·3루 파울라인 바깥 구역. 접근성이 좋고 가성비 높아 응원보다 여유로운 관람을 즐기는 팬이 많습니다.', zones: ['zone-foul','zone-blue-bottom','zone-blue-bottom-r','zone-navy-3b','zone-navy-1b'] }
};

function renderZone(key) {
  const d = zoneData[key];
  if (!d) return;
  const zoneName  = document.getElementById('zone-name');
  const zoneDesc  = document.getElementById('zone-desc');
  if (zoneName)  zoneName.textContent  = d.name;
  if (zoneDesc)  zoneDesc.textContent  = d.desc;

  document.querySelectorAll('.zone-btn').forEach(b => b.classList.toggle('active', b.dataset.zone === key));

  document.querySelectorAll('.seat-zone').forEach(z => {
    z.style.opacity = '0.10';
    z.style.filter  = 'brightness(0.7)';
  });
  if (d.zones) {
    d.zones.forEach(zid => {
      const el = document.getElementById(zid);
      if (el) { el.style.opacity = '0.72'; el.style.filter = 'brightness(1.3)'; }
    });
  }
}
document.querySelectorAll('.zone-btn').forEach(btn => {
  btn.addEventListener('click', () => renderZone(btn.dataset.zone));
});
renderZone('orange-3b'); // 초기 구역 세팅

// ─── 6. 응원 지수 실시간 반영 (서버 API 기반) ───
(function() {
  function updateCheerUI(homeScore, awayScore, homePct, awayPct) {
    const els = {
      kiaScore:  document.getElementById('kia-score'),
      lgScore:   document.getElementById('lg-score'),
      kiaPct:    document.getElementById('kia-pct'),
      lgPct:     document.getElementById('lg-pct'),
      kiaBar:    document.getElementById('kia-bar'),
      lgBar:     document.getElementById('lg-bar'),
      zoneRatio: document.getElementById('zone-ratio'),
    };
    if (els.kiaScore)  els.kiaScore.textContent  = homeScore;
    if (els.lgScore)   els.lgScore.textContent   = awayScore;
    if (els.kiaPct)    els.kiaPct.textContent    = homePct + '%';
    if (els.lgPct)     els.lgPct.textContent     = awayPct + '%';
    if (els.kiaBar)    els.kiaBar.style.width    = homePct + '%';
    if (els.lgBar)     els.lgBar.style.width     = awayPct + '%';
    if (els.zoneRatio) els.zoneRatio.innerHTML   =
      `<span style="color:var(--kia)">홈 ${homePct}%</span>`
      + `<span style="color:var(--text-3);font-size:1rem;margin:0 4px">:</span>`
      + `<span style="color:var(--lg)">원정 ${awayPct}%</span>`;
  }

  async function refreshCheerPoints() {
    try {
      const res  = await fetch('/api/posts/cheer-ratio');
      if (!res.ok) return;
      const data = await res.json();
      updateCheerUI(data.homeScore, data.awayScore, data.homePct, data.awayPct);
    } catch(e) { }
  }

  document.addEventListener('DOMContentLoaded', refreshCheerPoints);
})();

// ─── 7. 커뮤니티 인증샷 → index.html 카드 표시 (서버 API 기반) ───
(function() {
  const EMPTY_IMG = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" background="%231E293B"%3E%3Crect width="100%" height="100%" fill="%231E293B"/%3E%3Ctext x="50%" y="50%" fill="%2364748B" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle"%3E첫 인증샷을 올려주세요!%3C/text%3E%3C/svg%3E';

  async function renderPhotoCards() {
    let communityPhotos = [];
    try {
      const res  = await fetch('/api/posts/photos?limit=12');
      if (res.ok) communityPhotos = await res.json();
    } catch(e) {}

    document.querySelectorAll('.photo-item').forEach((item, i) => {
      const img = item.querySelector('img');
      if (!img) return;
      if (communityPhotos[i]) {
        img.src = communityPhotos[i].imageData;
        item.setAttribute('data-caption', '@' + communityPhotos[i].author);
        item.style.cursor = 'pointer';
        item.onclick = e => { e.stopPropagation(); window.location.href = 'community.html?tab=photo'; };
      } else {
        img.src = EMPTY_IMG;
        item.setAttribute('data-caption', '인증샷 대기 중');
        item.onclick = null;
      }
    });

    document.querySelectorAll('.popup-photo-item').forEach((item, i) => {
      const img = item.querySelector('img');
      if (!img) return;
      if (communityPhotos[i]) {
        img.src = communityPhotos[i].imageData;
        item.setAttribute('data-nick', '@' + communityPhotos[i].author);
      } else {
        img.src = EMPTY_IMG;
        item.setAttribute('data-nick', '대기 중');
      }
    });

    const galleryItems = document.querySelectorAll('#photos-modal .gallery-item');
    galleryItems.forEach((item, i) => {
      const img     = item.querySelector('img');
      const overlay = item.querySelector('.gallery-overlay');
      if (!img) return;
      if (communityPhotos[i]) {
        img.src = communityPhotos[i].imageData;
        if (overlay) overlay.textContent = '@' + communityPhotos[i].author;
      } else {
        img.src = EMPTY_IMG;
        if (overlay) overlay.textContent = '대기 중';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', renderPhotoCards);
})();

// ─── 8. AI 챗봇 ───
(function() {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const chatSend     = document.getElementById('chat-send');
  const typingEl     = document.getElementById('typing');
  if (!chatMessages || !chatInput || !chatSend) return;

  function addBubble(text, type) {
    const row    = document.createElement('div');
    row.className = `chat-msg-row${type === 'user' ? ' user-row' : ''}`;
    const bubble  = document.createElement('div');
    bubble.className = `bubble bubble-${type === 'user' ? 'user' : 'bot'}`;
    bubble.textContent = text;
    if (type === 'user') {
      const p = getPersonality();
      if (p) {
        const badge = document.createElement('div');
        badge.className = 'inline-badge';
        badge.style.cssText = `background:${hexToRgba(p.color||'#3B82F6',0.15)};border-color:${hexToRgba(p.color||'#3B82F6',0.35)};color:${p.color||'#3B82F6'}`;
        badge.innerHTML = `<span class="b-emoji">${p.emoji||'⚾'}</span><span>${p.name||''}</span>`;
        row.appendChild(badge);
      }
    }
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function fallback(msg) {
    if (msg.includes('응원') && msg.includes('문구')) return '오늘도 분위기는 우리가 가져간다! 구장 전체를 우리 응원으로 채워보자! ⚾';
    if (msg.includes('게시글')) return '직관 열기 가득했던 오늘 경기. 응원 열기가 올라오면서 분위기도 완전히 우리 쪽으로 넘어왔어요.';
    if (msg.includes('댓글'))  return '오늘 분위기 진짜 좋다. 이 흐름 끝까지 가져가자! 🔥';
    if (msg.includes('KIA'))   return 'KIA 팬 분위기를 더 살리려면 짧고 강한 문장으로 통일해서 반복 응원하는 게 좋아요!';
    if (msg.includes('LG'))    return 'LG 쪽 분위기는 역응원과 떼창 포인트를 같이 살리는 문장이 잘 어울려요.';
    return '응원 문구, 게시글 초안, 댓글 문장, 경기 분위기 정리 중에서 원하는 걸 편하게 물어보세요! ⚾';
  }

  async function sendChat(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    addBubble(trimmed, 'user');
    chatInput.value = '';
    if (typingEl) typingEl.classList.add('visible');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    let reply = '';
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed })
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || fallback(trimmed);
      } else {
        reply = fallback(trimmed);
      }
    } catch { reply = fallback(trimmed); }
    if (typingEl) typingEl.classList.remove('visible');
    addBubble(reply, 'bot');
  }

  chatSend.addEventListener('click', () => sendChat(chatInput.value));
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(chatInput.value); } });
})();

// ─── 9. 점령전 티켓 인증 모달 (OCR & Diary 연동) ───
(function() {
  const modal       = document.getElementById('battle-modal');
  const fileInput   = document.getElementById('battle-file-input');
  const uploadZone  = document.getElementById('battle-upload-zone');
  const previewWrap = document.getElementById('battle-preview-wrap');
  const previewImg  = document.getElementById('battle-preview-img');
  const ocrBtn      = document.getElementById('battle-ocr-btn');
  const resetBtn    = document.getElementById('battle-reset-btn');
  const stepUpload  = document.getElementById('battle-step-upload');
  const stepLoading = document.getElementById('battle-step-loading');
  const stepResult  = document.getElementById('battle-step-result');
  const stepDone    = document.getElementById('battle-step-done');
  const stepError   = document.getElementById('battle-step-error');

  if (!modal) return;

  let selectedFile = null;

  const joinBtn = document.getElementById('btn-join-battle');
  if (joinBtn) joinBtn.addEventListener('click', () => { resetModal(); modal.classList.add('open'); });

  if (uploadZone) {
    uploadZone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor='var(--lg)'; uploadZone.style.background='rgba(59,130,246,0.08)'; });
    uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor=''; uploadZone.style.background=''; });
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.style.borderColor=''; uploadZone.style.background='';
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleFile(f);
    });
  }
  if (fileInput) fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

  function handleFile(f) {
    selectedFile = f;
    const url = URL.createObjectURL(f);
    if (previewImg) previewImg.src = url;
    if (previewWrap) previewWrap.style.display = 'block';
    if (uploadZone) uploadZone.style.display = 'none';
    if (ocrBtn) { ocrBtn.style.opacity = '1'; ocrBtn.style.pointerEvents = 'auto'; ocrBtn.disabled = false; }
  }

  if (resetBtn) resetBtn.addEventListener('click', resetModal);

  if (ocrBtn) ocrBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    showStep('loading');
    animateProgress();
    try {
      const base64 = await fileToBase64(selectedFile);
      const res = await fetch('/api/vision/ticket-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: selectedFile.type })
      });
      if (!res.ok) throw new Error('서버 오류: ' + res.status);
      const data = await res.json();
      renderResult(data);
      showStep('result');
    } catch (err) {
      alert('티켓 분석 중 오류가 발생했어요. 다시 시도해주세요.\n' + err.message);
      showStep('upload');
    }
  });

  function renderResult(data) {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '인식 불가'; };
    setEl('ocr-date', data.date);
    setEl('ocr-match', data.match);
    setEl('ocr-stadium', data.stadium);
    setEl('ocr-seat', data.seat);
    const rawEl = document.getElementById('ocr-raw-text');
    if (rawEl) rawEl.textContent = data.rawText || '';
    const conf  = data.confidence || 0;
    const badge = document.getElementById('ocr-confidence-badge');
    if (badge) {
      if (conf >= 80) { badge.textContent = `✅ 신뢰도 ${conf}%`; badge.style.background='rgba(34,197,94,0.15)'; badge.style.color='#4ade80'; badge.style.borderColor='rgba(34,197,94,0.3)'; }
      else if (conf >= 50) { badge.textContent = `⚠️ 신뢰도 ${conf}%`; badge.style.background='rgba(245,158,11,0.15)'; badge.style.color='#fbbf24'; badge.style.borderColor='rgba(245,158,11,0.3)'; }
      else { badge.textContent = '❓ 낮은 신뢰도'; badge.style.background='rgba(239,68,68,0.12)'; badge.style.color='#f87171'; badge.style.borderColor='rgba(239,68,68,0.2)'; }
    }
    window._ocrResult = data;
  }

  const retryBtn = document.getElementById('battle-retry-btn');
  if (retryBtn) retryBtn.addEventListener('click', () => { resetModal(); showStep('upload'); });

  const confirmBtn = document.getElementById('battle-confirm-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', async () => {
    const d = window._ocrResult || {};
    confirmBtn.disabled = true;
    confirmBtn.textContent = '저장 중...';
    const result = await saveToDiary(d);
    if (result && result.error) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '⚔️ 점령전 참여 확정!';
      const errMsg = document.getElementById('battle-error-msg');
      if (errMsg) errMsg.textContent = result.error;
      showStep('error');
      return;
    }
    const gameData  = result;
    const matchInfo = gameData ? `${gameData.homeTeam} vs ${gameData.awayTeam} (DB 매칭 ✅)` : (d.match || '-');
    const doneInfo = document.getElementById('battle-done-info');
    if (doneInfo) doneInfo.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
        <div>📅 <b>${gameData ? gameData.date : (d.date||'-')}</b></div>
        <div>⚾ <b>${matchInfo}</b></div>
        <div>🏟 <b>${gameData ? gameData.venue : (d.stadium||'-')}</b></div>
        <div>💺 <b>${d.seat||'-'}</b></div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);color:#4ade80;font-weight:700;font-size:12px;">
          📔 직관 다이어리에 자동 저장되었어요!
          ${gameData?.fallback ? '<br><span style="color:#fbbf24;font-size:11px;">⚠️ 팀명 매칭 실패 — 당일 첫 경기로 저장됩니다. 수정해주세요.</span>' : ''}
        </div>
      </div>`;
    confirmBtn.disabled = false;
    confirmBtn.textContent = '⚔️ 점령전 참여 확정!';
    showStep('done');
  });

  async function saveToDiary(ocrData) {
    const user = localStorage.getItem('loggedInUser');
    if (!user) return null;
    try {
      let dateStr = '';
      if (ocrData.date) {
        const m = ocrData.date.match(/(\d{4})[년\s\-\/\.]+(\d{1,2})[월\s\-\/\.]+(\d{1,2})/);
        if (m) dateStr = `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
      }
      if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);
      const myTeam = localStorage.getItem('myTeam') || localStorage.getItem('favoriteTeam') || '';
      let teamHint = myTeam;
      if (ocrData.match) {
        const parts = ocrData.match.split(/\s*vs\s*/i);
        const found = parts.find(p => p.trim().toUpperCase().includes(myTeam.toUpperCase()));
        teamHint = (found || parts[0] || '').trim();
      }
      let gameData = null;
      try {
        const params = new URLSearchParams({ date: dateStr });
        if (teamHint) params.append('hint', teamHint);
        const res = await fetch(`/api/games/match?${params}`);
        if (res.ok) { const data = await res.json(); if (data.found) gameData = data; }
      } catch(e) { }

      let home = '', away = '', homeScore = null, awayScore = null, stadium = '', gameDate = dateStr;
      if (gameData) {
        home = gameData.homeTeam || ''; away = gameData.awayTeam || '';
        homeScore = gameData.homeScore >= 0 ? gameData.homeScore : null;
        awayScore = gameData.awayScore >= 0 ? gameData.awayScore : null;
        stadium = gameData.venue || ocrData.stadium || '';
        gameDate = gameData.date || dateStr;
      } else {
        if (ocrData.match) { const parts = ocrData.match.split(/\s*vs\s*/i); if (parts.length >= 2) { away = parts[0].trim(); home = parts[1].trim(); } }
        stadium = ocrData.stadium || '';
      }
      let result = 'draw';
      if (homeScore !== null && awayScore !== null) {
        const isHome = home === myTeam;
        const myScore  = isHome ? homeScore : awayScore;
        const oppScore = isHome ? awayScore : homeScore;
        result = myScore > oppScore ? 'win' : myScore < oppScore ? 'lose' : 'draw';
      }
      const payload = {
        nickname: user, date: gameDate, home, away, homeScore, awayScore,
        myteam: myTeam, result, stadium, seat: ocrData.seat || '',
        weather: '', mate: '', mood: '',
        memo: `🎫 점령전 티켓 인증으로 자동 저장${gameData ? ' (DB 매칭)' : ' (OCR 데이터)'}`,
        costTicket: 0, costTransport: 0, costFood: 0, costGoods: 0,
      };
      const res = await fetch('/api/diary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) return { error: data.message };
      return gameData;
    } catch(e) { return null; }
  }

  const doneClose = document.getElementById('battle-done-close');
  if (doneClose) doneClose.addEventListener('click', () => { modal.classList.remove('open'); });

  const errorClose = document.getElementById('battle-error-close');
  if (errorClose) errorClose.addEventListener('click', () => { modal.classList.remove('open'); });

  function showStep(name) {
    if (stepUpload)  stepUpload.style.display  = name === 'upload'  ? 'block' : 'none';
    if (stepLoading) stepLoading.style.display = name === 'loading' ? 'block' : 'none';
    if (stepResult)  stepResult.style.display  = name === 'result'  ? 'block' : 'none';
    if (stepDone)    stepDone.style.display    = name === 'done'    ? 'block' : 'none';
    if (stepError)   stepError.style.display   = name === 'error'   ? 'block' : 'none';
  }

  function resetModal() {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (uploadZone) uploadZone.style.display = 'block';
    if (ocrBtn) { ocrBtn.style.opacity = '0.4'; ocrBtn.style.pointerEvents = 'none'; ocrBtn.disabled = true; }
    showStep('upload');
  }

  function animateProgress() {
    const bar = document.getElementById('ocr-progress-bar');
    if (!bar) return;
    let w = 0;
    const iv = setInterval(() => {
      w = Math.min(w + Math.random() * 12, 88);
      bar.style.width = w + '%';
      if (w >= 88) clearInterval(iv);
    }, 200);
  }

  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
})();