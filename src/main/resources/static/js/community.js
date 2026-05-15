/* ============================================================
   PLACEBALL — community.js  (팀원 코드 병합)
   ============================================================ */
const POSTS_PER_PAGE = 10;
const STORAGE_KEY    = 'placeball_posts';
const LIKED_KEY      = 'placeball_liked_posts';

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
let currentPage   = 1;
let currentPostId = null;

function loadPosts() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : getDefaultPosts(); }
  catch(e) { return getDefaultPosts(); }
}
function savePosts(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function loadLiked() { try { const r = localStorage.getItem(LIKED_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; } }
function saveLiked(l) { localStorage.setItem(LIKED_KEY, JSON.stringify(l)); }

function getDefaultPosts() {
  const now = Date.now();
  return [
    { id:1,  tab:'chat',     title:'오늘 잠실 분위기 진짜 역대급이었다',            author:'KIA_Fan92',    persona:'🔥', content:'오늘 잠실 직관했는데 응원단장 진짜 미쳤다. 목 다 쉰 거 같음ㅋㅋ\n9회 역전 때 전광판 보고 진짜 눈물 날 뻔...', images:[], likes:124, views:430, date:now-1000*60*40 },
    { id:2,  tab:'photo',    title:'오늘 직관 인증샷 올려요 🍺⚾',                  author:'BaseballLover',persona:'📸', content:'비오는 날 직관이었는데 분위기는 최고였어요! 치킨 + 맥주 조합으로 즐겼습니다.', images:[], likes:89, views:256, date:now-1000*60*90 },
    { id:3,  tab:'analysis', title:'오늘 KIA 선발 구위 데이터 분석 공유합니다',      author:'StatGuru',     persona:'📊', content:'오늘 선발 평균 구속 143.2km, 헛스윙률 28.4%\n변화구 비율이 올라가면서 타자들이 많이 고전했네요.', images:[], likes:201, views:612, date:now-1000*60*120 },
    { id:4,  tab:'cheer',    title:'요즘 응원가 중에 제일 신나는 거 추천해줘요',     author:'CheerQueen',   persona:'🔥', content:'최근 생긴 응원가 중에 정말 신나는 거 있으면 알려주세요.', images:[], likes:67, views:189, date:now-1000*60*180 },
    { id:5,  tab:'info',     title:'잠실야구장 3루 응원석 꿀팁 정리',               author:'ParkExpert',   persona:'☀️', content:'- 입구: 1번 게이트가 줄 제일 짧음\n- 먹거리: B구역 매점이 줄 없음\n- 좌석: D열 이상이면 뒤에서 쪽지 안 날아옴', images:[], likes:156, views:511, date:now-1000*60*240 },
    { id:6,  tab:'chat',     title:'오늘 삼성 롯데 경기 진짜 극적이었다',           author:'SamsungFan',   persona:'📊', content:'9회 2아웃 2스트라이크에서 역전 만루홈런...', images:[], likes:312, views:890, date:now-1000*60*300 },
    { id:7,  tab:'photo',    title:'우리 구역 응원단 단체 인증샷!',                 author:'LotteFan88',   persona:'📸', content:'롯데 원정 응원 다녀왔습니다. 잠실에서 원정 응원하는 맛이 있어요 ㅎㅎ', images:[], likes:44, views:132, date:now-1000*60*360 },
    { id:8,  tab:'analysis', title:'LG 불펜진 ERA 비교 (최근 10경기)',             author:'DataNerd',     persona:'📊', content:'최근 10경기 LG 불펜 ERA 3.21로 시즌 최저치 기록 중.', images:[], likes:178, views:445, date:now-1000*60*420 },
    { id:9,  tab:'info',     title:'각 구장 주차 꿀팁 총정리 (2026 버전)',          author:'ParkingKing',  persona:'☀️', content:'잠실: 경기 2시간 전 → 1주차장\n광주: 무등경기장 길 건너 공영주차장 무료', images:[], likes:233, views:721, date:now-1000*60*480 },
    { id:10, tab:'cheer',    title:'이번 시즌 MVP 누가 될 것 같아요?',              author:'MVPHunter',    persona:'🏆', content:'저는 개인적으로 타격 부문에서 KIA 4번 타자가 유력하다고 봅니다.', images:[], likes:95, views:278, date:now-1000*60*540 },
  ];
}

function initHeader() {
  const nick = localStorage.getItem('loggedInUser');
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

function formatDate(ts) {
  const d = Date.now() - ts;
  if (d < 60000)     return '방금 전';
  if (d < 3600000)   return `${Math.floor(d/60000)}분 전`;
  if (d < 86400000)  return `${Math.floor(d/3600000)}시간 전`;
  const dt = new Date(ts);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}
function formatDateShort(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return '방금';
  if (d < 3600000)  return `${Math.floor(d/60000)}분`;
  if (d < 86400000) return `${Math.floor(d/3600000)}시간`;
  const dt = new Date(ts);
  return `${dt.getMonth()+1}/${dt.getDate()}`;
}

function updateTabCounts() {
  const posts = loadPosts();
  document.getElementById('cnt-all').textContent = posts.length;
  ['chat','photo','analysis','cheer','info'].forEach(t => {
    const el = document.getElementById(`cnt-${t}`);
    if (el) el.textContent = posts.filter(p => p.tab === t).length;
  });
}

function getFilteredSorted() {
  let posts = loadPosts();
  const q = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  if (currentTab !== 'all') posts = posts.filter(p => p.tab === currentTab);
  if (q) posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
  return [...posts].sort((a,b) => {
    if (currentSort === 'likes') return b.likes - a.likes;
    if (currentSort === 'date')  return b.date  - a.date;
    if (currentSort === 'views') return b.views - a.views;
    return 0;
  });
}

function renderBoard() {
  const posts = getFilteredSorted();
  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = posts.slice(start, start + POSTS_PER_PAGE);
  const listEl = document.getElementById('postList');
  if (!listEl) return;

  if (!pagePosts.length) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">⚾</span><p class="empty-text">아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!</p></div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  listEl.innerHTML = pagePosts.map(post => {
    const tab = TAB_META[post.tab] || TAB_META.chat;
    const likeClass = post.likes >= 100 ? 'hot' : post.likes >= 30 ? 'warm' : 'cool';
    const hasImg = post.images?.length > 0;
    return `<div class="post-row" onclick="openDetail(${post.id})">
      <div class="col-tab"><span class="post-tab-badge ${tab.badgeClass}">${tab.badge||tab.label}</span></div>
      <div class="col-title-cell">
        <span class="post-title-text">${escHtml(post.title)}</span>
        ${hasImg ? `<span class="post-has-img">🖼️ ${post.images.length}</span>` : ''}
      </div>
      <div class="col-center"><span class="post-author"><span>${post.persona||''}</span>${escHtml(post.author)}</span></div>
      <div class="col-center col-date-cell"><span class="post-date">${formatDateShort(post.date)}</span></div>
      <div class="col-center col-views-cell"><span class="post-views">${post.views}</span></div>
      <div class="col-center"><span class="post-likes ${likeClass}">${post.likes>=100?'🔥':post.likes>=30?'👍':'·'} ${post.likes}</span></div>
    </div>`;
  }).join('');

  renderPagination(totalPages);
  updateTabCounts();
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i===1||i===totalPages||(i>=currentPage-2&&i<=currentPage+2)) {
      html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i===currentPage-3||i===currentPage+3) {
      html += `<button class="page-btn" disabled style="border:none;background:none;color:var(--text-3)">…</button>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
  el.innerHTML = html;
}
function goPage(p) {
  const posts = getFilteredSorted();
  const total = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  if (p < 1 || p > total) return;
  currentPage = p;
  renderBoard();
  window.scrollTo({ top:0, behavior:'smooth' });
}

document.getElementById('tabList').addEventListener('click', e => {
  const btn = e.target.closest('.tab-item');
  if (!btn) return;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = btn.dataset.tab; currentPage = 1; renderBoard();
});
document.getElementById('sortList').addEventListener('click', e => {
  const btn = e.target.closest('.sort-item');
  if (!btn) return;
  document.querySelectorAll('.sort-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentSort = btn.dataset.sort; currentPage = 1; renderBoard();
});
document.getElementById('searchInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { currentPage = 1; renderBoard(); }
});

let selectedWriteTab = '';
let attachedImages   = [];

function openWriteModal() {
  const nick = localStorage.getItem('loggedInUser');
  if (!nick) { alert('로그인이 필요합니다.'); window.location.href = 'login.html'; return; }
  selectedWriteTab = ''; attachedImages = [];
  document.querySelectorAll('.write-tab-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('writeTitle').value = '';
  document.getElementById('writeContent').value = '';
  document.getElementById('imagePreviewRow').innerHTML = '';
  document.getElementById('writeError').classList.remove('visible');
  document.getElementById('writeTitle').classList.remove('error');
  document.getElementById('writeContent').classList.remove('error');
  document.getElementById('writeOverlay').classList.add('open');
}
function closeWriteModal() { document.getElementById('writeOverlay').classList.remove('open'); }
function selectWriteTab(btn) {
  document.querySelectorAll('.write-tab-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected'); selectedWriteTab = btn.dataset.tab;
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
  document.getElementById('imagePreviewRow').innerHTML = attachedImages.map((src,i) =>
    `<div class="image-preview-item"><img src="${src}" alt=""><button class="image-remove-btn" onclick="removeImage(${i})">✕</button></div>`
  ).join('');
}
function removeImage(idx) { attachedImages.splice(idx,1); renderImagePreviews(); }

document.getElementById('submitPostBtn').addEventListener('click', submitPost);
function submitPost() {
  const title   = document.getElementById('writeTitle').value.trim();
  const content = document.getElementById('writeContent').value.trim();
  if (!selectedWriteTab) { showWriteError('카테고리를 선택해주세요.'); return; }
  if (!title)   { document.getElementById('writeTitle').classList.add('error');   showWriteError('제목을 입력해주세요.'); return; }
  if (!content) { document.getElementById('writeContent').classList.add('error'); showWriteError('내용을 입력해주세요.'); return; }

  const nick = localStorage.getItem('loggedInUser') || '익명';
  let persona = '';
  try { const raw = localStorage.getItem('placeball_personality'); if(raw){const p=JSON.parse(raw);persona=p.emoji||'';} } catch(e) {}

  const posts = loadPosts();
  const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
  posts.unshift({ id:newId, tab:selectedWriteTab, title, content, author:nick, persona, images:[...attachedImages], likes:0, views:0, date:Date.now() });
  savePosts(posts);

  fetch('/api/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tab:selectedWriteTab,title,content,author:nick,persona}) }).catch(()=>{});

  closeWriteModal();
  currentSort='date'; currentPage=1;
  document.querySelectorAll('.sort-item').forEach(b => b.classList.toggle('active', b.dataset.sort==='date'));
  renderBoard();
}
function showWriteError(msg) {
  const el = document.getElementById('writeError');
  el.textContent = msg; el.classList.add('visible');
}
document.getElementById('openWriteBtn').addEventListener('click', openWriteModal);
document.getElementById('writeOverlay').addEventListener('click', function(e) { if(e.target===this) closeWriteModal(); });

function openDetail(id) {
  const posts = loadPosts();
  const post  = posts.find(p => p.id === id);
  if (!post) return;
  post.views += 1; savePosts(posts);
  currentPostId = id;
  const tab = TAB_META[post.tab] || TAB_META.chat;
  document.getElementById('detailModalTitle').textContent = '게시글 상세';
  document.getElementById('detailTab').innerHTML   = `<span class="post-tab-badge ${tab.badgeClass}">${tab.badge}</span>`;
  document.getElementById('detailTitle').textContent = post.title;
  document.getElementById('detailMeta').innerHTML  = `
    <div class="detail-meta-item"><span>${post.persona||'⚾'}</span><strong style="color:var(--text-1);font-weight:800;">${escHtml(post.author)}</strong></div>
    <div class="detail-meta-item">📅 ${formatDate(post.date)}</div>
    <div class="detail-meta-item">👁️ ${post.views}회</div>
    <div class="detail-meta-item">👍 ${post.likes}추천</div>`;
  document.getElementById('detailContent').textContent = post.content;
  document.getElementById('detailImages').innerHTML = (post.images||[]).map(src=>`<img src="${src}" alt="">`).join('');
  const liked = loadLiked().includes(id);
  document.getElementById('detailLikeCount').textContent = post.likes;
  document.getElementById('detailLikeBtn').classList.toggle('liked', liked);
  document.getElementById('detailOverlay').classList.add('open');
  renderBoard();
}
function closeDetailModal() { document.getElementById('detailOverlay').classList.remove('open'); currentPostId = null; }
document.getElementById('detailOverlay').addEventListener('click', function(e) { if(e.target===this) closeDetailModal(); });

function toggleLike() {
  if (!currentPostId) return;
  const nick = localStorage.getItem('loggedInUser');
  if (!nick) { alert('로그인이 필요합니다.'); return; }
  const posts = loadPosts();
  const post  = posts.find(p => p.id === currentPostId);
  if (!post) return;
  const liked = loadLiked();
  const idx   = liked.indexOf(currentPostId);
  const likeBtn = document.getElementById('detailLikeBtn');
  if (idx === -1) {
    post.likes++; liked.push(currentPostId); likeBtn.classList.add('liked');
    likeBtn.style.transform = 'scale(1.15)'; setTimeout(()=>{ likeBtn.style.transform=''; }, 200);
  } else {
    post.likes = Math.max(0, post.likes-1); liked.splice(idx,1); likeBtn.classList.remove('liked');
  }
  savePosts(posts); saveLiked(liked);
  document.getElementById('detailLikeCount').textContent = post.likes;
  document.getElementById('detailMeta').innerHTML = `
    <div class="detail-meta-item"><span>${post.persona||'⚾'}</span><strong style="color:var(--text-1);font-weight:800;">${escHtml(post.author)}</strong></div>
    <div class="detail-meta-item">📅 ${formatDate(post.date)}</div>
    <div class="detail-meta-item">👁️ ${post.views}회</div>
    <div class="detail-meta-item">👍 ${post.likes}추천</div>`;
  fetch(`/api/posts/${currentPostId}/like`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:nick}) }).catch(()=>{});
  renderBoard();
}

function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab && TAB_META[tab]) {
    currentTab = tab;
    document.querySelectorAll('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  handleURLParams();
  if (!localStorage.getItem(STORAGE_KEY)) savePosts(getDefaultPosts());
  renderBoard();
});
