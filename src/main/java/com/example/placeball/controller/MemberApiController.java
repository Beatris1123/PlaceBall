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
        // JS에서 data.available 로 확인하므로 결과를 맞춰줍니다.
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
    public Map<String, Boolean> signup(@RequestBody SignupRequest request) {
        Member member = new Member();
        member.setLoginId(request.getId());
        member.setNickname(request.getNickname());
        member.setPassword(request.getPassword()); // TODO: 실제 서비스에서는 BCrypt 등으로 암호화 필수

        memberRepository.save(member);
        return Map.of("success", true);
    }


    // 4. 로그인 API
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(request.getId());

        if (memberOpt.isPresent() && memberOpt.get().getPassword().equals(request.getPassword())) {
            // 로그인 성공 시 닉네임도 같이 프론트엔드로 보냄
            return Map.of("success", true, "nickname", memberOpt.get().getNickname());
        } else {
            return Map.of("success", false);
        }
    }
}

// 프론트엔드에서 넘어오는 JSON 데이터를 받을 DTO 클래스들
@Data
class SignupRequest {
    private String id;
    private String nickname;
    private String password;
}

@Data
class LoginRequest {
    private String id;
    private String password;


}