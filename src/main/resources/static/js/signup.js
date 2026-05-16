/* ============================================================
   signup.js — HTML ID 기준으로 완전 재작성
   HTML id 목록: regId, regNick, regPw, regPw2, selectedTeam,
                 signupSubmitBtn, signupMsg
   ============================================================ */

// ── 요소 참조 ──
const regIdEl   = document.getElementById('regId');
const regNickEl = document.getElementById('regNick');
const regPwEl   = document.getElementById('regPw');
const regPw2El  = document.getElementById('regPw2');
const msgEl     = document.getElementById('signupMsg');
const submitBtn = document.getElementById('signupSubmitBtn');

// ── 상태 ──
let idChecked   = false;
let nickChecked = false;

// ── 메시지 표시 헬퍼 ──
function showMsg(text, type) {   // type: 'error' | 'success' | ''
  if (!msgEl) return;
  msgEl.textContent  = text;
  msgEl.style.color  = type === 'error' ? '#F87171' : type === 'success' ? '#4ADE80' : '#94A3B8';
}

// ── 팀 선택 (onclick="pickTeam(this)" 에서 호출) ──
window.pickTeam = function(btn) {
  document.querySelectorAll('.team-pick-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hidden = document.getElementById('selectedTeam');
  if (hidden) hidden.value = btn.dataset.team;
};

// ── 아이디 중복 확인 ──
// signup.html에 checkIdBtn이 없으므로 regId에서 포커스 아웃 시 자동 체크
regIdEl?.addEventListener('blur', async function () {
  const val = this.value.trim();
  idChecked = false;
  if (!val) return;
  if (!/^[a-zA-Z0-9]{4,20}$/.test(val)) {
    showMsg('아이디는 영문·숫자 4~20자로 입력해주세요.', 'error');
    return;
  }
  try {
    const res  = await fetch(`/api/check-id?id=${encodeURIComponent(val)}`);
    const data = await res.json();
    if (data.available) {
      showMsg('사용 가능한 아이디입니다.', 'success');
      idChecked = true;
    } else {
      showMsg('이미 사용 중인 아이디입니다.', 'error');
    }
  } catch(e) { /* 서버 미연결 시 가입 단계에서 확인 */ idChecked = true; }
});

regIdEl?.addEventListener('input', () => { idChecked = false; showMsg('', ''); });

// ── 닉네임 중복 확인 ──
regNickEl?.addEventListener('blur', async function () {
  const val = this.value.trim();
  nickChecked = false;
  if (!val) return;
  try {
    const res  = await fetch(`/api/check-nickname?nickname=${encodeURIComponent(val)}`);
    const data = await res.json();
    if (data.available) {
      showMsg('사용 가능한 닉네임입니다.', 'success');
      nickChecked = true;
    } else {
      showMsg('이미 사용 중인 닉네임입니다.', 'error');
    }
  } catch(e) { nickChecked = true; }
});

regNickEl?.addEventListener('input', () => { nickChecked = false; showMsg('', ''); });

// ── 비밀번호 확인 (실시간) ──
regPw2El?.addEventListener('input', function () {
  if (!regPwEl.value || !this.value) { showMsg('', ''); return; }
  if (regPwEl.value === this.value) showMsg('비밀번호가 일치합니다.', 'success');
  else                              showMsg('비밀번호가 일치하지 않습니다.', 'error');
});

// ── 가입하기 버튼 ──
submitBtn?.addEventListener('click', async () => {
  const loginId      = regIdEl?.value.trim()   || '';
  const nickname     = regNickEl?.value.trim()  || '';
  const password     = regPwEl?.value           || '';
  const passwordConf = regPw2El?.value          || '';
  const favoriteTeam = document.getElementById('selectedTeam')?.value || '';

  // ── 유효성 검사 ──
  if (!loginId) { showMsg('아이디를 입력해주세요.', 'error'); regIdEl?.focus(); return; }
  if (!/^[a-zA-Z0-9]{4,20}$/.test(loginId)) {
    showMsg('아이디는 영문·숫자 4~20자로 입력해주세요.', 'error'); regIdEl?.focus(); return;
  }
  if (!nickname) { showMsg('닉네임을 입력해주세요.', 'error'); regNickEl?.focus(); return; }
  if (password.length < 8) { showMsg('비밀번호는 8자 이상이어야 합니다.', 'error'); regPwEl?.focus(); return; }
  if (password !== passwordConf) { showMsg('비밀번호가 일치하지 않습니다.', 'error'); regPw2El?.focus(); return; }
  if (!favoriteTeam) { showMsg('응원 팀을 선택해주세요.', 'error'); return; }

  submitBtn.disabled    = true;
  submitBtn.textContent = '처리 중...';

  try {
    const res  = await fetch('/api/signup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: loginId, nickname, password, favoriteTeam })
    });
    const data = await res.json();

    if (data.success) {
      showMsg('회원가입 완료! 로그인 페이지로 이동합니다.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    } else {
      showMsg(data.message || '회원가입에 실패했습니다. 다시 시도해주세요.', 'error');
      submitBtn.disabled    = false;
      submitBtn.textContent = '가입하기';
    }
  } catch(e) {
    showMsg('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    submitBtn.disabled    = false;
    submitBtn.textContent = '가입하기';
  }
});