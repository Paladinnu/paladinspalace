import sharp from 'sharp';

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  score?: number;
};

// Simple heuristic skin-tone detector.
// Returns fraction of pixels likely to be skin.
async function estimateSkinRatio(buf: Buffer): Promise<number> {
  try {
    // Downscale aggressively for speed and to denoise
    const img = sharp(buf).resize({ width: 96, height: 96, fit: 'inside', withoutEnlargement: true }).removeAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info; // channels should be 3 (RGB)
    if (channels < 3) return 0;

    let skin = 0;
    let total = width * height;

    // Skin detection in YCbCr + HSV ranges (broad, heuristic)
    // References: generic skin detection thresholds used in literature
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to YCbCr
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const inYCbCrRange = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;

      // Convert to HSV
      const rf = r / 255;
      const gf = g / 255;
      const bf = b / 255;
      const max = Math.max(rf, gf, bf);
      const min = Math.min(rf, gf, bf);
      const delta = max - min;
      let h = 0;
      if (delta !== 0) {
        if (max === rf) h = ((gf - bf) / delta) % 6;
        else if (max === gf) h = (bf - rf) / delta + 2;
        else h = (rf - gf) / delta + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      const s = max === 0 ? 0 : delta / max;
      const v = max;

      const inHSVRange = h >= 0 && h <= 50 && s >= 0.23 && s <= 0.68 && v >= 0.35;

      if (inYCbCrRange || inHSVRange) skin++;
    }

    return skin / total;
  } catch {
    return 0;
  }
}

export async function moderateImage(buf: Buffer, _mime?: string): Promise<ModerationResult> {
  // Allow bypass in development/testing
  if (process.env.MODERATION_BYPASS === '1') return { allowed: true };

  // Threshold configurable via env; default conservative 0.38
  const threshold = Number(process.env.MODERATION_SKIN_THRESHOLD || '0.38');

  const ratio = await estimateSkinRatio(buf);

  if (isNaN(ratio)) return { allowed: true };

  if (ratio >= threshold) {
    return { allowed: false, reason: 'nsfw_skin_ratio_high', score: ratio };
  }

  return { allowed: true, score: ratio };
}
