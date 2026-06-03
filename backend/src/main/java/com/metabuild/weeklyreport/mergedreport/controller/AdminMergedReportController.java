package com.metabuild.weeklyreport.mergedreport.controller;

import com.metabuild.weeklyreport.common.ApiResponse;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportResponse;
import com.metabuild.weeklyreport.mergedreport.service.MergedReportService;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/merged-reports")
public class AdminMergedReportController {

    private final MergedReportService mergedReportService;

    public AdminMergedReportController(MergedReportService mergedReportService) {
        this.mergedReportService = mergedReportService;
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<MergedReportResponse>> getSubmittedMemberReports(
            Authentication authentication,
            @NotNull @RequestParam LocalDate reportStartDate,
            @NotNull @RequestParam LocalDate reportEndDate
    ) {
        return ApiResponse.success(mergedReportService.getSubmittedMemberReportsForAdmin(
                authentication.getName(),
                reportStartDate,
                reportEndDate
        ));
    }
}
