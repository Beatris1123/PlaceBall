package com.example.placeball.controller;

import com.example.placeball.domain.Diary;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.DiaryRepository;
import com.example.placeball.repository.MemberRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/diary")
@RequiredArgsConstructor
public class DiaryApiController {

    private final DiaryRepository diaryRepository;
    private final MemberRepository memberRepository;

    // ── 회원 조회 헬퍼 ──
    private Optional<Member> findMember(String nickname) {
        return memberRepository.findByNickname(nickname);
    }

    // ── 1. 기록 저장 ──
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveDiary(
            @RequestBody DiaryRequest req) {

        Optional<Member> memberOpt = findMember(req.getNickname());
        if (memberOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "회원을 찾을 수 없습니다."));
        }

        Member member = memberOpt.get();

        // ── 최애팀 검증: 홈팀 또는 원정팀이 본인 최애팀이어야 함 ──
        String favoriteTeam = member.getFavoriteTeam();
        if (favoriteTeam != null && !favoriteTeam.isBlank()) {
            boolean myTeamInGame = favoriteTeam.equals(req.getHome())
                                || favoriteTeam.equals(req.getAway());
            if (!myTeamInGame) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "응원팀(" + favoriteTeam + ")이 포함된 경기만 기록할 수 있어요."
                ));
            }
        }

        Diary diary = new Diary();
        diary.setMember(member);
        fillDiary(diary, req);

        Diary saved = diaryRepository.save(diary);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "id",      saved.getId()
        ));
    }

    // ── 2. 기록 수정 ──
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateDiary(
            @PathVariable Long id,
            @RequestBody DiaryRequest req) {

        Optional<Diary> diaryOpt = diaryRepository.findById(id);
        if (diaryOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "기록을 찾을 수 없습니다."));
        }

        Diary diary = diaryOpt.get();
        // 본인 확인
        if (!diary.getMember().getNickname().equals(req.getNickname())) {
            return ResponseEntity.status(403)
                .body(Map.of("success", false, "message", "권한이 없습니다."));
        }

        fillDiary(diary, req);
        diaryRepository.save(diary);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── 3. 기록 삭제 ──
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDiary(
            @PathVariable Long id,
            @RequestParam String nickname) {

        Optional<Diary> diaryOpt = diaryRepository.findById(id);
        if (diaryOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", "기록을 찾을 수 없습니다."));
        }

        Diary diary = diaryOpt.get();
        if (!diary.getMember().getNickname().equals(nickname)) {
            return ResponseEntity.status(403)
                .body(Map.of("success", false, "message", "권한이 없습니다."));
        }

        diaryRepository.delete(diary);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ── 4. 회원의 전체 기록 조회 ──
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getDiaries(
            @RequestParam String nickname) {

        Optional<Member> memberOpt = findMember(nickname);
        if (memberOpt.isEmpty()) return ResponseEntity.ok(Collections.emptyList());

        List<Diary> diaries = diaryRepository.findByMemberOrderByGameDateDesc(memberOpt.get());
        return ResponseEntity.ok(diaries.stream().map(this::toMap).collect(Collectors.toList()));
    }

    // ── 5. 특정 월 기록 조회 ──
    @GetMapping("/month")
    public ResponseEntity<List<Map<String, Object>>> getDiariesByMonth(
            @RequestParam String nickname,
            @RequestParam int year,
            @RequestParam int month) {

        Optional<Member> memberOpt = findMember(nickname);
        if (memberOpt.isEmpty()) return ResponseEntity.ok(Collections.emptyList());

        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());

        List<Diary> diaries = diaryRepository
            .findByMemberAndGameDateBetweenOrderByGameDateAsc(memberOpt.get(), start, end);
        return ResponseEntity.ok(diaries.stream().map(this::toMap).collect(Collectors.toList()));
    }

    // ── 공통: Diary 필드 채우기 ──
    private void fillDiary(Diary diary, DiaryRequest req) {
        diary.setGameDate(LocalDate.parse(req.getDate()));
        diary.setHomeTeam(req.getHome());
        diary.setAwayTeam(req.getAway());
        diary.setHomeScore(req.getHomeScore());
        diary.setAwayScore(req.getAwayScore());
        diary.setMyTeam(req.getMyteam());
        diary.setResult(req.getResult());
        diary.setStadium(req.getStadium());
        diary.setSeat(req.getSeat());
        diary.setWeather(req.getWeather());
        diary.setMate(req.getMate());
        diary.setMood(req.getMood());
        diary.setMemo(req.getMemo());
        diary.setCostTicket(   req.getCostTicket()    != null ? req.getCostTicket()    : 0);
        diary.setCostTransport(req.getCostTransport() != null ? req.getCostTransport() : 0);
        diary.setCostFood(     req.getCostFood()      != null ? req.getCostFood()      : 0);
        diary.setCostGoods(    req.getCostGoods()     != null ? req.getCostGoods()     : 0);
    }

    // ── 공통: Diary → Map 변환 ──
    private Map<String, Object> toMap(Diary d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        d.getId());
        m.put("date",      d.getGameDate().toString());
        m.put("home",      d.getHomeTeam()   != null ? d.getHomeTeam()   : "");
        m.put("away",      d.getAwayTeam()   != null ? d.getAwayTeam()   : "");
        m.put("homeScore", d.getHomeScore());
        m.put("awayScore", d.getAwayScore());
        m.put("myteam",    d.getMyTeam()     != null ? d.getMyTeam()     : "");
        m.put("result",    d.getResult()     != null ? d.getResult()     : "");
        m.put("stadium",   d.getStadium()    != null ? d.getStadium()    : "");
        m.put("seat",      d.getSeat()       != null ? d.getSeat()       : "");
        m.put("weather",   d.getWeather()    != null ? d.getWeather()    : "");
        m.put("mate",      d.getMate()       != null ? d.getMate()       : "");
        m.put("mood",      d.getMood()       != null ? d.getMood()       : "");
        m.put("memo",      d.getMemo()       != null ? d.getMemo()       : "");
        m.put("cost", Map.of(
            "ticket",    d.getCostTicket()    != null ? d.getCostTicket()    : 0,
            "transport", d.getCostTransport() != null ? d.getCostTransport() : 0,
            "food",      d.getCostFood()      != null ? d.getCostFood()      : 0,
            "goods",     d.getCostGoods()     != null ? d.getCostGoods()     : 0
        ));
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : "");
        return m;
    }
}

// ── 요청 DTO ──
@Data
class DiaryRequest {
    private String  nickname;      // 로그인 닉네임 (본인 확인용)
    private String  date;          // "2026-05-11"
    private String  home;
    private String  away;
    private Integer homeScore;
    private Integer awayScore;
    private String  myteam;
    private String  result;        // win / lose / draw / cancel
    private String  stadium;
    private String  seat;
    private String  weather;
    private String  mate;
    private String  mood;
    private String  memo;
    private Integer costTicket;
    private Integer costTransport;
    private Integer costFood;
    private Integer costGoods;
}
