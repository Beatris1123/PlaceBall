/**
 * PLACEBALL — placeball-demo.js (백엔드 API 연동 버전)
 * 하드코딩 데이터 완전 제거 → 실제 API 호출로 교체
 *
 * 담당 페이지: index.html, community.html, schedule.html
 * API 목록:
 *   GET /api/games/today        → 오늘 경기
 *   GET /api/battle/today       → 배틀 통계 (배틀 스트립)
 *   GET /api/posts?tab=all      → 커뮤니티 게시글
 *   GET /api/posts/counts       → 탭별 카운트
 *   GET /api/posts/cheer-ratio  → 응원 비율
 */

(() => {
  // ─────────────────────────────────────────────────
  // 공통 유틸
  // ─────────────────────────────────────────────────
  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])
    );
  }

  function relative(isoStr) {
    const min = Math.max(1, Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000));
    if (min < 60) return `${min}분 전`;
    if (min < 1440) return `${Math.floor(min / 60)}시간 전`;
    return `${Math.floor(min / 1440)}일 전`;
  }

  async function apiFetch(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function currentPage() {
    return location.pathname;
  }

  // ─────────────────────────────────────────────────
  // CSS 동적 주입 (placeball-polish.css)
  // ─────────────────────────────────────────────────
  function injectPolishCSS() {
    if (!document.querySelector('link[href*="placeball-polish.css"]')) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'css/placeball-polish.css';
      document.head.appendChild(link);
    }
  }

  // ─────────────────────────────────────────────────
  // 배틀 스트립 (공통 — index/community/schedule)
  // ─────────────────────────────────────────────────
  async function renderBattleStrip(targetEl) {
    if (!targetEl || document.querySelector('.pb-battle-strip')) return;

    const strip = document.createElement('div');
    strip.className = 'pb-battle-strip';
    strip.innerHTML = `
      <div class="pb-battle-chip"><span class="pb-chip-label">오늘의 점령 구역</span><span class="pb-chip-value red" id="pb-strip-zone">로딩 중...</span></div>
      <div class="pb-battle-chip"><span class="pb-chip-label">실시간 참여 팬</span><span class="pb-chip-value blue" id="pb-strip-fans">-</span></div>
      <div class="pb-battle-chip"><span class="pb-chip-label">점령 보상</span><span class="pb-chip-value gold" id="pb-strip-reward">+50 티켓 인증</span></div>
      <div class="pb-battle-chip"><span class="pb-chip-label">분위기</span><span class="pb-chip-value green" id="pb-strip-mood">-</span></div>
    `;
    targetEl.prepend(strip);

    // 배틀 API 호출
    const battles = await apiFetch('/api/battle/today');
    if (!battles || !battles.length) {
      document.getElementById('pb-strip-zone').textContent  = '경기 없음';
      document.getElementById('pb-strip-fans').textContent  = '0명';
      document.getElementById('pb-strip-mood').textContent  = '-';
      return;
    }

    const b = battles[0];
    const total = (b.homeCheerScore || 0) + (b.awayCheerScore || 0);
    const homeTeam = b.homeTeam || 'HOME';
    const homePct  = b.homePct || 50;

    document.getElementById('pb-strip-zone').textContent  = `${homeTeam} 홈 점령`;
    document.getElementById('pb-strip-fans').textContent  = total.toLocaleString() + 'pt';
    document.getElementById('pb-strip-mood').textContent  = homePct >= 60 ? '응원 폭발' : homePct >= 50 ? '접전 중' : '역전 위기';
  }

  // ─────────────────────────────────────────────────
  // 커뮤니티 페이지 — 게시글 + 탭 카운트
  // ─────────────────────────────────────────────────
  async function polishCommunity() {
    const bannerTitle = document.querySelector('.banner-title');
    if (bannerTitle) bannerTitle.textContent = '점령전 커뮤니티';
    const bannerSub = document.querySelector('.banner-sub');
    if (bannerSub) bannerSub.textContent = '구역 점령 현황, 인증샷, 응원 분석이 모이는 PLACEBALL 팬 광장';

    const main = document.querySelector('.main-wrap');
    await renderBattleStrip(main);

    // 탭 카운트 업데이트
    const counts = await apiFetch('/api/posts/counts');
    if (counts) {
      Object.keys(counts).forEach(tab => {
        const el = document.getElementById(`cnt-${tab}`);
        if (el) el.textContent = counts[tab];
      });
    }

    // community.js가 이미 게시글 렌더링 담당 → 중복 방지를 위해 여기선 호출 안 함
  }

  // ─────────────────────────────────────────────────
  // 경기 일정 페이지 — 배틀 스트립 + 경기 목록
  // ─────────────────────────────────────────────────
  async function polishSchedule() {
    const bannerTitle = document.querySelector('.banner-title');
    if (bannerTitle) bannerTitle.textContent = '오늘의 점령 경기';
    const bannerSub = document.querySelector('.banner-sub');
    if (bannerSub) bannerSub.textContent = '경기 일정과 함께 어떤 구역에서 점령전이 열리는지 한눈에 확인하세요';

    const main = document.querySelector('.schedule-main');
    await renderBattleStrip(main);

    // schedule.js가 경기 목록 렌더링 담당 → 여기선 배틀 스트립만 처리
  }

  // ─────────────────────────────────────────────────
  // 메인(index) 페이지
  // ─────────────────────────────────────────────────
  async function polishHome() {
    // index.js가 대부분 처리하므로
    // 여기서는 배틀 보드 통계 보조 업데이트만 처리
    const battles = await apiFetch('/api/battle/today');
    if (!battles || !battles.length) return;

    const b = battles[0];
    const homeTeam = b.homeTeam || 'HOME';
    const awayTeam = b.awayTeam || 'AWAY';
    const homeScore = b.homeCheerScore || 0;
    const awayScore = b.awayCheerScore || 0;

    // 헤더 배틀보드 점수 업데이트 (index.js의 updateCheer와 중복되지 않게 null 체크)
    const homeScoreEl = document.getElementById('homeScore');
    const awayScoreEl = document.getElementById('awayScore');
    if (homeScoreEl && homeScoreEl.textContent.includes('pt') === false) {
      homeScoreEl.textContent = homeScore.toLocaleString() + ' pt';
    }
    if (awayScoreEl && awayScoreEl.textContent.includes('pt') === false) {
      awayScoreEl.textContent = awayScore.toLocaleString() + ' pt';
    }

    // 헤더 팀명 업데이트
    const bbLogoKia = document.querySelector('.bb-logo-kia');
    const bbLogoLg  = document.querySelector('.bb-logo-lg');
    if (bbLogoKia) bbLogoKia.textContent = homeTeam.slice(0, 3);
    if (bbLogoLg)  bbLogoLg.textContent  = awayTeam.slice(0, 3);
  }

  // ─────────────────────────────────────────────────
  // 부트스트랩
  // ─────────────────────────────────────────────────
  async function boot() {
    injectPolishCSS();
    const path = location.pathname;

    if (path.endsWith('community.html')) {
      await polishCommunity();
    } else if (path.endsWith('schedule.html')) {
      await polishSchedule();
    } else {
      // index.html 또는 기타
      await polishHome();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
