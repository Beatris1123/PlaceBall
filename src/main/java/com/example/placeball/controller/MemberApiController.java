package com.example.placeball.controller;

import com.example.placeball.domain.Member;
import com.example.placeball.repository.MemberRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemberApiController {

    private final MemberRepository memberRepository;

    // 1. 아이디 중복 확인 API
    @GetMapping("/check-id")
    public Map<String, Boolean> checkId(@RequestParam String id) {
        boolean isDuplicate = memberRepository.existsByLoginId(id);
        return Map.of("available", !isDuplicate);
    }

    // 2. 닉네임 중복 확인 API
    @GetMapping("/check-nickname")
    public Map<String, Boolean> checkNickname(@RequestParam String nickname) {
        boolean isDuplicate = memberRepository.existsByNickname(nickname);
        return Map.of("available", !isDuplicate);
    }

    // 3. 회원가입 API
    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody SignupRequest request) {
        if (request.getFavoriteTeam() == null || request.getFavoriteTeam().isBlank()) {
            return Map.of("success", false, "message", "최애팀을 선택해주세요.");
        }
        Member member = new Member();
        member.setLoginId(request.getId());
        member.setNickname(request.getNickname());
        member.setPassword(request.getPassword());
        member.setFavoriteTeam(request.getFavoriteTeam());

        memberRepository.save(member);
        return Map.of("success", true);
    }

    // 4. 로그인 API
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(request.getId());

        if (memberOpt.isPresent() && memberOpt.get().getPassword().equals(request.getPassword())) {
            Member member = memberOpt.get();
            String nickname = (member.getNickname() != null && !member.getNickname().isBlank())
                    ? member.getNickname()
                    : member.getLoginId();
            return Map.of(
                "success",      true,
                "nickname",     nickname,
                "favoriteTeam", member.getFavoriteTeam() != null ? member.getFavoriteTeam() : ""
            );
        } else {
            return Map.of("success", false);
        }
    }

    // 5. 내 정보 조회 API (닉네임으로 favoriteTeam 조회)
    @GetMapping("/my-info")
    public Map<String, Object> myInfo(@RequestParam String nickname) {
        return memberRepository.findByNickname(nickname)
            .map(m -> Map.<String, Object>of(
                "nickname",     m.getNickname(),
                "favoriteTeam", m.getFavoriteTeam() != null ? m.getFavoriteTeam() : ""
            ))
            .orElse(Map.of("error", "not found"));
    }
}

@Data
class SignupRequest {
    private String id;
    private String nickname;
    private String password;
    private String favoriteTeam;
}

@Data
class LoginRequest {
    private String id;
    private String password;
}
