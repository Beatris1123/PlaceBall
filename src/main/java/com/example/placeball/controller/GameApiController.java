package com.example.placeball.controller;

import com.example.placeball.domain.Game;
import com.example.placeball.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameApiController {

    private final GameRepository gameRepository;

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

    @GetMapping("/today")
    public List<Game> getTodayGames() {
        return gameRepository.findByGameDateOrderByGameTimeAsc(LocalDate.now());
    }

    @GetMapping("/date")
    public List<Game> getGamesByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return gameRepository.findByGameDateOrderByGameTime(date);
    }

    @GetMapping("/live")
    public List<Game> getLiveGames() {
        return gameRepository.findByYearAndMonthAndStatus(
                LocalDate.now().getYear(),
                LocalDate.now().getMonthValue(),
                "live"
        );
    }

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
            String venue    = resolveVenue(g.getHomeTeam(), g.getVenue());
            String label    = g.getGameDate() + " " +
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
     * 팀 순위 계산 (종료된 경기 기준 승/패/무 집계)
     * GET /api/games/standings?year=2026
     */
    @GetMapping("/standings")
    public List<Map<String, Object>> getStandings(
            @RequestParam(required = false) Integer year
    ) {
        int y = (year != null) ? year : LocalDate.now().getYear();

        List<Game> finished = gameRepository.findAll().stream()
                .filter(g -> g.getGameDate().getYear() == y
                        && "finished".equals(g.getStatus())
                        && g.getHomeScore() != null
                        && g.getAwayScore() != null)
                .toList();

        String[] teams = {"KIA","LG","삼성","두산","롯데","SSG","NC","KT","한화","키움"};
        Map<String, int[]> stats = new java.util.LinkedHashMap<>();
        for (String t : teams) stats.put(t, new int[]{0, 0, 0}); // [wins, losses, draws]

        for (Game g : finished) {
            String home = g.getHomeTeam();
            String away = g.getAwayTeam();
            int hs = g.getHomeScore();
            int as = g.getAwayScore();

            if (!stats.containsKey(home)) stats.put(home, new int[]{0,0,0});
            if (!stats.containsKey(away)) stats.put(away, new int[]{0,0,0});

            if (hs > as) {
                stats.get(home)[0]++; stats.get(away)[1]++;
            } else if (hs < as) {
                stats.get(home)[1]++; stats.get(away)[0]++;
            } else {
                stats.get(home)[2]++; stats.get(away)[2]++;
            }
        }

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map.Entry<String, int[]> e : stats.entrySet()) {
            int w = e.getValue()[0], l = e.getValue()[1], d = e.getValue()[2];
            int games = w + l + d;
            double pct = (w + l) == 0 ? 0.0 : (double) w / (w + l);
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("team",   e.getKey());
            m.put("wins",   w);
            m.put("losses", l);
            m.put("draws",  d);
            m.put("games",  games);
            m.put("pct",    (w + l) == 0 ? "-" : String.format(".%03d", (int)(pct * 1000)));
            result.add(m);
        }

        result.sort((a, b) -> {
            double pa = parsePct(a.get("pct")), pb = parsePct(b.get("pct"));
            return Double.compare(pb, pa);
        });
        for (int i = 0; i < result.size(); i++) result.get(i).put("rank", i + 1);

        return result;
    }

    @GetMapping("/match")
    public Map<String, Object> matchGame(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String hint
    ) {
        List<Game> dayGames = gameRepository.findByGameDateOrderByGameTime(date);
        if (dayGames.isEmpty()) return Map.of("found", false, "message", "해당 날짜에 경기가 없습니다.");
        if (hint == null || hint.isBlank()) return buildMatchResult(dayGames.get(0));

        Map<String, String> normalizeMap = buildNormalizeMap();
        String normalizedHint = normalizeTeamHint(hint.toUpperCase(), normalizeMap);

        for (Game g : dayGames) {
            if (g.getHomeTeam().equals(normalizedHint) || g.getAwayTeam().equals(normalizedHint))
                return buildMatchResult(g);
        }
        for (Game g : dayGames) {
            String home = g.getHomeTeam().toUpperCase(), away = g.getAwayTeam().toUpperCase();
            if (home.contains(normalizedHint) || away.contains(normalizedHint)
                    || normalizedHint.contains(home) || normalizedHint.contains(away))
                return buildMatchResult(g);
        }
        for (Game g : dayGames) {
            if (fuzzyMatch(hint, g.getHomeTeam()) || fuzzyMatch(hint, g.getAwayTeam()))
                return buildMatchResult(g);
        }

        Map<String, Object> result = new java.util.HashMap<>(buildMatchResult(dayGames.get(0)));
        result.put("fallback", true);
        result.put("message", "팀명 매칭 실패 — 당일 첫 경기로 대체합니다.");
        return result;
    }

    @GetMapping("/{id}")
    public Game getGame(@PathVariable Long id) {
        return gameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Game not found: " + id));
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────

    private String resolveVenue(String homeTeam, String crawledVenue) {
        Map<String, String> stadiumMap = Map.of(
            "KIA","광주기아챔피언스필드","LG","잠실야구장","두산","잠실야구장",
            "삼성","대구삼성라이온즈파크","롯데","사직야구장","한화","대전한화생명볼파크",
            "SSG","인천SSG랜더스필드","NC","창원NC파크","KT","수원KT위즈파크","키움","고척스카이돔"
        );
        if (homeTeam != null && stadiumMap.containsKey(homeTeam)) return stadiumMap.get(homeTeam);
        return (crawledVenue != null && !crawledVenue.isBlank()) ? crawledVenue : "미정";
    }

    private Map<String, Object> buildMatchResult(Game g) {
        return Map.of(
            "found",     true,
            "id",        g.getId(),
            "date",      g.getGameDate().toString(),
            "time",      g.getGameTime() != null ? g.getGameTime().toString().substring(0, 5) : "",
            "homeTeam",  g.getHomeTeam(),
            "awayTeam",  g.getAwayTeam(),
            "homeScore", g.getHomeScore() != null ? g.getHomeScore() : -1,
            "awayScore", g.getAwayScore() != null ? g.getAwayScore() : -1,
            "venue",     resolveVenue(g.getHomeTeam(), g.getVenue()),
            "status",    g.getStatus() != null ? g.getStatus() : ""
        );
    }

    private double parsePct(Object pct) {
        if (pct == null || "-".equals(pct)) return 0.0;
        try { return Double.parseDouble(pct.toString()); } catch (Exception e) { return 0.0; }
    }

    private String normalizeTeamHint(String hint, Map<String, String> map) {
        for (Map.Entry<String, String> e : map.entrySet()) {
            if (hint.contains(e.getKey())) return e.getValue();
        }
        return hint;
    }

    private Map<String, String> buildNormalizeMap() {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        m.put("KIA","KIA"); m.put("기아","KIA"); m.put("TIGERS","KIA"); m.put("타이거즈","KIA");
        m.put("LG","LG");   m.put("TWINS","LG"); m.put("트윈스","LG"); m.put("IG","LG");
        m.put("삼성","삼성"); m.put("SAMSUNG","삼성"); m.put("LIONS","삼성");
        m.put("두산","두산"); m.put("DOOSAN","두산"); m.put("BEARS","두산");
        m.put("롯데","롯데"); m.put("LOTTE","롯데"); m.put("GIANTS","롯데");
        m.put("SSG","SSG");  m.put("SK","SSG"); m.put("LANDERS","SSG"); m.put("SSC","SSG");
        m.put("NC","NC");    m.put("DINOS","NC"); m.put("다이노스","NC");
        m.put("KT","KT");    m.put("위즈","KT"); m.put("K7","KT");
        m.put("한화","한화"); m.put("HANWHA","한화"); m.put("EAGLES","한화");
        m.put("키움","키움"); m.put("KIWOOM","키움"); m.put("HEROES","키움"); m.put("넥센","키움");
        return m;
    }

    private boolean fuzzyMatch(String ocrHint, String teamName) {
        String h = ocrHint.toUpperCase().replaceAll("\\s", "");
        String t = teamName.toUpperCase().replaceAll("\\s", "");
        if (h.length() >= 2 && t.contains(h.substring(0, 2))) return true;
        if (t.length() >= 2 && h.contains(t.substring(0, 2))) return true;
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
}
