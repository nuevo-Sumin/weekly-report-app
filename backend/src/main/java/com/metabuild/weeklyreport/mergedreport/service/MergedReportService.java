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
        MergedReportStatus status = normalizeStatus(request.status());

        if (status == MergedReportStatus.FINAL) {
            List<MergedReport> finalReports = findFinalReports(createdBy, request);
            if (!finalReports.isEmpty()) {
                MergedReport existingFinalReport = finalReports.get(0);
                validateFinalReportCanBeChanged(existingFinalReport);
                existingFinalReport.update(
                        request.mergeType(),
                        request.reportStartDate(),
                        request.reportEndDate(),
                        request.mergedText().trim(),
                        status
                );
                replaceSourceItems(existingFinalReport, createdBy, request.sourceItemIds());
                demoteOtherFinalReports(createdBy, existingFinalReport);
                return MergedReportResponse.from(existingFinalReport, getSourceItemIds(existingFinalReport));
            }
        }

        MergedReport report = new MergedReport(
                createdBy,
                request.mergeType(),
                request.reportStartDate(),
                request.reportEndDate(),
                request.mergedText().trim(),
                status
        );

        MergedReport savedReport = mergedReportRepository.save(report);
        replaceSourceItems(savedReport, createdBy, request.sourceItemIds());
        if (status == MergedReportStatus.FINAL) {
            demoteOtherFinalReports(createdBy, savedReport);
        }
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

    @Transactional(readOnly = true)
    public List<MergedReportResponse> getSubmittedMemberReportsForAdmin(
            String loginId,
            LocalDate reportStartDate,
            LocalDate reportEndDate
    ) {
        User manager = getUser(loginId);
        if (manager.getRole() != UserRole.MANAGER) {
            throw new AccessDeniedException("관리자만 개발자 최종병합 제출본을 조회할 수 있습니다.");
        }
        validateDateRange(reportStartDate, reportEndDate);

        List<MergedReport> reports = mergedReportRepository.findByReportStartDateAndReportEndDateAndMergeTypeAndStatusOrderByUpdatedAtDesc(
                reportStartDate,
                reportEndDate,
                MergeType.MEMBER,
                MergedReportStatus.FINAL
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
        MergedReportStatus status = normalizeStatus(request.status());

        MergedReport report = mergedReportRepository.findByCreatedByAndId(createdBy, reportId)
                .orElseThrow(() -> new EntityNotFoundException("병합 결과를 찾을 수 없습니다."));
        validateMergeType(createdBy, report.getMergeType());
        if (request.mergeType() != report.getMergeType()) {
            throw new IllegalArgumentException("병합 유형은 변경할 수 없습니다.");
        }
        boolean cancelingFinalReport = report.getStatus() == MergedReportStatus.FINAL && status != MergedReportStatus.FINAL;
        List<WeeklyReportItem> sourceItemsToCancel = cancelingFinalReport ? getSourceItems(report) : List.of();
        if (report.getStatus() == MergedReportStatus.FINAL) {
            validateFinalReportCanBeChanged(report);
        }
        report.update(
                request.mergeType(),
                request.reportStartDate(),
                request.reportEndDate(),
                request.mergedText().trim(),
                status
        );

        if (request.sourceItemIds() != null) {
            replaceSourceItems(report, createdBy, request.sourceItemIds());
        } else {
            validateExistingSourceItems(createdBy, report);
        }
        if (status == MergedReportStatus.FINAL) {
            demoteOtherFinalReports(createdBy, report);
        }
        if (cancelingFinalReport) {
            sourceItemsToCancel.forEach(WeeklyReportItem::cancelSubmission);
        }

        return MergedReportResponse.from(report, getSourceItemIds(report));
    }

    private void validateRequest(User user, MergedReportRequest request) {
        validateDateRange(request.reportStartDate(), request.reportEndDate());
        validateMergeType(user, request.mergeType());
    }

    private void validateDateRange(LocalDate reportStartDate, LocalDate reportEndDate) {
        if (reportStartDate.isAfter(reportEndDate)) {
            throw new IllegalArgumentException("보고 시작일은 보고 종료일보다 늦을 수 없습니다.");
        }
    }

    private void validateMergeType(User user, MergeType mergeType) {
        if (mergeType != expectedMergeType(user)) {
            throw new AccessDeniedException("현재 권한으로는 해당 병합 유형을 사용할 수 없습니다.");
        }
    }

    private MergeType expectedMergeType(User user) {
        return user.getRole() == UserRole.MANAGER ? MergeType.ADMIN : MergeType.MEMBER;
    }

    private MergedReportStatus normalizeStatus(MergedReportStatus status) {
        return status == null ? MergedReportStatus.SAVED : status;
    }

    private List<MergedReport> findFinalReports(User createdBy, MergedReportRequest request) {
        return mergedReportRepository.findByCreatedByAndReportStartDateAndReportEndDateAndMergeTypeAndStatusOrderByUpdatedAtDesc(
                createdBy,
                request.reportStartDate(),
                request.reportEndDate(),
                request.mergeType(),
                MergedReportStatus.FINAL
        );
    }

    private void demoteOtherFinalReports(User createdBy, MergedReport currentFinalReport) {
        mergedReportRepository.findByCreatedByAndReportStartDateAndReportEndDateAndMergeTypeAndStatusOrderByUpdatedAtDesc(
                        createdBy,
                        currentFinalReport.getReportStartDate(),
                        currentFinalReport.getReportEndDate(),
                        currentFinalReport.getMergeType(),
                        MergedReportStatus.FINAL
                )
                .stream()
                .filter(report -> !report.getId().equals(currentFinalReport.getId()))
                .forEach(report -> report.changeStatus(MergedReportStatus.SAVED));
    }

    private void validateFinalReportCanBeChanged(MergedReport report) {
        if (report.getMergeType() != MergeType.MEMBER) {
            return;
        }

        List<WeeklyReportItem> sourceItems = getSourceItems(report);
        if (!sourceItems.isEmpty()
                && mergedReportItemRepository.existsByReportItemInAndMergedReportMergeType(sourceItems, MergeType.ADMIN)) {
            throw new IllegalArgumentException("팀장 취합에 사용된 제출본은 취소하거나 수정할 수 없습니다.");
        }
    }

    private List<WeeklyReportItem> getSourceItems(MergedReport report) {
        return mergedReportItemRepository.findByMergedReportOrderByReportItemIdAsc(report)
                .stream()
                .map(MergedReportItem::getReportItem)
                .toList();
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
            throw new IllegalArgumentException("원천 업무 항목 ID가 중복되었습니다.");
        }
        if (requestedIds.isEmpty()) {
            return List.of();
        }

        List<WeeklyReportItem> sourceItems = findAvailableSourceItems(createdBy, report, requestedIds);
        if (sourceItems.size() != requestedIds.size()) {
            throw new AccessDeniedException("이 병합 결과에 사용할 수 없는 원천 업무 항목이 포함되어 있습니다.");
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
            throw new IllegalArgumentException("원천 업무 항목은 병합 결과의 보고기간에 포함되어야 합니다.");
        }

        if (report.getMergeType() == MergeType.MEMBER) {
            if (!sourceItem.getAuthor().getId().equals(createdBy.getId())) {
                throw new AccessDeniedException("본인의 업무 항목만 연결할 수 있습니다.");
            }
            if (sourceItem.getSaveStatus() == SaveStatus.DRAFT) {
                throw new IllegalArgumentException("임시저장 항목은 병합 결과에 연결할 수 없습니다.");
            }
            return;
        }

        if (sourceItem.getSaveStatus() != SaveStatus.SUBMITTED) {
            throw new IllegalArgumentException("관리자 취합에는 제출된 업무 항목만 연결할 수 있습니다.");
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
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
