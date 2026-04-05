package com.example.CapStoneDesign.exception;

/** 이메일/닉네임 중복 시 발생하는 예외 */
public class DuplicateException extends RuntimeException {
    public DuplicateException(String message) {
        super(message);
    }
}
