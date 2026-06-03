package com.metabuild.weeklyreport.mergedreport.service;

import com.metabuild.weeklyreport.mergedreport.dto.MergedReportRequest;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportResponse;
import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportItem;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import com.metabuild.weeklyreport.mergedreport.repository.MergedReportItemRepository;
import com.metabuild.weeklyreport.mergedreport.repository.MergedReportRepository;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import com.metabuild.weeklyreport.reportitem.repository.WeeklyReportItemRepository;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MergedReportService {

    private final MergedReportRepository mergedReportRepository;
    private final MergedReportItemRepository mergedReportItemRepository;
    private final WeeklyReportItemRepository reportItemRepository;
    private final UserRepository userRepository;

    public MergedReportService(
            MergedReportRepository mergedReportRepository,
            MergedReportItemRepository mergedReportItemRepository,
            WeeklyReportItemRepository reportItemRepository,
            UserRepository userRepository
    ) {
        this.mergedReportRepository = mergedReportRepository;
        this.mergedReportItemRepository = mergedReportItemRepository;
        this.reportItemRepository = reportItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public MergedReportResponse create(String loginId, MergedReportRequest request) {
        User createdBy = getUser(loginId);
        validateRequest(createdBy, request);

        MergedReport report = new MergedReport(
                createdBy,
                request.mergeType(),
                request.reportStartDate(),
                request.reportEndDate(),
                request.mergedText().trim(),
                normalizeStatus(request.status())
        );

        MergedReport savedReport = mergedReportRepository.save(report);
        replaceSourceItems(savedReport, createdBy, request.sourceItemIds());
        return MergedReportResponse.from(savedReport, getSourceItemIds(savedReport));
    }

    @Transactional(readOnly = true)
    public List<MergedReportResponse> getMyReports(
            String loginId,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            MergeType mergeType
    ) {
        User createdBy = getUser(loginId);
        validateDateRange(reportStartDate, reportEndDate);

        MergeType requestedMergeType = mergeType == null ? expectedMergeType(createdBy) : mergeType;
        validateMergeType(createdBy, requestedMergeType);
        List<MergedReport> reports = mergedReportRepository.findByCreatedByAndReportStartDateAndReportEndDateAndMergeTypeOrderByUpdatedAtDesc(
                createdBy,
                reportStartDate,
                reportEndDate,
                requestedMergeType
        );

        Map<Long, List<Long>> sourceItemIdsByReportId = getSourceItemIdsByReportId(reports);
        return reports.stream()
                .map(report -> MergedReportResponse.from(
                        report,
                        sourceItemIdsByReportId.getOrDefault(report.getId(), List.of())
                ))
                .toList();
    }

    @Transactional
    public MergedReportResponse update(String loginId, Long reportId, MergedReportRequest request) {
        User createdBy = getUser(loginId);
        validateRequest(createdBy, request);

        MergedReport report = mergedReportRepository.findByCreatedByAndId(createdBy, reportId)
                .orElseThrow(() -> new EntityNotFoundException("Merged report not found."));
        validateMergeType(createdBy, report.getMergeType());
        if (request.mergeType() != report.getMergeType()) {
            throw new IllegalArgumentException("Merge type cannot be changed.");
        }
        report.update(
                request.mergeType(),
                request.reportStartDate(),
                request.reportEndDate(),
                request.mergedText().trim(),
                normalizeStatus(request.status())
        );

        if (request.sourceItemIds() != null) {
            replaceSourceItems(report, createdBy, request.sourceItemIds());
        } else {
            validateExistingSourceItems(createdBy, report);
        }

        return MergedReportResponse.from(report, getSourceItemIds(report));
    }

    private void validateRequest(User user, MergedReportRequest request) {
        validateDateRange(request.reportStartDate(), request.reportEndDate());
        validateMergeType(user, request.mergeType());
    }

    private void validateDateRange(LocalDate reportStartDate, LocalDate reportEndDate) {
        if (reportStartDate.isAfter(reportEndDate)) {
            throw new IllegalArgumentException("Report start date must be before or equal to report end date.");
        }
    }

    private void validateMergeType(User user, MergeType mergeType) {
        if (mergeType != expectedMergeType(user)) {
            throw new AccessDeniedException("Merge type is not allowed for current user role.");
        }
    }

    private MergeType expectedMergeType(User user) {
        return user.getRole() == UserRole.MANAGER ? MergeType.ADMIN : MergeType.MEMBER;
    }

    private MergedReportStatus normalizeStatus(MergedReportStatus status) {
        return status == null ? MergedReportStatus.SAVED : status;
    }

    private void replaceSourceItems(MergedReport report, User createdBy, List<Long> sourceItemIds) {
        if (sourceItemIds == null) {
            return;
        }

        List<WeeklyReportItem> sourceItems = getValidatedSourceItems(createdBy, report, sourceItemIds);
        mergedReportItemRepository.deleteByMergedReport(report);
        mergedReportItemRepository.flush();
        sourceItems.forEach(sourceItem -> mergedReportItemRepository.save(new MergedReportItem(report, sourceItem)));
    }

    private List<WeeklyReportItem> getValidatedSourceItems(
            User createdBy,
            MergedReport report,
            List<Long> sourceItemIds
    ) {
        Set<Long> requestedIds = new HashSet<>(sourceItemIds);
        if (requestedIds.size() != sourceItemIds.size()) {
            throw new IllegalArgumentException("Duplicate source report item ids are not allowed.");
        }
        if (requestedIds.isEmpty()) {
            return List.of();
        }

        List<WeeklyReportItem> sourceItems = findAvailableSourceItems(createdBy, report, requestedIds);
        if (sourceItems.size() != requestedIds.size()) {
            throw new AccessDeniedException("Source report items are not available for this merged report.");
        }

        sourceItems.forEach(sourceItem -> validateSourceItem(createdBy, report, sourceItem));
        return sourceItems;
    }

    private List<WeeklyReportItem> findAvailableSourceItems(
            User createdBy,
            MergedReport report,
            Set<Long> requestedIds
    ) {
        if (report.getMergeType() == MergeType.MEMBER) {
            return reportItemRepository.findByAuthorAndReportStartDateAndReportEndDateAndIdIn(
                    createdBy,
                    report.getReportStartDate(),
                    report.getReportEndDate(),
                    requestedIds
            );
        }

        return reportItemRepository.findByReportStartDateAndReportEndDateAndSaveStatusAndIdIn(
                report.getReportStartDate(),
                report.getReportEndDate(),
                SaveStatus.SUBMITTED,
                requestedIds
        );
    }

    private void validateSourceItem(User createdBy, MergedReport report, WeeklyReportItem sourceItem) {
        if (!sourceItem.getReportStartDate().equals(report.getReportStartDate())
                || !sourceItem.getReportEndDate().equals(report.getReportEndDate())) {
            throw new IllegalArgumentException("Source report items must belong to the merged report period.");
        }

        if (report.getMergeType() == MergeType.MEMBER) {
            if (!sourceItem.getAuthor().getId().equals(createdBy.getId())) {
                throw new AccessDeniedException("Only your own report items can be linked.");
            }
            if (sourceItem.getSaveStatus() == SaveStatus.DRAFT) {
                throw new IllegalArgumentException("Draft report items cannot be linked to merged reports.");
            }
            return;
        }

        if (sourceItem.getSaveStatus() != SaveStatus.SUBMITTED) {
            throw new IllegalArgumentException("Only submitted report items can be linked to admin merged reports.");
        }
    }

    private List<Long> getSourceItemIds(MergedReport report) {
        return mergedReportItemRepository.findByMergedReportOrderByReportItemIdAsc(report)
                .stream()
                .map(item -> item.getReportItem().getId())
                .toList();
    }

    private void validateExistingSourceItems(User createdBy, MergedReport report) {
        mergedReportItemRepository.findByMergedReportOrderByReportItemIdAsc(report)
                .forEach(item -> validateSourceItem(createdBy, report, item.getReportItem()));
    }

    private Map<Long, List<Long>> getSourceItemIdsByReportId(List<MergedReport> reports) {
        if (reports.isEmpty()) {
            return Map.of();
        }

        return mergedReportItemRepository.findByMergedReportInOrderByMergedReportIdAscReportItemIdAsc(reports)
                .stream()
                .collect(Collectors.groupingBy(
                        item -> item.getMergedReport().getId(),
                        Collectors.mapping(item -> item.getReportItem().getId(), Collectors.toList())
                ));
    }

    private User getUser(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
    }
}
