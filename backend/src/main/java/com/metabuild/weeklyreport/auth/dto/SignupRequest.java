package com.metabuild.weeklyreport.auth.dto;

import com.metabuild.weeklyreport.user.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "아이디를 입력해 주세요.")
        @Size(min = 4, max = 80, message = "아이디는 4자 이상 80자 이하로 입력해 주세요.")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "아이디는 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.")
        String loginId,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Pattern(regexp = "^\\d{4}$", message = "비밀번호는 숫자 4자리로 입력해 주세요.")
        String password,

        @NotBlank(message = "이메일을 입력해 주세요.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @Size(max = 160, message = "이메일은 160자 이하로 입력해 주세요.")
        String email,

        @NotBlank(message = "이름을 입력해 주세요.")
        @Size(max = 80, message = "이름은 80자 이하로 입력해 주세요.")
        String name,

        UserRole requestedRole
) {

    public SignupRequest(String loginId, String password, String email, String name) {
        this(loginId, password, email, name, UserRole.USER);
    }
}
