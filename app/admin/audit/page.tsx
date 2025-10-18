import AuditClient from './AuditClient';

// Server component: rely on client-side session gating; middleware can be extended to protect /admin/* if needed.
export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return <AuditClient />;
}
