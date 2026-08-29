// 通用小工具：JSON 响应、Cookie 解析、会话常量

export const SESSION_COOKIE = 'yhuo_session';
export const SESSION_DAYS = 7;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
