package com.metabuild.weeklyreport.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.weeklyreport.auth.dto.LoginRequest;
import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.user.entity.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "jwt.secret=12345678901234567890123456789012",
        "jwt.expiration=3600000"
})
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void meReturnsCurrentUserWithValidToken() throws Exception {
        String token = signupAndLogin("meuser");

        mockMvc.perform(get("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.loginId").value("meuser"))
                .andExpect(jsonPath("$.data.email").value("meuser@example.com"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test
    void meReturnsUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void meReturnsUnauthorizedWithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void publicAuthEndpointIgnoresInvalidBearerToken() throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                "publictoken",
                "1234",
                "publictoken@example.com",
                "Public Token"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void managerSignupRequiresApprovalBeforeRoleIsGranted() throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                "managerrequest",
                "1234",
                "managerrequest@example.com",
                "Manager Request",
                UserRole.MANAGER
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.requestedRole").value("MANAGER"))
                .andExpect(jsonPath("$.data.roleApprovalStatus").value("PENDING"));

        LoginRequest loginRequest = new LoginRequest("managerrequest", "1234");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.requestedRole").value("MANAGER"))
                .andExpect(jsonPath("$.data.roleApprovalStatus").value("PENDING"))
                .andReturn();

        JsonNode response = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String token = response.path("data").path("accessToken").asText();
        mockMvc.perform(get("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.requestedRole").value("MANAGER"))
                .andExpect(jsonPath("$.data.roleApprovalStatus").value("PENDING"));
    }

    @Test
    void signupRejectsPasswordThatIsNotFourDigitsWithKoreanMessage() throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                "badpassword",
                "password123",
                "badpassword@example.com",
                "Bad Password"
        );

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("password: 비밀번호는 숫자 4자리로 입력해 주세요."));
    }

    private String signupAndLogin(String loginId) throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                loginId,
                "1234",
                loginId + "@example.com",
                "Test User"
        );
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest(loginId, "1234");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        JsonNode response = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return response.path("data").path("accessToken").asText();
    }
}
