export function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:4100';
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4100';
  }
  return '';
}

export function handleAuthResponseCheck(data) {
  if (data && (data.error === 'ACCOUNT_DISABLED' || data.disabled === true)) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('decorfesto-current-user');
      window.dispatchEvent(new Event('storage'));
    }
  }
}
