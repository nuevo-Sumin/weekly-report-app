package com.metabuild.weeklyreport.reportitem.service;

import com.metabuild.weeklyreport.reportitem.dto.AdminReportItemResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemRequest;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemResponse;
import com.metabuild.weeklyreport.reportitem.dto.ReportItemSubmitRequest;
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
    private final UserRepository userRepository;

    public WeeklyReportItemService(
            WeeklyReportItemRepository reportItemRepository,
            UserRepository userRepository
    ) {
        this.reportItemRepository = reportItemRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ReportItemResponse create(String loginId, ReportItemRequest request) {
        User author = getUser(loginId);
        SaveStatus saveStatus = normalizeWritableSaveStatus(request.saveStatus());

        WeeklyReportItem item = new WeeklyReportItem(
                author,
                request.reportStartDate(),
                request.reportEndDate(),
                request.weekType(),
                trim(request.unitTask()),
                trim(request.title()),
                trim(request.detailContent()),
                trim(request.progressContent()),
                request.status(),
                request.progressRate(),
                request.dueDate(),
                request.completed(),
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
            throw new IllegalArgumentException("Submitted report items cannot be edited.");
        }
        item.update(
                request.reportStartDate(),
                request.reportEndDate(),
                request.weekType(),
                trim(request.unitTask()),
                trim(request.title()),
                trim(request.detailContent()),
                trim(request.progressContent()),
                request.status(),
                request.progressRate(),
                request.dueDate(),
                request.completed(),
                normalizeWritableSaveStatus(request.saveStatus())
        );
        return ReportItemResponse.from(item);
    }

    @Transactional
    public List<ReportItemResponse> submit(String loginId, ReportItemSubmitRequest request) {
        User author = getUser(loginId);
        Set<Long> requestedIds = new HashSet<>(request.itemIds());
        if (requestedIds.size() != request.itemIds().size()) {
            throw new IllegalArgumentException("Duplicate report item ids are not allowed.");
        }
        List<WeeklyReportItem> items = reportItemRepository.findByAuthorAndIdIn(author, requestedIds);

        if (items.size() != requestedIds.size()) {
            throw new AccessDeniedException("Only your own report items can be submitted.");
        }
        if (items.stream().anyMatch(item -> item.getSaveStatus() != SaveStatus.SAVED)) {
            throw new IllegalArgumentException("Only saved report items can be submitted.");
        }

        LocalDateTime now = LocalDateTime.now();
        items.forEach(item -> item.submit(now));
        return items.stream().map(ReportItemResponse::from).toList();
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
            throw new IllegalArgumentException("Report start date must be before or equal to report end date.");
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
                .orElseThrow(() -> new EntityNotFoundException("Report item not found."));
    }

    private User getUser(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
    }

    private SaveStatus normalizeWritableSaveStatus(SaveStatus saveStatus) {
        if (saveStatus == null) {
            return SaveStatus.SAVED;
        }
        if (saveStatus == SaveStatus.SUBMITTED) {
            throw new IllegalArgumentException("Use submit API to submit report items.");
        }
        return saveStatus;
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
