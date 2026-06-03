package com.metabuild.weeklyreport.mergedreport.entity;

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
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "merged_reports")
public class MergedReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MergeType mergeType;

    @Column(nullable = false)
    private LocalDate reportStartDate;

    @Column(nullable = false)
    private LocalDate reportEndDate;

    @Column(nullable = false, length = 10000)
    private String mergedText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MergedReportStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected MergedReport() {
    }

    public MergedReport(
            User createdBy,
            MergeType mergeType,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            String mergedText,
            MergedReportStatus status
    ) {
        this.createdBy = createdBy;
        this.mergeType = mergeType;
        this.reportStartDate = reportStartDate;
        this.reportEndDate = reportEndDate;
        this.mergedText = mergedText;
        this.status = status;
    }

    public void update(
            MergeType mergeType,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            String mergedText,
            MergedReportStatus status
    ) {
        this.mergeType = mergeType;
        this.reportStartDate = reportStartDate;
        this.reportEndDate = reportEndDate;
        this.mergedText = mergedText;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
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

    public User getCreatedBy() {
        return createdBy;
    }

    public MergeType getMergeType() {
        return mergeType;
    }

    public LocalDate getReportStartDate() {
        return reportStartDate;
    }

    public LocalDate getReportEndDate() {
        return reportEndDate;
    }

    public String getMergedText() {
        return mergedText;
    }

    public MergedReportStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
