package com.example.placeball.repository;

import com.example.placeball.domain.CommunityPost;
import com.example.placeball.domain.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {
    List<PostImage> findByPostOrderBySortOrderAsc(CommunityPost post);
    void deleteAllByPost(CommunityPost post);
}