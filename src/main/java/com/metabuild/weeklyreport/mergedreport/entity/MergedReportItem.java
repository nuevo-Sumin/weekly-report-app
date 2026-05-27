package com.metabuild.weeklyreport.mergedreport.entity;

import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "merged_report_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_merged_report_item",
                columnNames = {"merged_report_id", "report_item_id"}
        )
)
public class MergedReportItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "merged_report_id", nullable = false)
    private MergedReport mergedReport;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_item_id", nullable = false)
    private WeeklyReportItem reportItem;

    protected MergedReportItem() {
    }

    public MergedReportItem(MergedReport mergedReport, WeeklyReportItem reportItem) {
        this.mergedReport = mergedReport;
        this.reportItem = reportItem;
    }

    public Long getId() {
        return id;
    }

    public MergedReport getMergedReport() {
        return mergedReport;
    }

    public WeeklyReportItem getReportItem() {
        return reportItem;
    }
}
