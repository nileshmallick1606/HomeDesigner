/**
 * Download a file from an authenticated API endpoint using blob pattern.
 * Uses Bearer token from localStorage (ES-DC-2: not window.open).
 */
export async function downloadBlob(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('interior_science_token');
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
