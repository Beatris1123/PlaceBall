package com.example.placeball.repository;

import com.example.placeball.domain.Diary;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    // 특정 회원의 전체 다이어리 (최신순)
    List<Diary> findByMemberOrderByGameDateDesc(Member member);

    // 특정 회원의 특정 날짜 다이어리
    List<Diary> findByMemberAndGameDate(Member member, LocalDate gameDate);

    // 특정 회원의 특정 월 다이어리
    List<Diary> findByMemberAndGameDateBetweenOrderByGameDateAsc(
            Member member, LocalDate start, LocalDate end);

    // 특정 회원의 결과별 개수 (승/패/무 통계용)
    long countByMemberAndResult(Member member, String result);
}
