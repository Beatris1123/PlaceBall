// src/main/resources/static/js/login.js

// 2 & 3. 입력 후 로그인 버튼을 누르면 실행되는 로직
document.getElementById('loginSubmitBtn').addEventListener('click', function() {
    const userId = document.getElementById('userId').value;
    const userPw = document.getElementById('userPw').value;
    const errorText = document.getElementById('loginErrorText');

    // 빈 값 체크
    if(!userId || !userPw) {
        alert("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }

    // Spring Boot 백엔드(DB)로 로그인 검증 요청
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId, password: userPw })
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            // 로그인 성공 시 메인 화면(index.html)으로 돌아가기
            alert('로그인 성공!');
            // ★ 브라우저 저장소(localStorage)에 닉네임을 저장합니다!
            localStorage.setItem("loggedInUser", data.nickname);
            window.location.href = 'index.html';
        } else {
            // DB에 저장된 정보와 달라 실패한 경우 틀렸다는 텍스트 표시
            alert("아이디 또는 비밀번호가 일치하지 않습니다.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

// 4. 회원가입 버튼을 누를 경우 회원가입 페이지로 이동
document.getElementById('signupBtn').addEventListener('click', function() {
    // 회원가입 전용 html 페이지가 있다고 가정하고 이동
    window.location.href = 'signup.html';
});