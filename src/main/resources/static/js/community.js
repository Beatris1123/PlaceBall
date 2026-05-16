/* ============================================================
   PLACEBALL — community.js  (전면 백엔드 API 연동)
   localStorage 완전 제거 — 모든 데이터는 /api/posts 에서
   ============================================================ */

const POSTS_PER_PAGE = 10;

const TAB_META = {
  all:      { label:'전체',        badge:'',           badgeClass:'' },
  chat:     { label:'잡담',        badge:'💬 잡담',     badgeClass:'badge-chat' },
  photo:    { label:'사진/인증샷', badge:'📸 인증샷',   badgeClass:'badge-photo' },
  analysis: { label:'경기 분석',   badge:'📊 분석',     badgeClass:'badge-analysis' },
  cheer:    { label:'응원/선수',   badge:'🔥 응원',     badgeClass:'badge-cheer' },
  info:     { label:'정보/팁',     badge:'📢 정보',     badgeClass:'badge-info' },
};

let currentTab    = 'all';
let currentSort   = 'likes';
let currentPage   = 0;          // 0-based (Spring Page)
let currentPostId = null;
let searchQuery   = '';

// ──────────────────────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────────────────────
function getNick()    { return localStorage.getItem('loggedInUser') || ''; }
function escHtml(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatDate(isoStr) {
  const d   = new Date(isoStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000)    return '방금 전';
  if (diff < 3600000)  return `${Math.floor(diff/60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}시간 전`;
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
function formatDateShort(isoStr) {
  const d    = new Date(isoStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return '방금';
  if (diff < 3600000)  return `${Math.floor(diff/60000)}분`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}시간`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ──────────────────────────────────────────────────────────────
// API 호출
// ──────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch(e) {
    console.error('API 오류:', e);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// 헤더 초기화
// ──────────────────────────────────────────────────────────────
function initHeader() {
  const nick = getNick();
  if (!nick) return;
  const nw = document.getElementById('headerNickWrap');
  const ne = document.getElementById('headerNick');
  if (nw) nw.classList.add('visible');
  if (ne) ne.textContent = nick;
  try {
    const raw = localStorage.getItem('placeball_personality');
    if (!raw) return;
    const p = JSON.parse(raw);
    if (!p?.name) return;
    const badge = document.getElementById('headerPersonaBadge');
    if (badge) {
      document.getElementById('hpbEmoji').textContent = p.emoji || '⚾';
      document.getElementById('hpbLabel').textContent = p.name  || '';
      badge.style.background  = (p.color||'#3B82F6') + '18';
      badge.style.borderColor = (p.color||'#3B82F6') + '55';
      badge.style.color       = p.color || '#3B82F6';
      badge.classList.add('visible');
    }
  } catch(e) {}
}

document.getElementById('headerLogoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('favoriteTeam');
  window.location.href = 'login.html';
});

// ──────────────────────────────────────────────────────────────
// 탭 카운트
// ──────────────────────────────────────────────────────────────
async function updateTabCounts() {
  const data = await apiFetch('/api/posts/counts');
  if (!data) return;
  Object.keys(data).forEach(tab => {
    const el = document.getElementById(`cnt-${tab}`);
    if (el) el.textContent = data[tab];
  });
}

// ──────────────────────────────────────────────────────────────
// 게시판 렌더
// ──────────────────────────────────────────────────────────────
async function renderBoard() {
  const nick = getNick();
  const params = new URLSearchParams({
    tab:    currentTab,
    sort:   currentSort,
    q:      searchQuery,
    page:   currentPage,
    size:   POSTS_PER_PAGE,
  });
  if (nick) params.append('viewer', nick);

  showListLoading(true);
  const data = await apiFetch(`/api/posts?${params}`);
  showListLoading(false);

  const listEl = document.getElementById('postList');
  if (!listEl) return;

  if (!data || !data.posts?.length) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">⚾</span><p class="empty-text">아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!</p></div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  listEl.innerHTML = data.posts.map(post => {
    const tab = TAB_META[post.tab] || TAB_META.chat;
    const likeClass = post.likes >= 100 ? 'hot' : post.likes >= 30 ? 'warm' : 'cool';
    return `<div class="post-row" onclick="openDetail(${post.id})">
      <div class="col-tab"><span class="post-tab-badge ${tab.badgeClass}">${tab.badge||tab.label}</span></div>
      <div class="col-title-cell">
        <span class="post-title-text">${escHtml(post.title)}${post.edited ? ' <span style="font-size:10px;color:var(--text-3)">(수정됨)</span>' : ''}</span>
        ${post.hasImages ? `<span class="post-has-img">🖼️ ${post.imageCount}</span>` : ''}
      </div>
      <div class="col-center"><span class="post-author"><span>${escHtml(post.persona||'⚾')}</span>${escHtml(post.author)}</span></div>
      <div class="col-center col-date-cell"><span class="post-date">${formatDateShort(post.date)}</span></div>
      <div class="col-center col-views-cell"><span class="post-views">${post.views}</span></div>
      <div class="col-center"><span class="post-likes ${likeClass}">${post.likes>=100?'🔥':post.likes>=30?'👍':'·'} ${post.likes}</span></div>
    </div>`;
  }).join('');

  renderPagination(data.totalPages);
  updateTabCounts();
}

function showListLoading(show) {
  const listEl = document.getElementById('postList');
  if (!listEl) return;
  if (show) listEl.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-3)"><div style="font-size:2rem;margin-bottom:0.5rem">⚾</div>불러오는 중...</div>`;
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  const p = currentPage;
  let html = `<button class="page-btn" onclick="goPage(${p-1})" ${p===0?'disabled':''}>‹</button>`;
  for (let i = 0; i < totalPages; i++) {
    if (i===0||i===totalPages-1||(i>=p-2&&i<=p+2)) {
      html += `<button class="page-btn ${i===p?'active':''}" onclick="goPage(${i})">${i+1}</button>`;
    } else if (i===p-3||i===p+3) {
      html += `<button class="page-btn" disabled style="border:none;background:none;color:var(--text-3)">…</button>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${p+1})" ${p===totalPages-1||totalPages===0?'disabled':''}>›</button>`;
  el.innerHTML = html;
}
function goPage(p) {
  if (p < 0) return;
  currentPage = p;
  renderBoard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 탭 필터
document.getElementById('tabList').addEventListener('click', e => {
  const btn = e.target.closest('.tab-item');
  if (!btn) return;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = btn.dataset.tab; currentPage = 0; renderBoard();
});

// 정렬
document.getElementById('sortList').addEventListener('click', e => {
  const btn = e.target.closest('.sort-item');
  if (!btn) return;
  document.querySelectorAll('.sort-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentSort = btn.dataset.sort; currentPage = 0; renderBoard();
});

// 검색
document.getElementById('searchInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { searchQuery = e.target.value.trim(); currentPage = 0; renderBoard(); }
});
document.querySelector('.btn-search')?.addEventListener('click', () => {
  searchQuery = document.getElementById('searchInput')?.value.trim() || '';
  currentPage = 0; renderBoard();
});

// ──────────────────────────────────────────────────────────────
// 글쓰기 모달
// ──────────────────────────────────────────────────────────────
let selectedWriteTab = '';
let attachedImages   = [];
let editingPostId    = null;

function openWriteModal(editPost = null) {
  const nick = getNick();
  if (!nick) { alert('로그인이 필요합니다.'); window.location.href = 'login.html'; return; }

  editingPostId    = editPost ? editPost.id : null;
  selectedWriteTab = editPost ? editPost.tab : '';
  attachedImages   = editPost ? [...(editPost.images || [])] : [];

  document.querySelector('#writeOverlay .modal-title').textContent = editPost ? '✏️ 글 수정' : '✏️ 글쓰기';
  document.getElementById('submitPostBtn').textContent             = editPost ? '수정 완료'  : '등록하기';

  document.querySelectorAll('.write-tab-btn').forEach(b => {
    b.classList.toggle('selected', editPost && b.dataset.tab === editPost.tab);
  });
  document.getElementById('writeTitle').value   = editPost ? editPost.title   : '';
  document.getElementById('writeContent').value = editPost ? editPost.content : '';
  document.getElementById('imagePreviewRow').innerHTML = '';
  document.getElementById('writeError').classList.remove('visible');
  document.getElementById('writeTitle').classList.remove('error');
  document.getElementById('writeContent').classList.remove('error');
  renderImagePreviews();
  document.getElementById('writeOverlay').classList.add('open');
}

function closeWriteModal() {
  document.getElementById('writeOverlay').classList.remove('open');
  editingPostId = null;
}

function selectWriteTab(btn) {
  document.querySelectorAll('.write-tab-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedWriteTab = btn.dataset.tab;
}

document.getElementById('imageFileInput').addEventListener('change', function() {
  const files = Array.from(this.files).slice(0, 3 - attachedImages.length);
  files.forEach(file => {
    const r = new FileReader();
    r.onload = e => { if (attachedImages.length < 3) { attachedImages.push(e.target.result); renderImagePreviews(); } };
    r.readAsDataURL(file);
  });
  this.value = '';
});

function renderImagePreviews() {
  document.getElementById('imagePreviewRow').innerHTML = attachedImages.map((src, i) =>
    `<div class="image-preview-item"><img src="${src}" alt=""><button class="image-remove-btn" onclick="removeImage(${i})">✕</button></div>`
  ).join('');
}
function removeImage(idx) { attachedImages.splice(idx, 1); renderImagePreviews(); }

function showWriteError(msg) {
  const el = document.getElementById('writeError');
  el.textContent = msg; el.classList.add('visible');
}

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const title   = document.getElementById('writeTitle').value.trim();
  const content = document.getElementById('writeContent').value.trim();
  if (!selectedWriteTab) { showWriteError('카테고리를 선택해주세요.'); return; }
  if (!title)   { document.getElementById('writeTitle').classList.add('error');   showWriteError('제목을 입력해주세요.'); return; }
  if (!content) { document.getElementById('writeContent').classList.add('error'); showWriteError('내용을 입력해주세요.'); return; }

  const nick = getNick();
  let persona = '';
  try { const raw = localStorage.getItem('placeball_personality'); if(raw){const p=JSON.parse(raw);persona=p.emoji||'';} } catch(e){}

  const submitBtn = document.getElementById('submitPostBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '처리 중...';

  const body = { tab: selectedWriteTab, title, content, author: nick, persona, images: [...attachedImages] };
  let data;

  if (editingPostId !== null) {
    // 수정
    data = await apiFetch(`/api/posts/${editingPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } else {
    // 신규
    data = await apiFetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  submitBtn.disabled = false;
  submitBtn.textContent = editingPostId ? '수정 완료' : '등록하기';

  if (!data || !data.success) {
    showWriteError(data?.message || '오류가 발생했습니다. 다시 시도해주세요.');
    return;
  }

  closeWriteModal();
  currentSort = 'date'; currentPage = 0;
  document.querySelectorAll('.sort-item').forEach(b => b.classList.toggle('active', b.dataset.sort === 'date'));
  renderBoard();
});

document.getElementById('openWriteBtn').addEventListener('click', () => openWriteModal());
document.getElementById('writeOverlay').addEventListener('click', function(e) { if(e.target===this) closeWriteModal(); });

// ──────────────────────────────────────────────────────────────
// 상세 모달
// ──────────────────────────────────────────────────────────────
async function openDetail(id) {
  const nick   = getNick();
  const params = nick ? `?viewer=${encodeURIComponent(nick)}` : '';
  const data   = await apiFetch(`/api/posts/${id}${params}`);
  if (!data || data.success === false) return;

  currentPostId = id;
  const tab = TAB_META[data.tab] || TAB_META.chat;

  document.getElementById('detailModalTitle').textContent = '게시글 상세';
  document.getElementById('detailTab').innerHTML   = `<span class="post-tab-badge ${tab.badgeClass}">${tab.badge}</span>`;
  document.getElementById('detailTitle').textContent = data.title + (data.edited ? ' (수정됨)' : '');
  document.getElementById('detailMeta').innerHTML  = `
    <div class="detail-meta-item"><span>${escHtml(data.persona||'⚾')}</span><strong style="color:var(--text-1);font-weight:800;">${escHtml(data.author)}</strong></div>
    <div class="detail-meta-item">📅 ${formatDate(data.date)}</div>
    <div class="detail-meta-item">👁️ ${data.views}회</div>
    <div class="detail-meta-item">👍 ${data.likes}추천</div>`;
  document.getElementById('detailContent').textContent = data.content;
  document.getElementById('detailImages').innerHTML = (data.images||[])
    .map(src => `<img src="${src}" alt="" style="cursor:pointer;" onclick="window.open('${src}','_blank')">`).join('');

  const likeBtn   = document.getElementById('detailLikeBtn');
  const editBtn   = document.getElementById('detailEditBtn');
  const deleteBtn = document.getElementById('detailDeleteBtn');

  document.getElementById('detailLikeCount').textContent = data.likes;
  likeBtn.classList.toggle('liked', !!data.liked);

  if (editBtn)   editBtn.style.display   = data.isOwner ? 'inline-flex' : 'none';
  if (deleteBtn) deleteBtn.style.display = data.isOwner ? 'inline-flex' : 'none';

  // 수정 클릭 → 글쓰기 모달에 현재 글 채워서 열기
  if (editBtn) {
    editBtn.onclick = () => {
      closeDetailModal();
      openWriteModal(data);
    };
  }
  // 삭제 클릭
  if (deleteBtn) {
    deleteBtn.onclick = () => deletePost(id, data.title);
  }

  document.getElementById('detailOverlay').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detailOverlay').classList.remove('open');
  currentPostId = null;
}
document.getElementById('detailOverlay').addEventListener('click', function(e) { if(e.target===this) closeDetailModal(); });

// ──────────────────────────────────────────────────────────────
// 좋아요
// ──────────────────────────────────────────────────────────────
async function toggleLike() {
  if (!currentPostId) return;
  const nick = getNick();
  if (!nick) { alert('로그인이 필요합니다.'); return; }

  const data = await apiFetch(`/api/posts/${currentPostId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewer: nick })
  });
  if (!data) return;

  const likeBtn = document.getElementById('detailLikeBtn');
  likeBtn.classList.toggle('liked', !!data.liked);
  document.getElementById('detailLikeCount').textContent = data.likes;

  // 애니메이션
  likeBtn.style.transform = 'scale(1.15)';
  setTimeout(() => { likeBtn.style.transform = ''; }, 200);

  renderBoard();
}

// ──────────────────────────────────────────────────────────────
// 글 삭제
// ──────────────────────────────────────────────────────────────
async function deletePost(id, title) {
  if (!confirm(`"${title}" 글을 삭제하시겠습니까?`)) return;
  const nick = getNick();
  const data = await apiFetch(`/api/posts/${id}?author=${encodeURIComponent(nick)}`, {
    method: 'DELETE'
  });
  if (!data?.success) {
    alert(data?.message || '삭제 중 오류가 발생했습니다.');
    return;
  }
  closeDetailModal();
  renderBoard();
}

// ──────────────────────────────────────────────────────────────
// URL 파라미터 처리
// ──────────────────────────────────────────────────────────────
function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  const tab    = params.get('tab');
  if (tab && TAB_META[tab]) {
    currentTab = tab;
    document.querySelectorAll('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  }
}

// ──────────────────────────────────────────────────────────────
// 초기화
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  handleURLParams();
  renderBoard();
});
// ══════════════════════════════════════════════════════════════
// 댓글 기능
// ══════════════════════════════════════════════════════════════

let editingCommentId = null;   // 수정 중인 댓글 ID

function formatCommentDate(isoStr) {
  const d    = new Date(isoStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return '방금 전';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// 댓글 목록 로드
async function loadComments(postId) {
  const nick   = getNick();
  const params = new URLSearchParams({ postId });
  if (nick) params.append('viewer', nick);

  const list = await apiFetch(`/api/comments?${params}`);
  if (!list) return;

  const listEl      = document.getElementById('commentList');
  const countEl     = document.getElementById('commentCount');
  const writeEl     = document.getElementById('commentWrite');
  const loginPrompt = document.getElementById('commentLoginPrompt');

  if (countEl) countEl.textContent = list.length;

  // 로그인 여부에 따라 입력창 표시
  if (writeEl)     writeEl.style.display     = nick ? 'flex' : 'none';
  if (loginPrompt) loginPrompt.style.display = nick ? 'none' : 'block';

  if (!listEl) return;

  if (!list.length) {
    listEl.innerHTML = '<div class="comment-empty">첫 댓글을 남겨보세요!</div>';
    return;
  }

  listEl.innerHTML = list.map(c => `
    <div class="comment-item" id="comment-${c.id}">
      <div class="comment-header">
        <span class="comment-author">${escHtml(c.author)}</span>
        <span class="comment-date">${formatCommentDate(c.date)}</span>
        ${c.edited ? '<span class="comment-edited">(수정됨)</span>' : ''}
      </div>
      <div class="comment-content" id="comment-content-${c.id}">${escHtml(c.content)}</div>
      ${c.isOwner ? `
        <div class="comment-actions">
          <button class="comment-btn" onclick="startEditComment(${c.id}, ${JSON.stringify(c.content)})">수정</button>
          <button class="comment-btn del" onclick="deleteComment(${c.id})">삭제</button>
        </div>` : ''}
    </div>`
  ).join('');
}

// 댓글 작성 / 수정 제출
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('commentSubmitBtn');
  const input     = document.getElementById('commentInput');
  if (!submitBtn || !input) return;

  submitBtn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) return;

    const nick = getNick();
    if (!nick) { alert('로그인이 필요합니다.'); return; }

    submitBtn.disabled = true;

    if (editingCommentId !== null) {
      // ── 수정 모드 ──
      const data = await apiFetch(`/api/comments/${editingCommentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: nick, content })
      });
      if (data?.success) {
        cancelEditComment();
        await loadComments(currentPostId);
      } else {
        alert(data?.message || '수정 중 오류가 발생했습니다.');
      }
    } else {
      // ── 신규 작성 ──
      const data = await apiFetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: currentPostId, author: nick, content })
      });
      if (data?.success) {
        input.value = '';
        input.style.height = 'auto';
        await loadComments(currentPostId);
        // 맨 아래 스크롤
        const listEl = document.getElementById('commentList');
        if (listEl) listEl.scrollTop = listEl.scrollHeight;
      } else {
        alert(data?.message || '댓글 작성 중 오류가 발생했습니다.');
      }
    }

    submitBtn.disabled = false;
  });

  // Enter(shift 없이) 제출
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitBtn.click();
    }
  });
});

// 댓글 수정 시작
function startEditComment(commentId, originalContent) {
  editingCommentId = commentId;
  const input     = document.getElementById('commentInput');
  const submitBtn = document.getElementById('commentSubmitBtn');
  if (input)     { input.value = originalContent; input.focus(); input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
  if (submitBtn) submitBtn.textContent = '수정 완료';
  // 수정 취소 버튼 표시
  let cancelBtn = document.getElementById('commentCancelBtn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.id = 'commentCancelBtn';
    cancelBtn.className = 'comment-btn';
    cancelBtn.textContent = '취소';
    cancelBtn.style.cssText = 'margin-left:6px;';
    cancelBtn.onclick = cancelEditComment;
    submitBtn.insertAdjacentElement('afterend', cancelBtn);
  }
}

function cancelEditComment() {
  editingCommentId = null;
  const input     = document.getElementById('commentInput');
  const submitBtn = document.getElementById('commentSubmitBtn');
  const cancelBtn = document.getElementById('commentCancelBtn');
  if (input)     { input.value = ''; input.style.height = 'auto'; }
  if (submitBtn) submitBtn.textContent = '등록';
  if (cancelBtn) cancelBtn.remove();
}

// 댓글 삭제
async function deleteComment(commentId) {
  if (!confirm('댓글을 삭제하시겠습니까?')) return;
  const nick = getNick();
  const data = await apiFetch(`/api/comments/${commentId}?author=${encodeURIComponent(nick)}`, {
    method: 'DELETE'
  });
  if (data?.success) {
    await loadComments(currentPostId);
  } else {
    alert(data?.message || '삭제 중 오류가 발생했습니다.');
  }
}

// openDetail에 댓글 로드 연동 — 기존 openDetail 마지막에 loadComments 호출
const _origOpenDetail = openDetail;
window.openDetail = async function(id) {
  await _origOpenDetail(id);
  editingCommentId = null;
  const input = document.getElementById('commentInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const submitBtn = document.getElementById('commentSubmitBtn');
  if (submitBtn) submitBtn.textContent = '등록';
  const cancelBtn = document.getElementById('commentCancelBtn');
  if (cancelBtn) cancelBtn.remove();
  await loadComments(id);
};

// ══════════════════════════════════════════════════════════════
// 출석체크 기능
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const btn       = document.getElementById('attendanceBtn');
  const btnText   = document.getElementById('attendanceBtnText');
  const statusEl  = document.getElementById('attendanceStatus');
  if (!btn) return;

  const nick = getNick();
  if (!nick) {
    btn.disabled    = true;
    btnText.textContent = '로그인 필요';
    return;
  }

  // 오늘 출석 여부 조회
  try {
    const res  = await fetch(`/api/attendance?nickname=${encodeURIComponent(nick)}`);
    const data = await res.json();
    if (data.doneToday) {
      btn.disabled = true;
      btnText.textContent = '✅ 출석 완료';
      if (statusEl) { statusEl.textContent = '오늘 출석체크 완료!'; statusEl.className = 'attendance-status done'; }
    }
  } catch(e) {}

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btnText.textContent = '처리 중...';
    try {
      const res  = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick })
      });
      const data = await res.json();
      if (data.success) {
        btnText.textContent = '✅ 출석 완료';
        if (statusEl) { statusEl.textContent = data.message; statusEl.className = 'attendance-status done'; }
      } else if (data.alreadyDone) {
        btnText.textContent = '✅ 출석 완료';
        if (statusEl) { statusEl.textContent = data.message; statusEl.className = 'attendance-status done'; }
      } else {
        btn.disabled = false;
        btnText.textContent = '출석체크';
        if (statusEl) { statusEl.textContent = data.message || '오류가 발생했습니다.'; statusEl.className = 'attendance-status'; }
      }
    } catch(e) {
      btn.disabled = false;
      btnText.textContent = '출석체크';
    }
  });
});