package com.example.placeball.service;

import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.CheerPointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 포인트 적립 단일 진입점.
 *
 * [B안 설계]
 * - 티켓은 미래 날짜로 사전 인증 가능. gameDate = 티켓의 실제 경기 날짜.
 * - 커뮤니티 활동(POST_WRITE 등)은 "오늘 이후 가장 가까운 인증 티켓"을 찾아
 *   해당 경기의 gameDate와 seatZone을 자동 연결.
 * - 구역별·경기별 집계는 earnedAt(행위 시점)이 아닌 gameDate 기준으로 수행.
 */
@Service
@RequiredArgsConstructor
public class CheerPointService {

    private final CheerPointRepository cheerPointRepository;

    // ── 1. 커뮤니티 활동 포인트 적립 ─────────────────────────────────────────
    /**
     * @param oncePerDay true면 오늘 해당 pointType을 이미 적립한 경우 0 반환
     * @return 실제 적립 포인트 (0이면 미적립)
     */
    @Transactional
    public int award(Member member, String pointType, int amount,
                     String description, boolean oncePerDay) {
        if (oncePerDay && alreadyEarnedToday(member, pointType)) return 0;

        // 오늘 이후 가장 가까운 인증 티켓 조회 → gameDate, seatZone 연결
        ActiveTicket ticket = findActiveTicket(member);

        save(member, pointType, amount, description,
                ticket != null ? ticket.seatZone() : null,
                ticket != null ? ticket.gameDate() : null);
        return amount;
    }

    /** oncePerDay=false 오버로드 */
    @Transactional
    public int award(Member member, String pointType, int amount, String description) {
        return award(member, pointType, amount, description, false);
    }

    // ── 2. 티켓 인증 포인트 적립 ─────────────────────────────────────────────
    /**
     * gameDate = 티켓의 실제 경기 날짜 (오늘 이후 어느 날이든 가능).
     * 중복 인증은 description(경기 식별 문자열) 기준으로 차단.
     *
     * @return 실제 적립 포인트 (0이면 이미 인증한 경기)
     */
    @Transactional
    public int awardTicket(Member member, int amount, String description,
                           String seatZone, LocalDate gameDate) {
        if (cheerPointRepository.existsByMemberAndPointTypeAndDescription(
                member, "BATTLE_TICKET", description)) return 0;
        save(member, "BATTLE_TICKET", amount, description, seatZone, gameDate);
        return amount;
    }

    // ── 3. 차감 ──────────────────────────────────────────────────────────────
    @Transactional
    public void deduct(Member member, String pointType, int amount, String description) {
        save(member, pointType, -Math.abs(amount), description, null, null);
    }

    // ── 4. 유틸 ──────────────────────────────────────────────────────────────
    public boolean alreadyEarnedToday(Member member, String pointType) {
        return cheerPointRepository.existsTodayByMemberAndType(
                member, pointType, LocalDate.now());
    }

    /**
     * 오늘 이후 가장 가까운 인증 티켓을 반환.
     * - 오늘 경기 티켓이 있으면 그것이 우선.
     * - 없으면 미래 날짜 중 가장 가까운 것 (사전 인증).
     * - 둘 다 없으면 null → seatZone, gameDate 모두 null로 저장.
     */
    private ActiveTicket findActiveTicket(Member member) {
        List<CheerPoint> tickets = cheerPointRepository
                .findUpcomingTickets(member, LocalDate.now());
        if (tickets.isEmpty()) return null;
        CheerPoint cp = tickets.get(0); // gameDate ASC 정렬 → 가장 가까운 것
        return new ActiveTicket(cp.getSeatZone(), cp.getGameDate());
    }

    private void save(Member member, String pointType, int amount,
                      String description, String seatZone, LocalDate gameDate) {
        CheerPoint cp = new CheerPoint();
        cp.setMember(member);
        cp.setPointType(pointType);
        cp.setAmount(amount);
        cp.setDescription(description);
        cp.setSeatZone(seatZone);
        cp.setGameDate(gameDate);
        cheerPointRepository.save(cp);
    }

    private record ActiveTicket(String seatZone, LocalDate gameDate) {}
}
