const normalize = (value) => String(value || '').replace(/\/$/, '');

const envApiBase = normalize(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '');

const inferCloudflareFallback = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const hostname = String(window.location?.hostname || '').toLowerCase();
  if (hostname.endsWith('.pages.dev')) {
    // Safety fallback for Cloudflare Pages deployments when VITE_API_URL is missing.
    return 'https://cenechinesesahdowvn.onrender.com/api';
  }

  return '';
};

export const API_BASE = normalize(envApiBase || inferCloudflareFallback() || '/api');
