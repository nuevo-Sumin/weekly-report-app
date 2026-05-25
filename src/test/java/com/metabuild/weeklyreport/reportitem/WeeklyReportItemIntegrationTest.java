package com.metabuild.weeklyreport.reportitem;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import java.time.LocalDate;
import java.util.List;
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
class WeeklyReportItemIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void reportItemLifecycleRequiresAuthenticationAndUsesCurrentUser() throws Exception {
        mockMvc.perform(get("/api/report-items")
                        .param("reportStartDate", "2026-05-25")
                        .param("reportEndDate", "2026-05-31"))
                .andExpect(status().isUnauthorized());

        String token = signupAndLogin("reportuser");
        Long itemId = createItem(token, "주간보고 API", SaveStatus.DRAFT);

        mockMvc.perform(get("/api/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("reportStartDate", "2026-05-25")
                        .param("reportEndDate", "2026-05-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(itemId))
                .andExpect(jsonPath("$.data[0].unitTask").value("주간보고 API"))
                .andExpect(jsonPath("$.data[0].saveStatus").value("DRAFT"));

        ReportItemRequest updateRequest = reportItemRequest("주간보고 API", SaveStatus.SAVED);
        mockMvc.perform(put("/api/report-items/{itemId}", itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.saveStatus").value("SAVED"));

        ReportItemSubmitRequest submitRequest = new ReportItemSubmitRequest(List.of(itemId));
        mockMvc.perform(post("/api/report-items/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].saveStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.data[0].submittedAt").exists());
    }

    @Test
    void createRejectsSubmittedStatus() throws Exception {
        String token = signupAndLogin("rejectsubmitted");
        ReportItemRequest request = reportItemRequest("제출 상태 직접 생성", SaveStatus.SUBMITTED);

        mockMvc.perform(post("/api/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void submittedItemsCannotBeEditedOrSubmittedAgain() throws Exception {
        String token = signupAndLogin("submittedguard");
        Long itemId = createItem(token, "제출 보호", SaveStatus.SAVED);

        ReportItemSubmitRequest submitRequest = new ReportItemSubmitRequest(List.of(itemId));
        mockMvc.perform(post("/api/report-items/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/report-items/{itemId}", itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reportItemRequest("제출 보호", SaveStatus.SAVED))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(post("/api/report-items/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void userCannotUpdateOrSubmitAnotherUsersItem() throws Exception {
        String ownerToken = signupAndLogin("owneruser");
        String attackerToken = signupAndLogin("attackeruser");
        Long itemId = createItem(ownerToken, "소유자 항목", SaveStatus.SAVED);

        mockMvc.perform(put("/api/report-items/{itemId}", itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + attackerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reportItemRequest("공격자 수정", SaveStatus.SAVED))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));

        ReportItemSubmitRequest submitRequest = new ReportItemSubmitRequest(List.of(itemId));
        mockMvc.perform(post("/api/report-items/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + attackerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    private Long createItem(String token, String unitTask, SaveStatus saveStatus) throws Exception {
        ReportItemRequest request = reportItemRequest(unitTask, saveStatus);
        MvcResult result = mockMvc.perform(post("/api/report-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.path("data").path("id").asLong();
    }

    private ReportItemRequest reportItemRequest(String unitTask, SaveStatus saveStatus) {
        return new ReportItemRequest(
                LocalDate.of(2026, 5, 25),
                LocalDate.of(2026, 5, 31),
                WeekType.THIS_WEEK,
                unitTask,
                "항목 API 구현",
                "주간보고 항목 백엔드 API 작성",
                "생성, 조회, 수정, 제출 흐름 구현",
                ReportItemStatus.IN_PROGRESS,
                60,
                LocalDate.of(2026, 5, 29),
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
