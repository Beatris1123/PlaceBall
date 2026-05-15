const userIdInput = document.getElementById('signupId');
const userNicknameInput = document.getElementById('signupNickname'); // 닉네임 입력창
const userPwInput = document.getElementById('signupPw');
const pwConfirmInput = document.getElementById('signupPwConfirm');

const idMessage = document.getElementById('idMessage');
const nicknameMessage = document.getElementById('nicknameMessage'); // 닉네임 메시지
const pwMessage = document.getElementById('pwMessage');

// 상태 저장 변수
let isIdChecked = false;       // 아이디 중복확인 통과 여부
let isNicknameChecked = false; // 닉네임 중복확인 통과 여부

// ==========================================
// 1. 입력값이 변경되면 중복확인 상태 초기화
// ==========================================
userIdInput.addEventListener('input', function() {
    isIdChecked = false;
    idMessage.className = 'status-text';
});

userNicknameInput.addEventListener('input', function() {
    isNicknameChecked = false;
    nicknameMessage.className = 'status-text';
});

// ==========================================
// 2. 아이디 중복확인 버튼
// ==========================================
document.getElementById('checkIdBtn').addEventListener('click', function() {
    const userId = userIdInput.value.trim();

    if (!userId) {
        alert("아이디를 입력해주세요.");
        return;
    }

    fetch(`/api/check-id?id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                idMessage.textContent = "사용 가능한 아이디입니다.";
                idMessage.className = 'status-text text-success';
                isIdChecked = true;
            } else {
                idMessage.textContent = "이미 사용 중인 아이디입니다.";
                idMessage.className = 'status-text text-error';
                isIdChecked = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("백엔드 연결 전이므로 임시로 '사용 가능' 처리합니다.");
            idMessage.textContent = "사용 가능한 아이디입니다. (임시)";
            idMessage.className = 'status-text text-success';
            isIdChecked = true;
        });
});

// ==========================================
// 3. 닉네임 중복확인 버튼 (새로 추가됨)
// ==========================================
document.getElementById('checkNicknameBtn').addEventListener('click', function() {
    const nickname = userNicknameInput.value.trim();

    if (!nickname) {
        alert("닉네임을 입력해주세요.");
        return;
    }

    fetch(`/api/check-nickname?nickname=${nickname}`)
        .then(response => response.json())
        .then(data => {
            if (data.available) {
                nicknameMessage.textContent = "사용 가능한 닉네임입니다.";
                nicknameMessage.className = 'status-text text-success';
                isNicknameChecked = true;
            } else {
                nicknameMessage.textContent = "이미 사용 중인 닉네임입니다.";
                nicknameMessage.className = 'status-text text-error';
                isNicknameChecked = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("백엔드 연결 전이므로 임시로 '사용 가능' 처리합니다.");
            nicknameMessage.textContent = "사용 가능한 닉네임입니다. (임시)";
            nicknameMessage.className = 'status-text text-success';
            isNicknameChecked = true;
        });
});

// ==========================================
// 4. 비밀번호 일치 확인 (실시간 체크)
// ==========================================
function checkPasswordMatch() {
    const pw = userPwInput.value;
    const pwConfirm = pwConfirmInput.value;

    if (!pw || !pwConfirm) {
        pwMessage.className = 'status-text';
        return;
    }

    if (pw === pwConfirm) {
        pwMessage.textContent = "비밀번호가 일치합니다.";
        pwMessage.className = 'status-text text-success';
    } else {
        pwMessage.textContent = "비밀번호가 일치하지 않습니다.";
        pwMessage.className = 'status-text text-error';
    }
}

userPwInput.addEventListener('input', checkPasswordMatch);
pwConfirmInput.addEventListener('input', checkPasswordMatch);

// ==========================================
// 5. 최종 가입하기 버튼 클릭 시 검증
// ==========================================
document.getElementById('submitSignupBtn').addEventListener('click', function() {
    const userId = userIdInput.value.trim();
    const nickname = userNicknameInput.value.trim();
    const userPw = userPwInput.value;
    const pwConfirm = pwConfirmInput.value;

    if (!isIdChecked) {
        alert("아이디 중복확인을 진행해주세요.");
        return;
    }
    if (!isNicknameChecked) {
        alert("닉네임 중복확인을 진행해주세요.");
        return;
    }
    if (!userPw) {
        alert("비밀번호를 입력해주세요.");
        return;
    }
    if (userPw !== pwConfirm) {
        alert("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
        return;
    }

    // body 부분에 nickname 데이터 추가하여 백엔드 전송
    fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: userId,
            nickname: nickname,
            password: userPw
        })
    })
    .then(response => {
        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';
    })
    .catch(error => console.error('Error:', error));
});

// ==========================================
// 6. 돌아가기 버튼
// ==========================================
document.getElementById('cancelBtn').addEventListener('click', function() {
    window.location.href = 'login.html';
});