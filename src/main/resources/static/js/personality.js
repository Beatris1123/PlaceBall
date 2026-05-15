/**
 * PLACEBALL — 성향 시스템 공통 모듈 (personality.js)
 *
 * 모든 HTML 파일에서 이 파일 하나만 참조합니다.
 * login.js, index.html, community.js, quiz.html 이 공유하는
 * PERSONALITY_MAP과 getPersonality() 를 여기서 정의합니다.
 *
 * 로딩 순서: 이 파일을 다른 JS 파일보다 먼저 <script> 로드해야 합니다.
 */

/* ──────────────────────────────────────────────
   성향 맵 (10가지 유형)
   타입 키는 영문 소문자. quiz, login, index 통합.
   quiz.html의 'zen' 키는 'relaxed'로 통일.
────────────────────────────────────────────── */
const PERSONALITY_MAP = {
  'cheer'    : { name:'불타는 응원단장',  emoji:'🔥', color:'#EF4444', desc:'응원가를 외우고 떼창을 이끄는 열정 팬',        quote:'"이겨라! 이겨라! 목이 터질 때까지!"' },
  'food'     : { name:'먹거리 탐험가',    emoji:'🌭', color:'#F59E0B', desc:'직관의 목적은 치킨과 맥주! 야구장 맛집 지도 완성', quote:'"경기는 배불러야 제대로 즐길 수 있지."' },
  'analyst'  : { name:'데이터 분석가',    emoji:'📊', color:'#3B82F6', desc:'기록지와 스탯으로 경기를 읽는 야구 박사',       quote:'"저 투수 오늘 구속이 평균보다 3km 느리네."' },
  'photo'    : { name:'직관 포토그래퍼',  emoji:'📸', color:'#8B5CF6', desc:'인생샷 건지러 구장 구석구석을 탐험',            quote:'"이 앵글이면 완벽한 인증샷이야!"' },
  'social'   : { name:'인싸 직관러',      emoji:'🎉', color:'#EC4899', desc:'친구들과의 추억 만들기가 최우선',              quote:'"직관은 분위기야, 분위기!"' },
  'lucky'    : { name:'행운의 마스코트',  emoji:'🍀', color:'#10B981', desc:'내가 가면 팀이 이긴다는 믿음의 팬',            quote:'"오늘도 내가 직관하면 이긴다!"' },
  'vintage'  : { name:'레전드 올드팬',    emoji:'🏆', color:'#F97316', desc:'창단 멤버부터 알고 있는 산증인 팬',            quote:'"그때 그 선수가 진짜였지..."' },
  'relaxed'  : { name:'여유로운 관람객',  emoji:'☀️', color:'#06B6D4', desc:'잔디 냄새와 여유를 즐기는 힐링 팬',            quote:'"이기면 좋고 지면 어쩔 수 없지. 맥주나 한 잔."' },
  'collector': { name:'굿즈 수집가',      emoji:'🧢', color:'#6366F1', desc:'한정판 굿즈를 위해서라면 어디든 간다',          quote:'"오늘 한정판 콜라보 모자 득템!"' },
  'streamer' : { name:'직관 스트리머',    emoji:'📱', color:'#EF4444', desc:'실시간 중계와 SNS 공유가 직관의 이유',          quote:'"여러분 현장 분위기 어때요~?"' },
};

/* ──────────────────────────────────────────────
   quiz.html 에서 사용하던 'zen' 키 → 'relaxed' 리다이렉트
   quiz.html을 수정하지 않아도 저장 시 자동 변환됩니다.
────────────────────────────────────────────── */
const PERSONALITY_KEY_ALIAS = {
  'zen': 'relaxed',
};

/**
 * localStorage에서 성향 데이터를 읽어 PERSONALITY_MAP 기준으로 정규화하여 반환.
 * 없으면 null 반환.
 *
 * @returns {{ type, name, emoji, color, desc, quote } | null}
 */
function getPersonality() {
  try {
    const raw = localStorage.getItem('placeball_personality');
    if (!raw) return null;
    const data = JSON.parse(raw);

    // 별칭 처리: zen → relaxed
    let typeKey = data.type;
    if (typeKey && PERSONALITY_KEY_ALIAS[typeKey]) {
      typeKey = PERSONALITY_KEY_ALIAS[typeKey];
    }

    // 맵에서 정규 정보 조회
    if (typeKey && PERSONALITY_MAP[typeKey]) {
      return { ...PERSONALITY_MAP[typeKey], type: typeKey };
    }

    // 이름 기반 역방향 조회 (레거시 대응)
    if (data.name) {
      for (const [key, val] of Object.entries(PERSONALITY_MAP)) {
        if (val.name === data.name) {
          return { ...val, type: key };
        }
      }
      return data; // 알 수 없는 유형이지만 name은 있음
    }

    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 성향 데이터를 저장합니다.
 * 저장 전 별칭 변환(zen → relaxed)을 자동으로 처리합니다.
 *
 * @param {object} p — { type, ...기타 }
 */
function savePersonality(p) {
  if (!p) return;
  let type = p.type;
  if (type && PERSONALITY_KEY_ALIAS[type]) type = PERSONALITY_KEY_ALIAS[type];
  const canonical = PERSONALITY_MAP[type];
  const merged = canonical ? { ...canonical, type, ...p, type } : p;
  localStorage.setItem('placeball_personality', JSON.stringify(merged));
}

/**
 * hex → rgba 변환 헬퍼
 * @param {string} hex — '#RRGGBB'
 * @param {number} alpha — 0~1
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16) || 59;
  const g = parseInt(hex.slice(3,5), 16) || 130;
  const b = parseInt(hex.slice(5,7), 16) || 246;
  return `rgba(${r},${g},${b},${alpha})`;
}

// 전역 노출 (여러 파일에서 사용)
window.PERSONALITY_MAP  = PERSONALITY_MAP;
window.getPersonality   = getPersonality;
window.savePersonality  = savePersonality;
window.hexToRgba        = hexToRgba;
