package com.metabuild.weeklyreport.reportitem.dto;

import com.metabuild.weeklyreport.reportitem.entity.ReportItemStatus;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ReportItemRequest(
        @NotNull
        LocalDate reportStartDate,

        @NotNull
        LocalDate reportEndDate,

        @NotNull
        WeekType weekType,

        @NotBlank
        @Size(max = 120)
        String unitTask,

        @NotBlank
        @Size(max = 200)
        String title,

        @NotBlank
        @Size(max = 2000)
        String detailContent,

        @NotBlank
        @Size(max = 2000)
        String progressContent,

        @NotNull
        ReportItemStatus status,

        @Min(0)
        @Max(100)
        int progressRate,

        LocalDate dueDate,

        boolean completed,

        SaveStatus saveStatus
) {

    @AssertTrue(message = "reportEndDate must be on or after reportStartDate")
    public boolean isValidReportPeriod() {
        return reportStartDate == null || reportEndDate == null || !reportEndDate.isBefore(reportStartDate);
    }
}
