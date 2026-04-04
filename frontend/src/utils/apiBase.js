const normalize = (value) => String(value || '').replace(/\/$/, '');

const envApiBase = normalize(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '');
const envApiFallback = normalize(import.meta.env.VITE_API_FALLBACK_URL || '');
const DEFAULT_HOSTED_API_BASE = 'https://cenechinesesahdowvn.onrender.com/api';

const inferRuntimeFallback = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const hostname = String(window.location?.hostname || '').toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalHost) {
    return '/api';
  }

  const hostedApiFallback = envApiFallback || DEFAULT_HOSTED_API_BASE;

  if (hostname.endsWith('.pages.dev')) {
    // Fallback for Cloudflare Pages deployments when VITE_API_URL is missing.
    return hostedApiFallback;
  }

  if (!hostname.endsWith('.onrender.com')) {
    // Custom domains for static frontend should also point to backend API.
    return hostedApiFallback;
  }

  return '/api';
};

export const API_BASE = normalize(envApiBase || inferRuntimeFallback() || '/api');
