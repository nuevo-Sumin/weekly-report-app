package com.metabuild.weeklyreport.mergedreport.repository;

import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MergedReportItemRepository extends JpaRepository<MergedReportItem, Long> {

    List<MergedReportItem> findByMergedReportOrderByReportItemIdAsc(MergedReport mergedReport);

    List<MergedReportItem> findByMergedReportInOrderByMergedReportIdAscReportItemIdAsc(Collection<MergedReport> mergedReports);

    void deleteByMergedReport(MergedReport mergedReport);
}
