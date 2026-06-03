// ═══════════════════════════════════════════════════════════════════════════════
// PLACEBALL INDEX.JS — FINAL INTEGRATED (v9.0 — 백엔드 API 완전 연동)
// ═══════════════════════════════════════════════════════════════════════════════

const TEAM_COLORS = {
  'KIA':'#E60012','기아':'#E60012','LG':'#002C5F','두산':'#131230',
  '삼성':'#074CA1','롯데':'#002955','SSG':'#CE0E2D','NC':'#315288',
  'KT':'#000000','한화':'#FF6600','키움':'#820024'
};
function tc(name) { return TEAM_COLORS[name] || '#94A3B8'; }

// ─── 1. 헤더 및 로그인 ───
(function() {
  const user = localStorage.getItem('loggedInUser');
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userNick = document.getElementById('user-nick');
  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userNick) userNick.textContent = user;
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('loggedInUser');
      location.reload();
    };
  }
})();

// ─── 2. 경기 일정 (오늘의 전장) ───
(function() {
  const TEAM_COLORS_MAP = {
    'KIA':'#E60012','기아':'#E60012','LG':'#002C5F','두산':'#131230',
    '삼성':'#074CA1','롯데':'#002955','SSG':'#CE0E2D','NC':'#315288',
    'KT':'#000000','한화':'#FF6600','키움':'#820024'
  };

  async function loadGames() {
    try {
      const res   = await fetch('/api/games/today');
      const games = await res.json();
      if (!games || games.length === 0) {
        // 오늘 경기 없음 표시
        const container = document.getElementById('today-match-container');
        if (container) container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:13px;padding:1rem;">오늘 경기가 없습니다</div>';
        const timeEl = document.getElementById('today-match-time');
        if (timeEl) timeEl.textContent = '-';
        return;
      }

      const myTeam = localStorage.getItem('favoriteTeam') || '';
      let g = games[0];
      if (myTeam) {
        const found = games.find(x => x.homeTeam === myTeam || x.awayTeam === myTeam);
        if (found) g = found;
      }

      // 경기 시간
      const timeEl = document.getElementById('today-match-time');
      if (timeEl) timeEl.textContent = g.gameTime ? String(g.gameTime).slice(0,5) : '18:30';

      // 원정팀
      const awayName  = document.getElementById('today-away-name');
      const awayLogo  = document.getElementById('today-away-logo');
      if (awayName) awayName.textContent = g.awayTeam || '-';
      if (awayLogo) {
        awayLogo.textContent       = g.awayTeam ? g.awayTeam.slice(0,2) : '-';
        awayLogo.style.background  = TEAM_COLORS_MAP[g.awayTeam] || '#94A3B8';
        awayLogo.style.color       = '#fff';
      }

      // 홈팀
      const homeName  = document.getElementById('today-home-name');
      const homeLogo  = document.getElementById('today-home-logo');
      if (homeName) homeName.textContent = g.homeTeam || '-';
      if (homeLogo) {
        homeLogo.textContent       = g.homeTeam ? g.homeTeam.slice(0,2) : '-';
        homeLogo.style.background  = TEAM_COLORS_MAP[g.homeTeam] || '#94A3B8';
        homeLogo.style.color       = '#fff';
      }

    } catch(e) {}
  }
  document.addEventListener('DOMContentLoaded', loadGames);
})();

// ─── 3. 점령전 점수판 & 응원 게이지 (오늘 경기 기준) ───
(function() {
  const TEAM_COLORS_BOARD = {
    'KIA':'#E60012','기아':'#E60012','LG':'#002C5F','두산':'#131230',
    '삼성':'#074CA1','롯데':'#002955','SSG':'#CE0E2D','NC':'#315288',
    'KT':'#000000','한화':'#FF6600','키움':'#820024'
  };

  async function updateBattleBoard() {
    try {
      const myTeam = localStorage.getItem('favoriteTeam') || '';

      // 오늘 경기 기준 배틀 현황
      const res    = await fetch('/api/battle/today');
      const battles = await res.json();
      if (!battles || !battles.length) return;

      // 내 응원팀 경기 우선, 없으면 첫 번째
      let b = battles[0];
      if (myTeam) {
        const found = battles.find(x => x.homeTeam === myTeam || x.awayTeam === myTeam);
        if (found) b = found;
      }

      const homeTeam  = b.homeTeam  || '-';
      const awayTeam  = b.awayTeam  || '-';
      const homeScore = b.homeCheerScore || 0;
      const awayScore = b.awayCheerScore || 0;
      const homePct   = b.homePct   || 50;
      const awayPct   = b.awayPct   || 50;

      // ── 점수판 팀명 업데이트 ──
      const bbHomeLogo = document.getElementById('bb-home-logo');
      const bbAwayLogo = document.getElementById('bb-away-logo');
      if (bbHomeLogo) {
        bbHomeLogo.textContent      = homeTeam.slice(0, 3);
        bbHomeLogo.style.background = TEAM_COLORS_BOARD[homeTeam] || '#94A3B8';
      }
      if (bbAwayLogo) {
        bbAwayLogo.textContent      = awayTeam.slice(0, 3);
        bbAwayLogo.style.background = TEAM_COLORS_BOARD[awayTeam] || '#94A3B8';
      }

      // ── 점수판 점수 업데이트 (오늘 경기 기준 누적) ──
      const homeScoreEl = document.getElementById('homeScore');
      const awayScoreEl = document.getElementById('awayScore');
      if (homeScoreEl) homeScoreEl.textContent = homeScore.toLocaleString() + ' pt';
      if (awayScoreEl) awayScoreEl.textContent = awayScore.toLocaleString() + ' pt';

      // ── 게이지 바 ──
      const bbgKia     = document.getElementById('bbgKia');
      const bbGaugeKia = document.getElementById('bbGaugeKia');
      if (bbgKia)     bbgKia.style.width     = homePct + '%';
      if (bbGaugeKia) bbGaugeKia.style.width = homePct + '%';

      // ── 구역 패널 비율 ──
      const zoneRatio = document.getElementById('zone-ratio');
      if (zoneRatio) {
        const homeColor = TEAM_COLORS_BOARD[homeTeam] || 'var(--kia)';
        zoneRatio.innerHTML = `
          <span style="color:${homeColor}">${homeTeam} ${homePct}%</span>
          <span style="color:var(--muted); margin:0 5px;">:</span>
          <span style="color:var(--lg-mid)">${awayTeam} ${awayPct}%</span>`;
      }

      // ── 응원 반응 수치 (왼쪽 카드) ──
      const statBig = document.querySelector('.stat-big span:first-child');
      if (statBig) {
        statBig.textContent = homePct + '%';
        statBig.style.color = TEAM_COLORS_BOARD[homeTeam] || 'var(--kia)';
      }
      const statUnit = document.querySelector('.stat-unit');
      if (statUnit) statUnit.textContent = homeTeam + ' 응원';

      const fills = document.querySelectorAll('.progress-fill');
      if (fills[0]) fills[0].style.width = Math.min(homePct, 100) + '%';

    } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', updateBattleBoard);
  setInterval(updateBattleBoard, 30000); // 30초마다 갱신
})();

// ─── 4. 구역 선택 (ZONE SELECTOR) ───
(function() {
  const zoneData = {
    'orange-3b':       { name: '3루 오렌지석 (원정 응원석)', desc: '잠실의 원정팀 핵심 응원 구역. 상대팀 팬이 집결해 역응원 열기가 가장 강한 곳입니다.', zones: ['zone-orange-3b','zone-orange-3b-top','zone-red-3b','zone-red-3b-side'] },
    'orange-1b':       { name: '1루 오렌지석 (홈팀 응원석)', desc: '홈팀 팬의 핵심 응원 구역. 떼창과 단체 응원가가 가장 강렬하게 터지는 곳입니다.', zones: ['zone-orange-1b','zone-orange-1b-top','zone-red-1b','zone-red-1b-side'] },
    'outfield-center': { name: '중앙 외야 그린석', desc: '홈런볼이 떨어지는 중립 외야 구역. 양 팀 응원이 교차하며 분위기가 가장 다채로운 곳입니다.', zones: ['zone-outfield-center','zone-outfield-left','zone-outfield-right'] },
    'premium':         { name: '테이블석 / 프리미엄석', desc: '포수 바로 뒤 중앙 최고급 좌석. 경기장 전체를 한눈에 볼 수 있는 명당으로 응원보다 관람 중심입니다.', zones: ['zone-premium','zone-table-top','zone-exciting-l','zone-exciting-r'] },
    'foul':            { name: '외야 파울존 / 블루석', desc: '1·3루 파울라인 바깥 구역. 접근성이 좋고 가성비 높아 응원보다 여유로운 관람을 즐기는 팬이 많습니다.', zones: ['zone-foul','zone-blue-bottom','zone-blue-bottom-r','zone-navy-3b','zone-navy-1b'] }
  };

  function renderZone(key) {
    const d = zoneData[key];
    if (!d) return;
    const zoneName = document.getElementById('zone-name');
    const zoneDesc = document.getElementById('zone-desc');
    if (zoneName) zoneName.textContent = d.name;
    if (zoneDesc) zoneDesc.textContent = d.desc;

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

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.onclick = () => renderZone(btn.dataset.zone);
    });
    renderZone('orange-3b');
  });
})();

