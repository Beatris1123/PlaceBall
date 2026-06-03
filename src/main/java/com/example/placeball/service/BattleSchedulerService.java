package com.example.placeball.service;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.Game;
import com.example.placeball.repository.BattleRecordRepository;
import com.example.placeball.repository.CheerPointRepository;
import com.example.placeball.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 점령전 자동 결과 확정 스케줄러.
 *
 * ▸ 매일 00:00 (자정) — 전날 경기를 대상으로 결과 자동 저장
 *   - status = "finished" or "canceled", 또는 날짜가 이미 지난 경기
 *   - BattleRecord가 없는 경기에 대해서만 저장 (중복 방지)
 *
 * ▸ 저장 데이터:
 *   homeTeam / awayTeam  — Game에서 복사
 *   homeCheerScore       — 홈팀 BATTLE_TICKET 포인트 합산 (gameDate 기준)
 *   awayCheerScore       — 원정팀 BATTLE_TICKET 포인트 합산 (gameDate 기준)
 *   homeScore / awayScore — Game의 실제 야구 스코어 (없으면 null)
 *   cheerWinner          — 포인트 높은 팀명 | "draw" | "cancel"
 *   cheerLoser           — 포인트 낮은 팀명 | null (draw/cancel)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BattleSchedulerService {

    private final GameRepository         gameRepository;
    private final BattleRecordRepository battleRecordRepository;
    private final CheerPointRepository   cheerPointRepository;

    // ── 매일 00:00 자동 실행 ──────────────────────────────────────────
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void autoFinalizePreviousDay() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("[BattleScheduler] {} 점령전 자동 확정 시작", yesterday);
        int count = finalizeByDate(yesterday);
        log.info("[BattleScheduler] {} 완료 — {}경기 저장", yesterday, count);
    }

    /**
     * 특정 날짜의 모든 경기 점령전을 확정한다.
     * (수동 호출 / 테스트 / 관리자 API에서 사용)
     *
     * @return 새로 저장된 BattleRecord 수
     */
    @Transactional
    public int finalizeByDate(LocalDate date) {
        List<Game> games = gameRepository.findByGameDate(date);
        int count = 0;

        for (Game game : games) {

            // 이미 저장된 경기는 건너뜀
            if (battleRecordRepository.findByGame(game).isPresent()) {
                log.debug("[BattleScheduler] 이미 확정: gameId={}", game.getId());
                continue;
            }

            String status = game.getStatus();

            if ("canceled".equals(status)) {
                saveCanceled(game);
                count++;
                log.info("[BattleScheduler] 취소 처리: gameId={}", game.getId());
                continue;
            }

            // finished 이거나, 날짜가 지난 경기이거나, 오늘 날짜 수동 확정 모두 허용
            // (status가 upcoming/live여도 수동 호출 시에는 저장)
            if ("finished".equals(status)
                    || date.isBefore(LocalDate.now())
                    || date.isEqual(LocalDate.now())) {
                saveFinished(game, date);
                count++;
                log.info("[BattleScheduler] 확정 저장: gameId={} date={} status={}", game.getId(), date, status);
            }
        }
        return count;
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────────────

    /** 취소 경기: cheerWinner = "cancel", 점수 0 */
    private void saveCanceled(Game game) {
        BattleRecord record = new BattleRecord();
        record.setGame(game);
        record.setHomeTeam(game.getHomeTeam());
        record.setAwayTeam(game.getAwayTeam());
        record.setHomeCheerScore(0);
        record.setAwayCheerScore(0);
        record.setHomeScore(game.getHomeScore());   // null 가능
        record.setAwayScore(game.getAwayScore());   // null 가능
        record.setCheerWinner("cancel");
        record.setCheerLoser(null);
        battleRecordRepository.save(record);
    }

    /** 종료 경기: 응원 포인트 집계 → 승자/패자 결정 */
    private void saveFinished(Game game, LocalDate gameDate) {
        java.time.LocalDateTime from = gameDate.atStartOfDay();
        java.time.LocalDateTime to   = gameDate.atTime(java.time.LocalTime.MAX);

        // 티켓 인증 포인트 (gameDate 기준)
        int homeTicket = cheerPointRepository.sumTicketByTeamAndGameDate(game.getHomeTeam(), gameDate);
        int awayTicket = cheerPointRepository.sumTicketByTeamAndGameDate(game.getAwayTeam(), gameDate);

        // 온라인 활동 포인트 (earnedAt 기준 — 당일 활동)
        int homeOnline = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayOnline = cheerPointRepository.sumOnlineByTeamAndPeriod(game.getAwayTeam(), from, to);

        // BATTLE_TICKET이 gameDate=null로 저장된 경우 earnedAt 기간 집계로 폴백
        int homeTicketFallback = cheerPointRepository.sumByTeamAndPeriod(game.getHomeTeam(), from, to);
        int awayTicketFallback = cheerPointRepository.sumByTeamAndPeriod(game.getAwayTeam(), from, to);

        // 최종 합산: gameDate 집계 우선, 없으면 earnedAt 집계 사용
        int homeCheer = Math.max(homeTicket, homeTicketFallback) + homeOnline;
        int awayCheer = Math.max(awayTicket, awayTicketFallback) + awayOnline;

        log.info("[BattleScheduler] 집계결과 home={} away={} (homeTicket={}, homeFallback={}, homeOnline={})",
                homeCheer, awayCheer, homeTicket, homeTicketFallback, homeOnline);

        String cheerWinner;
        String cheerLoser;

        if (homeCheer > awayCheer) {
            cheerWinner = game.getHomeTeam();
            cheerLoser  = game.getAwayTeam();
        } else if (awayCheer > homeCheer) {
            cheerWinner = game.getAwayTeam();
            cheerLoser  = game.getHomeTeam();
        } else {
            cheerWinner = "draw";
            cheerLoser  = null;
        }

        BattleRecord record = new BattleRecord();
        record.setGame(game);
        record.setHomeTeam(game.getHomeTeam());
        record.setAwayTeam(game.getAwayTeam());
        record.setHomeCheerScore(homeCheer);
        record.setAwayCheerScore(awayCheer);
        record.setHomeScore(game.getHomeScore());   // 실제 야구 스코어
        record.setAwayScore(game.getAwayScore());   // 실제 야구 스코어
        record.setCheerWinner(cheerWinner);
        record.setCheerLoser(cheerLoser);
        battleRecordRepository.save(record);
    }
}
