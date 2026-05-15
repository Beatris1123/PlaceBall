package com.example.placeball.repository;

import com.example.placeball.domain.CommunityPost;
import com.example.placeball.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    // 전체 목록 (페이징)
    Page<CommunityPost> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 탭별 목록 (페이징)
    Page<CommunityPost> findByTabOrderByCreatedAtDesc(String tab, Pageable pageable);

    // 추천순
    Page<CommunityPost> findAllByOrderByLikesDescCreatedAtDesc(Pageable pageable);
    Page<CommunityPost> findByTabOrderByLikesDescCreatedAtDesc(String tab, Pageable pageable);

    // 조회순
    Page<CommunityPost> findAllByOrderByViewsDescCreatedAtDesc(Pageable pageable);
    Page<CommunityPost> findByTabOrderByViewsDescCreatedAtDesc(String tab, Pageable pageable);

    // 검색 (제목 또는 작성자 닉네임)
    @Query("SELECT p FROM CommunityPost p WHERE " +
            "(:tab IS NULL OR :tab = 'all' OR p.tab = :tab) AND " +
            "(LOWER(p.title) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.member.nickname) LIKE LOWER(CONCAT('%',:q,'%'))) " +
            "ORDER BY p.createdAt DESC")
    Page<CommunityPost> search(@Param("tab") String tab, @Param("q") String q, Pageable pageable);

    // 탭별 개수
    long countByTab(String tab);

    // 인증샷(photo) 탭 최신 N개 (index.html 인증샷 카드용)
    List<CommunityPost> findTop12ByTabOrderByCreatedAtDesc(String tab);

    // 특정 회원의 글
    List<CommunityPost> findByMemberOrderByCreatedAtDesc(Member member);
}