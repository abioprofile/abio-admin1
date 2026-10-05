export function validateImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Select an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('File is too large. Maximum size is 5MB.')
}
// Provenance comes from backend responses; the backend enforces account ownership.
export function isUploadedImage(url: string) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com' && parsed.pathname.split('/').filter(Boolean).length > 1 } catch { return false }
}