// ─── 5. 인증샷 갤러리 & 직접 업로드 ───
(function() {
  const MAX_FILE_MB  = 5;
  let selectedBase64 = null;

  function buildModalContent() {
    const modal = document.getElementById('photos-modal');
    if (!modal) return;
    const box = modal.querySelector('.modal-box');
    if (!box || box.querySelector('#gallery-modal-content')) return;

    const content = document.createElement('div');
    content.id    = 'gallery-modal-content';
    content.innerHTML = `
      <div id="gallery-upload-zone" style="border:2px dashed rgba(0,0,0,0.15);border-radius:14px;padding:1.5rem;text-align:center;cursor:pointer;margin-bottom:1rem;background:rgba(0,0,0,0.02);transition:all .2s;">
        <div id="gallery-upload-default">
          <div style="font-size:2.2rem;margin-bottom:0.5rem;">📸</div>
          <div style="font-size:13px;font-weight:800;margin-bottom:4px;color:var(--ink);">구장에서 찍은 사진을 올려보세요!</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:1rem;">클릭하거나 파일을 드래그하세요 · 사진 1장당 포인트 <b style="color:var(--kia);">+10점</b></div>
          <button type="button" id="gallery-pick-btn" style="padding:8px 18px;background:var(--ink);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">사진 선택</button>
        </div>
        <div id="gallery-upload-preview" style="display:none;">
          <img id="gallery-preview-img" style="max-height:200px;max-width:100%;border-radius:10px;margin-bottom:0.8rem;">
          <div id="gallery-preview-name" style="font-size:11px;color:var(--muted);margin-bottom:0.8rem;"></div>
          <input id="gallery-caption" type="text" maxlength="80" placeholder="한 줄 코멘트 (선택)" style="width:100%;max-width:360px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:12px;margin-bottom:0.8rem;">
          <div style="display:flex;gap:8px;justify-content:center;">
            <button type="button" id="gallery-cancel-btn" style="padding:8px 14px;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">취소</button>
            <button type="button" id="gallery-submit-btn" style="padding:8px 18px;background:var(--kia);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;">업로드하고 +10pt</button>
          </div>
        </div>
      </div>
      <input type="file" id="gallery-file-input" style="display:none" accept="image/*">
      <div id="gallery-upload-status" style="display:none;text-align:center;margin-bottom:1rem;font-size:12px;font-weight:700;padding:8px;border-radius:8px;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;">
        <div style="font-size:14px;font-weight:900;color:var(--ink);">🖼️ 팬 갤러리</div>
        <div id="gallery-count" style="font-size:11px;color:var(--muted);"></div>
      </div>
      <div id="gallery-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:380px;overflow-y:auto;padding:2px;"></div>
      <div id="gallery-empty" style="display:none;text-align:center;padding:2rem;color:var(--muted);font-size:12px;">아직 등록된 인증샷이 없습니다.<br>첫 번째로 올려보세요!</div>
    `;
    box.appendChild(content);

    const zone      = content.querySelector('#gallery-upload-zone');
    const fileIn    = content.querySelector('#gallery-file-input');
    const pickBtn   = content.querySelector('#gallery-pick-btn');
    const cancelBtn = content.querySelector('#gallery-cancel-btn');
    const submitBtn = content.querySelector('#gallery-submit-btn');

    pickBtn.onclick = (e) => { e.stopPropagation(); fileIn.click(); };
    zone.onclick    = (e) => {
      if (content.querySelector('#gallery-upload-preview').style.display === 'none') fileIn.click();
    };

    ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => {
      e.preventDefault(); zone.style.borderColor = 'var(--kia)'; zone.style.background = 'rgba(230,0,18,0.05)';
    }));
    ['dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => {
      e.preventDefault(); zone.style.borderColor = 'rgba(0,0,0,0.15)'; zone.style.background = 'rgba(0,0,0,0.02)';
    }));
    zone.addEventListener('drop', e => { const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); });
    fileIn.onchange = () => { const f = fileIn.files?.[0]; if (f) handleFile(f); };
    cancelBtn.onclick = resetUploadUI;
    submitBtn.onclick = doUpload;
  }

  function setStatus(msg, type) {
    const el = document.getElementById('gallery-upload-status');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.textContent = msg;
    el.style.background = type === 'success' ? '#E6F7EC' : type === 'error' ? '#FDECEC' : '#F0F4F8';
    el.style.color      = type === 'success' ? '#0F7A3A' : type === 'error' ? '#C0392B' : 'var(--ink)';
  }

  function resetUploadUI() {
    selectedBase64 = null;
    const fileIn = document.getElementById('gallery-file-input');
    if (fileIn) fileIn.value = '';
    document.getElementById('gallery-upload-default').style.display = 'block';
    document.getElementById('gallery-upload-preview').style.display = 'none';
    const cap = document.getElementById('gallery-caption');
    if (cap) cap.value = '';
    setStatus('');
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) { setStatus('❌ 이미지 파일만 업로드 가능합니다.', 'error'); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setStatus(`❌ 파일이 너무 큽니다. (최대 ${MAX_FILE_MB}MB)`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      selectedBase64 = reader.result;
      document.getElementById('gallery-preview-img').src = reader.result;
      document.getElementById('gallery-preview-name').textContent = `${file.name} · ${(file.size/1024).toFixed(0)}KB`;
      document.getElementById('gallery-upload-default').style.display = 'none';
      document.getElementById('gallery-upload-preview').style.display = 'block';
      setStatus('');
    };
    reader.onerror = () => setStatus('❌ 파일을 읽지 못했습니다.', 'error');
    reader.readAsDataURL(file);
  }

  async function doUpload() {
    if (!selectedBase64) return;
    const user = localStorage.getItem('loggedInUser');
    if (!user) { setStatus('❌ 로그인이 필요합니다.', 'error'); setTimeout(() => location.href = 'login.html', 1200); return; }
    const caption = (document.getElementById('gallery-caption')?.value || '').trim();
    const submitBtn = document.getElementById('gallery-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '업로드 중...'; }
    setStatus('⏳ 업로드 중...');
    try {
      const res  = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user, tab: 'photo', title: caption || '📸 직관 인증샷', content: caption || '메인 화면에서 업로드한 인증샷입니다.', images: [selectedBase64] })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        const pointMsg = data.points > 0
          ? `✅ 업로드 완료! +${data.points}pt 획득`
          : `✅ 업로드 완료! (오늘 포인트는 이미 획득하셨어요)`;
        setStatus(pointMsg, 'success');
        setTimeout(() => { resetUploadUI(); loadPhotos(); }, 1200);
      } else {
        setStatus('❌ ' + (data.message || '업로드 실패'), 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '업로드하고 +10pt'; }
      }
    } catch {
      setStatus('❌ 네트워크 오류가 발생했습니다.', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '업로드하고 +10pt'; }
    }
  }

  function openModal() {
    const modal = document.getElementById('photos-modal');
    if (!modal) return;
    buildModalContent();
    modal.classList.add('open');
    loadPhotos();
  }

  async function loadPhotos() {
    let photos = [];
    try {
      const res = await fetch('/api/posts/photos?limit=12');
      if (res.ok) photos = await res.json();
    } catch {}

    const slots = document.querySelectorAll('.pb-inv-slot');
    slots.forEach((slot, i) => {
      slot.style.cursor = 'pointer';
      if (photos[i]) {
        slot.innerHTML = `
          <img src="${photos[i].imageData}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">
          <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.65);color:#fff;font-size:9px;padding:3px 4px;text-align:center;border-radius:0 0 10px 10px;font-weight:700;">@${esc(photos[i].author)}</div>`;
      }
      slot.onclick = openModal;
    });

    const grid  = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    const count = document.getElementById('gallery-count');
    if (!grid) return;

    grid.innerHTML = '';
    if (count) count.textContent = `총 ${photos.length}장`;
    if (!photos.length) { grid.style.display = 'none'; if (empty) empty.style.display = 'block'; return; }
    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    photos.forEach(p => {
      const item = document.createElement('div');
      item.style.cssText = 'aspect-ratio:1;position:relative;overflow:hidden;border-radius:10px;cursor:pointer;transition:transform .15s;';
      item.innerHTML = `
        <img src="${p.imageData}" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:#fff;font-size:10px;padding:8px 6px 4px;font-weight:700;">@${esc(p.author)}</div>`;
      item.onmouseenter = () => item.style.transform = 'scale(1.03)';
      item.onmouseleave = () => item.style.transform = '';
      item.onclick = () => {
        const lb = document.createElement('div');
        lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:300;display:flex;align-items:center;justify-content:center;padding:2rem;cursor:zoom-out;';
        lb.innerHTML = `<div style="max-width:90vw;max-height:90vh;"><img src="${p.imageData}" style="max-width:90vw;max-height:80vh;border-radius:12px;"><div style="text-align:center;color:#fff;margin-top:1rem;font-weight:700;">@${esc(p.author)}</div></div>`;
        lb.onclick = () => lb.remove();
        document.body.appendChild(lb);
      };
      grid.appendChild(item);
    });
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildModalContent();
    loadPhotos();
    document.getElementById('open-photos')?.addEventListener('click', openModal);
  });
})();

