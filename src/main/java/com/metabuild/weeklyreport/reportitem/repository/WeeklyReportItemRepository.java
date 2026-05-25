package com.metabuild.weeklyreport.reportitem.repository;

import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import com.metabuild.weeklyreport.user.entity.User;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyReportItemRepository extends JpaRepository<WeeklyReportItem, Long> {

    List<WeeklyReportItem> findByAuthorAndReportStartDateAndReportEndDateOrderByWeekTypeAscUnitTaskAscIdAsc(
            User author,
            LocalDate reportStartDate,
            LocalDate reportEndDate
    );

    List<WeeklyReportItem> findByAuthorAndReportStartDateAndReportEndDateAndSaveStatusOrderByWeekTypeAscUnitTaskAscIdAsc(
            User author,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            SaveStatus saveStatus
    );

    List<WeeklyReportItem> findByAuthorAndIdIn(User author, Collection<Long> ids);

    Optional<WeeklyReportItem> findByAuthorAndId(User author, Long id);
}
