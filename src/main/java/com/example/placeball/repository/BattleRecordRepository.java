package com.example.placeball.repository;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.Game;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BattleRecordRepository extends JpaRepository<BattleRecord, Long> {

    // 특정 회원의 전체 점령전 참여 기록 (최신순)
    List<BattleRecord> findByMemberOrderByParticipatedAtDesc(Member member);

    // 특정 경기의 점령전 참여 기록
    List<BattleRecord> findByGame(Game game);

    // 특정 경기 + 구역별 참여 기록 (구역 점령 비율 계산용)
    List<BattleRecord> findByGameAndZone(Game game, String zone);

    // 특정 회원이 이미 특정 경기에 참여했는지 확인 (중복 참여 방지)
    boolean existsByMemberAndGame(Member member, Game game);

    // 특정 회원의 승인된 참여 기록 수
    long countByMemberAndStatus(Member member, String status);
}
