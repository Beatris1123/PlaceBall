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

    // ── 구장명 키워드 → 정규 구장명 매핑 ──
    private static final Map<String, String> STADIUM_ALIAS = new LinkedHashMap<>() {{
        put("고척스카이돔",       "고척스카이돔");
        put("고척",              "고척스카이돔");
        put("잠실야구장",         "잠실야구장");
        put("잠실",              "잠실야구장");
        put("광주-기아 챔피언스", "광주-기아 챔피언스 필드");
        put("광주기아",           "광주-기아 챔피언스 필드");
        put("광주",              "광주-기아 챔피언스 필드");
        put("대구삼성라이온즈파크","대구삼성라이온즈파크");
        put("대구",              "대구삼성라이온즈파크");
        put("사직야구장",         "사직야구장");
        put("사직",              "사직야구장");
        put("SSG랜더스필드",      "SSG랜더스필드");
        put("인천",              "SSG랜더스필드");
        put("창원NC파크",         "창원NC파크");
        put("창원",              "창원NC파크");
        put("수원KT위즈파크",     "수원KT위즈파크");
        put("수원",              "수원KT위즈파크");
        put("대전한화생명볼파크",  "대전한화생명볼파크");
        put("대전",              "대전한화생명볼파크");
        put("고양",              "고양국제야구장");
        put("대전한화생명볼파크",  "대전한화생명볼파크");
        put("대전볼파크",         "대전한화생명볼파크");
        put("인천SSG랜더스필드",  "인천SSG랜더스필드");
        put("인천SSG",           "인천SSG랜더스필드");
        put("수원KT위즈파크",     "수원KT위즈파크");
        put("수원위즈파크",       "수원KT위즈파크");
    }};

    // ── 구장별 구역번호 → seatZone 매핑 ──
    // 형식: 구역번호 시작(포함) ~ 끝(미포함)
    private static final Map<String, int[][]> STADIUM_ZONE_NUMBERS = new HashMap<>() {{
        // 고척스카이돔 (키움 홈구장)
        put("고척스카이돔", new int[][]{
                {101, 115, 0},  // 0=1루
                {401, 410, 0},
                {201, 215, 1},  // 1=3루
                {410, 420, 1},
                {301, 330, 2},  // 2=외야
                {501, 510, 2},
                {115, 120, 3},  // 3=중앙
                {215, 220, 3},
                {120, 135, 4},  // 4=내야
                {220, 235, 4},
        });
        // 잠실야구장 (LG·두산 홈구장)
        put("잠실야구장", new int[][]{
                {101, 115, 0},   // 1루 오렌지석
                {201, 215, 1},   // 3루 네이비석
                {301, 321, 1},   // 3루 외야 응원석 (310블럭 포함 — 네이비 연장)
                {321, 341, 2},   // 외야 그린석
                {115, 121, 3},   // 중앙 테이블
                {215, 221, 3},
                {121, 141, 4},   // 내야
                {221, 241, 4},
        });
        // 광주-기아 챔피언스 필드
        put("광주-기아 챔피언스 필드", new int[][]{
                {101, 112, 0},
                {201, 212, 1},
                {301, 320, 2},
                {112, 116, 3},
                {116, 130, 4},
        });
        // 대구삼성라이온즈파크
        put("대구삼성라이온즈파크", new int[][]{
                {101, 112, 0},
                {201, 212, 1},
                {301, 320, 2},
                {112, 116, 3},
                {116, 130, 4},
        });
        // 사직야구장
        put("사직야구장", new int[][]{
                {101, 110, 0},
                {201, 210, 1},
                {301, 315, 2},
                {110, 114, 3},
                {114, 125, 4},
        });
        // SSG랜더스필드
        put("SSG랜더스필드", new int[][]{
                {101, 112, 0},
                {201, 212, 1},
                {301, 320, 2},
                {112, 116, 3},
                {116, 130, 4},
        });
        // 창원NC파크
        put("창원NC파크", new int[][]{
                {101, 112, 0},
                {201, 212, 1},
                {301, 320, 2},
                {112, 116, 3},
                {116, 130, 4},
        });
        // 수원KT위즈파크
        put("수원KT위즈파크", new int[][]{
                {101, 112, 0},
                {201, 212, 1},
                {301, 320, 2},
                {112, 116, 3},
                {116, 130, 4},
        });
        // 대전한화생명볼파크 (한화 홈)
        put("대전한화생명볼파크", new int[][]{
                {100, 112, 0},  // 1루 (100A, 100B, 101~111)
                {200, 212, 1},  // 3루
                {301, 325, 2},  // 외야
                {112, 116, 3},  // 중앙
                {116, 135, 4},  // 내야
        });
    }};

    private static final String[] ZONE_NAMES = {"1루", "3루", "외야", "중앙", "내야"};

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
            resp.error = "API_KEY_MISSING";
            resp.rawText = "Google Vision API 키가 설정되지 않았습니다.\napplication.properties에 google.vision.api-key=YOUR_KEY 를 추가해주세요.";
            resp.confidence = 0;
            return ResponseEntity.ok(resp);
        }

        try {
            String visionUrl = "https://vision.googleapis.com/v1/images:annotate?key=" + apiKey;

            Map<String, Object> image = Map.of("content", req.imageBase64);
            Map<String, Object> feature = Map.of("type", "TEXT_DETECTION", "maxResults", 1);
            Map<String, Object> annotateReq = Map.of("image", image, "features", List.of(feature));
            Map<String, Object> body = Map.of("requests", List.of(annotateReq));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> visionResp = restTemplate.postForEntity(visionUrl, entity, Map.class);

            String rawText = extractRawText(visionResp.getBody());
            resp.rawText = rawText;
            parseTicketInfo(rawText, resp);

        } catch (Exception e) {
            resp.error = e.getMessage();
            resp.rawText = "Vision API 호출 실패: " + e.getMessage();
            resp.confidence = 0;
        }

        return ResponseEntity.ok(resp);
    }

    @SuppressWarnings("unchecked")
    private String extractRawText(Map body) {
        try {
            List<Map> responses = (List<Map>) body.get("responses");
            if (responses == null || responses.isEmpty()) return "";
            Map resp = responses.get(0);
            Map fta = (Map) resp.get("fullTextAnnotation");
            if (fta != null && fta.get("text") != null) return fta.get("text").toString();
            List<Map> ta = (List<Map>) resp.get("textAnnotations");
            if (ta != null && !ta.isEmpty()) return ta.get(0).get("description").toString();
        } catch (Exception e) { /* ignore */ }
        return "";
    }

    private void parseTicketInfo(String text, OcrResponse resp) {
        if (text == null || text.isBlank()) { resp.confidence = 0; return; }
        int score = 0;

        // ① 날짜 파싱
        Pattern[] datePatterns = {
                Pattern.compile("(20\\d{2})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일"),
                Pattern.compile("(20\\d{2})[.\\-/](\\d{1,2})[.\\-/](\\d{1,2})"),
                Pattern.compile("(\\d{2})[.\\-/](\\d{2})[.\\-/](\\d{2})"),
                Pattern.compile("(\\d{1,2})월\\s*(\\d{1,2})일")
        };
        for (Pattern p : datePatterns) {
            Matcher m = p.matcher(text);
            if (m.find()) {
                String year, month, day;
                if (p.pattern().startsWith("(20")) {
                    year = m.group(1); month = m.group(2); day = m.group(3);
                } else if (p.pattern().contains("월")) {
                    resp.date = m.group(1) + "월 " + m.group(2) + "일";
                    score += 30; break;
                } else {
                    year = "20" + m.group(1); month = m.group(2); day = m.group(3);
                }
                Matcher tm = Pattern.compile("(\\d{2}[:\\s시]\\d{2})").matcher(text);
                String time = tm.find() ? " " + tm.group(1).replace("시 ", ":") : "";
                resp.date = year + "년 " + month + "월 " + day + "일" + time;
                score += 30; break;
            }
        }

        // ② 구장명 파싱: 직접 매칭 ────────────────────────────────
        // ② 구장명 파싱: 직접 매칭 (개선판)
        String noSpaceText = text.replaceAll("\\s+", ""); // 띄어쓰기 전부 제거
        for (Map.Entry<String, String> e : STADIUM_ALIAS.entrySet()) {
            if (noSpaceText.contains(e.getKey().replaceAll("\\s+", ""))) {
                resp.stadium = e.getValue();
                score += 20;
                break;
            }
        }
        // 구장명 텍스트가 없으면 홈팀(첫 번째 팀)으로 역산
        // 지류 티켓처럼 구장명이 인쇄되지 않는 경우 대응
        // ※ 팀명 파싱(③)보다 먼저 실행할 수 없으므로 ③ 이후에도 한 번 더 체크한다

        // ③ 팀명 파싱
        Map<String, String> teamAlias = new LinkedHashMap<>();
        // ★ 복합 표기 먼저 — vs 패턴에서 "KT위즈 vs 삼성라이온즈" 등 정확히 정규화
        teamAlias.put("KIA타이거즈","KIA"); teamAlias.put("기아타이거즈","KIA"); teamAlias.put("KIA TIGERS","KIA");
        teamAlias.put("LG트윈스","LG");     teamAlias.put("LG TWINS","LG");
        teamAlias.put("삼성라이온즈","삼성"); teamAlias.put("SAMSUNG LIONS","삼성"); teamAlias.put("삼성 라이온즈","삼성");
        teamAlias.put("두산베어스","두산");  teamAlias.put("DOOSAN BEARS","두산"); teamAlias.put("두산 베어스","두산");
        teamAlias.put("롯데자이언츠","롯데"); teamAlias.put("LOTTE GIANTS","롯데"); teamAlias.put("롯데 자이언츠","롯데");
        teamAlias.put("SSG랜더스","SSG");   teamAlias.put("SSG LANDERS","SSG"); teamAlias.put("SK와이번스","SSG");
        teamAlias.put("NC다이노스","NC");    teamAlias.put("NC DINOS","NC"); teamAlias.put("NC 다이노스","NC");
        teamAlias.put("KT위즈","KT");       teamAlias.put("KT WIZ","KT"); teamAlias.put("KT 위즈","KT");
        teamAlias.put("한화이글스","한화");  teamAlias.put("한화 이글스","한화"); teamAlias.put("HANWHA EAGLES","한화");
        teamAlias.put("키움히어로즈","키움"); teamAlias.put("키움 히어로즈","키움"); teamAlias.put("KIWOOM HEROES","키움");
        // 단일 표기
        teamAlias.put("TIGERS","KIA"); teamAlias.put("타이거즈","KIA"); teamAlias.put("기아","KIA"); teamAlias.put("KIA","KIA");
        teamAlias.put("TWINS","LG");   teamAlias.put("트윈스","LG");   teamAlias.put("LG","LG");   teamAlias.put("IG","LG");
        teamAlias.put("LIONS","삼성"); teamAlias.put("라이온즈","삼성"); teamAlias.put("삼성","삼성"); teamAlias.put("SAMSUNG","삼성");
        teamAlias.put("BEARS","두산"); teamAlias.put("베어스","두산");   teamAlias.put("두산","두산"); teamAlias.put("DOOSAN","두산");
        teamAlias.put("GIANTS","롯데"); teamAlias.put("자이언츠","롯데"); teamAlias.put("롯데","롯데"); teamAlias.put("LOTTE","롯데");
        teamAlias.put("LANDERS","SSG"); teamAlias.put("랜더스","SSG"); teamAlias.put("SSG","SSG"); teamAlias.put("SK","SSG"); teamAlias.put("SSC","SSG");
        teamAlias.put("DINOS","NC");   teamAlias.put("다이노스","NC"); teamAlias.put("NC","NC");
        teamAlias.put("WIZ","KT");     teamAlias.put("위즈","KT");     teamAlias.put("KT","KT");   teamAlias.put("K7","KT"); teamAlias.put("WYVERNS","KT");
        teamAlias.put("EAGLES","한화"); teamAlias.put("이글스","한화"); teamAlias.put("한화","한화"); teamAlias.put("HANWHA","한화");
        teamAlias.put("HEROES","키움"); teamAlias.put("히어로즈","키움"); teamAlias.put("키움","키움"); teamAlias.put("KIWOOM","키움"); teamAlias.put("넥센","키움");

        String upper = text.toUpperCase();
        Pattern vsPat = Pattern.compile("([A-Z가-힣]+)\\s*(?:VS\\.?|대)\\s*([A-Z가-힣]+)",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        Matcher vsM = vsPat.matcher(upper);
        if (vsM.find()) {
            String t1 = teamAlias.getOrDefault(vsM.group(1).trim(), vsM.group(1).trim());
            String t2 = teamAlias.getOrDefault(vsM.group(2).trim(), vsM.group(2).trim());
            resp.match = t1 + " vs " + t2;
            score += 20;
        } else {
            List<String> found = new ArrayList<>();
            for (Map.Entry<String, String> e : teamAlias.entrySet()) {
                if (upper.contains(e.getKey().toUpperCase()) && !found.contains(e.getValue())) {
                    found.add(e.getValue());
                    if (found.size() == 2) break;
                }
            }
            if (found.size() >= 2)      { resp.match = found.get(0) + " vs " + found.get(1); score += 15; }
            else if (found.size() == 1) { resp.match = found.get(0) + " 경기"; score += 5; }
        }
        // ③-후처리: 구장명 여전히 없으면 홈팀으로 역산 ───────────────────
        if (resp.stadium == null && resp.match != null && resp.match.contains(" vs ")) {
            String homeTeam = resp.match.split(" vs ")[0].trim();
            String derived  = homeTeamToStadium(homeTeam);
            if (derived != null) { resp.stadium = derived; score += 10; }
        }
        // 팀명이 한 개뿐이어도 시도
        if (resp.stadium == null && resp.match != null && resp.match.contains(" 경기")) {
            String homeTeam = resp.match.replace(" 경기", "").trim();
            String derived  = homeTeamToStadium(homeTeam);
            if (derived != null) { resp.stadium = derived; score += 5; }
        }

        // ④ 좌석 파싱 ─────────────────────────────────────────
        // 우선순위: 구역명 포함 → 구역번호만 → 키워드
        Pattern[] seatPatterns = {
                // 1. 구역명 + 구역번호(알파벳 혼합) + 알파벳열 (ex. "중앙 4층지정석 415구역 E열 7", "100B구역 E열")
                Pattern.compile("([1-3]루|외야|중앙|그린|오렌지|네이비|블루|테이블|프리미엄|파울)[^\\n]{0,40}?([A-Z]?\\d{2,3}[A-Z]?)구역\\s+([A-Z]열)\\s*(\\d*)"),
                // 2. 구역명 + 구역번호(알파벳 혼합) + 숫자열 (ex. "외야 그린석 301구역 15열 22번", "100B구역 6열 19번")
                Pattern.compile("([1-3]루|외야|중앙|그린|오렌지|네이비|블루|테이블|프리미엄|파울)[^\\n]{0,40}?([A-Z]?\\d{2,3}[A-Z]?)구역\\s+(\\d+)열\\s*(\\d*)번?"),
                // 3. ★ 색상+블럭 통합 (색상 그룹 별도 캡처 — "1루 네이비석\n310블럭 13열 156번")
                Pattern.compile("(?:([1-3]루|외야|중앙)\\s+)?(네이비|오렌지|그린|블루|익사이팅|레드)석?\\s*\\n?\\s*(\\d{1,3})블[럭록]\\s+(\\d{1,3})열\\s+(\\d{1,3})번?"),
                // 3b. 구역명+블럭 (색상 없는 경우)
                Pattern.compile("([1-3]루|외야|중앙)석?\\s*[^\\n]{0,10}\\n?\\s*(\\d{1,3})블[럭록]\\s+(\\d{1,3})열\\s+(\\d{1,3})번?"),
                // 3c. 블럭만
                Pattern.compile("(\\d{1,3})블[럭록]\\s+(\\d{1,3})열\\s+(\\d{1,3})번?"),
                // 4. 구역명 + 블록코드 (ex. "1루 오렌지 4블록 15열")
                Pattern.compile("([1-3]루|외야|중앙)\\s+([A-Z가-힣]{1,10})\\s+(\\d{1,3}블[럭록])\\s*(\\d{1,3}열)?\\s*(\\d{1,3}번)?", Pattern.CASE_INSENSITIVE),
                // 5. 순수 숫자 구역번호 + 알파벳열 (ex. "404구역 E열 7")
                Pattern.compile("(\\d{3})구역\\s+([A-Z]열)\\s+(\\d+)"),
                // 6. 순수 숫자 구역번호 + 숫자열 (ex. "108구역 15열 7번")
                Pattern.compile("(\\d{3})구역\\s+(\\d+)열\\s+(\\d+)번?"),
                // 7. ★ 알파벳 혼합 구역번호 단독 (ex. "100B구역 6열 19번")
                Pattern.compile("(\\d{2,3}[A-Z])구역\\s+(\\d+)열\\s+(\\d+)번?"),
                // 8. 숫자 번호만 (ex. "109 29열 10번")
                Pattern.compile("(\\d{2,3})\\s+(\\d{1,3})열\\s+(\\d{1,3})번"),
                // 9. 키워드 + 구역번호 조합 (ex. "네이비석 310블럭")
                Pattern.compile("(네이비|오렌지|그린|블루|테이블|프리미엄|익사이팅|파울)석?\\s*[^\\n]{0,20}?(\\d{1,3}블[럭록]|\\d{3}구역)?"),
                // 10. 키워드 단독 (최후순위)
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

        // ⑤ 구역번호 기반 seatZone 보정 ──────────────────────
        // seat에 구역명(1루 등) 없고, 구역번호(404구역)가 있고, 구장명을 알 때
        if (resp.stadium != null && resp.seat != null) {
            boolean hasZoneName = resp.seat.matches(".*([1-3]루|외야|중앙|내야).*");
            if (!hasZoneName) {
                Matcher numM = Pattern.compile("(\\d{3})").matcher(resp.seat);
                if (numM.find()) {
                    int zoneNum = Integer.parseInt(numM.group(1));
                    String resolved = resolveZoneByNumber(resp.stadium, zoneNum);
                    if (resolved != null) {
                        // seat 앞에 구역명 추가 → parseSeatZone()이 바로 인식하도록
                        resp.seat = resolved + " " + resp.seat;
                    }
                }
            }
        }

        resp.confidence = Math.min(score, 100);
    }

    /** 홈팀명 → 구장명 (지류 티켓처럼 구장명 텍스트가 없을 때 역산) */
    private static String homeTeamToStadium(String homeTeam) {
        if (homeTeam == null) return null;
        switch (homeTeam) {
            case "KIA":  return "광주-기아 챔피언스 필드";
            case "LG":
            case "두산": return "잠실야구장";
            case "삼성": return "대구삼성라이온즈파크";
            case "롯데": return "사직야구장";
            case "한화": return "대전한화생명볼파크";
            case "SSG":  return "인천SSG랜더스필드";
            case "NC":   return "창원NC파크";
            case "KT":   return "수원KT위즈파크";
            case "키움": return "고척스카이돔";
            default:     return null;
        }
    }

    /**
     * 구장명 + 구역번호 → seatZone 문자열 반환
     * BattleApiController.parseSeatZone()이 인식할 수 있도록 "1루","3루" 등을 반환
     */
    public static String resolveZoneByNumber(String stadium, int zoneNumber) {
        int[][] ranges = STADIUM_ZONE_NUMBERS.get(stadium);
        if (ranges == null) return null;
        for (int[] r : ranges) {
            if (zoneNumber >= r[0] && zoneNumber < r[1]) {
                return ZONE_NAMES[r[2]];
            }
        }
        return null;
    }
}
