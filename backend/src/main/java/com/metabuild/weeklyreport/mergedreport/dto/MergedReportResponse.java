package com.metabuild.weeklyreport.mergedreport.dto;

import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MergedReportResponse(
        Long id,
        Long createdById,
        String createdByName,
        MergeType mergeType,
        LocalDate reportStartDate,
        LocalDate reportEndDate,
        String mergedText,
        MergedReportStatus status,
        List<Long> sourceItemIds,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static MergedReportResponse from(MergedReport report) {
        return from(report, List.of());
    }

    public static MergedReportResponse from(MergedReport report, List<Long> sourceItemIds) {
        return new MergedReportResponse(
                report.getId(),
                report.getCreatedBy().getId(),
                report.getCreatedBy().getName(),
                report.getMergeType(),
                report.getReportStartDate(),
                report.getReportEndDate(),
                report.getMergedText(),
                report.getStatus(),
                sourceItemIds,
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}
