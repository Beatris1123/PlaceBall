package com.example.CapStoneDesign.controller;

import com.example.CapStoneDesign.entity.Facility;
import com.example.CapStoneDesign.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/facilities")
public class FacilityApiController {

    private final FacilityRepository facilityRepository;

    @GetMapping
    public List<Facility> getFacilities(
            @RequestParam String stadiumId,
            @RequestParam String type) {

        return facilityRepository.findByStadiumIdAndType(stadiumId, type);
    }
}