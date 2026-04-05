package com.example.CapStoneDesign.exception;

/** 로그인 실패 (이메일/비밀번호 불일치) 시 발생하는 예외 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
