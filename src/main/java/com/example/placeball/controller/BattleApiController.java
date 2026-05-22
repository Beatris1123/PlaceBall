package com.example.placeball.controller;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Game;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.*;
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

    private final GameRepository         gameRepository;
    private final CheerPointRepository   cheerPointRepository;
    private final BattleRecordRepository battleRecordRepository;
    private final MemberRepository       memberRepository;

    // 좌석 텍스트 → 구역 코드 매핑
    private static final Map<String, String> ZONE_MAP = new LinkedHashMap<>() {{
        put("1루", "1루");
        put("3루", "3루");
        put("외야", "외야");
        put("중앙", "중앙");
        put("내야", "내야");
        put("테이블", "중앙");
        put("프리미엄", "중앙");
        put("파울", "내야");
        put("블루", "내야");
        put("그린", "외야");
    }};

    // ══════════════════════════════════════════════
    // 1. 오늘 점령전 현황 (홈/원정 총합)
    // ══════════════════════════════════════════════
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

    // ══════════════════════════════════════════════
    // 2. 특정 날짜 점령전
    // ══════════════════════════════════════════════
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

    // ══════════════════════════════════════════════
    // 3. 구역별 점령전 현황
    //    GET /api/battle/zones?team=KIA
    //    반환: { zones: { "1루": {home:x,away:y,homePct,awayPct}, ... }, online: {...} }
    // ══════════════════════════════════════════════
    @GetMapping("/zones")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getZoneBattle(
            @RequestParam(required = false) String team) {

        LocalDate today = LocalDate.now();
        List<Game> games = gameRepository.findByGameDate(today);
        if (games.isEmpty()) return ResponseEntity.ok(Map.of("zones", Map.of(), "online", Map.of()));

        // 내 팀 경기 우선
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

        // 구역별 집계
        String[] zones = {"1루", "3루", "외야", "중앙", "내야"};
        Map<String, Object> zoneResult = new LinkedHashMap<>();
        for (String zone : zones) {
            int home = cheerPointRepository.sumByTeamAndPeriodAndZone(homeTeam, from, to, zone);
            int away = cheerPointRepository.sumByTeamAndPeriodAndZone(awayTeam, from, to, zone);
            int total = home + away;
            int homePct = total == 0 ? 50 : Math.round((float) home / total * 100);
            zoneResult.put(zone, Map.of(
                    "homeTeam", homeTeam, "awayTeam", awayTeam,
                    "homeScore", home, "awayScore", away,
                    "homePct", homePct, "awayPct", 100 - homePct
            ));
        }

        // 온라인 활동 집계
        int onlineHome = cheerPointRepository.sumOnlineByTeamAndPeriod(homeTeam, from, to);
        int onlineAway = cheerPointRepository.sumOnlineByTeamAndPeriod(awayTeam, from, to);
        int onlineTotal = onlineHome + onlineAway;
        int onlineHomePct = onlineTotal == 0 ? 50 : Math.round((float) onlineHome / onlineTotal * 100);

        Map<String, Object> onlineResult = Map.of(
                "homeTeam", homeTeam, "awayTeam", awayTeam,
                "homeScore", onlineHome, "awayScore", onlineAway,
                "homePct", onlineHomePct, "awayPct", 100 - onlineHomePct
        );

        return ResponseEntity.ok(Map.of(
                "gameId",   game.getId(),
                "homeTeam", homeTeam,
                "awayTeam", awayTeam,
                "zones",    zoneResult,
                "online",   onlineResult
        ));
    }

    // ══════════════════════════════════════════════
    // 4. 티켓 인증 → 점령전 포인트 적립
    // ══════════════════════════════════════════════
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

        String desc = "티켓 인증: " + game.getGameDate() + " " + game.getHomeTeam() + " vs " + game.getAwayTeam();
        if (cheerPointRepository.existsByMemberAndPointTypeAndDescription(member, "BATTLE_TICKET", desc))
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "이미 인증한 경기입니다."));

        // 좌석 → 구역 코드 추출
        String seatZone = parseSeatZone(req.getSeat());

        CheerPoint cp = new CheerPoint();
        cp.setMember(member);
        cp.setPointType("BATTLE_TICKET");
        cp.setAmount(50);
        cp.setDescription(desc);
        cp.setSeatZone(seatZone);
        cheerPointRepository.save(cp);

        // 전체 현황 반환
        Map<String, Object> battleStatus = buildBattleStatus(game, game.getGameDate());
        battleStatus.put("success", true);
        battleStatus.put("message", "티켓 인증 완료! 점령전 포인트 50점 적립됐습니다.");
        battleStatus.put("earnedPoints", 50);
        battleStatus.put("seatZone", seatZone != null ? seatZone : "");

        return ResponseEntity.ok(battleStatus);
    }

    // ══════════════════════════════════════════════
    // 5. 점령전 최종 결과 저장
    // ══════════════════════════════════════════════
    @PostMapping("/finalize")
    @Transactional
    public ResponseEntity<Map<String, Object>> finalizeBattle(
            @RequestBody FinalizeRequest req) {

        Optional<Game> gameOpt = gameRepository.findById(req.getGameId());
        if (gameOpt.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "경기를 찾을 수 없습니다."));
        Game game = gameOpt.get();

        Optional<BattleRecord> existing = battleRecordRepository.findByGame(game);
        if (existing.isPresent())
            return ResponseEntity.ok(Map.of("success", false, "message", "이미 결과가 저장된 경기입니다."));

        LocalDateTime from = game.getGameDate().atStartOfDay();
        LocalDateTime to   = game.getGameDate().atTime(LocalTime.MAX);

        int homeScore = cheerPointRepository.sumByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayScore = cheerPointRepository.sumByTeamAndPeriod(game.getAwayTeam(), from, to);
        String cheerWinner = homeScore > awayScore ? game.getHomeTeam()
                           : awayScore > homeScore ? game.getAwayTeam() : "draw";

        BattleRecord record = new BattleRecord();
        record.setGame(game);
        record.setHomeCheerScore(homeScore);
        record.setAwayCheerScore(awayScore);
        record.setCheerWinner(cheerWinner);
        battleRecordRepository.save(record);

        return ResponseEntity.ok(Map.of(
                "success", true, "homeTeam", game.getHomeTeam(), "awayTeam", game.getAwayTeam(),
                "homeScore", homeScore, "awayScore", awayScore, "cheerWinner", cheerWinner
        ));
    }

    // ══════════════════════════════════════════════
    // 내부 헬퍼
    // ══════════════════════════════════════════════
    private Map<String, Object> buildBattleStatus(Game game, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to   = date.atTime(LocalTime.MAX);

        // ── 티켓 인증 포인트 합산 ──
        int homeScore = cheerPointRepository.sumByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayScore = cheerPointRepository.sumByTeamAndPeriod(game.getAwayTeam(), from, to);

        // ── 온라인 활동 포인트 합산 ──
        int homeOnline = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayOnline = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getAwayTeam(), from, to);

        // ── 총합 ──
        int homeTotalScore = homeScore + homeOnline;
        int awayTotalScore = awayScore + awayOnline;
        int total     = homeTotalScore + awayTotalScore;
        int homePct   = total == 0 ? 50 : Math.round((float) homeTotalScore / total * 100);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("gameId",          game.getId());
        m.put("gameDate",        game.getGameDate().toString());
        m.put("homeTeam",        game.getHomeTeam());
        m.put("awayTeam",        game.getAwayTeam());
        m.put("status",          game.getStatus());
        m.put("venue",           game.getVenue() != null ? game.getVenue() : "");
        m.put("homeCheerScore",  homeTotalScore);
        m.put("awayCheerScore",  awayTotalScore);
        m.put("homePct",         homePct);
        m.put("awayPct",         100 - homePct);
        m.put("homeTicket",      homeScore);
        m.put("awayTicket",      awayScore);
        m.put("homeOnline",      homeOnline);
        m.put("awayOnline",      awayOnline);
        return m;
    }

    // 좌석 문자열에서 구역 코드 추출
    private String parseSeatZone(String seat) {
        if (seat == null || seat.isBlank()) return null;
        for (Map.Entry<String, String> e : ZONE_MAP.entrySet()) {
            if (seat.contains(e.getKey())) return e.getValue();
        }
        return null;
    }
}

@Data class CertifyRequest {
    private String nickname;
    private Long   gameId;
    private String stadium;
    private String seat;
}

@Data class FinalizeRequest {
    private Long gameId;
}
