package com.example.placeball.controller;

import com.example.placeball.domain.Game;
import com.example.placeball.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameApiController {

    private final GameRepository gameRepository;

    /**
     * 월별 경기 목록 조회
     * GET /api/games?year=2025&month=5
     * GET /api/games?year=2025&month=5&team=KIA
     * GET /api/games?year=2025&month=5&status=upcoming
     */
    @GetMapping
    public List<Game> getGames(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String status
    ) {
        if (team != null && !team.isBlank()) {
            return gameRepository.findByYearAndMonthAndTeam(year, month, team);
        }
        if (status != null && !status.isBlank()) {
            return gameRepository.findByYearAndMonthAndStatus(year, month, status);
        }
        return gameRepository.findByYearAndMonth(year, month);
    }

    /**
     * 오늘 경기 조회
     * GET /api/games/today
     */
    @GetMapping("/today")
    public List<Game> getTodayGames() {
        return gameRepository.findByGameDateOrderByGameTimeAsc(LocalDate.now());
    }

    /**
     * 특정 날짜 경기 조회
     * GET /api/games/date?date=2025-05-02
     */
    @GetMapping("/date")
    public List<Game> getGamesByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return gameRepository.findByGameDateOrderByGameTime(date);
    }

    /**
     * LIVE 경기 목록 조회 (프론트 폴링용)
     * GET /api/games/live
     */
    @GetMapping("/live")
    public List<Game> getLiveGames() {
        return gameRepository.findByYearAndMonthAndStatus(
                LocalDate.now().getYear(),
                LocalDate.now().getMonthValue(),
                "live"
        );
    }

    /**
     * 최애팀 기준 경기 목록 조회 (다이어리 기록용)
     * GET /api/games/my-team?team=KIA&year=2026&month=5
     * 해당 팀이 홈 또는 원정으로 참가한 경기만 반환, 최신순
     */
    @GetMapping("/my-team")
    public List<Map<String, Object>> getMyTeamGames(
            @RequestParam String team,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        int y = (year  != null) ? year  : LocalDate.now().getYear();
        int m = (month != null) ? month : LocalDate.now().getMonthValue();

        List<Game> games = gameRepository.findByYearAndMonthAndTeam(y, m, team);

        return games.stream().map(g -> {
            String opponent = g.getHomeTeam().equals(team) ? g.getAwayTeam() : g.getHomeTeam();
            boolean isHome  = g.getHomeTeam().equals(team);

            // 홈팀 기준으로 구장 자동 매핑 (크롤러가 venue를 못 가져와도 정확하게 표시)
            String venue = resolveVenue(g.getHomeTeam(), g.getVenue());

            String label = g.getGameDate() + " " +
                (g.getGameTime() != null ? g.getGameTime().toString().substring(0,5) : "") +
                " | " + team + (isHome ? " (홈)" : " (원정)") + " vs " + opponent +
                " | " + venue;

            return Map.<String, Object>of(
                "id",       g.getId(),
                "date",     g.getGameDate().toString(),
                "time",     g.getGameTime() != null ? g.getGameTime().toString().substring(0,5) : "",
                "homeTeam", g.getHomeTeam(),
                "awayTeam", g.getAwayTeam(),
                "homeScore",g.getHomeScore() != null ? g.getHomeScore() : -1,
                "awayScore",g.getAwayScore() != null ? g.getAwayScore() : -1,
                "venue",    venue,
                "status",   g.getStatus() != null ? g.getStatus() : "",
                "label",    label
            );
        }).toList();
    }

    /**
     * 홈팀명으로 구장을 자동 결정
     * 크롤러가 venue를 가져오지 못할 경우를 대비해 항상 홈팀 기준으로 매핑
     */
    private String resolveVenue(String homeTeam, String crawledVenue) {
        // 홈팀 → 구장 고정 매핑 테이블
        Map<String, String> stadiumMap = Map.of(
            "KIA",  "광주기아챔피언스필드",
            "LG",   "잠실야구장",
            "두산",  "잠실야구장",
            "삼성",  "대구삼성라이온즈파크",
            "롯데",  "사직야구장",
            "한화",  "대전한화생명볼파크",
            "SSG",  "인천SSG랜더스필드",
            "NC",   "창원NC파크",
            "KT",   "수원KT위즈파크",
            "키움",  "고척스카이돔"
        );

        // 홈팀으로 매핑된 구장이 있으면 그걸 우선 사용
        if (homeTeam != null && stadiumMap.containsKey(homeTeam)) {
            return stadiumMap.get(homeTeam);
        }

        // 없으면 크롤러가 가져온 값 사용 (빈 문자열이면 "미정")
        return (crawledVenue != null && !crawledVenue.isBlank()) ? crawledVenue : "미정";
    }

    /**
     * 날짜 + 팀 힌트로 경기 매칭 조회 (OCR 결과 보정용)
     * GET /api/games/match?date=2024-06-05&hint=KIA
     * → 해당 날짜에 hint 팀이 포함된 경기 반환
     * hint가 불완전해도 퍼지 매칭으로 찾아줌
     */
    @GetMapping("/match")
    public Map<String, Object> matchGame(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String hint
    ) {
        List<Game> dayGames = gameRepository.findByGameDateOrderByGameTime(date);

        if (dayGames.isEmpty()) {
            return Map.of("found", false, "message", "해당 날짜에 경기가 없습니다.");
        }

        // hint가 없으면 첫 번째 경기 반환
        if (hint == null || hint.isBlank()) {
            Game g = dayGames.get(0);
            return buildMatchResult(g);
        }

        // 팀명 정규화 맵 (OCR 오인식 포함)
        Map<String, String> normalizeMap = buildNormalizeMap();
        String normalizedHint = normalizeTeamHint(hint.toUpperCase(), normalizeMap);

        // 1순위: 정확히 일치하는 팀이 있는 경기
        for (Game g : dayGames) {
            if (g.getHomeTeam().equals(normalizedHint) || g.getAwayTeam().equals(normalizedHint)) {
                return buildMatchResult(g);
            }
        }

        // 2순위: 팀명 일부 포함 (부분 매칭)
        for (Game g : dayGames) {
            String home = g.getHomeTeam().toUpperCase();
            String away = g.getAwayTeam().toUpperCase();
            if (home.contains(normalizedHint) || away.contains(normalizedHint)
                    || normalizedHint.contains(home) || normalizedHint.contains(away)) {
                return buildMatchResult(g);
            }
        }

        // 3순위: 영문 약칭 / 오인식 패턴 퍼지 매칭
        for (Game g : dayGames) {
            if (fuzzyMatch(hint, g.getHomeTeam()) || fuzzyMatch(hint, g.getAwayTeam())) {
                return buildMatchResult(g);
            }
        }

        // 매칭 실패 → 그냥 첫 번째 경기 반환 (fallback)
        Game g = dayGames.get(0);
        Map<String, Object> result = new java.util.HashMap<>(buildMatchResult(g));
        result.put("fallback", true);
        result.put("message", "팀명 매칭 실패 — 당일 첫 경기로 대체합니다.");
        return result;
    }

    private Map<String, Object> buildMatchResult(Game g) {
        String venue = resolveVenue(g.getHomeTeam(), g.getVenue());
        return Map.of(
            "found",     true,
            "id",        g.getId(),
            "date",      g.getGameDate().toString(),
            "time",      g.getGameTime() != null ? g.getGameTime().toString().substring(0, 5) : "",
            "homeTeam",  g.getHomeTeam(),
            "awayTeam",  g.getAwayTeam(),
            "homeScore", g.getHomeScore() != null ? g.getHomeScore() : -1,
            "awayScore", g.getAwayScore() != null ? g.getAwayScore() : -1,
            "venue",     venue,
            "status",    g.getStatus() != null ? g.getStatus() : ""
        );
    }

    /** OCR 힌트에서 팀명 정규화 */
    private String normalizeTeamHint(String hint, Map<String, String> map) {
        for (Map.Entry<String, String> e : map.entrySet()) {
            if (hint.contains(e.getKey())) return e.getValue();
        }
        return hint;
    }

    /** 팀명 정규화 맵 — OCR 오인식 패턴 포함 */
    private Map<String, String> buildNormalizeMap() {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        // KIA
        m.put("KIA", "KIA"); m.put("기아", "KIA"); m.put("TIGERS", "KIA"); m.put("타이거즈", "KIA");
        m.put("GIA", "KIA"); m.put("KI A", "KIA"); m.put("KIA타이거즈", "KIA");
        // LG
        m.put("LG", "LG"); m.put("TWINS", "LG"); m.put("트윈스", "LG");
        m.put("IG", "LG"); m.put("1G", "LG"); m.put("LG트윈스", "LG");
        // 삼성
        m.put("삼성", "삼성"); m.put("SAMSUNG", "삼성"); m.put("LIONS", "삼성"); m.put("라이온즈", "삼성");
        m.put("삼성라이온즈", "삼성");
        // 두산
        m.put("두산", "두산"); m.put("DOOSAN", "두산"); m.put("BEARS", "두산"); m.put("베어스", "두산");
        m.put("두산베어스", "두산");
        // 롯데
        m.put("롯데", "롯데"); m.put("LOTTE", "롯데"); m.put("GIANTS", "롯데"); m.put("자이언츠", "롯데");
        m.put("롯데자이언츠", "롯데"); m.put("GL", "롯데"); m.put("G1", "롯데");
        // SSG
        m.put("SSG", "SSG"); m.put("SK", "SSG"); m.put("LANDERS", "SSG"); m.put("랜더스", "SSG");
        m.put("SSG랜더스", "SSG"); m.put("SSC", "SSG"); m.put("55G", "SSG");
        // NC
        m.put("NC", "NC"); m.put("DINOS", "NC"); m.put("다이노스", "NC"); m.put("NC다이노스", "NC");
        m.put("NC다", "NC");
        // KT
        m.put("KT", "KT"); m.put("WYVERNS", "KT"); m.put("위즈", "KT"); m.put("KT위즈", "KT");
        m.put("K7", "KT"); m.put("KI", "KT");
        // 한화
        m.put("한화", "한화"); m.put("HANWHA", "한화"); m.put("EAGLES", "한화"); m.put("이글스", "한화");
        m.put("한화이글스", "한화"); m.put("하화", "한화");
        // 키움
        m.put("키움", "키움"); m.put("KIWOOM", "키움"); m.put("HEROES", "키움"); m.put("히어로즈", "키움");
        m.put("키움히어로즈", "키움"); m.put("넥센", "키움"); m.put("71움", "키움");
        return m;
    }

    /** 퍼지 매칭 — OCR 오인식 자음/모음 유사도 */
    private boolean fuzzyMatch(String ocrHint, String teamName) {
        String h = ocrHint.toUpperCase().replaceAll("\\s", "");
        String t = teamName.toUpperCase().replaceAll("\\s", "");
        // 팀명 2글자 이상 포함
        if (h.length() >= 2 && t.contains(h.substring(0, 2))) return true;
        if (t.length() >= 2 && h.contains(t.substring(0, 2))) return true;
        // 레벤슈타인 거리 2 이하
        return levenshtein(h, t) <= 2;
    }

    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++)
            for (int j = 1; j <= b.length(); j++)
                dp[i][j] = a.charAt(i-1) == b.charAt(j-1)
                    ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j-1], Math.min(dp[i-1][j], dp[i][j-1]));
        return dp[a.length()][b.length()];
    }
    @GetMapping("/{id}")
    public Game getGame(@PathVariable Long id) {
        return gameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Game not found: " + id));
    }
}
