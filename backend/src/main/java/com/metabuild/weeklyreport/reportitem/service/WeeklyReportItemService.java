package com.metabuild.weeklyreport.reportitem.service;

import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import com.metabuild.weeklyreport.mergedreport.repository.MergedReportItemRepository;
import com.metabuild.weeklyreport.reportitem.dto.AdminReportItemResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemRequest;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemSubmitRequest;
import com.metabuild.weeklyreport.reportitem.entity.ReportItemSourceType;
import com.metabuild.weeklyreport.reportitem.entity.ReportItemCategory;
import com.metabuild.weeklyreport.reportitem.entity.SaveStatus;
import com.metabuild.weeklyreport.reportitem.entity.WeeklyReportItem;
import com.metabuild.weeklyreport.reportitem.entity.WeekType;
import com.metabuild.weeklyreport.reportitem.repository.WeeklyReportItemRepository;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WeeklyReportItemService {

    private final WeeklyReportItemRepository reportItemRepository;
    private final MergedReportItemRepository mergedReportItemRepository;
    private final UserRepository userRepository;

    public WeeklyReportItemService(
            WeeklyReportItemRepository reportItemRepository,
            MergedReportItemRepository mergedReportItemRepository,
            UserRepository userRepository
    ) {
        this.reportItemRepository = reportItemRepository;
        this.mergedReportItemRepository = mergedReportItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ReportItemResponse create(String loginId, ReportItemRequest request) {
        User author = getUser(loginId);
        SaveStatus saveStatus = normalizeWritableSaveStatus(request.saveStatus());
        ReportItemSourceType sourceType = normalizeSourceType(request.sourceType());
        String sourceKey = normalizeSourceKey(sourceType, request.sourceKey());
        validateDuplicateSource(author, request, sourceType, sourceKey, null);

        WeeklyReportItem item = new WeeklyReportItem(
                author,
                request.reportStartDate(),
                request.reportEndDate(),
                request.weekType(),
                normalizeCategory(request.category()),
                normalizeUnitTask(request.category(), request.unitTask()),
                trim(request.title()),
                trim(request.detailContent()),
                trim(request.progressContent()),
                request.status(),
                request.progressRate(),
                request.dueDate(),
                request.completed(),
                sourceType,
                sourceKey,
                normalizeSourceRowNumber(sourceType, request.sourceRowNumber()),
                saveStatus
        );

        return ReportItemResponse.from(reportItemRepository.save(item));
    }

    @Transactional(readOnly = true)
    public List<ReportItemResponse> getMyItems(
            String loginId,
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            SaveStatus saveStatus
    ) {
        User author = getUser(loginId);
        List<WeeklyReportItem> items;
        if (saveStatus == null) {
            items = reportItemRepository.findByAuthorAndReportStartDateAndReportEndDateOrderByWeekTypeAscUnitTaskAscIdAsc(
                    author,
                    reportStartDate,
                    reportEndDate
            );
        } else {
            items = reportItemRepository.findByAuthorAndReportStartDateAndReportEndDateAndSaveStatusOrderByWeekTypeAscUnitTaskAscIdAsc(
                    author,
                    reportStartDate,
                    reportEndDate,
                    saveStatus
            );
        }

        return items.stream().map(ReportItemResponse::from).toList();
    }

    @Transactional
    public ReportItemResponse update(String loginId, Long itemId, ReportItemRequest request) {
        WeeklyReportItem item = getOwnedItem(loginId, itemId);
        if (item.getSaveStatus() == SaveStatus.SUBMITTED) {
            throw new IllegalArgumentException("제출된 업무 항목은 수정할 수 없습니다.");
        }
        ReportItemSourceType sourceType = normalizeSourceType(item.getSourceType());
        String sourceKey = item.getSourceKey();
        Integer sourceRowNumber = item.getSourceRowNumber();
        validateDuplicateSource(item.getAuthor(), request, sourceType, sourceKey, item.getId());
        item.update(
                request.reportStartDate(),
                request.reportEndDate(),
                request.weekType(),
                normalizeCategory(request.category()),
                normalizeUnitTask(request.category(), request.unitTask()),
                trim(request.title()),
                trim(request.detailContent()),
                trim(request.progressContent()),
                request.status(),
                request.progressRate(),
                request.dueDate(),
                request.completed(),
                sourceType,
                sourceKey,
                sourceRowNumber,
                normalizeWritableSaveStatus(request.saveStatus())
        );
        return ReportItemResponse.from(item);
    }

    @Transactional
    public List<ReportItemResponse> submit(String loginId, ReportItemSubmitRequest request) {
        User author = getUser(loginId);
        Set<Long> requestedIds = new HashSet<>(request.itemIds());
        if (requestedIds.size() != request.itemIds().size()) {
            throw new IllegalArgumentException("업무 항목 ID가 중복되었습니다.");
        }
        List<WeeklyReportItem> items = reportItemRepository.findByAuthorAndIdIn(author, requestedIds);

        if (items.size() != requestedIds.size()) {
            throw new AccessDeniedException("본인의 업무 항목만 제출할 수 있습니다.");
        }
        if (items.stream().anyMatch(item -> item.getSaveStatus() != SaveStatus.SAVED)) {
            throw new IllegalArgumentException("저장 상태의 업무 항목만 제출할 수 있습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        items.forEach(item -> item.submit(now));
        return items.stream().map(ReportItemResponse::from).toList();
    }

    @Transactional
    public void delete(String loginId, Long itemId) {
        WeeklyReportItem item = getOwnedItem(loginId, itemId);
        if (mergedReportItemRepository.existsByReportItemAndMergedReportStatus(item, MergedReportStatus.FINAL)) {
            throw new IllegalArgumentException("최종 제출된 병합 결과에 포함된 업무 항목은 삭제할 수 없습니다.");
        }

        mergedReportItemRepository.deleteByReportItemAndMergedReportStatusNot(item, MergedReportStatus.FINAL);
        reportItemRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public List<AdminReportItemResponse> getSubmittedItemsForAdmin(
            LocalDate reportStartDate,
            LocalDate reportEndDate,
            String memberLoginId,
            String unitTask,
            WeekType weekType
    ) {
        if (reportStartDate.isAfter(reportEndDate)) {
            throw new IllegalArgumentException("보고 시작일은 보고 종료일보다 늦을 수 없습니다.");
        }

        return reportItemRepository.findSubmittedItemsForAdmin(
                        reportStartDate,
                        reportEndDate,
                        normalizeOptional(memberLoginId),
                        normalizeOptional(unitTask),
                        weekType
                )
                .stream()
                .map(AdminReportItemResponse::from)
                .toList();
    }

    private WeeklyReportItem getOwnedItem(String loginId, Long itemId) {
        User author = getUser(loginId);
        return reportItemRepository.findByAuthorAndId(author, itemId)
                .orElseThrow(() -> new EntityNotFoundException("업무 항목을 찾을 수 없습니다."));
    }

    private User getUser(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
    }

    private SaveStatus normalizeWritableSaveStatus(SaveStatus saveStatus) {
        if (saveStatus == null) {
            return SaveStatus.SAVED;
        }
        if (saveStatus == SaveStatus.SUBMITTED) {
            throw new IllegalArgumentException("업무 항목 제출은 제출 API를 사용해 주세요.");
        }
        return saveStatus;
    }

    private ReportItemSourceType normalizeSourceType(ReportItemSourceType sourceType) {
        return sourceType == null ? ReportItemSourceType.MANUAL : sourceType;
    }

    private ReportItemCategory normalizeCategory(ReportItemCategory category) {
        return category == null ? ReportItemCategory.EXECUTION : category;
    }

    private String normalizeUnitTask(ReportItemCategory category, String unitTask) {
        if (normalizeCategory(category) == ReportItemCategory.BUSINESS_MANAGEMENT) {
            return "사업관리";
        }
        return trim(unitTask);
    }

    private String normalizeSourceKey(ReportItemSourceType sourceType, String sourceKey) {
        if (sourceType != ReportItemSourceType.CSV) {
            return null;
        }
        return trim(sourceKey);
    }

    private Integer normalizeSourceRowNumber(ReportItemSourceType sourceType, Integer sourceRowNumber) {
        return sourceType == ReportItemSourceType.CSV ? sourceRowNumber : null;
    }

    private void validateDuplicateSource(
            User author,
            ReportItemRequest request,
            ReportItemSourceType sourceType,
            String sourceKey,
            Long currentItemId
    ) {
        if (sourceType != ReportItemSourceType.CSV) {
            return;
        }

        boolean exists = currentItemId == null
                ? reportItemRepository.existsByAuthorAndReportStartDateAndReportEndDateAndWeekTypeAndSourceTypeAndSourceKey(
                        author,
                        request.reportStartDate(),
                        request.reportEndDate(),
                        request.weekType(),
                        sourceType,
                        sourceKey
                )
                : reportItemRepository.existsByAuthorAndReportStartDateAndReportEndDateAndWeekTypeAndSourceTypeAndSourceKeyAndIdNot(
                        author,
                        request.reportStartDate(),
                        request.reportEndDate(),
                        request.weekType(),
                        sourceType,
                        sourceKey,
                        currentItemId
                );

        if (exists) {
            throw new IllegalArgumentException("해당 보고기간과 주차에 이미 저장된 CSV 행입니다.");
        }
    }

    private String trim(String value) {
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