// ─── 6. 점령전 티켓 인증 ───
// DOMContentLoaded 안에서 전부 처리 → 타이밍 문제 완전 해결
document.addEventListener('DOMContentLoaded', function() {
  const modal   = document.getElementById('battle-modal');
  const joinBtn = document.getElementById('btn-join-battle');
  if (!modal || !joinBtn) return;

  // ── 스텝 전환 ──
  function showStep(step) {
    ['upload','loading','result','done'].forEach(s => {
      const el = document.getElementById('battle-step-' + s);
      if (el) el.style.display = s === step ? 'block' : 'none';
    });
    const err = document.getElementById('battle-error');
    if (err) err.style.display = 'none';
  }

  function showError(msg) {
    const err = document.getElementById('battle-error');
    if (err) { err.textContent = '❌ ' + msg; err.style.display = 'block'; }
  }

  // ── 모달 열기 ──
  function openBattleModal() {
    const fi = document.getElementById('battle-file-input');
    if (fi) fi.value = '';
    const pw = document.getElementById('battle-preview-wrap');
    if (pw) pw.style.display = 'none';
    const uz = document.getElementById('battle-upload-zone');
    if (uz) uz.style.display = 'block';

    // 구역 선택 초기화
    window._selectedBattleZone = null;
    document.querySelectorAll('.battle-zone-btn').forEach(b => {
      b.style.background  = '#fff';
      b.style.color       = 'var(--ink-2)';
      b.style.borderColor = 'var(--line)';
    });
    const zoneSelectedEl = document.getElementById('battle-zone-selected');
    if (zoneSelectedEl) zoneSelectedEl.textContent = '';

    showStep('upload');
    modal.classList.add('open');

    // 오늘 이미 참여했는지 체크
    checkAlreadyCertified();
  }

  // ── 오늘 이미 참여 여부 확인 ──
  async function checkAlreadyCertified() {
    const user = localStorage.getItem('loggedInUser');
    if (!user) return;

    try {
      const res     = await fetch('/api/battle/today');
      const battles = await res.json();
      if (!battles || !battles.length) return;

      const myTeam = localStorage.getItem('favoriteTeam') || '';
      let b = battles[0];
      if (myTeam) {
        const found = battles.find(x => x.homeTeam === myTeam || x.awayTeam === myTeam);
        if (found) b = found;
      }

      const gameId = b.gameId;
      if (!gameId) return;

      const certRes  = await fetch(`/api/battle/certified?nickname=${encodeURIComponent(user)}&gameId=${gameId}`);
      const certData = await certRes.json();

      if (certData.certified) {
        showAlreadyCertified();
      }
    } catch {}
  }

  // ── 이미 참여 화면 ──
  function showAlreadyCertified() {
    ['upload','loading','result','done'].forEach(s => {
      const el = document.getElementById('battle-step-' + s);
      if (el) el.style.display = 'none';
    });
    const err = document.getElementById('battle-error');
    if (err) err.style.display = 'none';

    // 이미 참여 안내 스텝 표시
    let alreadyEl = document.getElementById('battle-step-already');
    if (!alreadyEl) {
      alreadyEl = document.createElement('div');
      alreadyEl.id = 'battle-step-already';
      alreadyEl.className = 'battle-step';
      alreadyEl.style.cssText = 'text-align:center; padding:2.5rem 1rem;';
      alreadyEl.innerHTML = `
        <div style="font-size:3rem; margin-bottom:0.75rem;">✅</div>
        <div style="font-size:16px; font-weight:800; color:var(--ink); margin-bottom:0.4rem;">오늘 이미 참여하셨습니다!</div>
        <div style="font-size:13px; color:var(--muted); margin-bottom:1.5rem;">점령전 티켓 인증은 하루에 1번만 가능합니다.<br>내일 또 참여해주세요 ⚾</div>
        <div style="display:flex; justify-content:center;">
          <button class="modal-close" data-target="battle-modal"
                  style="padding:10px 28px; background:var(--ink); color:#fff;
                         border:1.5px solid var(--line); border-radius:10px;
                         font-family:inherit; font-size:13px; font-weight:700;
                         cursor:pointer; line-height:1; white-space:nowrap;
                         display:inline-flex; align-items:center; justify-content:center;">
            확인
          </button>
        </div>
      `;
      document.getElementById('battle-modal')
        .querySelector('.modal-body')
        .appendChild(alreadyEl);
    }
    alreadyEl.style.display = 'block';
  }

  joinBtn.addEventListener('click', openBattleModal);

  // ── 업로드 존 클릭 / 드래그앤드롭 ──
  const uz = document.getElementById('battle-upload-zone');
  const fi = document.getElementById('battle-file-input');

  if (uz) {
    uz.addEventListener('click', () => fi?.click());
    uz.addEventListener('dragover',  e => { e.preventDefault(); uz.style.borderColor = 'var(--kia)'; });
    uz.addEventListener('dragleave', e => { uz.style.borderColor = 'var(--line-dash)'; });
    uz.addEventListener('drop', e => {
      e.preventDefault();
      uz.style.borderColor = 'var(--line-dash)';
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    });
  }

  if (fi) {
    fi.addEventListener('change', () => { if (fi.files[0]) handleFileSelect(fi.files[0]); });
  }

  // ── 다른 사진 선택 ──
  const reselectBtn = document.getElementById('battle-reselect-btn');
  if (reselectBtn) {
    reselectBtn.addEventListener('click', () => {
      if (fi) { fi.value = ''; fi.click(); }
    });
  }

  // ── 티켓 자동 분석하기 버튼 ──
  const ocrBtn = document.getElementById('battle-ocr-btn');
  if (ocrBtn) {
    ocrBtn.addEventListener('click', runOCR);
  }

  // ── 다시 분석 버튼 ──
  const retryBtn = document.getElementById('battle-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => showStep('upload'));
  }

  // ── 점령전 참여 확정 버튼 ──
  const confirmBtn = document.getElementById('battle-confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmBattle);
  }

  // ── 파일 선택 처리 ──
  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) { showError('이미지 파일만 업로드 가능합니다.'); return; }
    if (file.size > 10 * 1024 * 1024)   { showError('파일이 너무 큽니다. (최대 10MB)'); return; }

    const pi = document.getElementById('battle-preview-img');
    if (pi) pi.src = URL.createObjectURL(file);

    const pw = document.getElementById('battle-preview-wrap');
    if (pw) pw.style.display = 'block';
    if (uz) uz.style.display = 'none';

    // 구역 선택 초기화
    document.querySelectorAll('.battle-zone-btn').forEach(b => {
      b.style.background   = '#fff';
      b.style.color        = 'var(--ink-2)';
      b.style.borderColor  = 'var(--line)';
    });
    window._selectedBattleZone = null;
    const zoneSelectedEl = document.getElementById('battle-zone-selected');
    if (zoneSelectedEl) zoneSelectedEl.textContent = '';
  }

  // ── 구역 버튼 이벤트 (중첩 DOMContentLoaded 제거 — 이미 DOMContentLoaded 안에 있음) ──
  document.querySelectorAll('.battle-zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.battle-zone-btn').forEach(b => {
        b.style.background  = '#fff';
        b.style.color       = 'var(--ink-2)';
        b.style.borderColor = 'var(--line)';
      });
      btn.style.background  = 'var(--kia)';
      btn.style.color       = '#fff';
      btn.style.borderColor = 'var(--kia)';
      window._selectedBattleZone = btn.dataset.zone;
      const zoneSelectedEl = document.getElementById('battle-zone-selected');
      if (zoneSelectedEl) zoneSelectedEl.textContent = `✅ ${btn.dataset.label} 선택됨`;

      // 구역 선택 시 해당 구역의 응원 데이터도 즉시 갱신
      if (window._zoneRenderFn) window._zoneRenderFn(btn.dataset.zone);
    });
  });

  // ── OCR 분석 실행 ──
  async function runOCR() {
    // fi를 클릭 시점에 다시 조회 (DOMContentLoaded 시점과 다를 수 있음)
    const fileInput = document.getElementById('battle-file-input');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      showError('먼저 티켓 사진을 선택해주세요.');
      return;
    }

    showStep('loading');

    let progress = 0;
    const bar = document.getElementById('ocr-progress-bar');
    const iv = setInterval(() => {
      progress = Math.min(progress + 8, 88);
      if (bar) bar.style.width = progress + '%';
    }, 200);

    try {
      const base64 = await fileToBase64(fileInput.files[0]);
      const res = await fetch('/api/vision/ticket-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: fileInput.files[0].type })
      });

      clearInterval(iv);
      if (bar) bar.style.width = '100%';

      if (!res.ok) throw new Error('서버 오류 ' + res.status);

      const data = await res.json();

      // ── DB에서 구장 조회 ──
      // OCR에서 팀+날짜 추출 후 /api/games/match 로 실제 구장을 가져옴
      let stadiumFromDB = '';
      let gameIdFromDB  = null;
      try {
        const isoDate = toISODate(data.date);
        const hint    = data.match ? data.match.split('vs')[0].trim() : '';
        if (isoDate) {
          const gameRes  = await fetch(`/api/games/match?date=${isoDate}&hint=${encodeURIComponent(hint)}`);
          const gameData = await gameRes.json();
          if (gameData.found) {
            stadiumFromDB = gameData.venue || '';
            gameIdFromDB  = gameData.id    || null;
          }
        }
      } catch {}

      // DB 구장을 OCR 결과에 덮어씀
      data.stadium = stadiumFromDB || data.stadium || '';
      if (gameIdFromDB) data.gameId = gameIdFromDB;

      window._ocrResult = data;

      if (data.error === 'API_KEY_MISSING') {
        setText('ocr-date',    '직접 확인 필요');
        setText('ocr-match',   '직접 확인 필요');
        setText('ocr-stadium', stadiumFromDB || '직접 확인 필요');
        setText('ocr-seat',    '직접 확인 필요');
      } else {
        setText('ocr-date',    data.date    || '인식 불가');
        setText('ocr-match',   data.match   || '인식 불가');
        setText('ocr-stadium', data.stadium || '인식 불가');
        setText('ocr-seat',    data.seat    || '인식 불가');
      }

      setTimeout(() => showStep('result'), 300);

    } catch(e) {
      clearInterval(iv);
      showStep('upload');
      showError('분석 중 오류가 발생했습니다: ' + e.message);
    }
  }

  // ── 점령전 참여 확정 ──
  async function confirmBattle() {
    const user = localStorage.getItem('loggedInUser');
    if (!user) {
      showError('로그인이 필요합니다.');
      setTimeout(() => location.href = 'login.html', 1200);
      return;
    }

    const ocr = window._ocrResult || {};
    const cb  = document.getElementById('battle-confirm-btn');
    if (cb) { cb.disabled = true; cb.textContent = '처리 중...'; }

    try {
      const matchParts = (ocr.match || '').split('vs').map(s => s.trim());
      const isoDate    = toISODate(ocr.date) || new Date().toISOString().slice(0, 10);

      // 1) gameId 확보 (OCR 분석 시 이미 저장된 값 우선 사용)
      let gameId   = ocr.gameId || null;
      let gameData = null;

      if (!gameId) {
        try {
          const gameRes = await fetch(`/api/games/match?date=${isoDate}&hint=${encodeURIComponent(matchParts[0] || '')}`);
          gameData = await gameRes.json();
          if (gameData.found) gameId = gameData.id;
        } catch {}
      } else {
        // gameId 있으면 상세 조회
        try {
          const gameRes = await fetch(`/api/games/${gameId}`);
          gameData = await gameRes.json();
          gameData.found = true;
        } catch {}
      }

      // 2) 경기 결과 자동 판단
      const myTeam    = localStorage.getItem('favoriteTeam') || '';
      const today     = new Date(); today.setHours(0, 0, 0, 0);
      const gameDateObj = new Date(isoDate + 'T00:00:00');

      let result    = 'cancel';
      let homeScore = null;
      let awayScore = null;
      let home      = matchParts[1] || (gameData?.homeTeam) || '';
      let away      = matchParts[0] || (gameData?.awayTeam) || '';

      if (gameData && gameData.found) {
        home      = gameData.homeTeam || home;
        away      = gameData.awayTeam || away;
        homeScore = (gameData.homeScore >= 0) ? gameData.homeScore : null;
        awayScore = (gameData.awayScore >= 0) ? gameData.awayScore : null;
      }

      if (gameDateObj > today) {
        // 미래 경기
        result = 'scheduled';
      } else if (homeScore !== null && awayScore !== null) {
        // 점수 있음 → 승/패/무 판단
        const isHome = myTeam && home === myTeam;
        const myScore  = isHome ? homeScore : awayScore;
        const oppScore = isHome ? awayScore : homeScore;
        result = myScore > oppScore ? 'win' : myScore < oppScore ? 'lose' : 'draw';
      } else {
        // 지난 날짜인데 점수 없음 → 취소
        result = 'cancel';
      }

      // 3) 다이어리 자동 등록
      await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname:  user,
          gameId:    gameId,
          date:      isoDate,
          home:      home,
          away:      away,
          homeScore: homeScore,
          awayScore: awayScore,
          myteam:    myTeam,
          result:    result,
          stadium:   ocr.stadium || '',
          seat:      ocr.seat    || '',
          memo:      '🎫 점령전 티켓 인증 (자동 등록)'
        })
      });

      // 4) 배틀 포인트 적립 — 선택된 구역 포함
      if (gameId) {
        try {
          // 구역 선택값: 모달에서 직접 선택 > OCR 좌석 파싱 순서
          const selectedZone = window._selectedBattleZone || null;
          await fetch('/api/battle/certify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: user,
              gameId:   gameId,
              stadium:  ocr.stadium || '',
              seat:     selectedZone
                          ? (selectedZone + ' ' + (ocr.seat || '')).trim()
                          : (ocr.seat || '')
            })
          });
        } catch {}
      }

    } catch(e) {
      // 저장 실패해도 완료 처리 (UX 우선)
    }

    showStep('done');

    // 완료 후 점수판 갱신
    setTimeout(() => {
      if (typeof updateBattleBoard === 'function') updateBattleBoard();
    }, 1000);
  }

  // ── 헬퍼 ──
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result.split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function toISODate(str) {
    if (!str) return '';
    const m = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return '';
  }
});

