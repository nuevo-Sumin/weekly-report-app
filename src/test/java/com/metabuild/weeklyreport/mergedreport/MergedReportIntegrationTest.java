package com.metabuild.weeklyreport.mergedreport;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.weeklyreport.auth.dto.LoginRequest;
import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportRequest;
import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import com.metabuild.weeklyreport.mergedreport.repository.MergedReportRepository;
import com.metabuild.weeklyreport.user.entity.RoleApprovalStatus;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "jwt.secret=12345678901234567890123456789012",
        "jwt.expiration=3600000"
})
class MergedReportIntegrationTest {

    private static final LocalDate REPORT_START_DATE = LocalDate.of(2026, 6, 8);
    private static final LocalDate REPORT_END_DATE = LocalDate.of(2026, 6, 14);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MergedReportRepository mergedReportRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void userCanCreateListAndUpdateOwnMemberMergedReport() throws Exception {
        String token = signupAndLogin("mergedmember");
        Long reportId = createMergedReport(token, memberRequest("초안", MergedReportStatus.DRAFT));

        mockMvc.perform(get("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString())
                        .param("mergeType", "MEMBER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(reportId))
                .andExpect(jsonPath("$.data[0].mergeType").value("MEMBER"))
                .andExpect(jsonPath("$.data[0].status").value("DRAFT"));

        MergedReportRequest updateRequest = memberRequest("수정된 최종 텍스트", MergedReportStatus.FINAL);
        mockMvc.perform(put("/api/merged-reports/{reportId}", reportId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mergedText").value("수정된 최종 텍스트"))
                .andExpect(jsonPath("$.data.status").value("FINAL"));
    }

    @Test
    void userCannotCreateAdminMergedReport() throws Exception {
        String token = signupAndLogin("notadminmerged");

        mockMvc.perform(post("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminRequest("관리자 취합", MergedReportStatus.SAVED))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void userCannotUpdateMemberMergedReportToAdminType() throws Exception {
        String token = signupAndLogin("membertypechange");
        Long reportId = createMergedReport(token, memberRequest("사용자 병합", MergedReportStatus.SAVED));

        mockMvc.perform(put("/api/merged-reports/{reportId}", reportId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminRequest("관리자 타입 전환", MergedReportStatus.SAVED))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void userListWithoutMergeTypeDoesNotReturnAdminReports() throws Exception {
        User user = createUser("legacyadminrow", UserRole.USER);
        mergedReportRepository.save(new MergedReport(
                user,
                MergeType.ADMIN,
                REPORT_START_DATE,
                REPORT_END_DATE,
                "legacy admin text",
                MergedReportStatus.SAVED
        ));
        String token = login("legacyadminrow");

        mockMvc.perform(get("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void managerCanCreateAdminMergedReport() throws Exception {
        String managerToken = createManagerAndLogin("mergedmanager");

        mockMvc.perform(post("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminRequest("팀장 최종 취합", MergedReportStatus.FINAL))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mergeType").value("ADMIN"))
                .andExpect(jsonPath("$.data.status").value("FINAL"));
    }

    @Test
    void managerCannotCreateMemberMergedReport() throws Exception {
        String managerToken = createManagerAndLogin("membertypedmanager");

        mockMvc.perform(post("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(memberRequest("팀장 member 저장", MergedReportStatus.SAVED))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void userCannotUpdateAnotherUsersMergedReport() throws Exception {
        String ownerToken = signupAndLogin("mergedowner");
        String attackerToken = signupAndLogin("mergedattacker");
        Long reportId = createMergedReport(ownerToken, memberRequest("소유자 병합", MergedReportStatus.SAVED));

        mockMvc.perform(put("/api/merged-reports/{reportId}", reportId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + attackerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(memberRequest("공격자 수정", MergedReportStatus.SAVED))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void mergedReportRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/merged-reports")
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString()))
                .andExpect(status().isUnauthorized());
    }

    private Long createMergedReport(String token, MergedReportRequest request) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/merged-reports")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.path("data").path("id").asLong();
    }

    private MergedReportRequest memberRequest(String mergedText, MergedReportStatus status) {
        return new MergedReportRequest(
                MergeType.MEMBER,
                REPORT_START_DATE,
                REPORT_END_DATE,
                mergedText,
                status
        );
    }

    private MergedReportRequest adminRequest(String mergedText, MergedReportStatus status) {
        return new MergedReportRequest(
                MergeType.ADMIN,
                REPORT_START_DATE,
                REPORT_END_DATE,
                mergedText,
                status
        );
    }

    private String signupAndLogin(String loginId) throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                loginId,
                "password123",
                loginId + "@example.com",
                "Merged User"
        );
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated());

        return login(loginId);
    }

    private String createManagerAndLogin(String loginId) throws Exception {
        createUser(loginId, UserRole.MANAGER);
        return login(loginId);
    }

    private User createUser(String loginId, UserRole role) {
        User user = new User(
                loginId,
                loginId + "@example.com",
                passwordEncoder.encode("password123"),
                role == UserRole.MANAGER ? "Merged Manager" : "Merged User",
                role,
                role,
                RoleApprovalStatus.APPROVED
        );
        return userRepository.save(user);
    }

    private String login(String loginId) throws Exception {
        LoginRequest loginRequest = new LoginRequest(loginId, "password123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return response.path("data").path("accessToken").asText();
    }
}
