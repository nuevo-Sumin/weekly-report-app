package com.metabuild.weeklyreport.reportitem;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.metabuild.weeklyreport.auth.dto.LoginRequest;
import com.metabuild.weeklyreport.auth.dto.SignupRequest;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemRequest;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemSubmitRequest;
import com.metabuild.weeklyreport.reportitem.entity.ReportItemStatus;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import com.metabuild.weeklyreport.user.entity.RoleApprovalStatus;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
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
class AdminReportItemIntegrationTest {

    private static final LocalDate REPORT_START_DATE = LocalDate.of(2026, 6, 1);
    private static final LocalDate REPORT_END_DATE = LocalDate.of(2026, 6, 7);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void managerCanReadSubmittedItemsOnlyWithFilters() throws Exception {
        String managerToken = createManagerAndLogin("admincollector");
        String memberToken = signupAndLogin("submittedmember");
        String otherMemberToken = signupAndLogin("othermember");

        Long submittedItemId = createItem(memberToken, "주간보고 API", WeekType.THIS_WEEK, SaveStatus.SAVED);
        submitItems(memberToken, submittedItemId);
        Long otherSubmittedItemId = createItem(otherMemberToken, "운영지원", WeekType.NEXT_WEEK, SaveStatus.SAVED);
        submitItems(otherMemberToken, otherSubmittedItemId);
        createItem(memberToken, "미제출 항목", WeekType.THIS_WEEK, SaveStatus.SAVED);

        mockMvc.perform(get("/api/admin/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].saveStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[0].authorLoginId").exists())
                .andExpect(jsonPath("$.data[1].saveStatus").value("SUBMITTED"));

        mockMvc.perform(get("/api/admin/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString())
                        .param("memberLoginId", "submittedmember"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(submittedItemId))
                .andExpect(jsonPath("$.data[0].authorLoginId").value("submittedmember"));

        mockMvc.perform(get("/api/admin/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString())
                        .param("unitTask", "운영"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(otherSubmittedItemId))
                .andExpect(jsonPath("$.data[0].unitTask").value("운영지원"));

        mockMvc.perform(get("/api/admin/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + managerToken)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString())
                        .param("weekType", "NEXT_WEEK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(otherSubmittedItemId))
                .andExpect(jsonPath("$.data[0].weekType").value("NEXT_WEEK"));
    }

    @Test
    void userCannotReadAdminReportItems() throws Exception {
        String userToken = signupAndLogin("notmanager");

        mockMvc.perform(get("/api/admin/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminReportItemsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/report-items")
                        .param("reportStartDate", REPORT_START_DATE.toString())
                        .param("reportEndDate", REPORT_END_DATE.toString()))
                .andExpect(status().isUnauthorized());
    }

    private Long createItem(
            String token,
            String unitTask,
            WeekType weekType,
            SaveStatus saveStatus
    ) throws Exception {
        ReportItemRequest request = reportItemRequest(unitTask, weekType, saveStatus);
        MvcResult result = mockMvc.perform(post("/api/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.path("data").path("id").asLong();
    }

    private void submitItems(String token, Long itemId) throws Exception {
        ReportItemSubmitRequest submitRequest = new ReportItemSubmitRequest(List.of(itemId));
        mockMvc.perform(post("/api/report-items/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk());
    }

    private ReportItemRequest reportItemRequest(String unitTask, WeekType weekType, SaveStatus saveStatus) {
        return new ReportItemRequest(
                REPORT_START_DATE,
                REPORT_END_DATE,
                weekType,
                unitTask,
                "팀장 취합 API",
                "팀장 취합용 제출 항목",
                "관리자 조회 필터 테스트",
                ReportItemStatus.IN_PROGRESS,
                70,
                LocalDate.of(2026, 6, 5),
                false,
                saveStatus
        );
    }

    private String signupAndLogin(String loginId) throws Exception {
        SignupRequest signupRequest = new SignupRequest(
                loginId,
                "password123",
                loginId + "@example.com",
                "Report User"
        );
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated());

        return login(loginId);
    }

    private String createManagerAndLogin(String loginId) throws Exception {
        User manager = new User(
                loginId,
                loginId + "@example.com",
                passwordEncoder.encode("password123"),
                "Manager User",
                UserRole.MANAGER,
                UserRole.MANAGER,
                RoleApprovalStatus.APPROVED
        );
        userRepository.save(manager);

        return login(loginId);
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
