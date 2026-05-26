package com.metabuild.weeklyreport.mergedreport.service;

import com.metabuild.weeklyreport.mergedreport.dto.MergedReportRequest;
import com.metabuild.weeklyreport.mergedreport.dto.MergedReportResponse;
import com.metabuild.weeklyreport.mergedreport.entity.MergeType;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReport;
import com.metabuild.weeklyreport.mergedreport.entity.MergedReportStatus;
import com.metabuild.weeklyreport.mergedreport.repository.MergedReportRepository;
import com.metabuild.weeklyreport.user.entity.User;
import com.metabuild.weeklyreport.user.entity.UserRole;
import com.metabuild.weeklyreport.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MergedReportService {

    private final MergedReportRepository mergedReportRepository;
    private final UserRepository userRepository;

    public MergedReportService(
            MergedReportRepository mergedReportRepository,
            UserRepository userRepository
    ) {
        this.mergedReportRepository = mergedReportRepository;
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

        return MergedReportResponse.from(mergedReportRepository.save(report));
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

        return reports.stream().map(MergedReportResponse::from).toList();
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

        return MergedReportResponse.from(report);
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

    private User getUser(String loginId) {
        return userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
    }
}
