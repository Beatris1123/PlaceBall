/* ============================================================
   PLACEBALL — login.js
   ============================================================ */

// ── 별 배경 생성 ──
(function () {
  const c = document.getElementById('stars');
  if (!c) return;
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 2 + 0.5;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*70}%;animation-delay:${Math.random()*4}s;animation-duration:${2+Math.random()*3}s;opacity:${0.3+Math.random()*0.7}`;
    c.appendChild(s);
  }
})();

/* ============================================================
   성향 데이터 (personality.js 없이 독립 동작)
   — quiz.html / index.html 과 동일한 키·이름·이모지 사용
============================================================ */
const PERSONALITY_DATA = {
  cheer   : { name:'불타는 응원단장',  emoji:'🔥', color:'#EF4444', desc:'응원가를 외우고 떼창을 이끄는 열정 팬',           quote:'"이겨라! 이겨라! 목이 터질 때까지!"' },
  food    : { name:'먹거리 탐험가',    emoji:'🌭', color:'#F59E0B', desc:'직관의 목적은 치킨과 맥주! 야구장 맛집 지도 완성', quote:'"경기는 배불러야 제대로 즐길 수 있지."' },
  analyst : { name:'데이터 분석가',    emoji:'📊', color:'#3B82F6', desc:'기록지와 스탯으로 경기를 읽는 야구 박사',          quote:'"저 투수 오늘 구속이 평균보다 3km 느리네."' },
  photo   : { name:'직관 포토그래퍼', emoji:'📸', color:'#8B5CF6', desc:'인생샷 건지러 구장 구석구석을 탐험',               quote:'"이 앵글이면 완벽한 인증샷이야!"' },
  relaxed : { name:'여유로운 관람객',  emoji:'☀️', color:'#06B6D4', desc:'잔디 냄새와 여유를 즐기는 힐링 팬',               quote:'"이기면 좋고 지면 어쩔 수 없지. 맥주나 한 잔."' },
};

// 12문항 → 성향 타입 매핑 (A/B 선택마다 해당 타입 점수 +1)
const Q_TYPES = [
  { A:'cheer',   B:'food'    },
  { A:'cheer',   B:'analyst' },
  { A:'analyst', B:'photo'   },
  { A:'relaxed', B:'food'    },
  { A:'analyst', B:'food'    },
  { A:'analyst', B:'photo'   },
  { A:'cheer',   B:'relaxed' },
  { A:'analyst', B:'photo'   },
  { A:'cheer',   B:'food'    },
  { A:'cheer',   B:'relaxed' },
  { A:'analyst', B:'photo'   },
  { A:'cheer',   B:'food'    },
];

/* ============================================================
   퀴즈 상태
============================================================ */
const qAnswers = {};
let currentSlide = 0;
const TOTAL = 12;

/* ── 저장된 성향 복원 (페이지 로드 시) ── */
(function restoreSaved() {
  try {
    const saved = localStorage.getItem('placeball_personality');
    if (!saved) return;
    const p = JSON.parse(saved);
    if (p && (p.type || p.name)) applyBadgeUI(p);
  } catch (e) {}
})();

/* ============================================================
   퀴즈 열기 / 닫기
============================================================ */
function openQuiz() {
  // 슬라이드·답안 초기화
  currentSlide = 0;
  Object.keys(qAnswers).forEach(k => delete qAnswers[k]);
  document.querySelectorAll('.quiz-slide').forEach((s, i) => s.classList.toggle('active', i === 0));
  document.getElementById('quizResult').classList.remove('show');
  document.getElementById('quizSlides').style.display = 'block';
  updateProgress();
  document.getElementById('quizOverlay').classList.add('open');
}

function closeQuiz() {
  document.getElementById('quizOverlay').classList.remove('open');
}

function retakeQuiz() {
  // 저장된 칭호 제거 후 퀴즈 재시작
  localStorage.removeItem('placeball_personality');
  resetBadgeUI();
  openQuiz();
}

/* 모달 바깥 클릭 시 닫기 */
document.getElementById('quizOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeQuiz();
});

/* ============================================================
   퀴즈 진행
============================================================ */
function qAnswer(qIdx, choice) {
  qAnswers[qIdx] = choice;

  // 선택 하이라이트
  const slide = document.querySelector(`.quiz-slide[data-q="${qIdx}"]`);
  slide.querySelectorAll('.choice-item').forEach((btn, i) => {
    btn.classList.toggle('selected', (i === 0 && choice === 'A') || (i === 1 && choice === 'B'));
  });

  // 다음 슬라이드
  setTimeout(() => {
    currentSlide = qIdx + 1;
    if (currentSlide >= TOTAL) {
      showResult();
    } else {
      document.querySelectorAll('.quiz-slide').forEach((s, i) =>
        s.classList.toggle('active', i === currentSlide)
      );
      updateProgress();
    }
  }, 220);
}

function updateProgress() {
  const pct = Math.round((currentSlide / TOTAL) * 100);
  const fill = document.getElementById('qFill');
  const num  = document.getElementById('qNum');
  if (fill) fill.style.width = pct + '%';
  if (num)  num.textContent  = `${currentSlide} / ${TOTAL}`;
}

/* ============================================================
   결과 계산 & 표시
============================================================ */
function showResult() {
  // 점수 집계
  const scores = { cheer:0, food:0, analyst:0, photo:0, relaxed:0 };
  for (let i = 0; i < TOTAL; i++) {
    const choice = qAnswers[i] || 'A';
    const type   = Q_TYPES[i]?.[choice];
    if (type && scores[type] !== undefined) scores[type]++;
  }
  const topType = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);
  const data    = PERSONALITY_DATA[topType];

  // 결과 화면 채우기
  document.getElementById('rEmoji').textContent = data.emoji;
  document.getElementById('rName').textContent  = data.name;
  document.getElementById('rDesc').textContent  = data.desc;
  document.getElementById('rQuote').textContent = data.quote;

  const titleCard = document.getElementById('rTitleCard');
  const titleText = document.getElementById('rTitleText');
  titleCard.style.borderColor = data.color + '55';
  titleCard.style.background  = data.color + '11';
  titleText.textContent = `${data.emoji} ${data.name}`;
  titleText.style.color = data.color;

  // 슬라이드 숨기고 결과 표시
  document.getElementById('quizSlides').style.display = 'none';
  document.getElementById('quizResult').classList.add('show');

  // 임시 저장 (적용 전)
  window._pendingPersonality = { type: topType, ...data };

  document.getElementById('applyBtn').onclick = applyPersonality;
}

/* ============================================================
   칭호 적용 (localStorage 저장 + UI 반영)
============================================================ */
function applyPersonality() {
  const p = window._pendingPersonality;
  if (!p) return;
  localStorage.setItem('placeball_personality', JSON.stringify(p));
  applyBadgeUI(p);
  closeQuiz();
}

function applyBadgeUI(p) {
  const toggleBtn  = document.getElementById('personaToggleBtn');
  const arrowEl    = document.getElementById('ptArrow');
  const previewEl  = document.getElementById('titlePreview');
  const previewVal = document.getElementById('titlePreviewVal');

  // 실제 data가 PERSONALITY_DATA에 없으면 보강
  const canonical = PERSONALITY_DATA[p.type] || {};
  const merged = { ...canonical, ...p };

  if (toggleBtn) {
    toggleBtn.classList.add('done');
    const ptTitle = toggleBtn.querySelector('.pt-title');
    const ptDesc  = toggleBtn.querySelector('.pt-desc');
    if (ptTitle) ptTitle.textContent = '성향 테스트 완료!';
    if (ptDesc)  ptDesc.textContent  = `${merged.emoji || '⚾'} ${merged.name || ''}`;
  }
  if (arrowEl) arrowEl.textContent = '✓';

  if (previewEl && merged.color) {
    previewEl.classList.add('visible');
    previewVal.textContent       = `${merged.emoji || '⚾'} ${merged.name || ''}`;
    previewVal.style.color       = merged.color;
    previewVal.style.borderColor = merged.color + '55';
    previewVal.style.background  = merged.color + '11';
  }
}

function resetBadgeUI() {
  const toggleBtn = document.getElementById('personaToggleBtn');
  const arrowEl   = document.getElementById('ptArrow');
  const previewEl = document.getElementById('titlePreview');
  if (toggleBtn) {
    toggleBtn.classList.remove('done');
    const ptTitle = toggleBtn.querySelector('.pt-title');
    const ptDesc  = toggleBtn.querySelector('.pt-desc');
    if (ptTitle) ptTitle.textContent = '야구장 부캐 성향 테스트';
    if (ptDesc)  ptDesc.textContent  = '완료하면 닉네임 옆에 칭호가 부여됩니다';
  }
  if (arrowEl) arrowEl.textContent = '→';
  if (previewEl) previewEl.classList.remove('visible');
}

/* ============================================================
   로그인
============================================================ */
document.getElementById('loginSubmitBtn').addEventListener('click', doLogin);
document.getElementById('loginPw').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function showError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}

async function doLogin() {
  const userId = document.getElementById('loginId')?.value.trim() || '';
  const userPw = document.getElementById('loginPw')?.value        || '';

  if (!userId || !userPw) { showError('아이디와 비밀번호를 모두 입력해주세요.'); return; }

  const btn = document.getElementById('loginSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '로그인 중...'; }

  try {
    const res  = await fetch('/api/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: userId, password: userPw }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.removeItem('loggedInUser');
      const displayName = (data.nickname && String(data.nickname).trim() !== '' && String(data.nickname) !== 'null')
        ? String(data.nickname).trim()
        : userId;
      localStorage.setItem('loggedInUser',  displayName);
      localStorage.setItem('favoriteTeam',  data.favoriteTeam || '');

      // 성향 결과 유지
      const saved = localStorage.getItem('placeball_personality');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          localStorage.setItem('placeball_personality', JSON.stringify({ ...p, nickname: displayName }));
        } catch(e) {}
      }

      window.location.href = 'index.html';
    } else {
      showError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  } catch(e) {
    showError('서버에 연결할 수 없습니다.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '로그인'; }
  }
}

// 회원가입 이동
document.getElementById('signupBtn').addEventListener('click', () => {
  window.location.href = 'signup.html';
});
