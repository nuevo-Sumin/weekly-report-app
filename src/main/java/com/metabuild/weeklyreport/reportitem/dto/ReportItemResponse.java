package com.metabuild.weeklyreport.reportitem.dto;

import com.metabuild.weeklyreport.reportitem.entity.ReportItemStatus;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ReportItemResponse(
        Long id,
        Long authorId,
        String authorName,
        LocalDate reportStartDate,
        LocalDate reportEndDate,
        WeekType weekType,
        String unitTask,
        String title,
        String detailContent,
        String progressContent,
        ReportItemStatus status,
        int progressRate,
        LocalDate dueDate,
        boolean completed,
        SaveStatus saveStatus,
        LocalDateTime submittedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static ReportItemResponse from(WeeklyReportItem item) {
        return new ReportItemResponse(
                item.getId(),
                item.getAuthor().getId(),
                item.getAuthor().getName(),
                item.getReportStartDate(),
                item.getReportEndDate(),
                item.getWeekType(),
                item.getUnitTask(),
                item.getTitle(),
                item.getDetailContent(),
                item.getProgressContent(),
                item.getStatus(),
                item.getProgressRate(),
                item.getDueDate(),
                item.isCompleted(),
                item.getSaveStatus(),
                item.getSubmittedAt(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