// ─── 7. 모달 공통 닫기 ───
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-close')) {
    const target = document.getElementById(e.target.dataset.target);
    if (target) target.classList.remove('open');
  }
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});

// ─── 8. 구역별 응원 비율 — /api/battle/zones 연동 ───
(function() {
  const ZONE_KEY_MAP = {
    'orange-3b':       { api: '3루',  name: '3루 오렌지석', desc: '홈팀 핵심 응원 구역. 가장 강렬한 응원과 떼창이 펼쳐지는 곳입니다.' },
    'orange-1b':       { api: '1루',  name: '1루 오렌지석', desc: '원정팀 핵심 응원 구역. 역응원 열기가 가장 강한 곳입니다.' },
    'outfield-center': { api: '외야', name: '중앙 외야석',  desc: '홈런볼이 떨어지는 중립 구역. 양팀 응원이 교차합니다.' },
    'premium':         { api: '중앙', name: '테이블·프리미엄석', desc: '포수 뒤 중앙 최고급 좌석. 경기장 전체를 한눈에 볼 수 있는 명당입니다.' },
    'foul':            { api: '내야', name: '외야 파울존',  desc: '1·3루 파울라인 바깥 구역. 여유로운 관람을 즐기는 팬이 많습니다.' },
  };

  let zoneData      = null;  // API에서 받은 전체 데이터
  let currentZone   = 'orange-3b';

  // ── 구역 패널 UI 업데이트 ──
  function renderZonePanel(zoneKey) {
    const info    = ZONE_KEY_MAP[zoneKey] || ZONE_KEY_MAP['orange-3b'];
    const apiKey  = info.api;
    const zoneEl  = zoneData?.zones?.[apiKey];

    // 구역 이름/설명 (삭제됨 — 구역 버튼 클릭 시 별도 처리 없음)

    const homeTeam = zoneData?.homeTeam || '홈';
    const awayTeam = zoneData?.awayTeam || '원정';
    const homePct  = zoneEl?.homePct  ?? 50;
    const awayPct  = zoneEl?.awayPct  ?? 50;
    const homeScore = zoneEl?.homeScore ?? 0;
    const awayScore = zoneEl?.awayScore ?? 0;

    // 홈팀 컬러
    const TEAM_COLORS_ZONE = {
      'KIA':'#E60012','기아':'#E60012','LG':'#002C5F','두산':'#131230',
      '삼성':'#074CA1','롯데':'#002955','SSG':'#CE0E2D','NC':'#315288',
      'KT':'#000000','한화':'#FF6600','키움':'#820024'
    };
    const homeColor = TEAM_COLORS_ZONE[homeTeam] || '#E60012';
    const awayColor = TEAM_COLORS_ZONE[awayTeam] || '#2563EB';

    // 홈팀 카드
    const homeBig   = document.getElementById('zone-home-big');
    const homeLabelEl  = document.getElementById('zone-home-label');
    const homeScoreEl  = document.getElementById('zone-home-score');
    if (homeBig)     { homeBig.textContent = homePct + '%'; homeBig.style.color = homeColor; }
    if (homeLabelEl) { homeLabelEl.textContent = homeTeam + ' 응원'; homeLabelEl.style.color = homeColor; }
    if (homeScoreEl)   homeScoreEl.textContent = homeScore.toLocaleString();

    // 원정팀 카드
    const awayBig   = document.getElementById('zone-away-big');
    const awayLabelEl  = document.getElementById('zone-away-label');
    const awayScoreEl  = document.getElementById('zone-away-score');
    if (awayBig)     { awayBig.textContent = awayPct + '%'; awayBig.style.color = awayColor; }
    if (awayLabelEl) { awayLabelEl.textContent = awayTeam + ' 응원'; awayLabelEl.style.color = awayColor; }
    if (awayScoreEl)   awayScoreEl.textContent = awayScore.toLocaleString();

    // 전체 비율 바
    const totalHomeBar = document.getElementById('total-home-bar');
    const totalHomePct = document.getElementById('total-home-pct');
    const totalAwayBar = document.getElementById('total-away-bar');
    const totalAwayPct = document.getElementById('total-away-pct');
    if (totalHomeBar) { totalHomeBar.style.width = homePct + '%'; totalHomeBar.style.background = homeColor; }
    if (totalHomePct) { totalHomePct.textContent = homePct + '%'; totalHomePct.style.color = homeColor; }
    if (totalAwayBar) { totalAwayBar.style.width = awayPct + '%'; totalAwayBar.style.background = awayColor; }
    if (totalAwayPct) { totalAwayPct.textContent = awayPct + '%'; totalAwayPct.style.color = awayColor; }

    // 헤더 비율 (삭제됨)
  }

  // ── API 로드 ──
  async function loadZoneData() {
    try {
      const myTeam = localStorage.getItem('favoriteTeam') || '';
      const url    = myTeam ? `/api/battle/zones?team=${encodeURIComponent(myTeam)}` : '/api/battle/zones';
      const res    = await fetch(url);
      if (!res.ok) return;
      zoneData = await res.json();
      window.__zoneDataCache = zoneData; // 히트맵용 캐시
    } catch {}
    renderZonePanel(currentZone);
  }

  // 전역에서 접근 가능하도록 등록 (티켓 구역 선택 시 즉시 갱신용)
  window._zoneRenderFn = (zoneKey) => {
    currentZone = zoneKey;
    renderZonePanel(currentZone);
  };

  // ── 존 버튼 이벤트 ──
  document.addEventListener('DOMContentLoaded', () => {
    loadZoneData();
    setInterval(loadZoneData, 30000); // 30초마다 갱신

    document.querySelectorAll('.zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentZone = btn.dataset.zone;
        renderZonePanel(currentZone);

        // 구장 SVG 하이라이트
        const zoneConfig = {
          'orange-3b':       ['zone-orange-3b','zone-orange-3b-top','zone-red-3b','zone-red-3b-side'],
          'orange-1b':       ['zone-orange-1b','zone-orange-1b-top','zone-red-1b','zone-red-1b-side'],
          'outfield-center': ['zone-outfield-center','zone-outfield-left','zone-outfield-right'],
          'premium':         ['zone-premium','zone-table-top','zone-exciting-l','zone-exciting-r'],
          'foul':            ['zone-foul','zone-blue-bottom','zone-blue-bottom-r','zone-navy-3b','zone-navy-1b'],
        };
        document.querySelectorAll('.seat-zone').forEach(z => {
          z.style.opacity = '0.35';
          z.style.filter  = 'brightness(0.7)';
        });
        const targets = zoneConfig[currentZone] || [];
        targets.forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.style.opacity = '0.95'; el.style.filter = 'brightness(1.2)'; }
        });
      });
    });

    // 초기 하이라이트 (3루 오렌지)
    document.querySelectorAll('.seat-zone').forEach(z => {
      z.style.opacity = '0.35'; z.style.filter = 'brightness(0.7)';
    });
    ['zone-orange-3b','zone-orange-3b-top'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '0.95'; el.style.filter = 'brightness(1.2)'; }
    });
  });
})();

