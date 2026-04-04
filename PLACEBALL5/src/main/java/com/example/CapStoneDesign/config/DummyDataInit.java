package com.example.CapStoneDesign.config;

import com.example.CapStoneDesign.entity.Facility;
import com.example.CapStoneDesign.repository.FacilityRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DummyDataInit {

    private final FacilityRepository repository;

    @PostConstruct
    public void init() {
        // 기존 겹친 데이터 다 날리기!
        repository.deleteAll();

        // ⚾ A존 (3루 내야 출입구 ~ 중앙 - 사진상 우측 상단 둥근 라인)
        createFacility("jamsil", "food", "[A01] 카페희다", 37.5125, 127.0733);
        createFacility("jamsil", "food", "[A02] BHC", 37.5127, 127.0731);
        createFacility("jamsil", "food", "[A03] 잠실원샷/미스터피자", 37.5129, 127.0729);
        createFacility("jamsil", "store", "[A04] GS25", 37.5131, 127.0726);
        createFacility("jamsil", "food", "[A05] 한식/분식", 37.5132, 127.0723);
        createFacility("jamsil", "food", "[A06] 프랭크버거", 37.5133, 127.0719);
        createFacility("jamsil", "food", "[A07] BBQ", 37.5133, 127.0715);

        // ⚾ B존 (1루 내야 출입구 - 사진상 좌측 상단 둥근 라인)
        createFacility("jamsil", "store", "[B08] 홈런마트", 37.5131, 127.0710);
        createFacility("jamsil", "food", "[B09] 꼬꼬닭", 37.5129, 127.0707);
        createFacility("jamsil", "food", "[B10] KFC", 37.5126, 127.0704);
        createFacility("jamsil", "food", "[B11] 광장식당", 37.5123, 127.0702);
        createFacility("jamsil", "food", "[B12] 도미노피자", 37.5120, 127.0701);

        // ⚾ C존 (외야 출입구 ~ 1매표소 - 사진상 좌측 하단 둥근 라인)
        createFacility("jamsil", "store", "[C13] GS25", 37.5116, 127.0703);
        createFacility("jamsil", "food", "[C14] 명인만두", 37.5113, 127.0705);
        createFacility("jamsil", "food", "[C15] BBQ", 37.5110, 127.0708);
        createFacility("jamsil", "food", "[C16] 프랭크버거", 37.5108, 127.0712);
        createFacility("jamsil", "food", "[C17] 명인만두", 37.5107, 127.0716);
        createFacility("jamsil", "food", "[C18] 수내닭꼬치", 37.5107, 127.0720);

        System.out.println("잠실야구장 18개 편의시설 예쁘게 둥글게 세팅 완료!");
    }

    private void createFacility(String stadiumId, String type, String title, double lat, double lng) {
        Facility f = new Facility();
        f.setStadiumId(stadiumId);
        f.setType(type);
        f.setTitle(title);
        f.setLat(lat);
        f.setLng(lng);
        repository.save(f);
    }
}