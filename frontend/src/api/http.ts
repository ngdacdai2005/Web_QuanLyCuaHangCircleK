/** Shared authenticated fetch helpers with token storage and 401 auto-handling. */

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('ck_auth_session');
  sessionStorage.removeItem('ck_auth_session');
};

export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        ...getAuthHeaders(),
        ...init.headers,
      },
    });

    // Tự động xử lý khi Token hết hạn (401 Unauthorized)
    if (response.status === 401 && !window.location.pathname.includes('/login')) {
      clearAuthTokens();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return response;
  } catch (error) {
    throw error;
  }
};