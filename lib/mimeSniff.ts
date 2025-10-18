// Basic magic number MIME sniffing for security hardening.
// NOTE: This is a limited subset for images we allow.

export type SniffResult = { mime: string | null };

export function sniffImageMime(bytes: Uint8Array): SniffResult {
  if (bytes.length >= 8) {
    // PNG 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { mime: 'image/png' };
  }
  if (bytes.length >= 3) {
    // JPEG FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return { mime: 'image/jpeg' };
  }
  if (bytes.length >= 12) {
    // WebP RIFF .... WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { mime: 'image/webp' };
  }
  return { mime: null };
}
