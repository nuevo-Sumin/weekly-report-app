package com.metabuild.weeklyreport.mergedreport.repository;

import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.user.entity.User;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MergedReportRepository extends JpaRepository<MergedReport, Long> {

    List<MergedReport> findByCreatedByAndReportStartDateAndReportEndDateOrderByUpdatedAtDesc(
            User createdBy,
            LocalDate reportStartDate,
            LocalDate reportEndDate
    );

    List<MergedReport> findByCreatedByAndReportStartDateAndReportEndDateAndMergeTypeOrderByUpdatedAtDesc(
            User createdBy,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            MergeType mergeType
    );

    Optional<MergedReport> findByCreatedByAndId(User createdBy, Long id);
}
