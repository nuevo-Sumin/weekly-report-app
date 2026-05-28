import { useEffect, useMemo, useRef, useState } from 'react';
import { csvWeekSelectionLabels, initialReportForm, statusLabels, weekTypeLabels } from '../constants';
import { formatDate, getWeekRange, toDateInputValue } from '../dateUtils';
import { buildPreview } from '../reportPreview';
import { requestApi } from '../api';
import { parseReportCsvBufferWithErrors } from '../csvReportImport';

function MemberReportScreen({ token, user, isLoading, setIsLoading, setMessage }) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const latestMergedReportsRequestId = useRef(0);
  const [baseDate, setBaseDate] = useState(today);
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
  const [copySucceeded, setCopySucceeded] = useState(false);

  const weekRange = useMemo(() => getWeekRange(baseDate), [baseDate]);
  const previewText = useMemo(() => buildPreview(items, selectedIds), [items, selectedIds]);
  const activeMergedText = mergedText ?? previewText;
  const isPendingManager = user.requestedRole === 'MANAGER' && user.roleApprovalStatus === 'PENDING';
  const savedItemCount = useMemo(() => items.filter((item) => item.saveStatus === 'SAVED').length, [items]);

  useEffect(() => {
    if (token) {
      setSavedMergedReports([]);
      loadReportItems();
      loadMergedReports();
    }
  }, [token, weekRange.startDate, weekRange.endDate]);

  function updateReportForm(field, value) {
    setReportForm((current) => ({ ...current, [field]: value }));
  }

  function updateCsvRow(tempId, field, value) {
    setCsvRows((current) => current.map((row) => (
      row.tempId === tempId ? { ...row, [field]: value } : row
    )));
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
        const { rows, errors } = parseReportCsvBufferWithErrors(reader.result);
        setCsvRows(rows.map((row) => ({
          ...row,
          savedWeekTypes: getSavedCsvWeekTypes(row),
        })));
        setCsvFileName(file.name);
        setCsvValidationResults(errors.map((error) => ({
          key: `csv-parse-error-${error.lineNumber}`,
          status: 'error',
          title: 'CSV 검증 오류',
          sourceKey: '-',
          sourceRowNumber: error.lineNumber,
          weekType: null,
          message: error.message,
        })));
        setCsvSaveResults([]);
        const errorNotice = errors.length > 0 ? ` 오류 ${errors.length}건은 제외했습니다.` : '';
        if (rows.length === 0 && errors.length > 0) {
          setMessage(`저장 가능한 CSV 행이 없습니다. 오류 ${errors.length}건을 확인해 주세요.`);
          return;
        }
        setMessage(`${rows.length}개 CSV 행을 불러왔습니다.${errorNotice} 행별 주차 구분을 확인해 주세요.`);
      } catch (error) {
        setCsvRows([]);
        setCsvFileName('');
        setCsvValidationResults([]);
        setCsvSaveResults([]);
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
      const body = {
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        weekType: reportForm.weekType,
        unitTask: reportForm.unitTask,
        title: reportForm.title,
        detailContent: reportForm.detailContent,
        progressContent: reportForm.progressContent,
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
    setReportForm({
      id: item.id,
      weekType: item.weekType,
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
          <p>현재는 팀원 권한으로 이용할 수 있습니다. 관리자 승인 후 팀장 취합 화면이 열립니다.</p>
        </div>
      )}

      <section className="tool-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">팀원 제출 화면</p>
            <h2>업무 항목 입력</h2>
          </div>
          <button className="secondary-button" type="button" onClick={loadReportItems}>
            새로고침
          </button>
        </div>

        <div className="period-grid">
          <label>
            기준 일자
            <input
              type="date"
              value={baseDate}
              onChange={(event) => setBaseDate(event.target.value)}
            />
          </label>
          <div className="readonly-box">
            <span>보고 기간</span>
            <strong>{formatDate(weekRange.startDate)} ~ {formatDate(weekRange.endDate)}</strong>
          </div>
        </div>

        <div className="csv-upload-panel">
          <div className="csv-upload-actions">
            <label>
              CSV 업로드
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} disabled={isLoading} />
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setCsvRows([]);
                setCsvFileName('');
                setCsvValidationResults([]);
                setCsvSaveResults([]);
              }}
              disabled={(csvRows.length === 0 && csvValidationResults.length === 0 && csvSaveResults.length === 0) || isLoading}
            >
              업로드 행 지우기
            </button>
          </div>
          <p className="helper-text">
            CSV 양식은 원본 PMS 파일의 #, 제목, 상태, 범주, 진척도 컬럼을 사용합니다. 주차 구분은 업로드 후 행별로 선택합니다.
          </p>

          {csvRows.length > 0 && (
            <div className="items-table-wrap csv-table-wrap">
              <div className="csv-table-summary">
                <strong>{csvFileName}</strong>
                <button className="primary-button compact" type="button" onClick={saveCsvRows} disabled={isLoading}>
                  선택 행 저장
                </button>
              </div>
              <table className="items-table csv-items-table" aria-label="CSV 업로드 대기 목록">
                <thead>
                  <tr>
                    <th scope="col">저장</th>
                    <th scope="col">주차</th>
                    <th scope="col">단위업무</th>
                    <th scope="col">세부사항</th>
                    <th scope="col">상태</th>
                    <th scope="col">진척도</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row) => (
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
                      <td>{row.unitTask}</td>
                      <td>{row.title}</td>
                      <td>{statusLabels[row.status]}</td>
                      <td>{row.progressRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {csvValidationResults.length > 0 && (
            <div className="csv-result-list" role="status" aria-live="polite" aria-label="CSV 검증 결과">
              {csvValidationResults.map((result) => (
                <p key={result.key} className={`csv-result ${result.status}`}>
                  <span>검증 오류</span>
                  <strong>{result.weekType ? weekTypeLabels[result.weekType] : '검증'}</strong>
                  <span>#{result.sourceKey} / {result.sourceRowNumber}행 / {result.title}</span>
                  <span>{result.message}</span>
                </p>
              ))}
            </div>
          )}

          {csvSaveResults.length > 0 && (
            <div className="csv-result-list" role="status" aria-live="polite" aria-label="CSV 저장 결과">
              {csvSaveResults.map((result) => (
                <p key={result.key} className={`csv-result ${result.status}`}>
                  <span>{result.status === 'success' ? '성공' : '실패'}</span>
                  <strong>{result.weekType ? weekTypeLabels[result.weekType] : '검증'}</strong>
                  <span>#{result.sourceKey} / {result.sourceRowNumber}행 / {result.title}</span>
                  <span>{result.message}</span>
                </p>
              ))}
            </div>
          )}
        </div>

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
            단위업무
            <input
              value={reportForm.unitTask}
              onChange={(event) => updateReportForm('unitTask', event.target.value)}
              placeholder="예: 주간보고"
              required
            />
          </label>
          <label>
            세부사항
            <input
              value={reportForm.title}
              onChange={(event) => updateReportForm('title', event.target.value)}
              placeholder="업무 제목"
              required
            />
          </label>
          <label className="wide-field">
            업무 상세
            <textarea
              value={reportForm.detailContent}
              onChange={(event) => updateReportForm('detailContent', event.target.value)}
              placeholder="업무 상세 내용을 입력하세요."
              required
            />
          </label>
          <label className="wide-field">
            진행내용
            <textarea
              value={reportForm.progressContent}
              onChange={(event) => updateReportForm('progressContent', event.target.value)}
              placeholder="금주 진행 또는 차주 예정 내용을 입력하세요."
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
            진행률
            <input
              type="number"
              min="0"
              max="100"
              value={reportForm.progressRate}
              onChange={(event) => updateReportForm('progressRate', event.target.value)}
            />
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
            <button className="primary-button compact" type="button" onClick={submitSelectedItems} disabled={selectedIds.length === 0 || isLoading}>
              제출
            </button>
          </div>
        </div>

        <div className="items-table-wrap">
          <table className="items-table" aria-label="주간업무 항목 목록">
            <thead>
              <tr>
                <th scope="col">선택</th>
                <th scope="col">구분</th>
                <th scope="col">단위업무</th>
                <th scope="col">세부사항</th>
                <th scope="col">상태</th>
                <th scope="col">저장</th>
                <th scope="col">수정</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="7">아직 저장된 항목이 없습니다.</td>
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
                  <td>{item.unitTask}</td>
                  <td>{item.title}</td>
                  <td>{statusLabels[item.status]}</td>
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
            <p className="panel-label">미리보기</p>
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
        <div className="saved-report-list" aria-label="저장된 병합 결과 목록">
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
          aria-label="팀원 병합 결과 텍스트"
        />
      </section>
    </div>
  );
}

export default MemberReportScreen;