// ═══════════════════════════════════════════════════════════════════════════════
// ─── BaekguStateComponent (상태 연동형 마스코트) ───
// 로그인 여부, 응원 열기(%), 인증 여부에 따라 이미지·메시지·CTA 자동 교체
// ═══════════════════════════════════════════════════════════════════════════════
(function() {

  const STATES = {
    not_logged_in: {
      img: 'images/mascot_thinking.png',
      badge: '🤔 GUIDE MODE',
      badgeBg: '#FFF7ED', badgeColor: '#D97706', badgeBorder: 'rgba(217,119,6,0.4)',
      msg: '로그인하고 응원 포인트를 모아보세요! 직관 기록도 남길 수 있어요.',
      cta: null,
      ctaAction: null,
      showGauge: false,
    },
    logged_in_not_verified: {
      img: 'images/mascot_guide.png',
      badge: '⚔️ READY',
      badgeBg: '#EFF6FF', badgeColor: '#2563EB', badgeBorder: 'rgba(37,99,235,0.4)',
      msg: '티켓 인증하고 전장에 뛰어드세요! 인증 시 <strong style="color:var(--primary)">+50pt</strong> 획득!',
      cta: '전장 진입하기 ⚔️',
      ctaAction: () => document.getElementById('battle-modal')?.classList.add('open'),
      showGauge: false,
    },
    low_cheer: {  // 인증 완료, 열기 < 40%
      img: 'images/mascot_helper.png',
      badge: '🔥 WARMING UP',
      badgeBg: '#FFF7ED', badgeColor: '#EA580C', badgeBorder: 'rgba(234,88,12,0.4)',
      msg: '응원 시작했네요! 커뮤니티에 글을 올려 열기를 끌어올려봐요!',
      cta: '응원 글 쓰러 가기 📝',
      ctaAction: () => location.href = 'community.html',
      showGauge: true,
    },
    mid_cheer: {  // 열기 40~75%
      img: 'images/mascot_cheer_original.png',
      badge: '🔥 ON FIRE',
      badgeBg: '#FEF2F2', badgeColor: '#DC2626', badgeBorder: 'rgba(220,38,38,0.4)',
      msg: '뜨거운 열기! 지금이 바로 인증샷 올릴 타이밍이에요!',
      cta: '인증샷 올리기 📸',
      ctaAction: () => location.href = 'community.html',
      showGauge: true,
    },
    high_cheer: {  // 열기 75%+
      img: 'images/mascot_battle.png',
      badge: '⚡ BLAZING',
      badgeBg: '#FFF7ED', badgeColor: '#B45309', badgeBorder: 'rgba(180,83,9,0.4)',
      msg: '🔥 전장 최고 열기! 리더보드 1위를 향해 달려가고 있어요!',
      cta: '전황 확인하기 📊',
      ctaAction: () => document.querySelector('.zone-btn')?.click(),
      showGauge: true,
    },
  };

  function getState() {
    const user       = localStorage.getItem('loggedInUser');
    const verified   = localStorage.getItem('battleVerified') === 'true';
    const cheerPct   = parseInt(localStorage.getItem('battleCheerPct') || '0', 10);

    if (!user)          return { key: 'not_logged_in',         pct: 0 };
    if (!verified)      return { key: 'logged_in_not_verified', pct: 0 };
    if (cheerPct < 40)  return { key: 'low_cheer',             pct: cheerPct };
    if (cheerPct < 75)  return { key: 'mid_cheer',             pct: cheerPct };
    return               { key: 'high_cheer',                  pct: cheerPct };
  }

  function renderBaekgu() {
    const { key, pct } = getState();
    const s = STATES[key];
    if (!s) return;

    const imgEl    = document.getElementById('baekgu-img');
    const badgeEl  = document.getElementById('baekgu-state-badge');
    const msgEl    = document.getElementById('baekgu-msg');
    const ctaEl    = document.getElementById('baekgu-cta');
    const gaugeWrap= document.getElementById('baekgu-cheer-gauge');
    const gaugeBar = document.getElementById('baekgu-cheer-bar');
    const gaugePct = document.getElementById('baekgu-cheer-pct');

    if (imgEl) {
      imgEl.style.opacity = '0';
      setTimeout(() => { imgEl.src = s.img; imgEl.style.opacity = '1'; }, 180);
    }
    if (badgeEl) {
      badgeEl.textContent  = s.badge;
      badgeEl.style.background   = s.badgeBg;
      badgeEl.style.color        = s.badgeColor;
      badgeEl.style.borderColor  = s.badgeBorder;
    }
    if (msgEl)   msgEl.innerHTML = s.msg;
    if (ctaEl) {
      if (s.cta) {
        ctaEl.style.display = '';
        ctaEl.textContent   = s.cta;
        ctaEl.onclick       = s.ctaAction;
      } else {
        ctaEl.style.display = 'none';
      }
    }
    if (gaugeWrap) gaugeWrap.style.display = s.showGauge ? 'block' : 'none';
    if (s.showGauge) {
      if (gaugePct) gaugePct.textContent = pct + '%';
      setTimeout(() => { if (gaugeBar) gaugeBar.style.width = pct + '%'; }, 300);
    }
  }

  document.addEventListener('DOMContentLoaded', renderBaekgu);

  // 로그인/인증 완료 이벤트 수신
  window.addEventListener('baekguStateChange', renderBaekgu);

  // 티켓 인증 완료 시 battleVerified 저장 훅 (기존 confirm 버튼 이벤트 뒤에 연결)
  document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('battle-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        localStorage.setItem('battleVerified', 'true');
        window.dispatchEvent(new Event('baekguStateChange'));
      });
    }
  });
})();


