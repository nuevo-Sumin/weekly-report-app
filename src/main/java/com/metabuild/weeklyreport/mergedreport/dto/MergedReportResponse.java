package com.metabuild.weeklyreport.mergedreport.dto;

import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MergedReportResponse(
        Long id,
        Long createdById,
        String createdByName,
        MergeType mergeType,
        LocalDate reportStartDate,
        LocalDate reportEndDate,
        String mergedText,
        MergedReportStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static MergedReportResponse from(MergedReport report) {
        return new MergedReportResponse(
                report.getId(),
                report.getCreatedBy().getId(),
                report.getCreatedBy().getName(),
                report.getMergeType(),
                report.getReportStartDate(),
                report.getReportEndDate(),
                report.getMergedText(),
                report.getStatus(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}
