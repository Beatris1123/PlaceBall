package com.example.CapStoneDesign.controller;

import com.example.CapStoneDesign.entity.User;
import com.example.CapStoneDesign.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserApiController {

    private final UserRepository userRepository;

    // 1. 이메일 중복 확인 API
    @GetMapping("/check-email")
    public ResponseEntity<Boolean> checkEmail(@RequestParam String email) {
        return ResponseEntity.ok(userRepository.existsByEmail(email));
    }

    // ⭐ 2. 닉네임 중복 확인 API (새로 추가!)
    @GetMapping("/check-nick")
    public ResponseEntity<Boolean> checkNick(@RequestParam String nick) {
        return ResponseEntity.ok(userRepository.existsByNick(nick));
    }

    // 3. 회원가입 API
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 등록된 이메일입니다.");
        }
        if (userRepository.existsByNick(user.getNick())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 등록된 닉네임입니다.");
        }
        userRepository.save(user);
        return ResponseEntity.ok("회원가입 성공");
    }

    // 4. 로그인 API
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        Optional<User> user = userRepository.findByEmailAndPw(loginRequest.getEmail(), loginRequest.getPw());
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("이메일 또는 비밀번호가 일치하지 않습니다.");
        }
    }
}