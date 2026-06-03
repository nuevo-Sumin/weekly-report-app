import { useEffect, useMemo, useRef, useState } from 'react';
import { buildIssueUrl, categoryLabels, csvWeekSelectionLabels, initialReportForm, statusLabels, weekTypeLabels } from '../constants';
import { formatDate, getWeekRange, toDateInputValue } from '../dateUtils';
import { buildPreview, formatReportItemDueLabel } from '../reportPreview';
import { requestApi } from '../api';
import { filterCsvRowsForReportPeriod, parseReportCsvBufferWithErrors } from '../csvReportImport';

function MemberReportScreen({ token, user, isLoading, setIsLoading, setMessage }) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const latestMergedReportsRequestId = useRef(0);
  const csvModalRef = useRef(null);
  const csvModalCloseButtonRef = useRef(null);
  const [inputMode, setInputMode] = useState('CSV');
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [mergedReportId, setMergedReportId] = useState(null);
  const [mergedText, setMergedText] = useState(null);
  const [savedMergedReports, setSavedMergedReports] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvValidationResults, setCsvValidationResults] = useState([]);
  const [csvSaveResults, setCsvSaveResults] = useState([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [copySucceeded, setCopySucceeded] = useState(false);

  const weekRange = useMemo(() => getWeekRange(today), [today]);
  const previewText = useMemo(() => buildPreview(items, selectedIds), [items, selectedIds]);
  const activeMergedText = mergedText ?? previewText;
  const isPendingManager = user.requestedRole === 'MANAGER' && user.roleApprovalStatus === 'PENDING';
  const savedItemCount = useMemo(() => items.filter((item) => item.saveStatus === 'SAVED').length, [items]);
  const selectableItemIds = useMemo(() => items.filter((item) => item.saveStatus === 'SAVED').map((item) => item.id), [items]);
  const allSelectableItemsSelected = selectableItemIds.length > 0 && selectableItemIds.every((id) => selectedIds.includes(id));
  const selectedCsvRowCount = useMemo(() => csvRows.filter((row) => row.selected).length, [csvRows]);
  const hasCsvImportState = csvRows.length > 0 || csvValidationResults.length > 0 || csvSaveResults.length > 0;
  const allCsvRowsSelected = csvRows.length > 0 && selectedCsvRowCount === csvRows.length;

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

  function updateReportForm(field, value) {
    setReportForm((current) => ({ ...current, [field]: value }));
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
  }

  function updateAllCsvRowsSelected(selected) {
    setCsvRows((current) => current.map((row) => ({ ...row, selected })));
  }

  function getPendingWeekTypes(row) {
    const selectedWeekTypes = row.weekSelection === 'ALL' ? ['THIS_WEEK', 'NEXT_WEEK'] : [row.weekSelection];
    return selectedWeekTypes.filter((weekType) => !row.savedWeekTypes?.includes(weekType));
  }

  function getSavedCsvWeekTypes(row, itemList = items) {
    return itemList
      .filter((item) => item.sourceType === 'CSV' && item.sourceKey === row.sourceKey)
      .map((item) => item.weekType);
  }

  function isDuplicateCsvMessage(message) {
    return String(message ?? '').includes('CSV row has already been saved');
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
            weekType: null,
            message: '기존 완료건',
          })),
        ];
        setCsvValidationResults(validationResults);
        setCsvSaveResults([]);
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
      for (const row of rowsToSave) {
        const weekTypes = getPendingWeekTypes(row);
        if (weekTypes.length === 0) {
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
            await requestApi('/api/report-items', {
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
      if (createdCount > 0) {
        await loadReportItems();
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
      setItems(data);
      setSelectedIds((current) => current.filter((id) => data.some((item) => item.id === id && item.saveStatus === 'SAVED')));
      setMergedReportId(null);
      setMergedText(null);
    } catch (error) {
      setMessage(error.message);
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

  async function saveReportItem(saveStatus) {
    setIsLoading(true);
    setMessage('');

    try {
      const detailContent = reportForm.detailContent?.trim() || reportForm.title;
      const body = {
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        weekType: reportForm.weekType,
        category: reportForm.category,
        unitTask: reportForm.category === 'BUSINESS_MANAGEMENT' ? '사업관리' : reportForm.unitTask,
        title: reportForm.title,
        detailContent,
        progressContent: reportForm.progressContent?.trim() || reportForm.title,
        status: reportForm.completed ? 'DONE' : reportForm.status,
        progressRate: Number(reportForm.progressRate),
        dueDate: reportForm.dueDate || null,
        completed: reportForm.completed,
        saveStatus,
      };
      const path = reportForm.id ? `/api/report-items/${reportForm.id}` : '/api/report-items';
      const method = reportForm.id ? 'PUT' : 'POST';
      await requestApi(path, { method, body, token });
      setReportForm(initialReportForm);
      setMessage(saveStatus === 'DRAFT' ? '임시저장되었습니다.' : '저장되었습니다.');
      await loadReportItems();
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

  async function submitSelectedItems() {
    if (selectedIds.length === 0) {
      setMessage('제출할 항목을 선택해 주세요.');
      return;
    }
    if (items.some((item) => selectedIds.includes(item.id) && item.saveStatus !== 'SAVED')) {
      setMessage('저장 상태의 항목만 제출할 수 있습니다.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      await requestApi('/api/report-items/submit', {
        body: { itemIds: selectedIds },
        token,
      });
      setMessage('선택한 항목을 제출했습니다.');
      await loadReportItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function editReportItem(item) {
    setInputMode('MANUAL');
    setReportForm({
      id: item.id,
      weekType: item.weekType,
      category: item.category ?? 'EXECUTION',
      unitTask: item.unitTask,
      title: item.title,
      detailContent: item.detailContent,
      progressContent: item.progressContent,
      status: item.status,
      progressRate: item.progressRate,
      dueDate: item.dueDate ?? '',
      completed: item.completed,
    });
    setMessage('선택한 항목을 수정 모드로 불러왔습니다.');
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
  }

  function loadSavedMergedReport(report) {
    setMergedReportId(report.id);
    setMergedText(report.mergedText);
    setSelectedIds(report.sourceItemIds ?? []);
    setCopySucceeded(false);
    setMessage('저장된 병합 결과를 불러왔습니다.');
  }

  async function saveMergedReport() {
    if (!mergedReportId && selectedIds.length === 0) {
      setMessage('저장할 병합 항목을 선택해 주세요.');
      return;
    }
    if (!activeMergedText.trim()) {
      setMessage('저장할 병합 텍스트가 없습니다.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const body = {
        mergeType: 'MEMBER',
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergedText: activeMergedText,
        status: 'SAVED',
        sourceItemIds: selectedIds,
      };
      const path = mergedReportId ? `/api/merged-reports/${mergedReportId}` : '/api/merged-reports';
      const method = mergedReportId ? 'PUT' : 'POST';
      const data = await requestApi(path, { method, body, token });
      setMergedReportId(data.id);
      setMergedText(data.mergedText);
      setCopySucceeded(false);
      await loadMergedReports();
      setMessage(mergedReportId ? '병합 결과를 수정 저장했습니다.' : '병합 결과를 저장했습니다.');
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
            CSV는 원본 PMS 파일 기준으로 읽고, 완료 항목은 완료일이 보고 기간 안에 있는 경우만 가져옵니다.
          </p>

          {hasCsvImportState && (
            <div className="csv-import-card">
              <div>
                <strong>{csvFileName || 'CSV 처리 결과'}</strong>
                <span>가져올 행 {csvRows.length}건 · 선택 {selectedCsvRowCount}건 · 오류/제외 {csvValidationResults.length}건</span>
              </div>
              <button className="primary-button compact" type="button" onClick={() => setCsvModalOpen(true)} disabled={isLoading}>
                그리드 열기
              </button>
            </div>
          )}

          {csvSaveResults.length > 0 && (
            <div className="csv-save-summary" role="status" aria-live="polite" aria-label="CSV 저장 결과">
              <strong>CSV 저장 결과</strong>
              <span>
                성공 {csvSaveResults.filter((result) => result.status === 'success').length}건 · 실패 {csvSaveResults.filter((result) => result.status === 'error').length}건
              </span>
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
                  <span>오류/제외 {csvValidationResults.length}</span>
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
                      <th scope="col">완료일</th>
                      <th scope="col">완료기한</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.length === 0 ? (
                      <tr>
                        <td className="empty-state" colSpan="9">저장 가능한 CSV 행이 없습니다.</td>
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
                        <td>{row.completedDate || '-'}</td>
                        <td>{row.dueDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvValidationResults.length > 0 && (
                <div className="csv-result-list csv-modal-results" role="status" aria-live="polite" aria-label="CSV 검증 결과">
                  {csvValidationResults.map((result) => (
                    <p key={result.key} className={`csv-result ${result.status}`}>
                      <span>{result.status === 'warning' ? '제외' : '검증 오류'}</span>
                      <strong>{result.weekType ? weekTypeLabels[result.weekType] : '검증'}</strong>
                      <span>{result.title}</span>
                      <span>{result.message}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {inputMode === 'MANUAL' && (
        <form className="report-form" onSubmit={handleReportSubmit}>
          <label>
            주차 구분
            <select
              value={reportForm.weekType}
              onChange={(event) => updateReportForm('weekType', event.target.value)}
            >
              <option value="THIS_WEEK">금주</option>
              <option value="NEXT_WEEK">차주</option>
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
          {reportForm.category === 'EXECUTION' && (
          <label>
            단위업무
            <input
              value={reportForm.unitTask}
              onChange={(event) => updateReportForm('unitTask', event.target.value)}
              placeholder="예: 주간보고"
              required
            />
          </label>
          )}
          <label>
            세부사항
            <input
              value={reportForm.title}
              onChange={(event) => updateReportForm('title', event.target.value)}
              placeholder="업무 제목"
              required
            />
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
          <label>
            완료기한
            <input
              type="date"
              value={reportForm.dueDate}
              onChange={(event) => updateReportForm('dueDate', event.target.value)}
            />
          </label>
          <label className="check-label align-end">
            <input
              type="checkbox"
              checked={reportForm.completed}
              onChange={(event) => updateReportForm('completed', event.target.checked)}
            />
            완료여부
          </label>

          <div className="button-row wide-field">
            <button className="secondary-button" type="submit" name="saveStatus" value="DRAFT" disabled={isLoading}>
              임시저장
            </button>
            <button className="primary-button compact" type="submit" name="saveStatus" value="SAVED" disabled={isLoading}>
              {reportForm.id ? '수정 저장' : '저장'}
            </button>
          </div>
        </form>
        )}
      </section>

      <section className="tool-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">저장된 항목</p>
            <h2>제출 항목 선택</h2>
          </div>
          <div className="section-actions">
            <div className="summary-counts">
              <span>저장 {savedItemCount}</span>
              <strong>선택 {selectedIds.length}</strong>
            </div>
            <button className="secondary-button compact" type="button" onClick={toggleAllSelectedItems} disabled={selectableItemIds.length === 0 || isLoading}>
              {allSelectableItemsSelected ? '전체 해제' : '전체 선택'}
            </button>
            <button className="primary-button compact" type="button" onClick={submitSelectedItems} disabled={selectedIds.length === 0 || isLoading}>
              제출
            </button>
          </div>
        </div>

        <div className="items-table-wrap">
          <table className="items-table" aria-label="주간업무 항목 목록">
            <thead>
              <tr>
                <th scope="col">
                  <label className="check-label table-check">
                    <input
                      type="checkbox"
                      aria-label="제출 항목 전체 선택"
                      checked={allSelectableItemsSelected}
                      disabled={selectableItemIds.length === 0}
                      onChange={toggleAllSelectedItems}
                    />
                  </label>
                </th>
                <th scope="col">구분</th>
                <th scope="col">업무</th>
                <th scope="col">단위업무</th>
                <th scope="col">일감</th>
                <th scope="col">세부사항</th>
                <th scope="col">완료예정</th>
                <th scope="col">저장</th>
                <th scope="col">수정</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="9">아직 저장된 항목이 없습니다.</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <label className="check-label table-check">
                      <input
                        type="checkbox"
                        aria-label={`${item.unitTask} ${item.title} 선택`}
                        checked={selectedIds.includes(item.id)}
                        disabled={item.saveStatus !== 'SAVED'}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </label>
                  </td>
                  <td>{weekTypeLabels[item.weekType]}</td>
                  <td>{categoryLabels[item.category ?? 'EXECUTION']}</td>
                  <td>{item.unitTask}</td>
                  <td>
                    {item.sourceKey ? (
                      <a className="issue-link" href={buildIssueUrl(item.sourceKey)} target="_blank" rel="noreferrer">
                        #{item.sourceKey}
                      </a>
                    ) : (
                      <span className="muted-text">-</span>
                    )}
                  </td>
                  <td>{item.title}</td>
                  <td>{formatReportItemDueLabel(item) || statusLabels[item.status]}</td>
                  <td>{item.saveStatus}</td>
                  <td>
                    {item.saveStatus === 'SUBMITTED' ? (
                      <span className="muted-text">읽기</span>
                    ) : (
                      <button className="link-button" type="button" onClick={() => editReportItem(item)}>
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <button className="secondary-button" type="button" onClick={saveMergedReport} disabled={(!mergedReportId && selectedIds.length === 0) || !activeMergedText.trim() || isLoading}>
              {mergedReportId ? '수정 저장' : '저장'}
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
          onChange={(event) => {
            setMergedText(event.target.value);
            setCopySucceeded(false);
          }}
          aria-label="개발자 병합 결과 텍스트"
        />
      </section>
    </div>
  );
}

export default MemberReportScreen;
