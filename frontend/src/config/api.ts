/**
 * Dynamic API URL Resolver
 * 
 * Automatically resolves the backend API URL:
 * 1. If NEXT_PUBLIC_API_URL is explicitly set, uses that.
 * 2. In browser environments, dynamically binds to the active hostname (e.g. 10.98.14.12:8000 or localhost:8000).
 * 3. Fallback for SSR to http://127.0.0.1:8000.
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const proto = window.location.protocol || 'http:';
    const host = window.location.hostname;
    return `${proto}//${host}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

export const API_URL = getApiUrl();
