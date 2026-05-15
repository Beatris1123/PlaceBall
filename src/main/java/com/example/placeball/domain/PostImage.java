package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "post_image")
@Getter @Setter
public class PostImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    // Base64 data URL (data:image/jpeg;base64,...)
    @Column(name = "image_data", columnDefinition = "MEDIUMTEXT", nullable = false)
    private String imageData;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}