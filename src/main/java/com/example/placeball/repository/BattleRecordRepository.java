package com.example.placeball.repository;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BattleRecordRepository extends JpaRepository<BattleRecord, Long> {

    // 경기로 점령전 결과 조회
    Optional<BattleRecord> findByGame(Game game);

    // 경기 ID로 점령전 결과 조회
    Optional<BattleRecord> findByGameId(Long gameId);
}
