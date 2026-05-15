package com.example.placeball.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.*;

@RestController
@RequestMapping("/api/vision")
public class VisionApiController {

    @Value("${google.vision.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // ─── 요청 DTO ───
    public static class OcrRequest {
        public String imageBase64;
        public String mimeType;
    }

    // ─── 응답 DTO ───
    public static class OcrResponse {
        public String date;
        public String match;
        public String stadium;
        public String seat;
        public String rawText;
        public int confidence;
        public String error;
    }

    @PostMapping("/ticket-ocr")
    public ResponseEntity<OcrResponse> analyzeTicket(@RequestBody OcrRequest req) {
        OcrResponse resp = new OcrResponse();

        if (apiKey == null || apiKey.isBlank()) {
            // API 키 없을 때 → 텍스트 직접 파싱만 수행 (데모용 fallback)
            resp.error = "API_KEY_MISSING";
            resp.rawText = "Google Vision API 키가 설정되지 않았습니다.\napplication.properties에 google.vision.api-key=YOUR_KEY 를 추가해주세요.";
            resp.confidence = 0;
            return ResponseEntity.ok(resp);
        }

        try {
            // 1) Cloud Vision API 호출
            String visionUrl = "https://vision.googleapis.com/v1/images:annotate?key=" + apiKey;

            Map<String, Object> image = Map.of("content", req.imageBase64);
            Map<String, Object> feature = Map.of("type", "TEXT_DETECTION", "maxResults", 1);
            Map<String, Object> annotateReq = Map.of("image", image, "features", List.of(feature));
            Map<String, Object> body = Map.of("requests", List.of(annotateReq));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> visionResp = restTemplate.postForEntity(visionUrl, entity, Map.class);

            // 2) 텍스트 추출
            String rawText = extractRawText(visionResp.getBody());
            resp.rawText = rawText;

            // 3) 파싱
            parseTicketInfo(rawText, resp);

        } catch (Exception e) {
            resp.error = e.getMessage();
            resp.rawText = "Vision API 호출 실패: " + e.getMessage();
            resp.confidence = 0;
        }

        return ResponseEntity.ok(resp);
    }

    // ── Vision 응답에서 fullTextAnnotation.text 추출 ──
    @SuppressWarnings("unchecked")
    private String extractRawText(Map body) {
        try {
            List<Map> responses = (List<Map>) body.get("responses");
            if (responses == null || responses.isEmpty()) return "";
            Map resp = responses.get(0);

            // fullTextAnnotation 우선
            Map fta = (Map) resp.get("fullTextAnnotation");
            if (fta != null && fta.get("text") != null) return fta.get("text").toString();

            // textAnnotations fallback
            List<Map> ta = (List<Map>) resp.get("textAnnotations");
            if (ta != null && !ta.isEmpty()) return ta.get(0).get("description").toString();
        } catch (Exception e) { /* ignore */ }
        return "";
    }

    // ── 티켓 텍스트 파싱 ──
    private void parseTicketInfo(String text, OcrResponse resp) {
        if (text == null || text.isBlank()) { resp.confidence = 0; return; }

        int score = 0;

        // ① 날짜 파싱 — 여러 형식 지원
        // "2024년 06월 05일" / "2024.06.05" / "2024-06-05" / "24/06/05"
        Pattern[] datePatterns = {
            Pattern.compile("(20\\d{2})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일"),
            Pattern.compile("(20\\d{2})[.\\-/](\\d{1,2})[.\\-/](\\d{1,2})"),
            Pattern.compile("(\\d{2})[.\\-/](\\d{2})[.\\-/](\\d{2})"),
            Pattern.compile("(\\d{1,2})월\\s*(\\d{1,2})일")
        };
        for (Pattern p : datePatterns) {
            Matcher m = p.matcher(text);
            if (m.find()) {
                if (p.pattern().startsWith("(20")) {
                    String year  = m.group(1);
                    String month = m.group(2);
                    String day   = m.group(3);
                    // 시간 추출 시도
                    Matcher tm = Pattern.compile("(\\d{2}:\\d{2})").matcher(text);
                    String time = tm.find() ? " " + tm.group(1) : "";
                    resp.date = year + "년 " + month + "월 " + day + "일" + time;
                } else if (p.pattern().contains("월\\\\s\\*\\(")) {
                    resp.date = m.group(1) + "월 " + m.group(2) + "일";
                } else {
                    resp.date = "20" + m.group(1) + "년 " + m.group(2) + "월 " + m.group(3) + "일";
                }
                score += 30;
                break;
            }
        }

        // ② 팀명 파싱 — 한글/영문/약칭 모두 커버
        // "TIGERS VS GIANTS" / "KIA VS LG" / "타이거즈 VS 트윈스"
        Map<String, String> teamAlias = new LinkedHashMap<>();
        teamAlias.put("TIGERS",   "KIA");   teamAlias.put("타이거즈", "KIA");
        teamAlias.put("TWINS",    "LG");    teamAlias.put("트윈스",   "LG");
        teamAlias.put("LIONS",    "삼성");  teamAlias.put("라이온즈", "삼성");
        teamAlias.put("BEARS",    "두산");  teamAlias.put("베어스",   "두산");
        teamAlias.put("GIANTS",   "롯데");  teamAlias.put("자이언츠", "롯데");
        teamAlias.put("LANDERS",  "SSG");   teamAlias.put("랜더스",   "SSG");
        teamAlias.put("DINOS",    "NC");    teamAlias.put("다이노스",  "NC");
        teamAlias.put("WYVERNS",  "KT");    teamAlias.put("위즈",     "KT");
        teamAlias.put("EAGLES",   "한화");  teamAlias.put("이글스",   "한화");
        teamAlias.put("HEROES",   "키움");  teamAlias.put("히어로즈", "키움");
        // 팀 코드 직접
        teamAlias.put("KIA",  "KIA");
        teamAlias.put("LG",   "LG");
        teamAlias.put("SSG",  "SSG");
        teamAlias.put("NC",   "NC");
        teamAlias.put("KT",   "KT");
        teamAlias.put("LOTTE","롯데");
        teamAlias.put("롯데", "롯데");
        teamAlias.put("삼성", "삼성");
        teamAlias.put("두산", "두산");
        teamAlias.put("한화", "한화");
        teamAlias.put("키움", "키움");

        String upper = text.toUpperCase();
        // "A VS B" 패턴 우선 탐색
        Pattern vsPat = Pattern.compile("([A-Z가-힣]+)\\s*(?:VS\\.?|대)\\s*([A-Z가-힣]+)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        Matcher vsM = vsPat.matcher(text.toUpperCase());
        if (vsM.find()) {
            String t1 = teamAlias.getOrDefault(vsM.group(1).trim(), vsM.group(1).trim());
            String t2 = teamAlias.getOrDefault(vsM.group(2).trim(), vsM.group(2).trim());
            resp.match = t1 + " vs " + t2;
            score += 30;
        } else {
            // VS 패턴 없으면 등장 순서로 찾기
            List<String> found = new ArrayList<>();
            for (Map.Entry<String, String> e : teamAlias.entrySet()) {
                if (upper.contains(e.getKey().toUpperCase()) && !found.contains(e.getValue())) {
                    found.add(e.getValue());
                    if (found.size() == 2) break;
                }
            }
            if (found.size() >= 2) {
                resp.match = found.get(0) + " vs " + found.get(1);
                score += 25;
            } else if (found.size() == 1) {
                resp.match = found.get(0) + " 경기";
                score += 10;
            }
        }

        // ③ 구장 파싱
        // 홈팀 기반 자동 추론 포함
        Map<String, String> stadiumKeyword = new LinkedHashMap<>();
        stadiumKeyword.put("잠실",         "잠실야구장");
        stadiumKeyword.put("JAMSIL",       "잠실야구장");
        stadiumKeyword.put("고척",         "고척스카이돔");
        stadiumKeyword.put("GOCHEOK",      "고척스카이돔");
        stadiumKeyword.put("광주",         "광주기아챔피언스필드");
        stadiumKeyword.put("기아챔피언스",  "광주기아챔피언스필드");
        stadiumKeyword.put("KIA CHAMPIONS","광주기아챔피언스필드");
        stadiumKeyword.put("대전",         "대전한화생명이글스파크");
        stadiumKeyword.put("한화생명",      "대전한화생명이글스파크");
        stadiumKeyword.put("인천",         "인천SSG랜더스필드");
        stadiumKeyword.put("SSG랜더스",    "인천SSG랜더스필드");
        stadiumKeyword.put("수원",         "수원KT위즈파크");
        stadiumKeyword.put("KT위즈",       "수원KT위즈파크");
        stadiumKeyword.put("창원",         "창원NC파크");
        stadiumKeyword.put("NC파크",       "창원NC파크");
        stadiumKeyword.put("사직",         "사직야구장");
        stadiumKeyword.put("SAJIK",        "사직야구장");
        stadiumKeyword.put("대구",         "대구삼성라이온즈파크");
        stadiumKeyword.put("삼성라이온즈파크","대구삼성라이온즈파크");

        boolean stadiumFound = false;
        for (Map.Entry<String, String> e : stadiumKeyword.entrySet()) {
            if (upper.contains(e.getKey().toUpperCase())) {
                resp.stadium = e.getValue();
                score += 20;
                stadiumFound = true;
                break;
            }
        }

        // 구장 못 찾으면 홈팀으로 추론
        if (!stadiumFound && resp.match != null) {
            Map<String, String> homeStadium = Map.of(
                "KIA","광주기아챔피언스필드",
                "LG","잠실야구장", "두산","잠실야구장",
                "롯데","사직야구장",
                "삼성","대구삼성라이온즈파크",
                "한화","대전한화생명이글스파크",
                "SSG","인천SSG랜더스필드",
                "NC","창원NC파크",
                "KT","수원KT위즈파크",
                "키움","고척스카이돔"
            );
            // "A vs B" 에서 B가 홈팀 (원정 티켓 기준 두 번째 팀이 홈)
            String[] parts = resp.match.split(" vs ");
            if (parts.length == 2) {
                String home = homeStadium.get(parts[1].trim());
                if (home != null) { resp.stadium = home + " (홈팀 추론)"; score += 10; }
            }
        }

        // ④ 좌석 파싱 — 더 넓은 패턴
        // "1루 KB 109 29열 10번" / "3루 오렌지 4블록 15열 22번" / "외야 지정 201구역" 등
        Pattern[] seatPatterns = {
            // "1루 KB 109 29열 10번" 형식
            Pattern.compile("([1-3]루|외야|중앙)\\s+([A-Z가-힣]{1,10})\\s+(\\d{2,3})\\s+(\\d{1,3})열\\s+(\\d{1,3})번", Pattern.CASE_INSENSITIVE),
            // "1루 오렌지 4블록 15열" 형식
            Pattern.compile("([1-3]루|외야|중앙)\\s+([A-Z가-힣]{1,10})\\s+(\\d{1,3}블록|[A-Z]구역)\\s*(\\d{1,3}열)?\\s*(\\d{1,3}번)?", Pattern.CASE_INSENSITIVE),
            // "109 29열 10번" (좌우 없는 단순 형식)
            Pattern.compile("(\\d{2,3})\\s+(\\d{1,3})열\\s+(\\d{1,3})번"),
            // 간단한 좌석 코드
            Pattern.compile("([1-3]루|외야|그린|오렌지|네이비|블루|테이블|프리미엄|익사이팅|파울)\\s*([A-Z가-힣\\d\\-]+)?"),
        };
        for (Pattern sp : seatPatterns) {
            Matcher sm = sp.matcher(text);
            if (sm.find()) {
                StringBuilder seat = new StringBuilder();
                for (int i = 1; i <= sm.groupCount(); i++) {
                    if (sm.group(i) != null && !sm.group(i).isBlank()) {
                        if (seat.length() > 0) seat.append(" ");
                        seat.append(sm.group(i).trim());
                    }
                }
                String seatStr = seat.toString().trim();
                if (!seatStr.isEmpty()) {
                    resp.seat = seatStr;
                    score += 20;
                    break;
                }
            }
        }

        resp.confidence = Math.min(score, 100);
    }
}
