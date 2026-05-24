package com.example.placeball.controller;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.Game;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.*;
import com.example.placeball.service.CheerPointService;
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
    private final CheerPointService      cheerPointService;

    private static final Map<String, String> ZONE_MAP = new LinkedHashMap<>() {{
        put("1루", "1루"); put("3루", "3루"); put("외야", "외야");
        put("중앙", "중앙"); put("내야", "내야"); put("테이블", "중앙");
        put("프리미엄", "중앙"); put("파울", "내야"); put("블루", "내야"); put("그린", "외야");
    }};

    // ── 1. 오늘 점령전 현황 ──
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
        for (Game game : games) result.add(buildBattleStatus(game));
        return ResponseEntity.ok(result);
    }

    // ── 2. 특정 날짜 점령전 ──
    @GetMapping("/date")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getBattleByDate(
            @RequestParam String date) {

        LocalDate targetDate = LocalDate.parse(date);
        List<Game> games = gameRepository.findByGameDate(targetDate);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Game game : games) result.add(buildBattleStatus(game));
        return ResponseEntity.ok(result);
    }

    // ── 3. 구역별 점령전 현황 (gameDate 기준 집계) ──
    @GetMapping("/zones")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getZoneBattle(
            @RequestParam(required = false) String team) {

        LocalDate today = LocalDate.now();
        List<Game> games = gameRepository.findByGameDate(today);
        if (games.isEmpty())
            return ResponseEntity.ok(Map.of("zones", Map.of(), "online", Map.of()));

        Game game = games.get(0);
        if (team != null && !team.isBlank()) {
            game = games.stream()
                    .filter(g -> team.equals(g.getHomeTeam()) || team.equals(g.getAwayTeam()))
                    .findFirst().orElse(games.get(0));
        }

        LocalDate gameDate = game.getGameDate();
        String homeTeam = game.getHomeTeam();
        String awayTeam = game.getAwayTeam();

        // 구역별 집계 — gameDate 기준이므로 사전 인증 티켓도 경기 당일에 정확히 반영
        String[] zones = {"1루", "3루", "외야", "중앙", "내야"};
        Map<String, Object> zoneResult = new LinkedHashMap<>();
        for (String zone : zones) {
            int home = cheerPointRepository.sumByTeamAndGameDateAndZone(homeTeam, gameDate, zone);
            int away = cheerPointRepository.sumByTeamAndGameDateAndZone(awayTeam, gameDate, zone);
            int total = home + away;
            int homePct = total == 0 ? 50 : Math.round((float) home / total * 100);
            zoneResult.put(zone, Map.of(
                    "homeTeam", homeTeam, "awayTeam", awayTeam,
                    "homeScore", home, "awayScore", away,
                    "homePct", homePct, "awayPct", 100 - homePct
            ));
        }

        int onlineHome = cheerPointRepository.sumOnlineByTeamAndGameDate(homeTeam, gameDate);
        int onlineAway = cheerPointRepository.sumOnlineByTeamAndGameDate(awayTeam, gameDate);
        int onlineTotal = onlineHome + onlineAway;
        int onlineHomePct = onlineTotal == 0 ? 50 : Math.round((float) onlineHome / onlineTotal * 100);

        return ResponseEntity.ok(Map.of(
                "gameId",   game.getId(),
                "gameDate", gameDate.toString(),
                "homeTeam", homeTeam,
                "awayTeam", awayTeam,
                "zones",    zoneResult,
                "online",   Map.of(
                        "homeTeam", homeTeam, "awayTeam", awayTeam,
                        "homeScore", onlineHome, "awayScore", onlineAway,
                        "homePct", onlineHomePct, "awayPct", 100 - onlineHomePct)
        ));
    }

    // ── 4. 티켓 인증 → 점령전 포인트 적립 ──
    // 미래 티켓 사전 인증 허용. gameDate = 티켓의 실제 경기 날짜.
    @PostMapping("/certify")
    @Transactional
    public ResponseEntity<Map<String, Object>> certifyTicket(
            @RequestBody CertifyRequest req) {

        Optional<Member> memberOpt = memberRepository.findByNickname(req.getNickname());
        if (memberOpt.isEmpty())
            return badReq("로그인이 필요합니다.");
        Member member = memberOpt.get();

        Optional<Game> gameOpt = gameRepository.findById(req.getGameId());
        if (gameOpt.isEmpty())
            return badReq("경기 정보를 찾을 수 없습니다.");
        Game game = gameOpt.get();

        // 응원팀이 해당 경기에 포함되는지만 검증 (날짜 제한 없음 — B안)
        String favoriteTeam = member.getFavoriteTeam();
        boolean teamInGame = favoriteTeam != null &&
                (favoriteTeam.equals(game.getHomeTeam()) || favoriteTeam.equals(game.getAwayTeam()));
        if (!teamInGame)
            return badReq("응원팀(" + favoriteTeam + ")이 포함된 경기만 인증할 수 있어요.");

        String desc = "티켓 인증: " + game.getGameDate() + " "
                + game.getHomeTeam() + " vs " + game.getAwayTeam();
        String seatZone = parseSeatZone(req.getSeat());
        LocalDate gameDate = game.getGameDate(); // 티켓의 실제 경기 날짜

        int earned = cheerPointService.awardTicket(member, 50, desc, seatZone, gameDate);
        if (earned == 0)
            return badReq("이미 인증한 경기입니다.");

        Map<String, Object> status = buildBattleStatus(game);
        status.put("success", true);
        status.put("message", gameDate.equals(LocalDate.now())
                ? "티켓 인증 완료! 점령전 포인트 50점 적립됐습니다."
                : "사전 인증 완료! " + gameDate + " 경기 당일에 점령전이 활성화됩니다.");
        status.put("earnedPoints", 50);
        status.put("seatZone", seatZone != null ? seatZone : "");
        status.put("gameDate", gameDate.toString());
        status.put("isPreCertified", !gameDate.equals(LocalDate.now()));

        return ResponseEntity.ok(status);
    }

    // ── 5. 인증 여부 확인 ──
    @GetMapping("/certified")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> checkCertified(
            @RequestParam String nickname,
            @RequestParam Long gameId) {

        Optional<Member> memberOpt = memberRepository.findByNickname(nickname);
        if (memberOpt.isEmpty()) return ResponseEntity.ok(Map.of("certified", false));
        Member member = memberOpt.get();

        Optional<Game> gameOpt = gameRepository.findById(gameId);
        if (gameOpt.isEmpty()) return ResponseEntity.ok(Map.of("certified", false));
        Game game = gameOpt.get();

        String desc = "티켓 인증: " + game.getGameDate() + " "
                + game.getHomeTeam() + " vs " + game.getAwayTeam();
        boolean certified = cheerPointRepository
                .existsByMemberAndPointTypeAndDescription(member, "BATTLE_TICKET", desc);

        return ResponseEntity.ok(Map.of("certified", certified));
    }

    // ── 6. 점령전 결과 확정 ──
    @PostMapping("/finalize")
    @Transactional
    public ResponseEntity<Map<String, Object>> finalizeBattle(
            @RequestBody FinalizeRequest req) {

        Optional<Game> gameOpt = gameRepository.findById(req.getGameId());
        if (gameOpt.isEmpty())
            return badReq("경기를 찾을 수 없습니다.");
        Game game = gameOpt.get();

        if (battleRecordRepository.findByGame(game).isPresent())
            return ResponseEntity.ok(Map.of("success", false, "message", "이미 결과가 저장된 경기입니다."));

        // gameDate 기준 집계
        LocalDate gameDate = game.getGameDate();
        int homeScore = cheerPointRepository.sumTicketByTeamAndGameDate(game.getHomeTeam(), gameDate);
        int awayScore = cheerPointRepository.sumTicketByTeamAndGameDate(game.getAwayTeam(), gameDate);
        String cheerWinner = homeScore > awayScore ? game.getHomeTeam()
                : awayScore > homeScore ? game.getAwayTeam() : "draw";

        BattleRecord record = new BattleRecord();
        record.setGame(game);
        record.setHomeCheerScore(homeScore);
        record.setAwayCheerScore(awayScore);
        record.setCheerWinner(cheerWinner);
        battleRecordRepository.save(record);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "homeTeam", game.getHomeTeam(), "awayTeam", game.getAwayTeam(),
                "homeScore", homeScore, "awayScore", awayScore, "cheerWinner", cheerWinner
        ));
    }

    // ── 내부 헬퍼 ──
    private Map<String, Object> buildBattleStatus(Game game) {
        LocalDate gameDate = game.getGameDate();

        int homeTicket  = cheerPointRepository.sumTicketByTeamAndGameDate(game.getHomeTeam(), gameDate);
        int awayTicket  = cheerPointRepository.sumTicketByTeamAndGameDate(game.getAwayTeam(), gameDate);
        int homeOnline  = cheerPointRepository.sumOnlineByTeamAndGameDate(game.getHomeTeam(), gameDate);
        int awayOnline  = cheerPointRepository.sumOnlineByTeamAndGameDate(game.getAwayTeam(), gameDate);
        int homeTotal   = homeTicket + homeOnline;
        int awayTotal   = awayTicket + awayOnline;
        int total       = homeTotal + awayTotal;
        int homePct     = total == 0 ? 50 : Math.round((float) homeTotal / total * 100);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("gameId",         game.getId());
        m.put("gameDate",       gameDate.toString());
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

    private String parseSeatZone(String seat) {
        if (seat == null || seat.isBlank()) return null;
        for (Map.Entry<String, String> e : ZONE_MAP.entrySet()) {
            if (seat.contains(e.getKey())) return e.getValue();
        }
        return null;
    }

    private ResponseEntity<Map<String, Object>> badReq(String msg) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", msg));
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
