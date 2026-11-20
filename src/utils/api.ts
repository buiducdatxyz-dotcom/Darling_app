const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

/** Adds the signed-in user's bearer token to same-origin API requests. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
  const path = url.split('?')[0];
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));

  if (path.startsWith('/api/') && !PUBLIC_API_PATHS.has(path)) {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers }).then(response => {
    if (response.status === 401 && path.startsWith('/api/') && !PUBLIC_API_PATHS.has(path) && localStorage.getItem('is_logged_in') === 'true') {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_id');
      sessionStorage.removeItem('temp_register_email');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('temp_register_email');
      localStorage.removeItem('is_logged_in');
      window.location.reload();
    }
    return response;
  });
}
