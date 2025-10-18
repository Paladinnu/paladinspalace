"use client";
import Image, { ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'src'> & { src?: string | null };

export function SafeImage({ src, alt, ...rest }: Props) {
  if (!src || typeof src !== 'string') return null;
  let finalSrc = src;
  try {
    // Prefer client origin in the browser; on the server, derive a safe base from env or fall back to localhost:3001.
    const serverOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const base = typeof window !== 'undefined' ? window.location.origin : serverOrigin;
    const u = new URL(src, base);
    // Reddit wrapper -> extract the actual image URL
    if (u.hostname === 'www.reddit.com' && u.pathname === '/media') {
      const wrapped = u.searchParams.get('url');
      if (wrapped) finalSrc = wrapped;
    }
    // Validate protocol
    const parsed = new URL(finalSrc, base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  } catch { return null; }
  // Let Next handle remotePatterns; if host not allowed it would error, so we guard by returning null on failure above.
  return <Image src={finalSrc} alt={alt} {...rest} />;
}