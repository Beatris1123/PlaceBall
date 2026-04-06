package com.example.CapStoneDesign.weather;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 날씨 API 컨트롤러
 * GET /api/weather?stadiumId=jamsil
 */
@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping
    public ResponseEntity<WeatherService.WeatherInfo> getWeather(HttpServletRequest req) {
        String stadiumId = req.getParameter("stadiumId");
        if (stadiumId == null || stadiumId.isBlank()) stadiumId = "jamsil";
        return ResponseEntity.ok(weatherService.getWeather(stadiumId));
    }

    @GetMapping("/all")
    public ResponseEntity<WeatherService.WeatherInfo[]> getAllWeather() {
        StadiumCoordinate[] stadiums = StadiumCoordinate.values();
        WeatherService.WeatherInfo[] result = new WeatherService.WeatherInfo[stadiums.length];
        for (int i = 0; i < stadiums.length; i++) {
            result[i] = weatherService.getWeather(stadiums[i].getId());
        }
        return ResponseEntity.ok(result);
    }
}
