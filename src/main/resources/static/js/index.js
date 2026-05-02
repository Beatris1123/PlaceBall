document.addEventListener('DOMContentLoaded', () => {

    // 1. 로그인 상태 확인 및 닉네임 표시
    const loggedInUser = localStorage.getItem("loggedInUser");

    const loginBtn = document.getElementById("login-btn");
    const userInfoSection = document.getElementById("user-info-section");
    const userNicknameEl = document.getElementById("user-nickname");
    const logoutBtn = document.getElementById("logout-btn");

    if (loggedInUser) {
        // 로그인 상태: 로그인 버튼 숨기고 닉네임 환영 메시지 표시
        if (loginBtn) loginBtn.style.display = "none";
        if (userInfoSection) userInfoSection.style.display = "inline-flex";
        if (userNicknameEl) userNicknameEl.textContent = loggedInUser;
    } else {
        // 비로그인 상태: 로그인 버튼 표시
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (userInfoSection) userInfoSection.style.display = "none";
    }

    // 2. 로그아웃 버튼
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("loggedInUser");
            alert("로그아웃 되었습니다.");
            window.location.reload();
        });
    }
});
