package com.example.CapStoneDesign.weather;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 기상청 단기예보 API 연동 서비스
 *
 * API: https://apihub.kma.go.kr 또는 data.go.kr 버전
 * 인증키: application.properties → weather.api.key
 * 캐시: 5분간 동일 구장 데이터 재사용 (API 호출 최소화)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    @Value("${weather.api.key:}")
    private String apiKey;

    private static final String BASE_URL =
        "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    // ─── 간단한 인메모리 캐시 (구장ID → WeatherInfo) ───
    private final Map<String, CachedWeather> cache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000L; // 5분

    // ─── 날씨 아이콘 매핑 (기상청 하늘 상태 코드) ───
    // SKY: 1=맑음, 3=구름많음, 4=흐림
    // PTY: 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기
    private static final Map<String, String> SKY_EMOJI = Map.of(
        "1", "☀️", "3", "⛅", "4", "☁️"
    );
    private static final Map<String, String> PTY_EMOJI = Map.of(
        "1", "🌧️", "2", "🌨️", "3", "❄️", "4", "🌦️"
    );

    /**
     * 구장 ID로 초단기 예보를 조회합니다.
     * API 키가 없거나 오류 발생 시 목업 데이터를 반환합니다.
     */
    public WeatherInfo getWeather(String stadiumId) {
        // 캐시 확인
        CachedWeather cached = cache.get(stadiumId);
        if (cached != null && !cached.isExpired()) {
            return cached.data;
        }

        StadiumCoordinate coord = StadiumCoordinate.findById(stadiumId);

        // API 키가 없으면 목업 데이터 반환
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[Weather] API 키 없음 → 목업 데이터 반환 (stadiumId={})", stadiumId);
            return mockWeather(coord);
        }

        try {
            WeatherInfo info = callApi(coord);
            cache.put(stadiumId, new CachedWeather(info));
            return info;
        } catch (Exception e) {
            log.error("[Weather] API 호출 실패: {}", e.getMessage());
            return mockWeather(coord);
        }
    }

    // ────────────────────────────────────────────────
    //  기상청 초단기예보 API 호출
    // ────────────────────────────────────────────────
    private WeatherInfo callApi(StadiumCoordinate coord) throws Exception {
        LocalDateTime now = LocalDateTime.now();
        // 초단기예보: 매 시 30분 발표 → 현재 시 기준
        String baseDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        // 초단기는 발표 10분 후 조회 가능 → 현재 시각의 정시 사용
        int hour = now.getMinute() < 30 ? now.getHour() - 1 : now.getHour();
        if (hour < 0) hour = 23;
        String baseTime = String.format("%02d30", hour);

        String url = UriComponentsBuilder.fromHttpUrl(BASE_URL)
            .queryParam("serviceKey", apiKey)
            .queryParam("pageNo", 1)
            .queryParam("numOfRows", 60)
            .queryParam("dataType", "JSON")
            .queryParam("base_date", baseDate)
            .queryParam("base_time", baseTime)
            .queryParam("nx", coord.getNx())
            .queryParam("ny", coord.getNy())
            .build(false)
            .toUriString();

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() != 200) {
            throw new RuntimeException("HTTP " + res.statusCode());
        }

        return parseResponse(res.body(), coord);
    }

    // ────────────────────────────────────────────────
    //  API 응답 파싱
    // ────────────────────────────────────────────────
    private WeatherInfo parseResponse(String json, StadiumCoordinate coord) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode items = root.path("response").path("body").path("items").path("item");

        String temp = "--";
        String sky  = "1";
        String pty  = "0";
        String wind = "--";
        String humid = "--";

        if (items.isArray()) {
            for (JsonNode item : items) {
                String cat = item.path("category").asText();
                String val = item.path("fcstValue").asText();
                switch (cat) {
                    case "T1H"  -> temp  = val;   // 기온
                    case "SKY"  -> sky   = val;   // 하늘 상태
                    case "PTY"  -> pty   = val;   // 강수 형태
                    case "WSD"  -> wind  = val;   // 풍속
                    case "REH"  -> humid = val;   // 습도
                }
            }
        }

        // 날씨 아이콘 결정
        String icon = !"0".equals(pty) ?
            PTY_EMOJI.getOrDefault(pty, "🌧️") :
            SKY_EMOJI.getOrDefault(sky, "☀️");

        String skyDesc = getSkyDesc(sky, pty);

        return new WeatherInfo(
            coord.getId(),
            coord.getName(),
            temp + "°C",
            icon,
            skyDesc,
            wind + "m/s",
            humid + "%",
            coord.getLat(),
            coord.getLng(),
            false  // isMock
        );
    }

    // ────────────────────────────────────────────────
    //  목업 날씨 데이터 (API 키 없을 때)
    // ────────────────────────────────────────────────
    private WeatherInfo mockWeather(StadiumCoordinate coord) {
        int hour = LocalDateTime.now().getHour();
        // 시간대별 날씨 시뮬레이션
        String[] icons  = {"☀️","☀️","⛅","⛅","☁️","🌦️","☀️","☀️"};
        String[] descs  = {"맑음","맑음","구름많음","구름많음","흐림","소나기","맑음","맑음"};
        String[] temps  = {"22","23","24","25","24","22","20","19"};
        int idx = (hour / 3) % icons.length;

        return new WeatherInfo(
            coord.getId(),
            coord.getName(),
            temps[idx] + "°C",
            icons[idx],
            descs[idx],
            "2.5m/s",
            "55%",
            coord.getLat(),
            coord.getLng(),
            true  // isMock
        );
    }

    private String getSkyDesc(String sky, String pty) {
        if (!"0".equals(pty)) {
            return switch (pty) {
                case "1" -> "비";
                case "2" -> "비/눈";
                case "3" -> "눈";
                case "4" -> "소나기";
                default  -> "강수";
            };
        }
        return switch (sky) {
            case "1" -> "맑음";
            case "3" -> "구름많음";
            case "4" -> "흐림";
            default  -> "맑음";
        };
    }

    // ────────────────────────────────────────────────
    //  캐시 래퍼
    // ────────────────────────────────────────────────
    private static class CachedWeather {
        final WeatherInfo data;
        final long timestamp;

        CachedWeather(WeatherInfo data) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }

    // ────────────────────────────────────────────────
    //  날씨 정보 DTO
    // ────────────────────────────────────────────────
    public record WeatherInfo(
        String stadiumId,
        String stadiumName,
        String temp,
        String icon,
        String desc,
        String wind,
        String humidity,
        double lat,
        double lng,
        boolean isMock
    ) {}
}
