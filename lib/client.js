export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const fmtSeconds = (s) =>
  s == null ? '-' : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;