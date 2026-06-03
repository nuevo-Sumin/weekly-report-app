package com.metabuild.weeklyreport.reportitem.repository;

import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.ReportItemSourceType;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import com.metabuild.weeklyreport.user.entity.User;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    List<WeeklyReportItem> findByAuthorAndReportStartDateAndReportEndDateAndIdIn(
            User author,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            Collection<Long> ids
    );

    List<WeeklyReportItem> findByReportStartDateAndReportEndDateAndSaveStatusAndIdIn(
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            SaveStatus saveStatus,
            Collection<Long> ids
    );

    Optional<WeeklyReportItem> findByAuthorAndId(User author, Long id);

    boolean existsByAuthorAndReportStartDateAndReportEndDateAndWeekTypeAndSourceTypeAndSourceKey(
            User author,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            WeekType weekType,
            ReportItemSourceType sourceType,
            String sourceKey
    );

    boolean existsByAuthorAndReportStartDateAndReportEndDateAndWeekTypeAndSourceTypeAndSourceKeyAndIdNot(
            User author,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            WeekType weekType,
            ReportItemSourceType sourceType,
            String sourceKey,
            Long id
    );

    @Query("""
            select item
            from WeeklyReportItem item
            join fetch item.author author
            where item.reportStartDate = :reportStartDate
              and item.reportEndDate = :reportEndDate
              and item.saveStatus = com.metabuild.weeklyreport.reportitem.entity.SaveStatus.SUBMITTED
              and (:memberLoginId is null or author.loginId = :memberLoginId)
              and (:unitTask is null or lower(item.unitTask) like lower(concat('%', :unitTask, '%')))
              and (:weekType is null or item.weekType = :weekType)
            order by author.name asc, author.loginId asc, item.weekType asc, item.unitTask asc, item.id asc
            """)
    List<WeeklyReportItem> findSubmittedItemsForAdmin(
            @Param("reportStartDate") LocalDate reportStartDate,
            @Param("reportEndDate") LocalDate reportEndDate,
            @Param("memberLoginId") String memberLoginId,
            @Param("unitTask") String unitTask,
            @Param("weekType") WeekType weekType
    );
}
