import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildIssueUrl,
  businessManagementTaskOptions,
  categoryLabels,
  compareReportItemsByUnitTask,
  csvWeekSelectionLabels,
  initialReportForm,
  manualWeekSelectionLabels,
  normalizeReportItemUnitTask,
  normalizeUnitTaskName,
  statusLabels,
  unitTaskOrder,
  weekTypeLabels,
} from '../constants';
import { formatDate, getPreviousWeekRange, getWeekRange, toDateInputValue } from '../dateUtils';
import { buildPreview, extractWeekSection, formatReportItemDueLabel } from '../reportPreview';
import { requestApi } from '../api';
import { filterCsvRowsForReportPeriod, parseReportCsvBufferWithErrors } from '../csvReportImport';

function MemberReportScreen({ token, user, isLoading, setIsLoading, setMessage }) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const latestMergedReportsRequestId = useRef(0);
  const csvModalRef = useRef(null);
  const csvModalCloseButtonRef = useRef(null);
  const weekComparisonModalRef = useRef(null);
  const weekComparisonCloseButtonRef = useRef(null);
  const [inputMode, setInputMode] = useState('CSV');
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [mergedReportId, setMergedReportId] = useState(null);
  const [mergedText, setMergedText] = useState(null);
  const [mergedReportStatus, setMergedReportStatus] = useState(null);
  const [isMergedReportEditing, setIsMergedReportEditing] = useState(true);
  const [savedMergedReports, setSavedMergedReports] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvValidationResults, setCsvValidationResults] = useState([]);
  const [csvSaveResults, setCsvSaveResults] = useState([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvExcludedOpen, setCsvExcludedOpen] = useState(false);
  const [weekComparisonOpen, setWeekComparisonOpen] = useState(false);
  const [weekComparison, setWeekComparison] = useState(null);
  const [copySucceeded, setCopySucceeded] = useState(false);

  const weekRange = useMemo(() => getWeekRange(today), [today]);
  const previousWeekRange = useMemo(() => getPreviousWeekRange(today), [today]);
  const previewText = useMemo(() => buildPreview(items, selectedIds), [items, selectedIds]);
  const activeMergedText = mergedText ?? previewText;
  const isFinalMergedReport = mergedReportStatus === 'FINAL';
  const isFinalMergedReportLocked = isFinalMergedReport && !isMergedReportEditing;
  const canPersistMergedReport = (mergedReportId || selectedIds.length > 0) && activeMergedText.trim() && !isLoading;
  const isPendingManager = user.requestedRole === 'MANAGER' && user.roleApprovalStatus === 'PENDING';
  const selectedCsvRowCount = useMemo(() => csvRows.filter((row) => row.selected).length, [csvRows]);
  const hasCsvImportState = csvRows.length > 0 || csvValidationResults.length > 0 || csvSaveResults.length > 0;
  const allCsvRowsSelected = csvRows.length > 0 && selectedCsvRowCount === csvRows.length;
  const csvSaveSuccessCount = useMemo(() => csvSaveResults.filter((result) => result.status === 'success').length, [csvSaveResults]);
  const csvSaveFailureCount = useMemo(() => csvSaveResults.filter((result) => result.status === 'error').length, [csvSaveResults]);
  const csvCompletedExcludedResults = useMemo(
    () => csvValidationResults.filter((result) => result.status === 'warning' && result.reason === 'COMPLETED_EXCLUDED'),
    [csvValidationResults]
  );
  const csvStatusExcludedResults = useMemo(
    () => csvValidationResults.filter((result) => result.status === 'warning' && result.reason === 'STATUS_EXCLUDED'),
    [csvValidationResults]
  );
  const csvValidationErrorResults = useMemo(() => csvValidationResults.filter((result) => result.status !== 'warning'), [csvValidationResults]);
  const csvCompletedExcludedCount = csvCompletedExcludedResults.length;
  const csvStatusExcludedCount = csvStatusExcludedResults.length;
  const csvExcludedCount = csvCompletedExcludedCount + csvStatusExcludedCount;

  useEffect(() => {
    if (token) {
      setSavedMergedReports([]);
      loadReportItems();
      loadMergedReports();
    }
  }, [token, weekRange.startDate, weekRange.endDate]);

  useEffect(() => {
    if (!csvModalOpen) {
      return undefined;
    }

    csvModalCloseButtonRef.current?.focus();

    function handleModalKeyDown(event) {
      if (event.key === 'Escape') {
        setCsvModalOpen(false);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = csvModalRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
      );
      const focusableList = Array.from(focusableElements ?? []);
      if (focusableList.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableList[0];
      const lastElement = focusableList[focusableList.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);
    return () => document.removeEventListener('keydown', handleModalKeyDown);
  }, [csvModalOpen]);

  useEffect(() => {
    if (!weekComparisonOpen) {
      return undefined;
    }

    weekComparisonCloseButtonRef.current?.focus();

    function handleModalKeyDown(event) {
      if (event.key === 'Escape') {
        setWeekComparisonOpen(false);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = weekComparisonModalRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
      );
      const focusableList = Array.from(focusableElements ?? []);
      if (focusableList.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableList[0];
      const lastElement = focusableList[focusableList.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);
    return () => document.removeEventListener('keydown', handleModalKeyDown);
  }, [weekComparisonOpen]);

  function updateReportForm(field, value) {
    setReportForm((current) => {
      if (field === 'category') {
        return {
          ...current,
          category: value,
          unitTask: value === 'BUSINESS_MANAGEMENT' ? '' : (current.unitTask || unitTaskOrder[0]),
          title: value === 'BUSINESS_MANAGEMENT' ? '' : current.title,
          businessTaskOption: value === 'BUSINESS_MANAGEMENT' ? current.businessTaskOption : '',
          businessTaskCustomTitle: value === 'BUSINESS_MANAGEMENT' ? current.businessTaskCustomTitle : '',
        };
      }
      if (field === 'status') {
        return {
          ...current,
          status: value,
          dueDate: value === 'IN_PROGRESS' ? current.dueDate : '',
        };
      }
      if (field === 'businessTaskOption') {
        return {
          ...current,
          businessTaskOption: value,
          businessTaskCustomTitle: value === '기타' ? current.businessTaskCustomTitle : '',
        };
      }
      return { ...current, [field]: value };
    });
  }

  function updateCsvRow(tempId, field, value) {
    setCsvRows((current) => current.map((row) => (
      row.tempId === tempId ? { ...row, [field]: value } : row
    )));
  }

  function clearCsvImport() {
    setCsvRows([]);
    setCsvFileName('');
    setCsvValidationResults([]);
    setCsvSaveResults([]);
    setCsvModalOpen(false);
    setCsvExcludedOpen(false);
  }

  function clearCurrentWork() {
    clearCsvImport();
    setSelectedIds([]);
    setReportForm(initialReportForm);
    setMergedReportId(null);
    setMergedText(null);
    setMergedReportStatus(null);
    setIsMergedReportEditing(true);
    setCopySucceeded(false);
    setInputMode('CSV');
    setMessage('현재 입력 내용을 초기화했습니다. 저장된 데이터는 삭제되지 않습니다.');
  }

  function updateAllCsvRowsSelected(selected) {
    setCsvRows((current) => current.map((row) => ({ ...row, selected })));
  }

  function getSelectedWeekTypes(row) {
    return row.weekSelection === 'ALL' ? ['THIS_WEEK', 'NEXT_WEEK'] : [row.weekSelection];
  }

  function getPendingWeekTypes(row) {
    return getSelectedWeekTypes(row).filter((weekType) => !row.savedWeekTypes?.includes(weekType));
  }

  function getSavedCsvWeekTypes(row, itemList = items) {
    return itemList
      .filter((item) => item.sourceType === 'CSV' && item.sourceKey === row.sourceKey)
      .map((item) => item.weekType);
  }

  function isDuplicateCsvMessage(message) {
    const normalizedMessage = String(message ?? '');
    return normalizedMessage.includes('CSV row has already been saved')
      || normalizedMessage.includes('이미 저장된 CSV 행');
  }

  function handleCsvFileChange(event) {
    const [file] = event.target.files;
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage('CSV 파일만 업로드할 수 있습니다.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseReportCsvBufferWithErrors(reader.result);
        const periodFiltered = filterCsvRowsForReportPeriod(parsed.rows, weekRange);
        setCsvRows(periodFiltered.rows.map((row) => ({
          ...row,
          savedWeekTypes: getSavedCsvWeekTypes(row),
        })));
        setCsvFileName(file.name);
        const validationResults = [
          ...parsed.errors.map((error) => ({
            key: `csv-parse-error-${error.lineNumber}`,
            status: 'error',
            title: 'CSV 검증 오류',
            sourceKey: '-',
            sourceRowNumber: error.lineNumber,
            weekType: null,
            message: error.message,
          })),
          ...periodFiltered.skipped.map((skipped) => ({
            key: `csv-period-skip-${skipped.lineNumber}`,
            status: 'warning',
            title: skipped.title,
            sourceKey: skipped.sourceKey,
            sourceRowNumber: skipped.lineNumber,
            completedDate: skipped.completedDate,
            reason: skipped.reason,
            weekType: null,
            message: skipped.message,
          })),
        ];
        setCsvValidationResults(validationResults);
        setCsvSaveResults([]);
        setCsvExcludedOpen(false);
        setCsvModalOpen(true);
        const errorNotice = validationResults.length > 0 ? ` 오류/제외 ${validationResults.length}건은 목록에서 제외했습니다.` : '';
        if (periodFiltered.rows.length === 0 && validationResults.length > 0) {
          setMessage(`저장 가능한 CSV 행이 없습니다. 오류/제외 ${validationResults.length}건을 확인해 주세요.`);
          return;
        }
        setMessage(`${periodFiltered.rows.length}개 CSV 행을 불러왔습니다.${errorNotice} 행별 주차 구분을 확인해 주세요.`);
      } catch (error) {
        setCsvRows([]);
        setCsvFileName('');
        setCsvValidationResults([]);
        setCsvSaveResults([]);
        setCsvModalOpen(false);
        setCsvExcludedOpen(false);
        setMessage(error.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      setMessage('CSV 파일을 읽지 못했습니다.');
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  async function saveCsvRows() {
    const rowsToSave = csvRows.filter((row) => row.selected);
    if (rowsToSave.length === 0) {
      setMessage('저장할 CSV 행을 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      let createdCount = 0;
      let failedCount = 0;
      const results = [];
      const savedWeekTypesByRow = {};
      const selectedSources = [];
      for (const row of rowsToSave) {
        const weekTypes = getPendingWeekTypes(row);
        if (weekTypes.length === 0) {
          getSelectedWeekTypes(row).forEach((weekType) => {
            selectedSources.push({ sourceKey: row.sourceKey, weekType });
          });
          results.push({
            key: `${row.tempId}-skipped`,
            status: 'success',
            title: row.title,
            sourceKey: row.sourceKey,
            sourceRowNumber: row.sourceRowNumber,
            weekType: row.weekSelection === 'ALL' ? 'THIS_WEEK' : row.weekSelection,
            message: '이미 저장됨',
          });
          continue;
        }
        for (const weekType of weekTypes) {
          try {
            const savedItem = await requestApi('/api/report-items', {
              body: {
                reportStartDate: weekRange.startDate,
                reportEndDate: weekRange.endDate,
                weekType,
                category: row.category,
                unitTask: row.unitTask,
                title: row.title,
                detailContent: row.title,
                progressContent: row.progressContent,
                status: row.completed ? 'DONE' : row.status,
                progressRate: row.progressRate,
                dueDate: row.dueDate || null,
                completed: row.completed,
                sourceType: 'CSV',
                sourceKey: row.sourceKey,
                sourceRowNumber: row.sourceRowNumber,
                saveStatus: 'SAVED',
              },
              token,
            });
            createdCount += 1;
            selectedSources.push({
              sourceKey: savedItem.sourceKey ?? row.sourceKey,
              weekType: savedItem.weekType ?? weekType,
            });
            savedWeekTypesByRow[row.tempId] = [...(savedWeekTypesByRow[row.tempId] ?? []), weekType];
            results.push({
              key: `${row.tempId}-${weekType}`,
              status: 'success',
              title: row.title,
              sourceKey: row.sourceKey,
              sourceRowNumber: row.sourceRowNumber,
              weekType,
              message: '저장됨',
            });
          } catch (error) {
            if (isDuplicateCsvMessage(error.message)) {
              savedWeekTypesByRow[row.tempId] = [...(savedWeekTypesByRow[row.tempId] ?? []), weekType];
              selectedSources.push({ sourceKey: row.sourceKey, weekType });
              results.push({
                key: `${row.tempId}-${weekType}`,
                status: 'success',
                title: row.title,
                sourceKey: row.sourceKey,
                sourceRowNumber: row.sourceRowNumber,
                weekType,
                message: '이미 저장됨',
              });
              continue;
            }

            failedCount += 1;
            results.push({
              key: `${row.tempId}-${weekType}`,
              status: 'error',
              title: row.title,
              sourceKey: row.sourceKey,
              sourceRowNumber: row.sourceRowNumber,
              weekType,
              message: error.message,
            });
          }
        }
      }

      setCsvSaveResults(results);
      if (failedCount === 0) {
        setCsvRows([]);
        setCsvFileName('');
        setCsvModalOpen(false);
      } else {
        setCsvRows((current) => current.map((row) => (
          savedWeekTypesByRow[row.tempId]
            ? {
                ...row,
                savedWeekTypes: [...new Set([...(row.savedWeekTypes ?? []), ...savedWeekTypesByRow[row.tempId]])],
              }
            : row
        )));
      }
      const validationNotice = csvValidationResults.length > 0 ? `, 검증 제외 ${csvValidationResults.length}건` : '';
      setMessage(`CSV 저장 결과: 성공 ${createdCount}건, 실패 ${failedCount}건${validationNotice}`);
      if (selectedSources.length > 0) {
        const refreshedItems = await loadReportItems();
        const nextSelectedIds = refreshedItems
          .filter((item) => item.sourceType === 'CSV'
            && item.saveStatus === 'SAVED'
            && selectedSources.some((source) => source.sourceKey === item.sourceKey && source.weekType === item.weekType))
          .map((item) => item.id);
        setSelectedIds([...new Set(nextSelectedIds)]);
        setMergedReportId(null);
        setMergedText(null);
        setMergedReportStatus(null);
        setIsMergedReportEditing(true);
        setCopySucceeded(false);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadReportItems() {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
      });
      const data = await requestApi(`/api/report-items?${query.toString()}`, {
        method: 'GET',
        token,
      });
      const normalizedItems = data
        .map(normalizeReportItemUnitTask)
        .sort(compareReportItemsByUnitTask);
      setItems(normalizedItems);
      setSelectedIds((current) => current.filter((id) => normalizedItems.some((item) => item.id === id && item.saveStatus === 'SAVED')));
      setMergedReportId(null);
      setMergedText(null);
      setMergedReportStatus(null);
      setIsMergedReportEditing(true);
      return normalizedItems;
    } catch (error) {
      setMessage(error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMergedReports() {
    const requestId = latestMergedReportsRequestId.current + 1;
    latestMergedReportsRequestId.current = requestId;
    setIsLoading(true);
    setSavedMergedReports([]);
    try {
      const query = new URLSearchParams({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergeType: 'MEMBER',
      });
      const data = await requestApi(`/api/merged-reports?${query.toString()}`, {
        method: 'GET',
        token,
      });
      if (requestId !== latestMergedReportsRequestId.current) {
        return;
      }
      setSavedMergedReports(data);
    } catch (error) {
      if (requestId === latestMergedReportsRequestId.current) {
        setSavedMergedReports([]);
        setMessage(error.message);
      }
    } finally {
      if (requestId === latestMergedReportsRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  async function openPreviousWeekComparison() {
    setIsLoading(true);
    setMessage('');

    try {
      const query = new URLSearchParams({
        reportStartDate: previousWeekRange.startDate,
        reportEndDate: previousWeekRange.endDate,
        mergeType: 'MEMBER',
      });
      const previousReports = await requestApi(`/api/merged-reports?${query.toString()}`, {
        method: 'GET',
        token,
      });
      const previousFinalReport = previousReports.find((report) => report.status === 'FINAL');
      if (!previousFinalReport) {
        const currentThisWeek = extractWeekSection(activeMergedText, 'THIS_WEEK');
        setWeekComparison({
          previousRange: previousWeekRange,
          currentRange: weekRange,
          previousUpdatedAt: null,
          previousText: '',
          previousSectionFound: true,
          currentText: currentThisWeek.text,
          currentSectionFound: currentThisWeek.found,
        });
        setWeekComparisonOpen(true);
        setMessage('');
        return;
      }

      const previousNextWeek = extractWeekSection(previousFinalReport.mergedText, 'NEXT_WEEK');
      const currentThisWeek = extractWeekSection(activeMergedText, 'THIS_WEEK');
      setWeekComparison({
        previousRange: previousWeekRange,
        currentRange: weekRange,
        previousUpdatedAt: previousFinalReport.updatedAt,
        previousText: previousNextWeek.text,
        previousSectionFound: previousNextWeek.found,
        currentText: currentThisWeek.text,
        currentSectionFound: currentThisWeek.found,
      });
      setWeekComparisonOpen(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveReportItem(saveStatus) {
    setIsLoading(true);
    setMessage('');

    try {
      const manualTitle = reportForm.category === 'BUSINESS_MANAGEMENT'
        ? (
            reportForm.businessTaskOption === '기타'
              ? reportForm.businessTaskCustomTitle.trim()
              : reportForm.businessTaskOption
          )
        : reportForm.title.trim();
      if (!manualTitle) {
        setMessage('세부사항을 입력해 주세요.');
        return;
      }

      const completed = reportForm.status === 'DONE';
      const weekTypes = reportForm.weekType === 'ALL' ? ['THIS_WEEK', 'NEXT_WEEK'] : [reportForm.weekType];
      const detailContent = reportForm.detailContent?.trim() || manualTitle;
      const buildBody = (weekType) => ({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        weekType,
        category: reportForm.category,
        unitTask: reportForm.category === 'BUSINESS_MANAGEMENT' ? '사업관리' : normalizeUnitTaskName(reportForm.unitTask),
        title: manualTitle,
        detailContent,
        progressContent: reportForm.progressContent?.trim() || manualTitle,
        status: reportForm.status,
        progressRate: completed ? 100 : Number(reportForm.progressRate),
        dueDate: reportForm.status === 'IN_PROGRESS' ? (reportForm.dueDate || null) : null,
        completed,
        saveStatus,
      });
      const savedItems = [];
      for (const weekType of weekTypes) {
        const data = await requestApi('/api/report-items', { method: 'POST', body: buildBody(weekType), token });
        savedItems.push(data);
      }
      setReportForm(initialReportForm);
      const savedCountLabel = savedItems.length > 1 ? ` ${savedItems.length}건` : '';
      setMessage(saveStatus === 'DRAFT' ? `임시저장되었습니다.${savedCountLabel}` : `저장되었습니다.${savedCountLabel}`);
      await loadReportItems();
      if (saveStatus === 'SAVED') {
        setSelectedIds((current) => [...new Set([...current, ...savedItems.map((item) => item.id)])]);
        setMergedReportId(null);
        setMergedText(null);
        setMergedReportStatus(null);
        setIsMergedReportEditing(true);
        setCopySucceeded(false);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReportSubmit(event) {
    event.preventDefault();
    const saveStatus = event.nativeEvent.submitter?.value ?? 'SAVED';
    saveReportItem(saveStatus);
  }

  async function markSelectedItemsSubmitted() {
    if (selectedIds.length === 0) {
      setMessage('제출할 항목을 선택해 주세요.');
      return false;
    }
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    if (selectedItems.some((item) => !['SAVED', 'SUBMITTED'].includes(item.saveStatus))) {
      setMessage('저장 또는 제출 상태의 항목만 최종병합에 포함할 수 있습니다.');
      return false;
    }
    const savedIds = selectedItems.filter((item) => item.saveStatus === 'SAVED').map((item) => item.id);
    if (savedIds.length > 0) {
      await requestApi('/api/report-items/submit', {
        body: { itemIds: savedIds },
        token,
      });
    }
    return true;
  }

  function toggleSelected(id) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.saveStatus !== 'SAVED') {
      setMessage('저장 상태의 항목만 제출 대상으로 선택할 수 있습니다.');
      return;
    }
    setCopySucceeded(false);
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
    setMergedReportId(null);
    setMergedText(null);
    setMergedReportStatus(null);
    setIsMergedReportEditing(true);
  }

  function toggleAllSelectedItems() {
    if (selectableItemIds.length === 0) {
      setMessage('선택할 저장 항목이 없습니다.');
      return;
    }
    setCopySucceeded(false);
    setSelectedIds(allSelectableItemsSelected ? [] : selectableItemIds);
    setMergedReportId(null);
    setMergedText(null);
    setMergedReportStatus(null);
    setIsMergedReportEditing(true);
  }

  function loadSavedMergedReport(report) {
    setMergedReportId(report.id);
    setMergedText(report.mergedText);
    setMergedReportStatus(report.status);
    setIsMergedReportEditing(report.status !== 'FINAL');
    setSelectedIds(report.sourceItemIds ?? []);
    setCopySucceeded(false);
    setMessage(report.status === 'FINAL' ? '제출된 최종병합 결과를 불러왔습니다.' : '저장된 병합 결과를 불러왔습니다.');
  }

  async function saveMergedReport(status = 'SAVED') {
    if (!mergedReportId && selectedIds.length === 0) {
      setMessage('저장할 병합 항목을 선택해 주세요.');
      return;
    }
    if (!activeMergedText.trim()) {
      setMessage('저장할 병합 텍스트가 없습니다.');
      return;
    }
    if (status === 'FINAL' && selectedIds.length === 0) {
      setMessage('관리자에게 제출할 항목을 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    const wasFinalMergedReport = isFinalMergedReport;

    try {
      if (status === 'FINAL') {
        const canSubmit = await markSelectedItemsSubmitted();
        if (!canSubmit) {
          return;
        }
      }
      const body = {
        mergeType: 'MEMBER',
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergedText: activeMergedText,
        status,
        sourceItemIds: selectedIds,
      };
      const path = mergedReportId ? `/api/merged-reports/${mergedReportId}` : '/api/merged-reports';
      const method = mergedReportId ? 'PUT' : 'POST';
      const data = await requestApi(path, { method, body, token });
      if (status === 'FINAL' || wasFinalMergedReport) {
        await loadReportItems();
      }
      setMergedReportId(data.id);
      setMergedText(data.mergedText);
      setMergedReportStatus(data.status);
      setIsMergedReportEditing(data.status !== 'FINAL');
      setSelectedIds(data.sourceItemIds ?? selectedIds);
      setCopySucceeded(false);
      await loadMergedReports();
      if (status === 'FINAL') {
        setMessage(mergedReportStatus === 'SAVED' ? '최종병합 내용을 다시 제출했습니다.' : '최종병합 내용을 관리자 페이지로 제출했습니다.');
      } else if (wasFinalMergedReport) {
        setMessage('제출을 취소했습니다. 내용을 수정한 뒤 다시 제출할 수 있습니다.');
      } else {
        setMessage(mergedReportId ? '병합 결과를 수정 저장했습니다.' : '병합 결과를 저장했습니다.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPreview() {
    if (!mergedReportId && selectedIds.length === 0) {
      setMessage('복사할 항목을 선택하거나 저장된 병합 결과를 불러와 주세요.');
      return;
    }
    if (!activeMergedText.trim()) {
      setMessage('복사할 병합 텍스트가 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(activeMergedText);
      setCopySucceeded(true);
      setMessage('미리보기 텍스트를 복사했습니다.');
    } catch (error) {
      setMessage('브라우저에서 클립보드 복사를 허용하지 않았습니다.');
    }
  }

  async function deleteCurrentItems() {
    if (selectedIds.length === 0) {
      setMessage('삭제할 현재 항목이 없습니다.');
      return;
    }
    if (isFinalMergedReport) {
      setMessage('FINAL 제출본에 포함된 항목은 삭제할 수 없습니다.');
      return;
    }
    if (!window.confirm('현재 최종병합 대상 항목을 삭제할까요? FINAL 제출본에 포함된 항목은 삭제되지 않습니다.')) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => requestApi(`/api/report-items/${id}`, {
        method: 'DELETE',
        token,
      })));
      const deletedCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - deletedCount;
      await loadReportItems();
      setMergedReportId(null);
      setMergedText(null);
      setMergedReportStatus(null);
      setIsMergedReportEditing(true);
      setSelectedIds([]);
      setCopySucceeded(false);
      await loadMergedReports();
      setMessage(`현재 항목 삭제 결과: 성공 ${deletedCount}건, 실패 ${failedCount}건`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="report-layout">
      {isPendingManager && (
        <div className="tool-panel pending-panel">
          <p className="panel-label">PL 권한 승인 대기</p>
          <p>현재는 개발자 권한으로 이용할 수 있습니다. 관리자 승인 후 팀장 취합 화면이 열립니다.</p>
        </div>
      )}

      <section className="tool-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">개발자 제출 화면</p>
            <h2>업무 항목 입력</h2>
          </div>
          <div className="inline-period" aria-label="보고 기간">
            <span>보고 기간</span>
            <strong>{formatDate(weekRange.startDate)} ~ {formatDate(weekRange.endDate)}</strong>
          </div>
          <button className="secondary-button" type="button" onClick={loadReportItems}>
            새로고침
          </button>
          <button className="secondary-button" type="button" onClick={clearCurrentWork} disabled={isLoading}>
            현재 입력 초기화
          </button>
        </div>

        <div className="input-mode-tabs" aria-label="업무 입력 방식 선택">
          <button
            type="button"
            className={inputMode === 'CSV' ? 'active' : ''}
            aria-pressed={inputMode === 'CSV'}
            onClick={() => setInputMode('CSV')}
          >
            CSV 업로드
          </button>
          <button
            type="button"
            className={inputMode === 'MANUAL' ? 'active' : ''}
            aria-pressed={inputMode === 'MANUAL'}
            onClick={() => setInputMode('MANUAL')}
          >
            수기 입력
          </button>
        </div>

        {inputMode === 'CSV' && (
        <div className="csv-upload-panel">
          <div className="csv-upload-actions">
            <label>
              CSV 업로드
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} disabled={isLoading} />
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={clearCsvImport}
              disabled={!hasCsvImportState || isLoading}
            >
              업로드 행 지우기
            </button>
          </div>
          <p className="helper-text">
            Redmine에서 전체 컬럼 내보내기 한 CSV파일을 올려주세요. 완료 항목은 완료일이 보고 기간 사이일 때만 표시합니다.
          </p>

          {hasCsvImportState && (
            <div className="csv-import-card">
              <div>
                <strong>{csvFileName || 'CSV 처리 결과'}</strong>
                <span>
                  가져올 행 {csvRows.length}건 · 선택 {selectedCsvRowCount}건 · 제외 {csvExcludedCount}건 · 오류 {csvValidationErrorResults.length}건
                  {csvSaveResults.length > 0 && ` · 저장 성공 ${csvSaveSuccessCount}건 · 저장 실패 ${csvSaveFailureCount}건`}
                </span>
              </div>
              <button className="primary-button compact" type="button" onClick={() => setCsvModalOpen(true)} disabled={isLoading}>
                그리드 열기
              </button>
            </div>
          )}
        </div>
        )}

        {csvModalOpen && hasCsvImportState && (
          <div className="modal-backdrop" role="presentation">
            <div className="csv-modal" ref={csvModalRef} role="dialog" aria-modal="true" aria-labelledby="csv-modal-title">
              <div className="csv-modal-header">
                <div>
                  <p className="panel-label">CSV 업로드 그리드</p>
                  <h3 id="csv-modal-title">{csvFileName || 'CSV 처리 결과'}</h3>
                </div>
                <button
                  className="secondary-button icon-button"
                  type="button"
                  ref={csvModalCloseButtonRef}
                  onClick={() => setCsvModalOpen(false)}
                  aria-label="CSV 그리드 닫기"
                >
                  ×
                </button>
              </div>

              <div className="csv-grid-toolbar">
                <div className="summary-counts">
                  <span>가져올 행 {csvRows.length}</span>
                  <strong>선택 {selectedCsvRowCount}</strong>
                  <span>제외 {csvExcludedCount}</span>
                  <span>오류 {csvValidationErrorResults.length}</span>
                </div>
                <div className="button-row csv-grid-actions">
                  <button className="secondary-button" type="button" onClick={() => updateAllCsvRowsSelected(true)} disabled={csvRows.length === 0 || isLoading}>
                    전체 선택
                  </button>
                  <button className="secondary-button" type="button" onClick={() => updateAllCsvRowsSelected(false)} disabled={csvRows.length === 0 || isLoading}>
                    전체 해제
                  </button>
                  <button className="primary-button compact" type="button" onClick={saveCsvRows} disabled={selectedCsvRowCount === 0 || isLoading}>
                    선택 행 저장
                  </button>
                </div>
              </div>

              <div className="items-table-wrap csv-table-wrap csv-modal-table-wrap">
                <table className="items-table csv-items-table" aria-label="CSV 업로드 대기 목록">
                  <thead>
                    <tr>
                      <th scope="col">
                        <label className="check-label table-check">
                          <input
                            type="checkbox"
                            aria-label="CSV 행 전체 선택"
                            checked={allCsvRowsSelected}
                            disabled={csvRows.length === 0}
                            onChange={(event) => updateAllCsvRowsSelected(event.target.checked)}
                          />
                        </label>
                      </th>
                      <th scope="col">주차</th>
                      <th scope="col">일감</th>
                      <th scope="col">단위업무</th>
                      <th scope="col">세부사항</th>
                      <th scope="col">상태</th>
                      <th scope="col">완료예정</th>
                      <th scope="col">완료기한</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.length === 0 ? (
                      <tr>
                        <td className="empty-state" colSpan="8">저장 가능한 CSV 행이 없습니다.</td>
                      </tr>
                    ) : csvRows.map((row) => (
                      <tr key={row.tempId}>
                        <td>
                          <label className="check-label table-check">
                            <input
                              type="checkbox"
                              aria-label={`${row.title} 저장 선택`}
                              checked={row.selected}
                              onChange={(event) => updateCsvRow(row.tempId, 'selected', event.target.checked)}
                            />
                          </label>
                        </td>
                        <td>
                          <select
                            aria-label={`${row.title} 주차 구분`}
                            value={row.weekSelection}
                            onChange={(event) => updateCsvRow(row.tempId, 'weekSelection', event.target.value)}
                          >
                            {Object.entries(csvWeekSelectionLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {row.sourceKey ? (
                            <a className="issue-link" href={buildIssueUrl(row.sourceKey)} target="_blank" rel="noreferrer">
                              #{row.sourceKey}
                            </a>
                          ) : (
                            <span className="muted-text">-</span>
                          )}
                        </td>
                        <td>{row.unitTask}</td>
                        <td className="csv-title-cell" title={row.title}>{row.title}</td>
                        <td>{statusLabels[row.status]}</td>
                        <td>{formatReportItemDueLabel(row) || '-'}</td>
                        <td>{row.dueDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvValidationResults.length > 0 && (
                <div className="csv-modal-results" aria-label="CSV 검증 결과">
                  {csvCompletedExcludedCount > 0 && (
                    <>
                      <button
                        className="csv-results-toggle"
                        type="button"
                        onClick={() => setCsvExcludedOpen((current) => !current)}
                        aria-expanded={csvExcludedOpen}
                      >
                        <span>제외된 기존 완료건 {csvCompletedExcludedCount}건</span>
                        <strong>{csvExcludedOpen ? '접기' : '펼치기'}</strong>
                      </button>
                      {csvExcludedOpen && (
                        <div className="csv-result-list" role="status" aria-live="polite">
                          {csvCompletedExcludedResults.map((result) => (
                            <p key={result.key} className={`csv-result ${result.status}`}>
                              <span className="csv-result-badge">제외</span>
                              <span className="csv-result-title">{result.title}</span>
                              <span className="csv-result-detail">기존 완료건 · 완료일 {result.completedDate || '-'}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {csvStatusExcludedCount > 0 && (
                    <div className="csv-result-list" role="status" aria-live="polite">
                      {csvStatusExcludedResults.map((result) => (
                        <p key={result.key} className={`csv-result ${result.status}`}>
                          <span className="csv-result-badge">제외</span>
                          <span className="csv-result-title">{result.title}</span>
                          <span className="csv-result-detail">{result.message}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {csvValidationErrorResults.length > 0 && (
                    <div className="csv-result-list" role="status" aria-live="polite">
                      {csvValidationErrorResults.map((result) => (
                        <p key={result.key} className={`csv-result ${result.status}`}>
                          <span className="csv-result-badge">검증 오류</span>
                          <span className="csv-result-title">{result.title}</span>
                          <span className="csv-result-detail">{result.message}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {inputMode === 'MANUAL' && (
        <form className="report-form" onSubmit={handleReportSubmit}>
          <div className="manual-form-row manual-form-row-primary">
            <label>
              주차 구분
              <select
                value={reportForm.weekType}
                onChange={(event) => updateReportForm('weekType', event.target.value)}
              >
                {Object.entries(manualWeekSelectionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              업무 구분
              <select
                value={reportForm.category}
                onChange={(event) => updateReportForm('category', event.target.value)}
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              세부사항
              {reportForm.category === 'BUSINESS_MANAGEMENT' ? (
                <select
                  value={reportForm.businessTaskOption}
                  onChange={(event) => updateReportForm('businessTaskOption', event.target.value)}
                  required
                >
                  {businessManagementTaskOptions.map((option) => (
                    <option key={option || 'empty-business-task'} value={option}>{option || '선택'}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={reportForm.title}
                  onChange={(event) => updateReportForm('title', event.target.value)}
                  placeholder="업무 제목"
                  required
                />
              )}
            </label>
          </div>
          {reportForm.category === 'EXECUTION' && (
            <div className={`manual-form-row manual-execution-row${reportForm.status === 'IN_PROGRESS' ? '' : ' compact'}`}>
              <label>
                단위업무
                <select
                  value={reportForm.unitTask}
                  onChange={(event) => updateReportForm('unitTask', event.target.value)}
                  required
                >
                  {unitTaskOrder.map((unitTask) => (
                    <option key={unitTask} value={unitTask}>{unitTask}</option>
                  ))}
                </select>
              </label>
              <label>
                상태
                <select
                  value={reportForm.status}
                  onChange={(event) => updateReportForm('status', event.target.value)}
                >
                  <option value="NEW">신규</option>
                  <option value="IN_PROGRESS">진행중</option>
                  <option value="DONE">완료</option>
                  <option value="HOLD">보류</option>
                </select>
              </label>
              {reportForm.status === 'IN_PROGRESS' && (
                <label>
                  완료기한
                  <input
                    type="date"
                    value={reportForm.dueDate}
                    onChange={(event) => updateReportForm('dueDate', event.target.value)}
                  />
                </label>
              )}
            </div>
          )}
          {reportForm.category === 'BUSINESS_MANAGEMENT' && (
            <div className="manual-form-row manual-business-status-row">
              <label>
                상태
                <select
                  value={reportForm.status}
                  onChange={(event) => updateReportForm('status', event.target.value)}
                >
                  <option value="NEW">신규</option>
                  <option value="IN_PROGRESS">진행중</option>
                  <option value="DONE">완료</option>
                  <option value="HOLD">보류</option>
                </select>
              </label>
              {reportForm.status === 'IN_PROGRESS' ? (
                <label>
                  완료기한
                  <input
                    type="date"
                    value={reportForm.dueDate}
                    onChange={(event) => updateReportForm('dueDate', event.target.value)}
                  />
                </label>
              ) : (
                <div className="manual-form-placeholder" aria-hidden="true" />
              )}
              {reportForm.businessTaskOption === '기타' ? (
                <label>
                  기타 세부사항
                  <input
                    value={reportForm.businessTaskCustomTitle}
                    onChange={(event) => updateReportForm('businessTaskCustomTitle', event.target.value)}
                    placeholder="사업관리 세부사항 입력"
                    required
                  />
                </label>
              ) : (
                <div className="manual-form-placeholder" aria-hidden="true" />
              )}
            </div>
          )}

          <div className="button-row wide-field">
            <button className="secondary-button" type="submit" name="saveStatus" value="DRAFT" disabled={isLoading}>
              임시저장
            </button>
            <button className="primary-button compact" type="submit" name="saveStatus" value="SAVED" disabled={isLoading}>
              저장
            </button>
          </div>
        </form>
        )}
      </section>

      <section className="tool-panel preview-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">최종 병합</p>
            <h2>단위업무별 병합 결과</h2>
          </div>
          <div className="button-row compact-actions">
            <button className="secondary-button" type="button" onClick={loadMergedReports} disabled={isLoading}>
              목록 새로고침
            </button>
            <button className="secondary-button" type="button" onClick={openPreviousWeekComparison} disabled={isLoading}>
              전주 차주 비교
            </button>
            {isFinalMergedReportLocked ? (
              <button className="secondary-button" type="button" onClick={() => saveMergedReport('SAVED')} disabled={isLoading}>
                제출 취소
              </button>
            ) : !isFinalMergedReport ? (
              <button className="secondary-button" type="button" onClick={() => saveMergedReport('SAVED')} disabled={(!mergedReportId && selectedIds.length === 0) || !activeMergedText.trim() || isLoading}>
                {mergedReportId ? '수정 저장' : '저장'}
              </button>
            ) : null}
            <button className="primary-button compact" type="button" onClick={() => saveMergedReport('FINAL')} disabled={!canPersistMergedReport || isFinalMergedReportLocked}>
              {mergedReportId ? '재제출' : '제출'}
            </button>
            <button className="danger-button compact" type="button" onClick={deleteCurrentItems} disabled={selectedIds.length === 0 || isLoading || isFinalMergedReport}>
              현재 항목 삭제
            </button>
            <button className="primary-button compact" type="button" onClick={copyPreview} disabled={(!mergedReportId && selectedIds.length === 0) || !activeMergedText.trim()}>
              {copySucceeded ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
        <div className="saved-report-list-header">
          <strong>최종병합 목록</strong>
          <span>{savedMergedReports.length}건</span>
        </div>
        <div className="saved-report-list" aria-label="저장된 최종병합 목록">
          {savedMergedReports.length === 0 ? (
            <p className="empty-list">저장된 병합 결과가 없습니다.</p>
          ) : savedMergedReports.map((report) => (
            <button
              key={report.id}
              className={`saved-report-button${mergedReportId === report.id ? ' active' : ''}`}
              type="button"
              onClick={() => loadSavedMergedReport(report)}
            >
              <strong>{report.status}</strong>
              <span>{formatDate(report.updatedAt.slice(0, 10))}</span>
              <span>{report.mergedText.slice(0, 60)}</span>
            </button>
          ))}
        </div>
        <textarea
          className="preview-editor"
          value={activeMergedText}
          readOnly={mergedReportStatus === 'FINAL' && !isMergedReportEditing}
          onChange={(event) => {
            setMergedText(event.target.value);
            setCopySucceeded(false);
          }}
          aria-label="개발자 병합 결과 텍스트"
        />
      </section>

      {weekComparisonOpen && weekComparison && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="csv-modal comparison-modal"
            ref={weekComparisonModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="week-comparison-title"
          >
            <div className="csv-modal-header">
              <div>
                <p className="panel-label">전주 차주 비교</p>
                <h3 id="week-comparison-title">전주 계획과 현재 금주 비교</h3>
              </div>
              <button
                className="secondary-button icon-button"
                type="button"
                ref={weekComparisonCloseButtonRef}
                onClick={() => setWeekComparisonOpen(false)}
                aria-label="전주 차주 비교 닫기"
              >
                ×
              </button>
            </div>

            <div className="week-comparison-grid">
              <section className="comparison-column" aria-label="전주 FINAL의 차주 내용">
                <div className="comparison-column-header">
                  <strong>전주 FINAL의 차주</strong>
                  <span>
                    {formatDate(weekComparison.previousRange.startDate)} ~ {formatDate(weekComparison.previousRange.endDate)}
                  </span>
                </div>
                {!weekComparison.previousSectionFound && (
                  <p className="comparison-note">[차주] 구분을 찾지 못해 전주 FINAL 전체 내용을 표시합니다.</p>
                )}
                <pre className="comparison-text">{weekComparison.previousText || '표시할 차주 내용이 없습니다.'}</pre>
              </section>

              <section className="comparison-column" aria-label="현재 금주 내용">
                <div className="comparison-column-header">
                  <strong>현재 금주</strong>
                  <span>
                    {formatDate(weekComparison.currentRange.startDate)} ~ {formatDate(weekComparison.currentRange.endDate)}
                  </span>
                </div>
                {!weekComparison.currentSectionFound && (
                  <p className="comparison-note">[금주] 구분을 찾지 못해 현재 병합 텍스트 전체 내용을 표시합니다.</p>
                )}
                <pre className="comparison-text">{weekComparison.currentText || '현재 금주 비교 대상이 없습니다.'}</pre>
              </section>
            </div>

            <div className="comparison-footer">
              <span>
                {weekComparison.previousUpdatedAt
                  ? `전주 FINAL 수정일 ${formatDate(weekComparison.previousUpdatedAt.slice(0, 10))}`
                  : '전주 FINAL 제출본이 없습니다.'}
              </span>
              <button className="primary-button compact" type="button" onClick={() => setWeekComparisonOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberReportScreen;
