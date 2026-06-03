package com.example.placeball.controller;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Game;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.*;
import com.example.placeball.service.BattleSchedulerService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/battle")
@RequiredArgsConstructor
public class BattleApiController {

    private final GameRepository           gameRepository;
    private final CheerPointRepository     cheerPointRepository;
    private final BattleRecordRepository   battleRecordRepository;
    private final MemberRepository         memberRepository;
    private final BattleSchedulerService   battleSchedulerService;

    // 좌석 텍스트 → 구역 코드 매핑
    private static final Map<String, String> ZONE_MAP = new LinkedHashMap<>() {{
        put("1루", "1루"); put("3루", "3루"); put("외야", "외야");
        put("중앙", "중앙"); put("내야", "내야");
        put("테이블", "중앙"); put("프리미엄", "중앙");
        put("파울", "내야"); put("블루", "내야"); put("그린", "외야");
    }};

    /** KBO 10개 팀 목록 (랭킹 집계 기준) */
    private static final List<String> KBO_TEAMS = List.of(
            "KIA", "LG", "삼성", "두산", "롯데", "SSG", "NC", "KT", "한화", "키움"
    );

    // ══════════════════════════════════════════════════════════════
    // 1. 오늘 점령전 현황 (홈/원정 총합)
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/today")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getTodayBattle(
            @RequestParam(required = false) String team) {

        LocalDate today = LocalDate.now();
        List<Game> games = gameRepository.findByGameDate(today);
        if (team != null && !team.isBlank()) {
            games = games.stream()
                    .filter(g -> team.equals(g.getHomeTeam()) || team.equals(g.getAwayTeam()))
                    .toList();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Game game : games) result.add(buildBattleStatus(game, today));
        return ResponseEntity.ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    // 2. 특정 날짜 점령전 현황 (실시간 집계)
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/date")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getBattleByDate(
            @RequestParam String date) {

        LocalDate targetDate = LocalDate.parse(date);
        List<Game> games = gameRepository.findByGameDate(targetDate);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Game game : games) result.add(buildBattleStatus(game, targetDate));
        return ResponseEntity.ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    // 3. 확정된 점령전 결과 조회 (battle_record 기반)
    //    GET /api/battle/result?date=2026-05-30
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/result")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getResult(
            @RequestParam String date) {

        LocalDate gameDate = LocalDate.parse(date);
        List<BattleRecord> records = battleRecordRepository.findByGameDate(gameDate);

        List<Map<String, Object>> result = records.stream()
                .map(this::toResultMap)
                .toList();
        return ResponseEntity.ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    // 4. 점령전 팀 랭킹
    //    GET /api/battle/rankings?year=2026[&month=5]
    //    반환: [ { rank, team, played, wins, loses, draws, winPct, totalPts }, ... ]
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/rankings")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getRankings(
            @RequestParam int year,
            @RequestParam(required = false) Integer month) {

        // ── 승·패·경기수·포인트 집계 ──
        Map<String, Long>   winsMap    = toMap(month == null
                ? battleRecordRepository.countWinsByYear(year)
                : battleRecordRepository.countWinsByYearAndMonth(year, month));

        Map<String, Long>   losesMap   = toMap(month == null
                ? battleRecordRepository.countLosesByYear(year)
                : battleRecordRepository.countLosesByYearAndMonth(year, month));

        Map<String, Long>   homePlayed = toMap(month == null
                ? battleRecordRepository.countHomePlayedByYear(year)
                : battleRecordRepository.countHomePlayedByYearAndMonth(year, month));

        Map<String, Long>   awayPlayed = toMap(month == null
                ? battleRecordRepository.countAwayPlayedByYear(year)
                : battleRecordRepository.countAwayPlayedByYearAndMonth(year, month));

        Map<String, Long>   homeCheer  = toMap(month == null
                ? battleRecordRepository.sumHomeCheerPtsByYear(year)
                : battleRecordRepository.sumHomeCheerPtsByYearAndMonth(year, month));

        Map<String, Long>   awayCheer  = toMap(month == null
                ? battleRecordRepository.sumAwayCheerPtsByYear(year)
                : battleRecordRepository.sumAwayCheerPtsByYearAndMonth(year, month));

        // ── 10개 팀 전체 집계 ──
        List<Map<String, Object>> list = new ArrayList<>();

        for (String team : KBO_TEAMS) {
            long wins    = winsMap.getOrDefault(team, 0L);
            long loses   = losesMap.getOrDefault(team, 0L);
            long played  = homePlayed.getOrDefault(team, 0L)
                         + awayPlayed.getOrDefault(team, 0L);
            long draws   = played - wins - loses;
            if (draws < 0) draws = 0;

            long totalPts = homeCheer.getOrDefault(team, 0L)
                          + awayCheer.getOrDefault(team, 0L);

            // 승률: 승 / (승 + 패) — 무승부 제외 KBO식
            // 예) 1승0패 = 1.000 / 1승1패 = .500 / 0승1패 = .000
            String winPct;
            long decidedGames = wins + loses;
            if (decidedGames == 0) {
                winPct = "-";
            } else {
                double pct = (double) wins / decidedGames;
                if (pct == 1.0) {
                    winPct = "1.000";
                } else {
                    winPct = String.format(".%03d", Math.round(pct * 1000));
                }
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("team",     team);
            row.put("played",   played);
            row.put("wins",     wins);
            row.put("loses",    loses);
            row.put("draws",    draws);
            row.put("winPct",   winPct);
            row.put("totalPts", totalPts);
            list.add(row);
        }

        // ── 정렬: 경기 있는 팀 우선 → 승수↓ → 패수↑ → 승률↓ → 포인트↓
        // played=0인 팀은 항상 맨 아래
        list.sort((a, b) -> {
            long playedA = (Long) a.get("played");
            long playedB = (Long) b.get("played");

            // 경기 없는 팀은 맨 뒤
            if (playedA == 0 && playedB  > 0) return  1;
            if (playedB == 0 && playedA  > 0) return -1;
            if (playedA == 0 && playedB == 0) return  0;

            // 1순위: 승수 내림차순
            int cmpWins = Long.compare((Long) b.get("wins"), (Long) a.get("wins"));
            if (cmpWins != 0) return cmpWins;

            // 2순위: 패수 오름차순 (패 적은 팀이 위)
            int cmpLoses = Long.compare((Long) a.get("loses"), (Long) b.get("loses"));
            if (cmpLoses != 0) return cmpLoses;

            // 3순위: 승률 내림차순
            String pA = (String) a.get("winPct");
            String pB = (String) b.get("winPct");
            if (!"-".equals(pA) && !"-".equals(pB)) {
                int cmpPct = Double.compare(
                        Double.parseDouble("0" + pB),
                        Double.parseDouble("0" + pA));
                if (cmpPct != 0) return cmpPct;
            }

            // 4순위: 포인트 내림차순
            return Long.compare((Long) b.get("totalPts"), (Long) a.get("totalPts"));
        });

        // ── 순위 부여 ──
        for (int i = 0; i < list.size(); i++) {
            list.get(i).put("rank", i + 1);
        }

        return ResponseEntity.ok(list);
    }

    // ══════════════════════════════════════════════════════════════
    // 5. 구역별 점령전 현황 (실시간)
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/zones")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getZoneBattle(
            @RequestParam(required = false) String team) {

        LocalDate today = LocalDate.now();
        List<Game> games = gameRepository.findByGameDate(today);
        if (games.isEmpty()) return ResponseEntity.ok(Map.of("zones", Map.of(), "online", Map.of()));

        Game game = games.get(0);
        if (team != null && !team.isBlank()) {
            game = games.stream()
                    .filter(g -> team.equals(g.getHomeTeam()) || team.equals(g.getAwayTeam()))
                    .findFirst().orElse(games.get(0));
        }

        LocalDateTime from = today.atStartOfDay();
        LocalDateTime to   = today.atTime(LocalTime.MAX);
        String homeTeam = game.getHomeTeam();
        String awayTeam = game.getAwayTeam();

        String[] zones = {"1루", "3루", "외야", "중앙", "내야"};
        Map<String, Object> zoneResult = new LinkedHashMap<>();
        for (String zone : zones) {
            int home  = cheerPointRepository.sumByTeamAndPeriodAndZone(homeTeam, from, to, zone);
            int away  = cheerPointRepository.sumByTeamAndPeriodAndZone(awayTeam, from, to, zone);
            int total = home + away;
            int homePct = total == 0 ? 50 : Math.round((float) home / total * 100);
            zoneResult.put(zone, Map.of(
                    "homeTeam", homeTeam, "awayTeam", awayTeam,
                    "homeScore", home, "awayScore", away,
                    "homePct", homePct, "awayPct", 100 - homePct
            ));
        }

        int onlineHome  = cheerPointRepository.sumOnlineByTeamAndPeriod(homeTeam, from, to);
        int onlineAway  = cheerPointRepository.sumOnlineByTeamAndPeriod(awayTeam, from, to);
        int onlineTotal = onlineHome + onlineAway;
        int onlineHomePct = onlineTotal == 0 ? 50 : Math.round((float) onlineHome / onlineTotal * 100);

        return ResponseEntity.ok(Map.of(
                "gameId",   game.getId(),
                "homeTeam", homeTeam, "awayTeam", awayTeam,
                "zones",    zoneResult,
                "online",   Map.of(
                        "homeTeam", homeTeam, "awayTeam", awayTeam,
                        "homeScore", onlineHome, "awayScore", onlineAway,
                        "homePct", onlineHomePct, "awayPct", 100 - onlineHomePct)
        ));
    }

    // ══════════════════════════════════════════════════════════════
    // 6. 티켓 인증 → 점령전 포인트 적립
    // ══════════════════════════════════════════════════════════════
    @PostMapping("/certify")
    @Transactional
    public ResponseEntity<Map<String, Object>> certifyTicket(
            @RequestBody CertifyRequest req) {

        Optional<Member> memberOpt = memberRepository.findByNickname(req.getNickname());
        if (memberOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "로그인이 필요합니다."));
        Member member = memberOpt.get();

        Optional<Game> gameOpt = gameRepository.findById(req.getGameId());
        if (gameOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "경기 정보를 찾을 수 없습니다."));
        Game game = gameOpt.get();

        String favoriteTeam = member.getFavoriteTeam();
        boolean teamInGame = favoriteTeam != null &&
                (favoriteTeam.equals(game.getHomeTeam()) || favoriteTeam.equals(game.getAwayTeam()));
        if (!teamInGame)
            return ResponseEntity.badRequest().body(Map.of("success", false,
                    "message", "응원팀(" + favoriteTeam + ")이 포함된 경기만 인증할 수 있어요."));

        String desc = "티켓 인증: " + game.getGameDate() + " "
                + game.getHomeTeam() + " vs " + game.getAwayTeam();
        if (cheerPointRepository.existsByMemberAndPointTypeAndDescription(member, "BATTLE_TICKET", desc))
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "이미 인증한 경기입니다."));

        String seatZone = parseSeatZone(req.getSeat());

        CheerPoint cp = new CheerPoint();
        cp.setMember(member);
        cp.setPointType("BATTLE_TICKET");
        cp.setAmount(50);
        cp.setDescription(desc);
        cp.setSeatZone(seatZone);
        cp.setGameDate(game.getGameDate());
        cheerPointRepository.save(cp);

        Map<String, Object> battleStatus = buildBattleStatus(game, game.getGameDate());
        battleStatus.put("success", true);
        battleStatus.put("message", "티켓 인증 완료! 점령전 포인트 50점 적립됐습니다.");
        battleStatus.put("earnedPoints", 50);
        battleStatus.put("seatZone", seatZone != null ? seatZone : "");
        return ResponseEntity.ok(battleStatus);
    }

    // ══════════════════════════════════════════════════════════════
    // 7. 오늘 인증 여부 확인
    // ══════════════════════════════════════════════════════════════
    @GetMapping("/certified")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> checkCertified(
            @RequestParam String nickname,
            @RequestParam Long   gameId) {

        Optional<Member> memberOpt = memberRepository.findByNickname(nickname);
        if (memberOpt.isEmpty()) return ResponseEntity.ok(Map.of("certified", false));
        Member member = memberOpt.get();

        Optional<Game> gameOpt = gameRepository.findById(gameId);
        if (gameOpt.isEmpty()) return ResponseEntity.ok(Map.of("certified", false));
        Game game = gameOpt.get();

        String desc = "티켓 인증: " + game.getGameDate() + " "
                + game.getHomeTeam() + " vs " + game.getAwayTeam();
        return ResponseEntity.ok(Map.of("certified",
                cheerPointRepository.existsByMemberAndPointTypeAndDescription(
                        member, "BATTLE_TICKET", desc)));
    }

    // ══════════════════════════════════════════════════════════════
    // 8. 단일 경기 수동 확정 (관리자 / 테스트)
    //    POST /api/battle/finalize  { "gameId": 1 }
    // ══════════════════════════════════════════════════════════════
    @PostMapping("/finalize")
    @Transactional
    public ResponseEntity<Map<String, Object>> finalizeSingle(
            @RequestBody FinalizeRequest req) {

        Optional<Game> gameOpt = gameRepository.findById(req.getGameId());
        if (gameOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "경기를 찾을 수 없습니다."));
        Game game = gameOpt.get();

        if (battleRecordRepository.findByGame(game).isPresent())
            return ResponseEntity.ok(Map.of("success", false, "message", "이미 확정된 경기입니다."));

        int homeCheer = cheerPointRepository.sumTicketByTeamAndGameDate(
                game.getHomeTeam(), game.getGameDate());
        int awayCheer = cheerPointRepository.sumTicketByTeamAndGameDate(
                game.getAwayTeam(), game.getGameDate());

        String cheerWinner, cheerLoser;
        if (homeCheer > awayCheer) {
            cheerWinner = game.getHomeTeam(); cheerLoser = game.getAwayTeam();
        } else if (awayCheer > homeCheer) {
            cheerWinner = game.getAwayTeam(); cheerLoser = game.getHomeTeam();
        } else {
            cheerWinner = "draw"; cheerLoser = null;
        }

        BattleRecord record = new BattleRecord();
        record.setGame(game);
        record.setHomeTeam(game.getHomeTeam());
        record.setAwayTeam(game.getAwayTeam());
        record.setHomeCheerScore(homeCheer);
        record.setAwayCheerScore(awayCheer);
        record.setHomeScore(game.getHomeScore());
        record.setAwayScore(game.getAwayScore());
        record.setCheerWinner(cheerWinner);
        record.setCheerLoser(cheerLoser);
        battleRecordRepository.save(record);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "homeTeam", game.getHomeTeam(), "awayTeam", game.getAwayTeam(),
                "homeCheerScore", homeCheer,    "awayCheerScore", awayCheer,
                "homeScore", game.getHomeScore() != null ? game.getHomeScore() : "-",
                "awayScore", game.getAwayScore() != null ? game.getAwayScore() : "-",
                "cheerWinner", cheerWinner,
                "cheerLoser",  cheerLoser != null ? cheerLoser : ""
        ));
    }

    // ══════════════════════════════════════════════════════════════
    // 9. 날짜 지정 일괄 확정 (관리자)
    //    POST /api/battle/finalize-date  { "date": "2026-05-30" }
    // ══════════════════════════════════════════════════════════════
    @PostMapping("/finalize-date")
    public ResponseEntity<Map<String, Object>> finalizeDate(
            @RequestBody FinalizeDateRequest req) {

        LocalDate date = LocalDate.parse(req.getDate());
        int count = battleSchedulerService.finalizeByDate(date);
        return ResponseEntity.ok(Map.of("success", true, "date", date.toString(), "saved", count));
    }

    // ══════════════════════════════════════════════════════════════
    // 10. 특정 날짜 battle_record 전체 삭제 후 재집계 (테스트용)
    //    DELETE /api/battle/reset-date?date=2026-06-02
    // ══════════════════════════════════════════════════════════════
    @DeleteMapping("/reset-date")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetDate(@RequestParam String date) {
        LocalDate gameDate = LocalDate.parse(date);
        List<BattleRecord> records = battleRecordRepository.findByGameDate(gameDate);
        battleRecordRepository.deleteAll(records);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "date",    date,
                "deleted", records.size()
        ));
    }

    // ══════════════════════════════════════════════════════════════
    // 내부 헬퍼
    // ══════════════════════════════════════════════════════════════

    /** 실시간 응원 현황 빌드 (battle_record 저장 전 집계) */
    private Map<String, Object> buildBattleStatus(Game game, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to   = date.atTime(LocalTime.MAX);

        int homeTicket  = cheerPointRepository.sumByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayTicket  = cheerPointRepository.sumByTeamAndPeriod(game.getAwayTeam(), from, to);
        int homeOnline  = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayOnline  = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getAwayTeam(), from, to);
        int homeTotal   = homeTicket + homeOnline;
        int awayTotal   = awayTicket + awayOnline;
        int total       = homeTotal  + awayTotal;
        int homePct     = total == 0 ? 50 : Math.round((float) homeTotal / total * 100);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("gameId",         game.getId());
        m.put("gameDate",       game.getGameDate().toString());
        m.put("homeTeam",       game.getHomeTeam());
        m.put("awayTeam",       game.getAwayTeam());
        m.put("status",         game.getStatus());
        m.put("venue",          game.getVenue() != null ? game.getVenue() : "");
        m.put("homeCheerScore", homeTotal);
        m.put("awayCheerScore", awayTotal);
        m.put("homePct",        homePct);
        m.put("awayPct",        100 - homePct);
        m.put("homeTicket",     homeTicket);
        m.put("awayTicket",     awayTicket);
        m.put("homeOnline",     homeOnline);
        m.put("awayOnline",     awayOnline);
        return m;
    }

    /** BattleRecord → 프론트 전달용 Map (점령전 결과만, 야구 스코어 제외) */
    private Map<String, Object> toResultMap(BattleRecord br) {
        Game g = br.getGame();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("gameId",         g.getId());
        m.put("gameDate",       g.getGameDate().toString());
        m.put("homeTeam",       br.getHomeTeam());
        m.put("awayTeam",       br.getAwayTeam());
        m.put("homeCheerScore", br.getHomeCheerScore());
        m.put("awayCheerScore", br.getAwayCheerScore());
        m.put("cheerWinner",    br.getCheerWinner());
        m.put("cheerLoser",     br.getCheerLoser() != null ? br.getCheerLoser() : "");
        m.put("finalized",      true);
        return m;
    }

    /** List<Object[]> { teamName, count/sum } → Map */
    private Map<String, Long> toMap(List<Object[]> rows) {
        Map<String, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] == null) continue;
            map.put((String) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private String parseSeatZone(String seat) {
        if (seat == null || seat.isBlank()) return null;
        for (Map.Entry<String, String> e : ZONE_MAP.entrySet()) {
            if (seat.contains(e.getKey())) return e.getValue();
        }
        return null;
    }
}

// ── DTO ──────────────────────────────────────────────────────────
@Data class CertifyRequest {
    private String nickname;
    private Long   gameId;
    private String stadium;
    private String seat;
}

@Data class FinalizeRequest {
    private Long gameId;
}

@Data class FinalizeDateRequest {
    private String date;   // "2026-05-30"
}
