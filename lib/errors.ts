import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export interface ApiErrorShape {
  error: string;
  code: string;
  details?: any;
  requestId?: string;
}

export function respondError(code: string, message: string, status = 400, details?: any, requestId?: string) {
  let reqId = requestId;
  try {
    if (!reqId) {
      const h = headers();
      reqId = h.get('x-request-id') || undefined;
    }
  } catch {}
  const body: ApiErrorShape = { error: message, code, ...(details ? { details } : {}), ...(reqId ? { requestId: reqId } : {}) };
  const res = NextResponse.json(body, { status });
  if (reqId) res.headers.set('x-request-id', reqId);
  return res;
}

// Common helpers
export const ERR = {
  UNAUTHORIZED: (reqId?: string) => respondError('UNAUTHORIZED', 'Unauthorized', 401, undefined, reqId),
  FORBIDDEN: (reqId?: string) => respondError('FORBIDDEN', 'Forbidden', 403, undefined, reqId),
  NOT_FOUND: (reqId?: string) => respondError('NOT_FOUND', 'Not found', 404, undefined, reqId),
  RATE_LIMIT: (retryAfterSec: number, reqId?: string) => respondError('RATE_LIMIT', 'Too many requests', 429, { retryAfter: retryAfterSec }, reqId),
  INVALID_INPUT: (details?: any, reqId?: string) => respondError('INVALID_INPUT', 'Date invalide', 400, details, reqId),
  SERVER_ERROR: (reqId?: string) => respondError('SERVER_ERROR', 'Eroare server', 500, undefined, reqId)
};
