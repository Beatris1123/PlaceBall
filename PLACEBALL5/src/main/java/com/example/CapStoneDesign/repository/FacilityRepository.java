package com.example.CapStoneDesign.repository;

import com.example.CapStoneDesign.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findByStadiumIdAndType(String stadiumId, String type);
}