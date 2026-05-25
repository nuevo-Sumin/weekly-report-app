export async function requestApi(path, { method = 'POST', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('서버 응답을 읽지 못했습니다.');
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || '요청을 처리하지 못했습니다.');
  }

  return payload.data;
}

