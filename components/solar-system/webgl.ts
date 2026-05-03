/**
 * Best-effort detection: try to acquire a WebGL context on a throwaway canvas.
 * Returns false in SSR or when the browser refuses (blocked extensions,
 * software-rendering blacklists, etc).
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}
