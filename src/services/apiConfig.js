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
