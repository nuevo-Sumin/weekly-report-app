package com.metabuild.weeklyreport.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(
        @NotBlank(message = "아이디를 입력해 주세요.")
        String loginId,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Pattern(regexp = "^\\d{4}$", message = "비밀번호는 숫자 4자리로 입력해 주세요.")
        String password
) {
}
