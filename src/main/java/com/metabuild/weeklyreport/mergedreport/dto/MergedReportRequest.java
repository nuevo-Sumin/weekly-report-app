package com.metabuild.weeklyreport.mergedreport.dto;

import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record MergedReportRequest(
        @NotNull
        MergeType mergeType,

        @NotNull
        LocalDate reportStartDate,

        @NotNull
        LocalDate reportEndDate,

        @NotBlank
        @Size(max = 10000)
        String mergedText,

        MergedReportStatus status
) {
}
