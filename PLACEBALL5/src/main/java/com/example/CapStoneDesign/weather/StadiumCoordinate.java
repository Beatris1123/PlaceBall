package com.example.CapStoneDesign.weather;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * KBO 구장별 위경도 + 기상청 격자 좌표
 *
 * 기상청 단기예보 API는 위경도를 직접 쓰지 않고
 * 자체 격자(nx, ny) 좌표로 변환해야 합니다.
 * 사전 계산된 값을 enum으로 관리합니다.
 */
@Getter
@RequiredArgsConstructor
public enum StadiumCoordinate {

    JAMSIL   ("jamsil",   "잠실 야구장",          37.5122, 127.0719, 61, 126),
    GOCHEOK  ("gocheok",  "고척 스카이돔",         37.4982, 126.8670, 58, 125),
    INCHEON  ("incheon",  "SSG 랜더스필드",        37.4370, 126.6933, 55, 124),
    SUWON    ("suwon",    "수원 KT 위즈파크",      37.2997, 127.0097, 60, 121),
    GWANGJU  ("gwangju",  "광주 챔피언스필드",      35.1681, 126.8848, 58,  74),
    DAEGU    ("daegu",    "대구 라이온즈파크",      35.8412, 128.6818, 89,  90),
    SAJIK    ("sajik",    "사직 야구장",           35.1940, 129.0615, 98,  76),
    CHANGWON ("changwon", "창원 NC파크",           35.2224, 128.5823, 91,  77),
    DAEJEON  ("daejeon",  "대전 이글스파크",        36.3171, 127.4292, 67, 100);

    private final String id;
    private final String name;
    private final double lat;
    private final double lng;
    private final int nx;   // 기상청 격자 X
    private final int ny;   // 기상청 격자 Y

    public static StadiumCoordinate findById(String id) {
        for (StadiumCoordinate s : values()) {
            if (s.id.equals(id)) return s;
        }
        return JAMSIL; // 기본값
    }
}
