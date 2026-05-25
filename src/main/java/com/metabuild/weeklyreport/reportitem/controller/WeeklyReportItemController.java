package com.metabuild.weeklyreport.reportitem.controller;

import com.metabuild.weeklyreport.common.ApiResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemRequest;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemSubmitRequest;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.service.WeeklyReportItemService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/report-items")
public class WeeklyReportItemController {

    private final WeeklyReportItemService reportItemService;

    public WeeklyReportItemController(WeeklyReportItemService reportItemService) {
        this.reportItemService = reportItemService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReportItemResponse>> create(
            Authentication authentication,
            @Valid @RequestBody ReportItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(reportItemService.create(authentication.getName(), request), "Report item created."));
    }

    @GetMapping
    public ApiResponse<List<ReportItemResponse>> getMyItems(
            Authentication authentication,
            @NotNull @RequestParam LocalDate reportStartDate,
            @NotNull @RequestParam LocalDate reportEndDate,
            @RequestParam(required = false) SaveStatus saveStatus
    ) {
        return ApiResponse.success(reportItemService.getMyItems(
                authentication.getName(),
                reportStartDate,
                reportEndDate,
                saveStatus
        ));
    }

    @PutMapping("/{itemId}")
    public ApiResponse<ReportItemResponse> update(
            Authentication authentication,
            @PathVariable Long itemId,
            @Valid @RequestBody ReportItemRequest request
    ) {
        return ApiResponse.success(reportItemService.update(authentication.getName(), itemId, request), "Report item updated.");
    }

    @PostMapping("/submit")
    public ApiResponse<List<ReportItemResponse>> submit(
            Authentication authentication,
            @Valid @RequestBody ReportItemSubmitRequest request
    ) {
        return ApiResponse.success(reportItemService.submit(authentication.getName(), request), "Report items submitted.");
    }
}
