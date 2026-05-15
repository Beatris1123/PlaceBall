/**
 * PLACEBALL — 성향 테스트 연동 브릿지
 * 
 * 동작 방식:
 * 1. 로그인 페이지에서 성향 테스트 사이트를 iframe으로 엽니다.
 * 2. 테스트 사이트가 localStorage에 결과를 저장하면 polling으로 감지합니다.
 * 3. postMessage 이벤트도 수신합니다 (사이트가 지원하는 경우).
 * 4. 결과를 'placeball_personality' 키로 표준화하여 저장합니다.
 * 
 * 테스트 사이트가 사용하는 것으로 추정되는 localStorage 키들을 모두 감시합니다.
 */

const QUIZ_URL = 'https://baseballtest-jnfgrdjj.manus.space/';

// 테스트 사이트가 사용할 수 있는 모든 키 패턴
const WATCH_KEYS = [
  'personality', 'personalityType', 'personality_type', 'quizResult',
  'quiz_result', 'baseball_type', 'baseballType', 'myType', 'my_type',
  'userType', 'user_type', 'result', 'testResult',
];

// 10가지 유형 한/영 매핑
const TYPE_MAP = {
  // 영문 키
  'cheer'      : { name:'불타는 응원단장',    emoji:'🔥', color:'#EF4444' },
  'food'       : { name:'먹거리 탐험가',      emoji:'🌭', color:'#F59E0B' },
  'analyst'    : { name:'데이터 분석가',      emoji:'📊', color:'#3B82F6' },
  'photo'      : { name:'직관 포토그래퍼',   emoji:'📸', color:'#8B5CF6' },
  'social'     : { name:'인싸 직관러',        emoji:'🎉', color:'#EC4899' },
  'lucky'      : { name:'행운의 마스코트',    emoji:'🍀', color:'#10B981' },
  'vintage'    : { name:'레전드 올드팬',      emoji:'🏆', color:'#F97316' },
  'relaxed'    : { name:'여유로운 관람객',    emoji:'☀️', color:'#06B6D4' },
  'collector'  : { name:'굿즈 수집가',        emoji:'🧢', color:'#6366F1' },
  'streamer'   : { name:'직관 스트리머',      emoji:'📱', color:'#EF4444' },
  // 한글 이름으로도 매핑
  '불타는 응원단장'  : { emoji:'🔥', color:'#EF4444', type:'cheer' },
  '먹거리 탐험가'    : { emoji:'🌭', color:'#F59E0B', type:'food' },
  '데이터 분석가'    : { emoji:'📊', color:'#3B82F6', type:'analyst' },
  '직관 포토그래퍼'  : { emoji:'📸', color:'#8B5CF6', type:'photo' },
  '인싸 직관러'      : { emoji:'🎉', color:'#EC4899', type:'social' },
  '행운의 마스코트'  : { emoji:'🍀', color:'#10B981', type:'lucky' },
  '레전드 올드팬'    : { emoji:'🏆', color:'#F97316', type:'vintage' },
  '여유로운 관람객'  : { emoji:'☀️', color:'#06B6D4', type:'relaxed' },
  '굿즈 수집가'      : { emoji:'🧢', color:'#6366F1', type:'collector' },
  '직관 스트리머'    : { emoji:'📱', color:'#EF4444', type:'streamer' },
};

/**
 * 원시 결과값을 표준 personality 객체로 변환
 */
function normalizeResult(raw) {
  if (!raw) return null;
  
  // 이미 표준 형식인 경우
  if (typeof raw === 'object' && raw.name && raw.emoji) return raw;
  
  // 문자열인 경우
  const str = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw);
  
  // 영문 타입 키
  if (TYPE_MAP[str]) {
    return { type: str, ...TYPE_MAP[str] };
  }
  
  // 한글 이름
  if (TYPE_MAP[str]) {
    const m = TYPE_MAP[str];
    return { type: m.type, name: str, emoji: m.emoji, color: m.color };
  }
  
  // JSON 파싱 시도
  try {
    const obj = JSON.parse(str);
    if (obj.type && TYPE_MAP[obj.type]) {
      return { ...TYPE_MAP[obj.type], ...obj };
    }
    if (obj.name) {
      const match = TYPE_MAP[obj.name];
      return match ? { ...match, name: obj.name, ...obj } : obj;
    }
  } catch(e) {}
  
  // 알 수 없는 형식 — 그냥 이름으로 저장
  return { name: str, emoji: '⚾', color: '#64748B', type: 'unknown' };
}

/**
 * localStorage에서 테스트 결과 스캔
 */
function scanLocalStorage() {
  for (const key of WATCH_KEYS) {
    const val = localStorage.getItem(key);
    if (!val) continue;
    const normalized = normalizeResult(val);
    if (normalized) {
      localStorage.setItem('placeball_personality', JSON.stringify(normalized));
      return normalized;
    }
  }
  // 전체 키 스캔 (패턴 기반)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key === 'placeball_personality' || key === 'loggedInUser') continue;
    const val = localStorage.getItem(key);
    if (!val) continue;
    // "type", "name", "emoji" 중 하나라도 포함하면 시도
    if (val.includes('type') || val.includes('name') || val.includes('emoji')) {
      const normalized = normalizeResult(val);
      if (normalized && normalized.name) {
        localStorage.setItem('placeball_personality', JSON.stringify(normalized));
        return normalized;
      }
    }
  }
  return null;
}

// Export for login.html use
window.PLACEBALL_BRIDGE = { scanLocalStorage, normalizeResult, TYPE_MAP, QUIZ_URL };