// ═══════════════════════════════════════════════════════════════════════════════
// ─── 인터랙티브 맵 툴팁 & 히트맵 (SVG Zone Hover) ───
// ═══════════════════════════════════════════════════════════════════════════════
(function() {

  // 구역별 메타 데이터 (데이터가 없을 때 fallback)
  const ZONE_META = {
    'zone-orange-3b':       { name: '3루 오렌지 🔥', heat: 'hot' },
    'zone-orange-3b-top':   { name: '3루 오렌지 (상단)', heat: 'hot' },
    'zone-orange-1b':       { name: '1루 오렌지', heat: 'warm' },
    'zone-orange-1b-top':   { name: '1루 오렌지 (상단)', heat: 'warm' },
    'zone-table-top':       { name: '테이블석', heat: 'warm' },
    'zone-premium':         { name: '프리미엄석', heat: 'warm' },
    'zone-exciting-l':      { name: '익사이팅존 (3루)', heat: 'hot' },
    'zone-exciting-r':      { name: '익사이팅존 (1루)', heat: 'warm' },
    'zone-foul':            { name: '내야 블루 · 파울존', heat: 'cool' },
    'zone-blue-bottom':     { name: '3루 내야석', heat: 'warm' },
    'zone-blue-bottom-r':   { name: '1루 내야석', heat: 'warm' },
  };

  function applyHeatmap(zoneData) {
    // zoneData가 있으면 비율 기반, 없으면 fallback 메타 사용
    document.querySelectorAll('.seat-zone').forEach(el => {
      const id   = el.id;
      const meta = ZONE_META[id];
      if (!meta) return;

      el.classList.remove('heatmap-hot', 'heatmap-warm', 'heatmap-cool');

      // zoneData API 결과로 히트맵 등급 결정
      let heat = meta.heat;
      if (zoneData) {
        // 구역 데이터에서 homeScore 비중으로 결정
        const zKey = Object.keys(zoneData).find(k => {
          const z = zoneData[k];
          return z.zones && z.zones.includes(id);
        });
        if (zKey) {
          const z = zoneData[zKey];
          const total = (z.homeScore || 0) + (z.awayScore || 0);
          if (total > 0) {
            const ratio = (z.homeScore || 0) / total;
            if (ratio > 0.7 || ratio < 0.3) heat = 'hot';
            else if (ratio > 0.55 || ratio < 0.45) heat = 'warm';
            else heat = 'cool';
          }
        }
      }

      el.classList.add('heatmap-' + heat);
    });
  }

  function setupMapTooltip() {
    const shell   = document.getElementById('stadium-map-shell');
    const tooltip = document.getElementById('map-tooltip');
    const ttName  = document.getElementById('map-tooltip-name');
    const ttRatio = document.getElementById('map-tooltip-ratio');
    if (!shell || !tooltip) return;

    document.querySelectorAll('.seat-zone').forEach(el => {
      const id   = el.id;
      const meta = ZONE_META[id];
      if (!meta) return;

      el.addEventListener('mouseenter', (e) => {
        if (ttName)  ttName.textContent  = meta.name;
        if (ttRatio) ttRatio.textContent = '호버 시 구역 데이터 표시';
        tooltip.classList.add('visible');

        // SVG 내 좌표 → shell 기준 위치 계산
        const svgEl  = el.closest('svg');
        const bbox   = el.getBBox();
        const pt     = svgEl.createSVGPoint();
        pt.x = bbox.x + bbox.width / 2;
        pt.y = bbox.y;
        const svgRect   = svgEl.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const scale     = svgRect.width / 680;
        tooltip.style.left = ((bbox.x + bbox.width / 2) * scale + svgRect.left - shellRect.left) + 'px';
        tooltip.style.top  = (bbox.y * scale + svgRect.top  - shellRect.top) + 'px';
      });

      el.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyHeatmap(null);
    setupMapTooltip();

    // zoneData 로드 후 히트맵 재적용
    const origLoad = window._zoneRenderFn;
    const checkInterval = setInterval(() => {
      if (window.__zoneDataCache) {
        applyHeatmap(window.__zoneDataCache);
        clearInterval(checkInterval);
      }
    }, 2000);
  });
})();


// ═══════════════════════════════════════════════════════════════════════════════
// ─── 점령전 랭킹 미니 카드 (index.html 우측 컬럼) ───
// /api/battle/rankings 에서 상위 3팀 + 내 팀 순위를 가져와 카드에 표시
// ═══════════════════════════════════════════════════════════════════════════════
(function() {
  const TEAM_META_MINI = {
    'KIA':  { emoji:'🐯', color:'#E60012' },
    '기아': { emoji:'🐯', color:'#E60012' },
    'LG':   { emoji:'⚡', color:'#C60C30' },
    '삼성': { emoji:'🦁', color:'#074CA1' },
    '두산': { emoji:'🐻', color:'#131230' },
    '롯데': { emoji:'🌊', color:'#041E42' },
    'SSG':  { emoji:'🛬', color:'#CE0E2D' },
    'NC':   { emoji:'🦕', color:'#071D36' },
    'KT':   { emoji:'⚫', color:'#000000' },
    '한화': { emoji:'🦅', color:'#FC4E00' },
    '키움': { emoji:'🦸', color:'#820024' },
  };

  async function loadRankingMini() {
    try {
      const year = new Date().getFullYear();
      const res  = await fetch(`/api/battle/rankings?year=${year}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data || data.length === 0) return;

      // 상위 3팀 표시
      const rank1 = data.find(t => t.rank === 1);
      const rank2 = data.find(t => t.rank === 2);
      const rank3 = data.find(t => t.rank === 3);

      function setTeamCell(elId, team) {
        const el = document.getElementById(elId);
        if (!el || !team) return;
        const meta = TEAM_META_MINI[team.team] || { emoji:'⚾', color:'#374151' };
        el.innerHTML = `<span style="font-size:1.1rem;">${meta.emoji}</span>&nbsp;<span style="color:${meta.color};font-weight:900;">${team.team}</span>`;
      }

      setTeamCell('rank1-team', rank1);
      setTeamCell('rank2-team', rank2);
      setTeamCell('rank3-team', rank3);

      // 내 팀 현황
      const myTeam = localStorage.getItem('favoriteTeam') || sessionStorage.getItem('favoriteTeam') || '';
      const myRow  = document.getElementById('my-team-rank-row');
      if (myTeam && myRow) {
        const myData = data.find(t => t.team === myTeam);
        const meta   = TEAM_META_MINI[myTeam] || { emoji:'⚾', color:'#374151' };
        const emojiEl = document.getElementById('my-team-emoji');
        const nameEl  = document.getElementById('my-team-name');
        const rankEl  = document.getElementById('my-team-rank-num');
        if (emojiEl) emojiEl.textContent = meta.emoji;
        if (nameEl)  { nameEl.textContent = myTeam; nameEl.style.color = meta.color; }
        if (rankEl)  rankEl.textContent   = myData ? myData.rank : '-';
        myRow.style.display = 'flex';
      } else if (myRow) {
        // 비로그인 / 팀 미설정 → 숨김
        myRow.innerHTML = `
          <div style="width:100%;text-align:center;font-size:11.5px;color:var(--muted);">
            로그인 후 내 팀 순위를 확인해보세요
          </div>`;
      }

    } catch(e) {
      // API 미연결 시 조용히 실패
    }
  }

  document.addEventListener('DOMContentLoaded', loadRankingMini);
})();

// ═══════════════════════════════════════════════════════════════════════════════
// ─── 게이지바 애니메이션 (Animated Progress Bars) ───
// 응원 비중 바가 처음 로드 시 부드럽게 차오르도록
// ═══════════════════════════════════════════════════════════════════════════════
(function() {
  function animateBar(el, targetWidth, delay) {
    if (!el) return;
    el.style.width = '0%';
    el.style.transition = 'none';
    setTimeout(() => {
      el.style.transition = 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.width = targetWidth;
    }, delay || 400);
  }

  // IntersectionObserver로 뷰포트 진입 시 애니메이션
  const barIds = ['total-home-bar', 'total-away-bar', 'baekgu-cheer-bar'];
  document.addEventListener('DOMContentLoaded', () => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = el.style.width || '50%';
          animateBar(el, target, 200);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    barIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });

    // progress-fill 클래스 바도 동일하게
    document.querySelectorAll('.progress-fill').forEach(el => obs.observe(el));
  });
})();
