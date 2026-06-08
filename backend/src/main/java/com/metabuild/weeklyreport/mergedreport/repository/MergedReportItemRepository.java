package com.metabuild.weeklyreport.mergedreport.repository;

import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportItem;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MergedReportItemRepository extends JpaRepository<MergedReportItem, Long> {

    List<MergedReportItem> findByMergedReportOrderByReportItemIdAsc(MergedReport mergedReport);

    List<MergedReportItem> findByMergedReportInOrderByMergedReportIdAscReportItemIdAsc(Collection<MergedReport> mergedReports);

    void deleteByMergedReport(MergedReport mergedReport);

    boolean existsByReportItemAndMergedReportStatus(WeeklyReportItem reportItem, MergedReportStatus status);

    boolean existsByReportItemInAndMergedReportMergeType(Collection<WeeklyReportItem> reportItems, MergeType mergeType);

    @Modifying
    @Query("""
            delete from MergedReportItem item
            where item.reportItem = :reportItem
              and item.mergedReport.status <> :status
            """)
    void deleteByReportItemAndMergedReportStatusNot(
            @Param("reportItem") WeeklyReportItem reportItem,
            @Param("status") MergedReportStatus status
    );
}
