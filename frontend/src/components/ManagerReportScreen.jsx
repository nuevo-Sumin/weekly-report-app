import { useEffect, useMemo, useRef, useState } from 'react';
import { buildIssueUrl, categoryLabels, statusLabels, weekTypeLabels } from '../constants';
import { formatDate, getWeekRange, toDateInputValue } from '../dateUtils';
import { buildAdminPreview, formatReportItemDueLabel } from '../reportPreview';
import { requestApi } from '../api';

const initialFilters = {
  memberLoginId: '',
  unitTask: '',
  weekType: '',
};

function ManagerReportScreen({ token, isLoading, setIsLoading, setMessage }) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const latestRequestId = useRef(0);
  const latestMergedReportsRequestId = useRef(0);
  const latestMemberMergedReportsRequestId = useRef(0);
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mergedText, setMergedText] = useState(null);
  const [mergedReportId, setMergedReportId] = useState(null);
  const [savedMergedReports, setSavedMergedReports] = useState([]);
  const [submittedMemberReports, setSubmittedMemberReports] = useState([]);
  const [copySucceeded, setCopySucceeded] = useState(false);

  const weekRange = useMemo(() => getWeekRange(today), [today]);
  const automaticPreview = useMemo(() => buildAdminPreview(items, selectedIds), [items, selectedIds]);
  const hiddenSelectedCount = useMemo(
    () => selectedIds.filter((id) => !items.some((item) => item.id === id)).length,
    [items, selectedIds],
  );
  const allVisibleItemsSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  useEffect(() => {
    if (token) {
      setSavedMergedReports([]);
      loadSubmittedItems();
      loadMergedReports();
      loadSubmittedMemberReports();
    }
  }, [token, weekRange.startDate, weekRange.endDate]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
    setMergedText(null);
    setMergedReportId(null);
    setCopySucceeded(false);
  }

  function buildQuery(activeFilters = filters) {
    const query = new URLSearchParams({
      reportStartDate: weekRange.startDate,
      reportEndDate: weekRange.endDate,
    });

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value.trim()) {
        query.set(key, value.trim());
      }
    });

    return query.toString();
  }

  async function loadSubmittedItems(activeFilters = filters) {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setIsLoading(true);
    setMessage('');

    try {
      const data = await requestApi(`/api/admin/report-items?${buildQuery(activeFilters)}`, {
        method: 'GET',
        token,
      });
      if (requestId !== latestRequestId.current) {
        return;
      }
      setItems(data);
      setSelectedIds((current) => current.filter((id) => data.some((item) => item.id === id)));
      setMergedText(null);
      setMergedReportId(null);
      setCopySucceeded(false);
    } catch (error) {
      if (requestId === latestRequestId.current) {
        setMessage(error.message);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  async function loadMergedReports() {
    const requestId = latestMergedReportsRequestId.current + 1;
    latestMergedReportsRequestId.current = requestId;
    setIsLoading(true);
    setMessage('');
    setSavedMergedReports([]);

    try {
      const query = new URLSearchParams({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergeType: 'ADMIN',
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

  async function loadSubmittedMemberReports() {
    const requestId = latestMemberMergedReportsRequestId.current + 1;
    latestMemberMergedReportsRequestId.current = requestId;
    setIsLoading(true);
    setSubmittedMemberReports([]);

    try {
      const query = new URLSearchParams({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
      });
      const data = await requestApi(`/api/admin/merged-reports?${query.toString()}`, {
        method: 'GET',
        token,
      });
      if (requestId !== latestMemberMergedReportsRequestId.current) {
        return;
      }
      setSubmittedMemberReports(data);
    } catch (error) {
      if (requestId === latestMemberMergedReportsRequestId.current) {
        setSubmittedMemberReports([]);
        setMessage(error.message);
      }
    } finally {
      if (requestId === latestMemberMergedReportsRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    loadSubmittedItems();
  }

  function resetFilters() {
    const nextFilters = initialFilters;
    setFilters(nextFilters);
    setSelectedIds([]);
    setMergedText(null);
    setMergedReportId(null);
    setCopySucceeded(false);
    loadSubmittedItems(nextFilters);
  }

  function toggleSelected(id) {
    setMergedText(null);
    setMergedReportId(null);
    setCopySucceeded(false);
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
  }

  function mergeSelectedItems() {
    if (selectedIds.length === 0) {
      setMessage('병합할 항목을 선택해 주세요.');
      return;
    }
    if (hiddenSelectedCount > 0) {
      setMessage('현재 필터에 보이지 않는 원본 항목이 있어 재병합할 수 없습니다. 필터를 초기화한 뒤 다시 불러와 주세요.');
      return;
    }

    setMergedReportId(null);
    setMergedText(automaticPreview);
    setCopySucceeded(false);
    setMessage('선택한 항목을 단위업무별로 병합했습니다.');
  }

  function toggleAllVisibleItems() {
    setMergedText(null);
    setMergedReportId(null);
    setCopySucceeded(false);
    setSelectedIds(allVisibleItemsSelected ? [] : items.map((item) => item.id));
  }

  async function saveMergedReport() {
    if (!mergedReportId && selectedIds.length === 0) {
      setMessage('저장할 취합 항목을 선택해 주세요.');
      return;
    }
    if (!mergedText?.trim()) {
      setMessage('저장할 병합 결과를 먼저 생성해 주세요.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const body = {
        mergeType: 'ADMIN',
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergedText,
        status: 'SAVED',
        sourceItemIds: selectedIds,
      };
      const path = mergedReportId ? `/api/merged-reports/${mergedReportId}` : '/api/merged-reports';
      const method = mergedReportId ? 'PUT' : 'POST';
      const data = await requestApi(path, { method, body, token });
      setMergedText(data.mergedText);
      setMergedReportId(data.id);
      setCopySucceeded(false);
      await loadMergedReports();
      setMessage(mergedReportId ? '취합 결과를 수정 저장했습니다.' : '취합 결과를 저장했습니다.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function loadSavedMergedReport(report) {
    setMergedReportId(report.id);
    setMergedText(report.mergedText);
    setSelectedIds(report.sourceItemIds ?? []);
    setCopySucceeded(false);
    setMessage('저장된 취합 결과를 불러왔습니다.');
  }

  function loadSubmittedMemberReport(report) {
    setMergedReportId(null);
    setMergedText(report.mergedText);
    setSelectedIds(report.sourceItemIds ?? []);
    setCopySucceeded(false);
    setMessage(`${report.createdByName}님의 제출본을 최종 텍스트로 불러왔습니다.`);
  }

  async function copyMergedText() {
    if (!mergedText?.trim()) {
      setMessage('복사할 병합 결과를 먼저 생성해 주세요.');
      return;
    }

    try {
      await navigator.clipboard.writeText(mergedText);
      setCopySucceeded(true);
      setMessage('최종 취합 텍스트를 복사했습니다.');
    } catch (error) {
      setMessage('브라우저에서 클립보드 복사를 허용하지 않았습니다.');
    }
  }

  return (
    <div className="manager-layout">
      <section className="tool-panel manager-filter-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">팀장 취합 화면</p>
            <h2>개발자 제출 내용 조회</h2>
          </div>
          <div className="inline-period" aria-label="보고 기간">
            <span>보고 기간</span>
            <strong>{formatDate(weekRange.startDate)} ~ {formatDate(weekRange.endDate)}</strong>
          </div>
          <button className="secondary-button" type="button" onClick={() => loadSubmittedItems()} disabled={isLoading}>
            새로고침
          </button>
        </div>

        <form className="filter-grid" onSubmit={handleSearch}>
          <label>
            개발자 아이디
            <input
              value={filters.memberLoginId}
              onChange={(event) => updateFilter('memberLoginId', event.target.value)}
              placeholder="전체"
            />
          </label>
          <label>
            단위업무
            <input
              value={filters.unitTask}
              onChange={(event) => updateFilter('unitTask', event.target.value)}
              placeholder="전체"
            />
          </label>
          <label>
            주차 구분
            <select
              value={filters.weekType}
              onChange={(event) => updateFilter('weekType', event.target.value)}
            >
              <option value="">전체</option>
              <option value="THIS_WEEK">금주</option>
              <option value="NEXT_WEEK">차주</option>
            </select>
          </label>
          <div className="button-row align-end">
            <button className="secondary-button" type="button" onClick={resetFilters} disabled={isLoading}>
              초기화
            </button>
            <button className="primary-button compact" type="submit" disabled={isLoading}>
              조회
            </button>
          </div>
        </form>
      </section>

      <section className="tool-panel manager-table-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">제출 항목</p>
            <h2>병합 대상 선택</h2>
          </div>
          <div className="summary-counts">
            <span>전체 {items.length}</span>
            <strong>선택 {selectedIds.length}</strong>
          </div>
          <button className="secondary-button compact" type="button" onClick={toggleAllVisibleItems} disabled={items.length === 0 || isLoading}>
            {allVisibleItemsSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        <div className="items-table-wrap">
          <table className="items-table manager-items-table" aria-label="개발자 제출 항목 목록">
            <thead>
              <tr>
                <th scope="col">
                  <label className="check-label table-check">
                    <input
                      type="checkbox"
                      aria-label="병합 대상 전체 선택"
                      checked={allVisibleItemsSelected}
                      disabled={items.length === 0}
                      onChange={toggleAllVisibleItems}
                    />
                  </label>
                </th>
                <th scope="col">개발자</th>
                <th scope="col">구분</th>
                <th scope="col">업무</th>
                <th scope="col">단위업무</th>
                <th scope="col">일감</th>
                <th scope="col">세부사항</th>
                <th scope="col">상태</th>
                <th scope="col">완료예정</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="9">조회된 제출 항목이 없습니다.</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <label className="check-label table-check">
                      <input
                        type="checkbox"
                        aria-label={`${item.authorName} ${item.unitTask} ${item.title} 선택`}
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </label>
                  </td>
                  <td>
                    <strong>{item.authorName}</strong>
                    <span className="table-subtext">{item.authorLoginId}</span>
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
                  <td>{statusLabels[item.status]}</td>
                  <td>{formatReportItemDueLabel(item) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tool-panel preview-panel">
        <div className="section-header">
          <div>
            <p className="panel-label">취합 결과</p>
            <h2>최종 텍스트</h2>
          </div>
          <div className="button-row compact-actions">
            <button className="secondary-button" type="button" onClick={mergeSelectedItems} disabled={selectedIds.length === 0}>
              병합
            </button>
            <button className="secondary-button" type="button" onClick={loadMergedReports} disabled={isLoading}>
              목록 새로고침
            </button>
            <button className="secondary-button" type="button" onClick={loadSubmittedMemberReports} disabled={isLoading}>
              제출본 새로고침
            </button>
            <button className="secondary-button" type="button" onClick={saveMergedReport} disabled={!mergedText?.trim() || isLoading}>
              {mergedReportId ? '수정 저장' : '저장'}
            </button>
            <button className="primary-button compact" type="button" onClick={copyMergedText} disabled={!mergedText?.trim()}>
              {copySucceeded ? '복사됨' : '복사'}
            </button>
          </div>
        </div>
        <div className="saved-report-list-header">
          <strong>개발자 최종병합 제출본</strong>
          <span>{submittedMemberReports.length}건</span>
        </div>
        <div className="saved-report-list" aria-label="개발자 최종병합 제출본 목록">
          {submittedMemberReports.length === 0 ? (
            <p className="empty-list">제출된 개발자 최종병합 결과가 없습니다.</p>
          ) : submittedMemberReports.map((report) => (
            <button
              key={report.id}
              className="saved-report-button"
              type="button"
              onClick={() => loadSubmittedMemberReport(report)}
            >
              <strong>{report.createdByName}</strong>
              <span>{formatDate(report.updatedAt.slice(0, 10))}</span>
              <span>{report.mergedText.slice(0, 60)}</span>
            </button>
          ))}
        </div>
        <div className="saved-report-list-header">
          <strong>저장된 관리자 취합 결과</strong>
          <span>{savedMergedReports.length}건</span>
        </div>
        <div className="saved-report-list" aria-label="저장된 취합 결과 목록">
          {savedMergedReports.length === 0 ? (
            <p className="empty-list">저장된 취합 결과가 없습니다.</p>
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
          value={mergedText ?? automaticPreview}
          onChange={(event) => {
            setMergedText(event.target.value);
            setCopySucceeded(false);
          }}
          aria-label="팀장 취합 최종 텍스트"
        />
      </section>
    </div>
  );
}

export default ManagerReportScreen;
