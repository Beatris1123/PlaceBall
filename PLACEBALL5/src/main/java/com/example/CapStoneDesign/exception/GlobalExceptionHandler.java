package com.example.CapStoneDesign.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * 전역 예외 핸들러
 * 모든 컨트롤러에서 발생하는 예외를 한 곳에서 처리
 *
 * 프론트에서 받는 에러 응답 형식:
 * { "error": "에러 메시지" }
 * 또는 @Valid 검증 실패:
 * { "email": "올바른 이메일 형식이 아닙니다", "password": "최소 8자 이상" }
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 중복 (이메일/닉네임) */
    @ExceptionHandler(DuplicateException.class)
    public ResponseEntity<Map<String, String>> handleDuplicate(DuplicateException e) {
        log.warn("중복 오류: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)          // 409
                .body(Map.of("error", e.getMessage()));
    }

    /** 로그인 실패 */
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleInvalidCredentials(InvalidCredentialsException e) {
        log.warn("인증 실패: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)      // 401
                .body(Map.of("error", e.getMessage()));
    }

    /** @Valid 검증 실패 (요청 바디 유효성) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            errors.put(fe.getField(), fe.getDefaultMessage());
        }
        log.warn("유효성 검사 실패: {}", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)       // 400
                .body(errors);
    }

    /** 예상치 못한 오류 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception e) {
        log.error("서버 오류: {}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)  // 500
                .body(Map.of("error", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
    }
}
