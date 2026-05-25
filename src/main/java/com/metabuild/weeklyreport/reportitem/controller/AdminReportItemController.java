package com.metabuild.weeklyreport.reportitem.controller;

import com.metabuild.weeklyreport.common.ApiResponse;
import com.metabuild.weeklyreport.reportitem.dto.AdminReportItemResponse;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import com.metabuild.weeklyreport.reportitem.service.WeeklyReportItemService;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/admin/report-items")
public class AdminReportItemController {

    private final WeeklyReportItemService reportItemService;

    public AdminReportItemController(WeeklyReportItemService reportItemService) {
        this.reportItemService = reportItemService;
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ApiResponse<List<AdminReportItemResponse>> getSubmittedItems(
            @NotNull @RequestParam LocalDate reportStartDate,
            @NotNull @RequestParam LocalDate reportEndDate,
            @RequestParam(required = false) String memberLoginId,
            @RequestParam(required = false) String unitTask,
            @RequestParam(required = false) WeekType weekType
    ) {
        return ApiResponse.success(reportItemService.getSubmittedItemsForAdmin(
                reportStartDate,
                reportEndDate,
                memberLoginId,
                unitTask,
                weekType
        ));
    }
}
