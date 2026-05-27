package com.metabuild.weeklyreport.reportitem.entity;

import com.metabuild.weeklyreport.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "weekly_report_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_report_item_csv_source",
                columnNames = {
                        "author_id",
                        "report_start_date",
                        "report_end_date",
                        "week_type",
                        "source_type",
                        "source_key"
                }
        )
)
public class WeeklyReportItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false)
    private LocalDate reportStartDate;

    @Column(nullable = false)
    private LocalDate reportEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WeekType weekType;

    @Column(nullable = false, length = 120)
    private String unitTask;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 2000)
    private String detailContent;

    @Column(nullable = false, length = 2000)
    private String progressContent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportItemStatus status;

    @Column(nullable = false)
    private int progressRate;

    private LocalDate dueDate;

    @Column(nullable = false)
    private boolean completed;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReportItemSourceType sourceType;

    @Column(length = 120)
    private String sourceKey;

    private Integer sourceRowNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SaveStatus saveStatus;

    private LocalDateTime submittedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected WeeklyReportItem() {
    }

    public WeeklyReportItem(
            User author,
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
            ReportItemSourceType sourceType,
            String sourceKey,
            Integer sourceRowNumber,
            SaveStatus saveStatus
    ) {
        this.author = author;
        this.reportStartDate = reportStartDate;
        this.reportEndDate = reportEndDate;
        this.weekType = weekType;
        this.unitTask = unitTask;
        this.title = title;
        this.detailContent = detailContent;
        this.progressContent = progressContent;
        this.status = status;
        this.progressRate = progressRate;
        this.dueDate = dueDate;
        this.completed = completed;
        this.sourceType = sourceType;
        this.sourceKey = sourceKey;
        this.sourceRowNumber = sourceRowNumber;
        this.saveStatus = saveStatus;
    }

    public void update(
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
            ReportItemSourceType sourceType,
            String sourceKey,
            Integer sourceRowNumber,
            SaveStatus saveStatus
    ) {
        this.reportStartDate = reportStartDate;
        this.reportEndDate = reportEndDate;
        this.weekType = weekType;
        this.unitTask = unitTask;
        this.title = title;
        this.detailContent = detailContent;
        this.progressContent = progressContent;
        this.status = status;
        this.progressRate = progressRate;
        this.dueDate = dueDate;
        this.completed = completed;
        this.sourceType = sourceType;
        this.sourceKey = sourceKey;
        this.sourceRowNumber = sourceRowNumber;
        this.saveStatus = saveStatus;
        if (saveStatus != SaveStatus.SUBMITTED) {
            this.submittedAt = null;
        }
    }

    public void submit(LocalDateTime submittedAt) {
        if (this.saveStatus == SaveStatus.SUBMITTED) {
            return;
        }
        this.saveStatus = SaveStatus.SUBMITTED;
        this.submittedAt = submittedAt;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.sourceType == null) {
            this.sourceType = ReportItemSourceType.MANUAL;
        }
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getAuthor() {
        return author;
    }

    public LocalDate getReportStartDate() {
        return reportStartDate;
    }

    public LocalDate getReportEndDate() {
        return reportEndDate;
    }

    public WeekType getWeekType() {
        return weekType;
    }

    public String getUnitTask() {
        return unitTask;
    }

    public String getTitle() {
        return title;
    }

    public String getDetailContent() {
        return detailContent;
    }

    public String getProgressContent() {
        return progressContent;
    }

    public ReportItemStatus getStatus() {
        return status;
    }

    public int getProgressRate() {
        return progressRate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public boolean isCompleted() {
        return completed;
    }

    public ReportItemSourceType getSourceType() {
        return sourceType;
    }

    public String getSourceKey() {
        return sourceKey;
    }

    public Integer getSourceRowNumber() {
        return sourceRowNumber;
    }

    public SaveStatus getSaveStatus() {
        return saveStatus;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
