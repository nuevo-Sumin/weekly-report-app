package com.metabuild.weeklyreport.mergedreport.controller;

import com.metabuild.weeklyreport.common.ApiResponse;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportRequest;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportResponse;
import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.service.MergedReportService;
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
@RequestMapping("/api/merged-reports")
public class MergedReportController {

    private final MergedReportService mergedReportService;

    public MergedReportController(MergedReportService mergedReportService) {
        this.mergedReportService = mergedReportService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MergedReportResponse>> create(
            Authentication authentication,
            @Valid @RequestBody MergedReportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(mergedReportService.create(authentication.getName(), request), "Merged report created."));
    }

    @GetMapping
    public ApiResponse<List<MergedReportResponse>> getMyReports(
            Authentication authentication,
            @NotNull @RequestParam LocalDate reportStartDate,
            @NotNull @RequestParam LocalDate reportEndDate,
            @RequestParam(required = false) MergeType mergeType
    ) {
        return ApiResponse.success(mergedReportService.getMyReports(
                authentication.getName(),
                reportStartDate,
                reportEndDate,
                mergeType
        ));
    }

    @PutMapping("/{reportId}")
    public ApiResponse<MergedReportResponse> update(
            Authentication authentication,
            @PathVariable Long reportId,
            @Valid @RequestBody MergedReportRequest request
    ) {
        return ApiResponse.success(
                mergedReportService.update(authentication.getName(), reportId, request),
                "Merged report updated."
        );
    }
}
