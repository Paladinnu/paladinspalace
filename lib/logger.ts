type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogFields { [k: string]: any }

function base(level: Level, msg: string, fields?: LogFields) {
  const line = { ts: new Date().toISOString(), level, msg, ...(fields||{}) };
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, f?: LogFields) => base('debug', msg, f),
  info: (msg: string, f?: LogFields) => base('info', msg, f),
  warn: (msg: string, f?: LogFields) => base('warn', msg, f),
  error: (msg: string, f?: LogFields) => base('error', msg, f)
};

// Helper to wrap async route handlers with auto error logging (optional future use)
export function withLogging<TArgs extends any[], T>(fn: (...a: TArgs) => Promise<T>) {
  return async (...a: TArgs) => {
    try { return await fn(...a); } catch (e: any) { logger.error('handler_error', { err: e.message }); throw e; }
  };
}
