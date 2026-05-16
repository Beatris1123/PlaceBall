package com.example.placeball.repository;

import com.example.placeball.domain.Comment;
import com.example.placeball.domain.CommunityPost;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostOrderByCreatedAtAsc(CommunityPost post);
    long countByPost(CommunityPost post);
    void deleteAllByPost(CommunityPost post);
    List<Comment> findByMember(Member member);
}