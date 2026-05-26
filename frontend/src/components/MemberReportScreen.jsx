import { useEffect, useMemo, useState } from 'react';
import { initialReportForm, statusLabels, weekTypeLabels } from '../constants';
import { formatDate, getWeekRange, toDateInputValue } from '../dateUtils';
import { buildPreview } from '../reportPreview';
import { requestApi } from '../api';

function MemberReportScreen({ token, user, isLoading, setIsLoading, setMessage }) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [baseDate, setBaseDate] = useState(today);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [mergedReportId, setMergedReportId] = useState(null);

  const weekRange = useMemo(() => getWeekRange(baseDate), [baseDate]);
  const previewText = useMemo(() => buildPreview(items, selectedIds), [items, selectedIds]);
  const isPendingManager = user.requestedRole === 'MANAGER' && user.roleApprovalStatus === 'PENDING';

  useEffect(() => {
    if (token) {
      loadReportItems();
    }
  }, [token, weekRange.startDate, weekRange.endDate]);

  function updateReportForm(field, value) {
    setReportForm((current) => ({ ...current, [field]: value }));
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
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
    setMergedReportId(null);
  }

  async function saveMergedReport() {
    if (selectedIds.length === 0) {
      setMessage('저장할 병합 항목을 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const body = {
        mergeType: 'MEMBER',
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        mergedText: previewText,
        status: 'SAVED',
      };
      const path = mergedReportId ? `/api/merged-reports/${mergedReportId}` : '/api/merged-reports';
      const method = mergedReportId ? 'PUT' : 'POST';
      const data = await requestApi(path, { method, body, token });
      setMergedReportId(data.id);
      setMessage(mergedReportId ? '병합 결과를 수정 저장했습니다.' : '병합 결과를 저장했습니다.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPreview() {
    if (selectedIds.length === 0) {
      setMessage('복사할 항목을 선택해 주세요.');
      return;
    }

    try {
      await navigator.clipboard.writeText(previewText);
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
          <button className="primary-button compact" type="button" onClick={submitSelectedItems} disabled={isLoading}>
            제출
          </button>
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
            <button className="secondary-button" type="button" onClick={saveMergedReport} disabled={selectedIds.length === 0 || isLoading}>
              {mergedReportId ? '수정 저장' : '저장'}
            </button>
            <button className="primary-button compact" type="button" onClick={copyPreview} disabled={selectedIds.length === 0}>
              복사
            </button>
          </div>
        </div>
        <pre>{previewText}</pre>
      </section>
    </div>
  );
}

export default MemberReportScreen;
